import { type NextRequest, NextResponse } from "next/server"
import { StudentService } from "@/lib/student-service"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const name = searchParams.get("name")
        const year = Number.parseInt(searchParams.get("year") || "2025")
        const examType = (searchParams.get("examType") as "BAC" | "BREVET") || "BAC"
        const sessionType = searchParams.get("sessionType") || null
        const page = Number.parseInt(searchParams.get("page") || "1")
        const limit = Number.parseInt(searchParams.get("limit") || "50")
        const section = searchParams.get("section") || "all"

        if (!name) {
            return NextResponse.json({ error: "Wilaya name is required" }, { status: 400 })
        }

        console.log(`🗺️ Loading students for wilaya ${name} in ${examType} ${year}${sessionType ? ` (${sessionType})` : ""} (page ${page}, limit ${limit}, section ${section})`)

        // Get paginated students by wilaya from database
        const result = await StudentService.getStudentsByWilayaPaginated(name, year, examType, page, limit, section, sessionType || undefined)

        return NextResponse.json(result)
    } catch (error) {
        console.error("💥 Wilaya students error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
