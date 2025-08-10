import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        console.log("🔍 Debug database request received")

        // Check database connection
        if (!process.env.DATABASE_URL) {
            return NextResponse.json({
                error: "DATABASE_URL not configured",
                env: process.env.NODE_ENV
            })
        }

        // Test basic connection
        await prisma.$connect()
        console.log("✅ Database connection successful")

        // Get basic counts
        const [uploadsCount, studentsCount] = await Promise.all([
            prisma.dataUpload.count(),
            prisma.student.count()
        ])

        // Get latest uploads
        const latestUploads = await prisma.dataUpload.findMany({
            take: 5,
            orderBy: { uploadedAt: 'desc' },
            select: {
                id: true,
                fileName: true,
                year: true,
                examType: true,
                studentCount: true,
                uploadedAt: true
            }
        })

        // Get students by year/examType
        const studentsByExam = await prisma.student.groupBy({
            by: ['year', 'examType'],
            _count: {
                _all: true
            },
            orderBy: [
                { year: 'desc' },
                { examType: 'asc' }
            ]
        })

        return NextResponse.json({
            success: true,
            database: {
                connected: true,
                uploadsCount,
                studentsCount
            },
            latestUploads,
            studentsByExam,
            environment: process.env.NODE_ENV,
            serverTime: new Date().toISOString()
        })

    } catch (error: any) {
        console.error("❌ Database debug error:", error)

        return NextResponse.json({
            success: false,
            error: error.message,
            database: {
                connected: false
            },
            environment: process.env.NODE_ENV,
            serverTime: new Date().toISOString()
        }, { status: 500 })
    } finally {
        await prisma.$disconnect()
    }
}
