import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 Analyze Excel request received")

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("excel") as File
    const examType = formData.get("examType") as string

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log("📄 File details:", {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Dynamic import XLSX to avoid SSR issues
    const XLSX = await import("xlsx")

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    if (jsonData.length === 0) {
      return NextResponse.json({ success: false, error: "Le fichier Excel est vide" }, { status: 400 })
    }

    // Get headers (first row) and filter out empty/undefined values
    const rawHeaders = jsonData[0] as any[]
    const headers = rawHeaders
      .map((header, index) => {
        // Convert to string and clean up
        if (header === null || header === undefined || header === "") {
          return `Colonne_${index + 1}` // Give a default name to empty columns
        }
        return String(header).trim()
      })
      ?.filter((header) => header && header !== "")

    console.log("📊 Raw headers:", rawHeaders)
    console.log("📊 Cleaned headers:", headers)

    // Get data rows and filter out completely empty rows
    const dataRows = jsonData.slice(1)?.filter((row) => {
      if (!Array.isArray(row)) return false
      return row.some((cell) => cell !== null && cell !== undefined && cell !== "")
    })

    console.log("📊 Excel analysis:", {
      totalRows: dataRows.length,
      columns: headers.length,
      headers: headers.slice(0, 10), // Show first 10 headers
    })

    if (headers.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucune colonne valide trouvée dans le fichier" },
        { status: 400 },
      )
    }

    if (dataRows.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée trouvée dans le fichier" }, { status: 400 })
    }

    // Get sample data (first 3 rows)
    const sampleData = dataRows.slice(0, 3).map((row) => {
      const obj: any = {}
      headers.forEach((header, index) => {
        const cellValue = (row as any[])[index]
        obj[header] = cellValue !== null && cellValue !== undefined ? String(cellValue) : ""
      })
      return obj
    })

    // Define required fields based on exam type
    const requiredFields =
      examType === "BAC"
        ? [
          { field: "matricule", description: "Numéro de dossier/matricule de l'étudiant" },
          { field: "nom_complet", description: "Nom et prénom complet de l'étudiant" },
          { field: "section", description: "Section/Série (ex: Sciences Expérimentales, Mathématiques, etc.)" },
          { field: "moyenne", description: "Moyenne générale du BAC" },
          { field: "ecole", description: "École/Lycée d'origine" },
          { field: "etablissement", description: "Établissement/Institution" },
          { field: "wilaya", description: "Wilaya/Province" },
          { field: "decision", description: "Décision finale (Admis/Non admis)" },
          { field: "date_naissance", description: "Date de naissance (optionnel)" },
        ]
        : examType === "CONCOURS"
        ? [
          { field: "matricule", description: "Numéro de dossier/matricule de l'étudiant" },
          { field: "nom_complet", description: "Nom et prénom complet de l'étudiant" },
          { field: "score", description: "Score obtenu au concours" },
          { field: "ecole", description: "École/Lycée d'origine" },
          { field: "etablissement", description: "Établissement/Institution" },
          { field: "wilaya", description: "Wilaya/Province" },
          { field: "moughataa", description: "Moughataa/Centre (pour identifier l'étudiant de manière unique)" },
          { field: "date_naissance", description: "Date de naissance (optionnel)" },
        ]
        : [
          { field: "matricule", description: "Numéro de dossier/matricule de l'étudiant" },
          { field: "nom_complet", description: "Nom et prénom complet de l'étudiant" },
          { field: "moyenne", description: "Moyenne générale du BREVET" },
          { field: "ecole", description: "École/Collège d'origine" },
          { field: "etablissement", description: "Établissement/Institution" },
          { field: "wilaya", description: "Wilaya/Province" },
          { field: "decision", description: "Décision finale (Admis/Non admis)" },
          { field: "date_naissance", description: "Date de naissance (optionnel)" },
        ]

    // Create suggested mapping based on common patterns
    const suggestedMapping: { [key: string]: string } = {}

    // Common patterns for each field
    const patterns = {
      matricule: ["nodoss", "matricule", "numero", "dossier", "id", "num", "num_bac", "num_bepc"],
      nom_complet: ["nompl", "nom_prenom", "nom_complet", "nom", "prenom", "fullname", "nom_fr"],
      section: ["serie", "section", "filiere", "specialite", "branch"],
      moyenne: ["moybac", "moyenne", "moy", "note", "score", "average", "moy_bac", "moyenne_bepc"],
      score: ["score", "note", "total", "points", "resultat", "moyenne"],
      ecole: ["libnoets", "ecole", "lycee", "etablissement_origine", "school", "libnoetce", "centre"],
      etablissement: ["libnoetce", "etablissement", "institution", "centre", "etablissement_fr"],
      wilaya: ["wilaya", "province", "region", "gouvernorat", "wilaya_fr"],
      moughataa: ["moughataa", "centre", "district", "moughata", "moughataa_fr", "centre_examen"],
      decision: ["decision", "resultat", "statut", "admis", "result"],
      date_naissance: ["date_naissance", "naissance", "birth", "birthday", "date_naiss", "datn"],
    }

    // Try to match headers with patterns (case-insensitive and partial matching)
    for (const [field, fieldPatterns] of Object.entries(patterns)) {
      for (const header of headers) {
        if (!header || typeof header !== "string") continue

        const headerLower = header?.toLowerCase().trim()

        for (const pattern of fieldPatterns) {
          const patternLower = pattern?.toLowerCase()

          // Exact match or contains pattern
          if (
            headerLower === patternLower ||
            headerLower?.includes(patternLower) ||
            patternLower?.includes(headerLower)
          ) {
            if (!suggestedMapping[field]) {
              suggestedMapping[field] = header
              console.log(`🎯 Matched ${field} -> ${header} (pattern: ${pattern})`)
              break
            }
          }
        }
        if (suggestedMapping[field]) break
      }
    }

    console.log("🎯 Final suggested mapping:", suggestedMapping)

    const response = {
      success: true,
      fileName: file.name,
      fileSize: file.size,
      examType: examType,
      columns: headers,
      sampleData: sampleData,
      totalRows: dataRows.length,
      requiredFields: requiredFields,
      suggestedMapping: suggestedMapping,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("💥 Analyze Excel error:", error)

    let errorMessage = "Erreur lors de l'analyse du fichier Excel"

    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack?.split("\n").slice(0, 5),
      })

      if (error.message?.includes("Unsupported file")) {
        errorMessage = "Format de fichier non supporté. Veuillez utiliser un fichier Excel (.xlsx ou .xls)"
      } else if (error.message?.includes("Invalid file")) {
        errorMessage = "Fichier Excel invalide ou corrompu"
      } else if (error.message?.includes("Cannot read properties")) {
        errorMessage = "Erreur de lecture du fichier Excel. Vérifiez que le fichier contient des données valides."
      } else {
        errorMessage = `Erreur d'analyse: ${error.message}`
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
