import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
    try {
        const { year, examType, dryRun = true } = await request.json()

        if (!year || !examType) {
            return NextResponse.json({
                error: "Year and examType are required"
            }, { status: 400 })
        }

        console.log(`🔧 ${dryRun ? 'Analyzing' : 'Fixing'} admis logic for ${examType} ${year}`)

        // Helper function to determine if student should be admitted based on decision text
        function shouldBeAdmitted(decisionText: string): boolean {
            if (!decisionText || typeof decisionText !== 'string') {
                return false
            }

            const decision = decisionText.toLowerCase().trim()

            // Logic rules for determining admission status from Decision column:

            // 1. Explicitly admitted (various forms)
            if (decision.includes("admis") ||           // "Admis", "Admise"
                decision.includes("reussi") ||          // "Réussi", "Réussie" 
                decision.includes("reussie") ||         // Alternative spelling
                decision.includes("success") ||         // English equivalent
                decision === "r" ||                     // Short form for "Réussi"
                decision === "a" ||                     // Short form for "Admis"
                decision.includes("pass") ||            // "Passé", "Passed"
                decision.includes("valide")) {          // "Validé"
                return true
            }

            // 2. Session candidates (considered as not admitted for main admission)
            if (decision.includes("sessionnaire") ||
                decision.includes("sessionn") ||        // Shortened form
                decision.includes("session") ||
                decision.includes("rattrapage")) {      // Makeup/retake session
                return false
            }

            // 3. Explicitly failed
            if (decision.includes("echec") ||           // "Échec"
                decision.includes("echoue") ||          // "Échoué"
                decision.includes("refuse") ||          // "Refusé"
                decision.includes("elimine") ||         // "Éliminé"
                decision.includes("ajourne") ||         // "Ajourné"
                decision.includes("fail") ||            // English equivalent
                decision.includes("reject")) {          // English equivalent
                return false
            }

            // 4. Default: if decision text doesn't match any pattern, consider as not admitted
            return false
        }        // Get all students for the specified year and exam type
        const students = await prisma.student.findMany({
            where: {
                year: Number(year),
                examType
            },
            select: {
                id: true,
                matricule: true,
                nom_complet: true,
                decision_text: true,
                admis: true
            }
        })

        // Find students where admis doesn't match decision_text
        const toUpdate = students.filter(student => {
            const shouldBe = shouldBeAdmitted(student.decision_text)
            return student.admis !== shouldBe
        })

        const report = {
            totalStudents: students.length,
            incorrectRecords: toUpdate.length,
            correctRecords: students.length - toUpdate.length,
            wouldBeUpdated: toUpdate.map(s => ({
                matricule: s.matricule,
                nom_complet: s.nom_complet,
                decision_text: s.decision_text,
                current_admis: s.admis,
                should_be_admis: shouldBeAdmitted(s.decision_text)
            }))
        }

        if (dryRun) {
            // Just return the analysis without making changes
            return NextResponse.json({
                message: "Dry run completed - no changes made",
                year,
                examType,
                report
            })
        } else {
            // Actually update the records
            if (toUpdate.length === 0) {
                return NextResponse.json({
                    message: "No records need to be updated",
                    year,
                    examType,
                    report
                })
            }

            // Update records in batches
            let updatedCount = 0
            for (const student of toUpdate) {
                const newAdmisValue = shouldBeAdmitted(student.decision_text)
                await prisma.student.update({
                    where: { id: student.id },
                    data: { admis: newAdmisValue }
                })
                updatedCount++
            }

            console.log(`✅ Updated ${updatedCount} student records`)

            return NextResponse.json({
                message: `Successfully updated ${updatedCount} student records`,
                year,
                examType,
                report: {
                    ...report,
                    actuallyUpdated: updatedCount
                }
            })
        }

    } catch (error) {
        console.error("💥 Fix admis error:", error)
        return NextResponse.json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 })
    }
}
