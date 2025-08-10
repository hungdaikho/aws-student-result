import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const schoolName = searchParams.get("school")
        const year = parseInt(searchParams.get("year") || "2024")
        const examType = searchParams.get("examType") || "BAC"

        if (!schoolName) {
            return NextResponse.json({ error: "School name is required" }, { status: 400 })
        }

        // Get all students for this school
        const students = await prisma.student.findMany({
            where: {
                ecole: schoolName,
                year,
                examType
            },
            select: {
                matricule: true,
                nom_complet: true,
                moyenne: true,
                admis: true,
                section: true,
                rang: true
            }
        })

        // Calculate statistics
        const totalStudents = students.length
        const admittedStudents = students.filter(s => s.admis).length
        const notAdmittedStudents = students.filter(s => !s.admis).length
        const admissionRate = totalStudents > 0 ? ((admittedStudents / totalStudents) * 100).toFixed(1) : "0.0"

        // Get sample data
        const admittedSample = students.filter(s => s.admis).slice(0, 5)
        const notAdmittedSample = students.filter(s => !s.admis).slice(0, 5)

        // Section breakdown
        const sectionBreakdown = students.reduce((acc, student) => {
            const section = student.section || 'Unknown'
            if (!acc[section]) {
                acc[section] = { total: 0, admitted: 0, notAdmitted: 0 }
            }
            acc[section].total++
            if (student.admis) {
                acc[section].admitted++
            } else {
                acc[section].notAdmitted++
            }
            return acc
        }, {} as Record<string, { total: number, admitted: number, notAdmitted: number }>)

        return NextResponse.json({
            schoolName,
            year,
            examType,
            totalStudents,
            admittedStudents,
            notAdmittedStudents,
            admissionRate: Number(admissionRate),
            sectionBreakdown,
            samples: {
                admitted: admittedSample.map(s => ({
                    matricule: s.matricule,
                    nom: s.nom_complet,
                    moyenne: s.moyenne,
                    admis: s.admis,
                    section: s.section
                })),
                notAdmitted: notAdmittedSample.map(s => ({
                    matricule: s.matricule,
                    nom: s.nom_complet,
                    moyenne: s.moyenne,
                    admis: s.admis,
                    section: s.section
                }))
            }
        })

    } catch (error: any) {
        console.error("❌ Error in debug API:", error)
        return NextResponse.json(
            {
                error: "Server error",
                details: error.message
            },
            { status: 500 }
        )
    }
}
