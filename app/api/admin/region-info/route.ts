import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    try {
        console.log("📍 Region info request received")

        // Get region statistics from database
        const [wilayaStats, schoolStats, totalStudents] = await Promise.all([
            // Students grouped by wilaya
            prisma.student.groupBy({
                by: ['wilaya'],
                _count: true,
                _avg: {
                    moyenne: true
                }
            }),

            // Students grouped by school
            prisma.student.groupBy({
                by: ['etablissement'],
                _count: true,
                _avg: {
                    moyenne: true
                }
            }),

            // Total students count
            prisma.student.count()
        ])

        // Process wilaya data
        const wilayaData = wilayaStats
            .map(stat => ({
                wilaya: stat.wilaya,
                studentCount: stat._count,
                averageScore: stat._avg.moyenne ? Number(stat._avg.moyenne.toFixed(2)) : 0,
                percentage: totalStudents > 0 ? Number(((stat._count / totalStudents) * 100).toFixed(2)) : 0
            }))
            .sort((a, b) => b.studentCount - a.studentCount)

        // Process school data
        const schoolData = schoolStats
            .map(stat => ({
                school: stat.etablissement,
                studentCount: stat._count,
                averageScore: stat._avg.moyenne ? Number(stat._avg.moyenne.toFixed(2)) : 0,
                percentage: totalStudents > 0 ? Number(((stat._count / totalStudents) * 100).toFixed(2)) : 0
            }))
            .sort((a, b) => b.studentCount - a.studentCount)
            .slice(0, 50) // Limit to top 50 schools

        // Calculate summary statistics
        const summary = {
            totalStudents,
            totalWilayas: wilayaData.length,
            totalSchools: schoolData.length,
            topWilaya: wilayaData.length > 0 ? wilayaData[0] : null,
            topSchool: schoolData.length > 0 ? schoolData[0] : null
        }

        return NextResponse.json({
            status: "SUCCESS",
            summary,
            wilayas: wilayaData,
            schools: schoolData,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error("❌ Region info error:", error)

        return NextResponse.json({
            status: "ERROR",
            error: "Failed to retrieve region information",
            details: error instanceof Error ? error.message : "Unknown error",
            configured: Boolean(process.env.DATABASE_URL),
            timestamp: new Date().toISOString()
        }, { status: 500 })
    }
}
