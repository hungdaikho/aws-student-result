import { type NextRequest, NextResponse } from "next/server"
import { StudentService } from "@/lib/student-service"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = Number.parseInt(searchParams.get("year") || "2025")
    const examType = searchParams.get("examType") || "BAC"
    const sessionType = searchParams.get("sessionType")

    console.log(`🗺️ Loading wilayas for ${examType} ${year}${sessionType ? ` (${sessionType})` : ""}`)

    // Get wilayas from database
    const wilayas = await StudentService.getWilayas(year, examType, sessionType || undefined)

    return NextResponse.json(wilayas)
  } catch (error) {
    console.error("💥 Wilayas error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
