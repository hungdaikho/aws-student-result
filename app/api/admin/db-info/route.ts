import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    try {
        console.log("📊 Database info request received")

        // Check if database is configured
        if (!process.env.DATABASE_URL) {
            return NextResponse.json({
                status: "ERROR",
                message: "Database not configured",
                configured: false,
                timestamp: new Date().toISOString()
            }, { status: 500 })
        }

        // Get comprehensive database statistics
        const [
            totalStudents,
            totalAdmitted,
            allStudents,
            dataUploads,
            duplicateGroups
        ] = await Promise.all([
            // Total students count
            prisma.student.count(),

            // Total admitted students
            prisma.student.count({
                where: { admis: true }
            }),

            // All students for detailed analysis
            prisma.student.findMany({
                select: {
                    year: true,
                    examType: true,
                    admis: true,
                    moyenne: true,
                    section: true,
                    etablissement: true,
                    wilaya: true,
                    createdAt: true,
                    updatedAt: true
                }
            }),

            // Data uploads
            prisma.dataUpload.findMany({
                orderBy: { uploadedAt: 'desc' }
            }),

            // Find duplicates by matricule
            prisma.student.groupBy({
                by: ['matricule'],
                _count: true,
                having: {
                    matricule: {
                        _count: {
                            gt: 1
                        }
                    }
                }
            })
        ])

        // Calculate admission rate
        const admissionRate = totalStudents > 0 ? ((totalAdmitted / totalStudents) * 100).toFixed(1) : "0.0"

        // Group by year and exam type
        const yearExamGroups = allStudents.reduce((acc, student) => {
            const key = `${student.examType} ${student.year}`
            if (!acc[key]) {
                acc[key] = {
                    year: student.year,
                    examType: student.examType,
                    students: [],
                    admittedCount: 0,
                    sectionsCount: new Set(),
                    establishmentsCount: new Set(),
                    wilayasCount: new Set(),
                    firstUpload: null as Date | null,
                    lastUpdate: null as Date | null
                }
            }

            acc[key].students.push(student)
            if (student.admis) acc[key].admittedCount++
            if (student.section) acc[key].sectionsCount.add(student.section)
            if (student.etablissement) acc[key].establishmentsCount.add(student.etablissement)
            if (student.wilaya) acc[key].wilayasCount.add(student.wilaya)

            if (!acc[key].firstUpload || student.createdAt < acc[key].firstUpload!) {
                acc[key].firstUpload = student.createdAt
            }
            if (!acc[key].lastUpdate || student.updatedAt > acc[key].lastUpdate!) {
                acc[key].lastUpdate = student.updatedAt
            }

            return acc
        }, {} as any)

        // Format data for response
        const data = Object.entries(yearExamGroups).map(([key, group]: [string, any]) => ({
            key,
            year: group.year,
            examType: group.examType,
            studentCount: group.students.length,
            admittedCount: group.admittedCount,
            admissionRate: group.students.length > 0 ? ((group.admittedCount / group.students.length) * 100).toFixed(1) : "0.0",
            averageScore: group.students.length > 0
                ? (group.students.reduce((sum: number, s: any) => sum + s.moyenne, 0) / group.students.length).toFixed(1)
                : 0,
            sectionsCount: group.sectionsCount.size,
            establishmentsCount: group.establishmentsCount.size,
            wilayasCount: group.wilayasCount.size,
            firstUpload: group.firstUpload?.toISOString(),
            lastUpdate: group.lastUpdate?.toISOString()
        }))

        // Get duplicate details
        const duplicates = await Promise.all(
            duplicateGroups.slice(0, 10).map(async (group) => {
                const students = await prisma.student.findMany({
                    where: { matricule: group.matricule },
                    select: { nom_complet: true }
                })
                return {
                    matricule: group.matricule,
                    count: group._count,
                    names: students.map(s => s.nom_complet)
                }
            })
        )

        // Calculate summary statistics
        const totalYears = new Set(allStudents.map(s => s.year)).size
        const totalExamTypes = new Set(allStudents.map(s => s.examType)).size
        const totalSections = new Set(allStudents.map(s => s.section)).size
        const totalEstablishments = new Set(allStudents.map(s => s.etablissement)).size
        const totalWilayas = new Set(allStudents.map(s => s.wilaya)).size

        return NextResponse.json({
            status: "SUCCESS",
            message: "Database information retrieved",
            configured: true,
            summary: {
                totalStudents,
                totalAdmitted,
                admissionRate,
                totalYears,
                totalExamTypes,
                totalSections,
                totalEstablishments,
                totalWilayas,
                tableSize: "N/A", // Would need raw SQL to calculate
                databaseSize: "N/A" // Would need raw SQL to calculate
            },
            data,
            duplicates,
            environment: {
                hasDatabase: true,
                region: process.env.VERCEL_REGION || "local"
            },
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error("❌ Database info error:", error)

        return NextResponse.json({
            status: "ERROR",
            message: "Failed to retrieve database information",
            configured: Boolean(process.env.DATABASE_URL),
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString()
        }, { status: 500 })
    }
}
