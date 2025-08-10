import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering
export const dynamic = "force-dynamic"

export async function GET() {
    try {
        console.log("📥 Files list request received")

        // Check database connection
        if (!process.env.DATABASE_URL) {
            console.error("❌ DATABASE_URL not configured")
            return NextResponse.json(
                { error: "Database not configured" },
                { status: 500 }
            )
        }

        // Get all uploads ordered by upload date (newest first)
        const uploads = await prisma.dataUpload.findMany({
            orderBy: {
                uploadedAt: 'desc'
            }
        })

        console.log(`📁 Found ${uploads.length} files in dataUpload table`)

        if (uploads.length === 0) {
            return NextResponse.json({
                success: true,
                files: [],
                totalFiles: 0,
                message: "Aucun fichier trouvé"
            })
        }

        // Get detailed stats for each upload using more efficient queries
        const files = await Promise.all(uploads.map(async (upload) => {
            try {
                console.log(`📊 Processing stats for ${upload.examType} ${upload.year}`)

                // Build where condition including sessionType
                const whereCondition: any = {
                    year: upload.year,
                    examType: upload.examType as any
                }
                
                if (upload.sessionType) {
                    whereCondition.sessionType = upload.sessionType
                }

                // Single query to get all needed statistics
                const [studentsStats, admittedCount] = await Promise.all([
                    prisma.student.aggregate({
                        where: whereCondition,
                        _count: {
                            _all: true
                        },
                        _avg: {
                            moyenne: true
                        }
                    }),
                    prisma.student.count({
                        where: {
                            ...whereCondition,
                            admis: true
                        }
                    })
                ])

                const actualStudentCount = studentsStats._count._all
                const averageScore = studentsStats._avg.moyenne || 0
                const admissionRate = actualStudentCount > 0
                    ? Number(((admittedCount / actualStudentCount) * 100).toFixed(1))
                    : 0

                // Format file size (estimate based on student count)
                const estimatedSizeKB = actualStudentCount * 0.5 // Rough estimate: 0.5KB per student
                const sizeFormatted = estimatedSizeKB < 1024
                    ? `${estimatedSizeKB.toFixed(0)} KB`
                    : `${(estimatedSizeKB / 1024).toFixed(1)} MB`

                return {
                    id: upload.id,
                    fileName: upload.fileName,
                    year: upload.year,
                    examType: upload.examType,
                    sessionType: upload.sessionType,
                    studentCount: actualStudentCount,
                    admittedCount: admittedCount,
                    admissionRate: admissionRate,
                    averageScore: Number(averageScore.toFixed(2)),
                    uploadedAt: upload.uploadedAt,
                    sizeFormatted: sizeFormatted,
                    status: actualStudentCount > 0 ? 'active' : 'no_data'
                }
            } catch (uploadError: any) {
                console.error(`❌ Error processing upload ${upload.id}:`, uploadError)
                // Return basic info even if stats fail
                return {
                    id: upload.id,
                    fileName: upload.fileName,
                    year: upload.year,
                    examType: upload.examType,
                    sessionType: upload.sessionType,
                    studentCount: 0,
                    admittedCount: 0,
                    admissionRate: 0,
                    averageScore: 0,
                    uploadedAt: upload.uploadedAt,
                    sizeFormatted: "0 KB",
                    status: 'error'
                }
            }
        }))

        console.log(`✅ Successfully processed ${files.length} files`)

        return NextResponse.json({
            success: true,
            files,
            totalFiles: files.length,
            message: `${files.length} fichier(s) trouvé(s)`,
            serverTime: new Date().toISOString()
        })

    } catch (error: any) {
        console.error("❌ Error fetching files:", error)
        console.error("❌ Stack trace:", error.stack)

        return NextResponse.json(
            {
                success: false,
                error: "Erreur lors de la récupération des fichiers",
                details: process.env.NODE_ENV === 'development' ? error.message : "Internal server error",
                serverTime: new Date().toISOString()
            },
            { status: 500 }
        )
    } finally {
        // Ensure Prisma connection is closed properly
        await prisma.$disconnect()
    }
}

// DELETE specific upload and its students
export async function DELETE(request: NextRequest) {
    try {
        console.log("🗑️ Delete file request received")

        const url = new URL(request.url)
        const uploadId = url.searchParams.get("id")
        const year = url.searchParams.get("year")
        const examType = url.searchParams.get("examType")

        if (!uploadId && (!year || !examType)) {
            return NextResponse.json(
                { error: "Provide either uploadId or year+examType" },
                { status: 400 }
            )
        }

        let deletedStudents = 0
        let deletedUpload = false

        if (uploadId) {
            // Delete by upload ID
            const upload = await prisma.dataUpload.findUnique({
                where: { id: uploadId }
            })

            if (!upload) {
                return NextResponse.json(
                    { error: "Upload not found" },
                    { status: 404 }
                )
            }

            // Delete students and upload in transaction
            const result = await prisma.$transaction(async (tx) => {
                const studentsResult = await tx.student.deleteMany({
                    where: {
                        year: upload.year,
                        examType: upload.examType as any,
                        sessionType: upload.sessionType as any
                    }
                })

                await tx.dataUpload.delete({
                    where: { id: uploadId }
                })

                return studentsResult.count
            })

            deletedStudents = result
            deletedUpload = true

            console.log(`✅ Deleted upload ${uploadId} and ${deletedStudents} students`)
        } else {
            // Delete by year and examType
            const result = await prisma.$transaction(async (tx) => {
                const studentsResult = await tx.student.deleteMany({
                    where: {
                        year: Number(year),
                        examType: examType as any
                    }
                })

                const uploadResult = await tx.dataUpload.deleteMany({
                    where: {
                        year: Number(year),
                        examType: examType as any
                    }
                })

                return {
                    students: studentsResult.count,
                    uploads: uploadResult.count
                }
            })

            deletedStudents = result.students
            deletedUpload = result.uploads > 0

            console.log(`✅ Deleted ${result.uploads} upload(s) and ${deletedStudents} students for ${examType} ${year}`)
        }

        return NextResponse.json({
            success: true,
            deletedStudents,
            deletedUpload,
            message: `Successfully deleted ${deletedStudents} student records${deletedUpload ? ' and upload info' : ''}`
        })

    } catch (error: any) {
        console.error("❌ Error deleting file:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Erreur lors de la suppression",
                details: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
            },
            { status: 500 }
        )
    } finally {
        await prisma.$disconnect()
    }
}
