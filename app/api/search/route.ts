import { type NextRequest, NextResponse } from "next/server"
import { StudentService } from "@/lib/student-service"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const matricule = searchParams.get("matricule")
    const year = Number.parseInt(searchParams.get("year") || "2025")
    const examType = searchParams.get("examType") || "BAC"
    const sessionTypeParam = searchParams.get("sessionType")
    const sessionType = sessionTypeParam || undefined

    if (!matricule) {
      return NextResponse.json({ error: "Matricule is required" }, { status: 400 })
    }

    // For CONCOURS exams, search by matricule is not supported for manual search
    const isDirectClick = searchParams.get("directClick") === "true"
    if (examType === "CONCOURS" && !isDirectClick) {
      return NextResponse.json({ 
        error: "Recherche par matricule non disponible pour les examens CONCOURS. Utilisez la recherche par nom ou établissement.",
        code: "SEARCH_NOT_SUPPORTED"
      }, { status: 400 })
    }

    console.log(`🔍 Searching for matricule: ${matricule} in ${examType} ${year}${sessionType ? ` (${sessionType})` : ""}`)

    // For BAC exams, session type is required
    if (examType === "BAC" && !sessionType) {
      return NextResponse.json({ 
        error: "Session type is required for BAC exams. Please specify either 'NORMALE' or 'COMPLEMENTAIRE'",
        code: "SESSION_REQUIRED"
      }, { status: 400 })
    }

    // Find student in database
    try {
      // For CONCOURS exams with direct click, we need to include location information
      let student;
      if (examType === "CONCOURS" && isDirectClick) {
        // Get the additional parameters for CONCOURS
        let schoolName = searchParams.get("schoolName");
        let studentName = searchParams.get("studentName");
        let wilaya = searchParams.get("wilaya");
        let moughataa = searchParams.get("moughataa");
        
        if (!schoolName) {
          // Fallback to referer
          const referer = request.headers.get("referer");
          if (referer) {
            const url = new URL(referer);
            schoolName = url.searchParams.get("name");
          }
        }
        
        // Decode the parameters properly
        if (schoolName) schoolName = decodeURIComponent(schoolName);
        if (studentName) studentName = decodeURIComponent(studentName);
        if (wilaya) wilaya = decodeURIComponent(wilaya);
        if (moughataa) moughataa = decodeURIComponent(moughataa);
        
        console.log(`🔍 CONCOURS location search: studentName=${studentName}, wilaya=${wilaya}, moughataa=${moughataa}, schoolName=${schoolName}`);
        
        // For CONCOURS, NEVER use matricule - only use location-based search
        if (studentName && wilaya && moughataa && schoolName) {
          // Use comprehensive search (name + wilaya + moughataa + etablissement) - most reliable
          student = await StudentService.findStudentByNameAndLocation(studentName, wilaya, moughataa, schoolName, year, examType);
        } else if (wilaya && moughataa && schoolName) {
          // Use location-based search (wilaya + moughataa + etablissement)
          student = await StudentService.findStudentByLocation(wilaya, moughataa, schoolName, year, examType);
        } else if (schoolName && studentName) {
          // Fallback to student name and school
          student = await StudentService.findStudentByNameAndSchool(studentName, year, examType, schoolName, wilaya);
        } else {
          // For CONCOURS, if we don't have location data, return error
          console.log(`❌ CONCOURS: Insufficient location data for unique identification`);
          return NextResponse.json({ error: "Étudiant non trouvé - données de localisation insuffisantes" }, { status: 404 });
        }
      } else {
        student = await StudentService.findStudentByMatricule(matricule, year, examType, sessionType, isDirectClick);
      }
      
      if (!student) {
        console.log(`❌ Student with matricule ${matricule} not found in ${examType} ${year}${sessionType ? ` (${sessionType})` : ""}`)
        return NextResponse.json({ error: "Étudiant non trouvé" }, { status: 404 })
      }

      console.log(`✅ Found student: ${student.nom_complet} (${matricule}) in ${examType} ${year}${sessionType ? ` (${sessionType})` : ""}`)
      return NextResponse.json(student)
    } catch (error) {
      if (error instanceof Error && error.message === "Session type is required for BAC exams") {
        return NextResponse.json({ 
          error: "Session type is required for BAC exams. Please specify either 'NORMALE' or 'COMPLEMENTAIRE'",
          code: "SESSION_REQUIRED"
        }, { status: 400 })
      }
      throw error
    }
  } catch (error) {
    console.error("💥 Search error:", error)
    return NextResponse.json({
      error: "Internal server error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
