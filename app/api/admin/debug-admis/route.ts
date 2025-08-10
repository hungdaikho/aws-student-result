import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const year = Number.parseInt(searchParams.get("year") || "2024")
        const examType = searchParams.get("examType") || "BAC"
        const limit = Number.parseInt(searchParams.get("limit") || "50")

        console.log(`🔍 Debug admis logic for ${examType} ${year}`)

        // Get students with their decision_text and admis status
        const students = await prisma.student.findMany({
            where: {
                year,
                examType
            },
            select: {
                matricule: true,
                nom_complet: true,
                etablissement: true,
                decision_text: true,
                admis: true,
                moyenne: true,
                rang: true
            },
            orderBy: {
                rang: 'asc'
            },
            take: limit
        })

        // Helper function to determine if student should be admitted based on decision text
        function shouldBeAdmittedByDecision(decisionText: string): boolean {
            if (!decisionText || typeof decisionText !== 'string') {
                return false
            }

            // Normalize text: lowercase, trim whitespace, and normalize diacritics
            const decision = decisionText
                .toLowerCase()
                .trim()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (é→e, à→a, etc.)
                .replace(/\s+/g, ' ') // Normalize multiple spaces to single space

            // Logic rules for determining admission status from Decision column:

            // 1. Explicitly admitted (various forms)
            if (decision.includes("admis") ||           // "Admis", "Admise", "ADMIS"
                decision.includes("reussi") ||          // "Réussi", "Réussie", "REUSSI"
                decision.includes("reussie") ||         // Alternative spelling
                decision.includes("success") ||         // English equivalent
                decision === "r" ||                     // Short form for "Réussi"
                decision === "a" ||                     // Short form for "Admis"
                decision.includes("pass") ||            // "Passé", "Passed", "PASSE"
                decision.includes("valide")) {          // "Validé", "VALIDE"
                return true
            }

            // 2. Session candidates (considered as not admitted for main admission)
            if (decision.includes("sessionnaire") ||
                decision.includes("sessionn") ||        // Shortened form
                decision.includes("session") ||
                decision.includes("rattrapage")) {      // Makeup/retake session
                return false
            }

            // 3. Explicitly failed
            if (decision.includes("echec") ||           // "Échec", "ECHEC"
                decision.includes("echoue") ||          // "Échoué", "ECHOUE"
                decision.includes("refuse") ||          // "Refusé", "REFUSE"
                decision.includes("elimine") ||         // "Éliminé", "ELIMINE"
                decision.includes("ajourne") ||         // "Ajourné", "AJOURNE"
                decision.includes("fail") ||            // English equivalent
                decision.includes("reject")) {          // English equivalent
                return false
            }

            // 4. Default: if decision text doesn't match any pattern, consider as not admitted
            return false
        }        // Analyze the data
        const analysis = students.map(student => {
            const shouldBeAdmittedByText = shouldBeAdmittedByDecision(student.decision_text)
            const isInconsistent = student.admis !== shouldBeAdmittedByText

            return {
                matricule: student.matricule,
                nom_complet: student.nom_complet,
                etablissement: student.etablissement,
                decision_text: student.decision_text,
                admis_in_db: student.admis,
                should_be_admitted: shouldBeAdmittedByText,
                is_inconsistent: isInconsistent,
                moyenne: student.moyenne,
                rang: student.rang
            }
        })

        // Summary statistics
        const totalStudents = students.length
        const admittedInDb = students.filter(s => s.admis).length
        const shouldBeAdmittedCount = analysis.filter(a => a.should_be_admitted).length
        const inconsistentRecords = analysis.filter(a => a.is_inconsistent).length

        const summary = {
            totalStudents,
            admittedInDb,
            shouldBeAdmitted: shouldBeAdmittedCount,
            inconsistentRecords,
            inconsistencyRate: totalStudents > 0 ? ((inconsistentRecords / totalStudents) * 100).toFixed(1) : "0.0",
            dbAdmissionRate: totalStudents > 0 ? ((admittedInDb / totalStudents) * 100).toFixed(1) : "0.0",
            textBasedAdmissionRate: totalStudents > 0 ? ((shouldBeAdmittedCount / totalStudents) * 100).toFixed(1) : "0.0"
        }

        // Sample inconsistent records
        const inconsistentSamples = analysis
            .filter(a => a.is_inconsistent)
            .slice(0, 10)

        // Unique decision text values
        const uniqueDecisionTexts = [...new Set(students.map(s => s.decision_text))]
            .sort()

        return NextResponse.json({
            year,
            examType,
            summary,
            uniqueDecisionTexts,
            inconsistentSamples,
            sampleData: analysis.slice(0, 20) // First 20 records
        })

    } catch (error) {
        console.error("💥 Debug admis error:", error)
        return NextResponse.json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 })
    }
}
