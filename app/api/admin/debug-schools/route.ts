import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        console.log("🔍 Getting all school names from database...")

        // Get all distinct school names
        const schools = await prisma.student.findMany({
            select: {
                ecole: true,
                etablissement: true,
                year: true,
                examType: true
            },
            distinct: ['ecole', 'year', 'examType'],
            orderBy: [
                { year: 'desc' },
                { examType: 'asc' },
                { ecole: 'asc' }
            ]
        })

        // Group by year and examType
        const grouped = schools.reduce((acc, school) => {
            const key = `${school.examType} ${school.year}`
            if (!acc[key]) {
                acc[key] = []
            }
            acc[key].push({
                ecole: school.ecole,
                etablissement: school.etablissement
            })
            return acc
        }, {} as any)

        return NextResponse.json({
            status: "SUCCESS",
            message: "All school names retrieved",
            data: grouped,
            totalSchools: schools.length,
            timestamp: new Date().toISOString()
        })

    } catch (error: any) {
        console.error("❌ Debug schools error:", error)

        return NextResponse.json({
            status: "ERROR",
            message: "Failed to retrieve school names",
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 })
    }
}
