import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    try {
        console.log("📊 Database info request received")

        // Get statistics from database
        const [totalStudents, uploads, distinctYearsExamTypes] = await Promise.all([
            // Total students count
            prisma.student.count(),

            // All uploads info
            prisma.dataUpload.findMany({
                orderBy: [
                    { year: 'desc' },
                    { examType: 'asc' },
                    { uploadedAt: 'desc' }
                ]
            }),

            // Distinct year/examType combinations
            prisma.student.groupBy({
                by: ['year', 'examType'],
                _count: {
                    _all: true
                },
                _avg: {
                    moyenne: true
                },
                orderBy: [
                    { year: 'desc' },
                    { examType: 'asc' }
                ]
            })
        ])

        // Calculate summary statistics
        const summary = {
            totalStudents,
            totalUploads: uploads.length,
            distinctYearTypes: distinctYearsExamTypes.length,
            totalDataSize: uploads.reduce((sum, upload) => sum + upload.studentCount, 0)
        }

        // Group data by year and exam type
        const dataByYearType: { [key: string]: any } = {}

        for (const group of distinctYearsExamTypes) {
            const key = `${group.examType} ${group.year}`
            const upload = uploads.find(u => u.year === group.year && u.examType === group.examType)

            dataByYearType[key] = {
                year: group.year,
                examType: group.examType,
                studentCount: group._count._all,
                averageScore: group._avg.moyenne ? Number(group._avg.moyenne.toFixed(2)) : 0,
                uploadInfo: upload ? {
                    fileName: upload.fileName,
                    uploadedAt: upload.uploadedAt,
                    uploadId: upload.id
                } : null
            }
        }

        // Get recent uploads for timeline
        const recentUploads = uploads.slice(0, 10).map(upload => ({
            id: upload.id,
            fileName: upload.fileName,
            year: upload.year,
            examType: upload.examType,
            studentCount: upload.studentCount,
            uploadedAt: upload.uploadedAt
        }))

        return NextResponse.json({
            status: "SUCCESS",
            summary,
            data: dataByYearType,
            recentUploads,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error("❌ Database info error:", error)

        return NextResponse.json({
            status: "ERROR",
            error: "Failed to retrieve database information",
            details: error instanceof Error ? error.message : "Unknown error",
            configured: Boolean(process.env.DATABASE_URL),
            timestamp: new Date().toISOString()
        }, { status: 500 })
    }
}
