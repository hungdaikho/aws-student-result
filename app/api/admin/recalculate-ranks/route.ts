import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
    try {
        console.log("🔄 Recalculate ranks request received")

        const body = await request.json()
        const { year, examType } = body

        if (!year || !examType) {
            return NextResponse.json(
                { error: "Year and examType are required" },
                { status: 400 }
            )
        }

        console.log(`🔄 Recalculating ranks for ${examType} ${year}`)

        // Get all students for the specified year and exam type, sorted by moyenne (descending)
        const students = await prisma.student.findMany({
            where: {
                year: parseInt(year),
                examType: examType as "BAC" | "BREVET"
            },
            orderBy: [
                { moyenne: 'desc' },
                { matricule: 'asc' } // Secondary sort for consistent ordering when scores are equal
            ],
            select: {
                id: true,
                matricule: true,
                moyenne: true,
                rang: true
            }
        })

        if (students.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No students found for the specified year and exam type",
                updatedCount: 0
            })
        }

        console.log(`📊 Found ${students.length} students to rerank`)

        // Calculate new ranks and prepare update operations
        const updates = students.map((student, index) => {
            const newRank = index + 1
            return {
                id: student.id,
                oldRank: student.rang,
                newRank: newRank,
                matricule: student.matricule,
                moyenne: student.moyenne
            }
        })

        // Filter only students whose rank has changed
        const changedRanks = updates.filter(update => update.oldRank !== update.newRank)

        console.log(`🔄 ${changedRanks.length} students need rank updates`)

        // Update ranks in database using transaction
        let updatedCount = 0
        if (changedRanks.length > 0) {
            await prisma.$transaction(async (tx) => {
                for (const update of changedRanks) {
                    await tx.student.update({
                        where: { id: update.id },
                        data: { rang: update.newRank }
                    })
                    updatedCount++
                }
            })
        }

        // Log some examples of rank changes
        if (changedRanks.length > 0) {
            console.log("📊 Sample rank changes:")
            changedRanks.slice(0, 5).forEach(change => {
                console.log(`  ${change.matricule}: ${change.oldRank} → ${change.newRank} (score: ${change.moyenne})`)
            })
        }

        return NextResponse.json({
            success: true,
            message: `Ranks recalculated successfully. ${updatedCount} students updated.`,
            totalStudents: students.length,
            updatedCount: updatedCount,
            samples: changedRanks.slice(0, 10).map(c => ({
                matricule: c.matricule,
                moyenne: c.moyenne,
                oldRank: c.oldRank,
                newRank: c.newRank
            }))
        })

    } catch (error: any) {
        console.error("❌ Error recalculating ranks:", error)
        return NextResponse.json(
            {
                error: "Erreur lors du recalcul des rangs",
                details: error.message
            },
            { status: 500 }
        )
    }
}
