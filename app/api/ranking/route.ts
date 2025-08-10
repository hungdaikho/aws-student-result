import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const matricule = searchParams.get("matricule")
        const year = Number.parseInt(searchParams.get("year") || "2025")
        const examType = searchParams.get("examType") || "BAC"
        const sessionType = searchParams.get("sessionType")

        if (!matricule) {
            return NextResponse.json({ error: "Matricule is required" }, { status: 400 })
        }

        console.log(`🏆 Calculating rankings for matricule: ${matricule} in ${examType} ${year}${sessionType ? ` (${sessionType})` : ""}`)

        // Find the target student using the provided session type
        let targetStudent = null;
        
        if (examType === "BAC") {
            // For BAC exams, session type is required
            if (!sessionType) {
                return NextResponse.json({ 
                    error: "Session type is required for BAC exams. Please specify either 'NORMALE' or 'COMPLEMENTAIRE'",
                    code: "SESSION_REQUIRED"
                }, { status: 400 })
            }

            targetStudent = await prisma.student.findUnique({
                where: {
                    matricule_year_examType_sessionType: {
                        matricule,
                        year,
                        examType,
                        sessionType: sessionType as any
                    }
                }
            });
        } else if (examType === "CONCOURS") {
            // For CONCOURS exams, use location-based search
            const schoolName = searchParams.get("schoolName");
            const studentName = searchParams.get("studentName");
            const wilaya = searchParams.get("wilaya");
            const moughataa = searchParams.get("moughataa");

            // Build where clause based on available location data
            const whereClause: any = {
                year,
                examType,
                sessionType: null
            };

            if (studentName) whereClause.nom_complet = studentName;
            if (schoolName) whereClause.etablissement = schoolName;
            if (wilaya) whereClause.wilaya = wilaya;
            if (moughataa) whereClause.moughataa = moughataa;

            targetStudent = await prisma.student.findFirst({
                where: whereClause
            });
        } else {
            // For BREVET exams, use findFirst with null sessionType
            targetStudent = await prisma.student.findFirst({
                where: {
                    matricule,
                    year,
                    examType,
                    sessionType: null
                }
            });
        }

        if (!targetStudent) {
            return NextResponse.json({ error: "Étudiant non trouvé" }, { status: 404 })
        }

        const rankings = await calculateRankings(targetStudent, year, examType)

        return NextResponse.json(rankings)
    } catch (error) {
        console.error("💥 Ranking calculation error:", error)
        return NextResponse.json({
            error: "Internal server error",
            timestamp: new Date().toISOString()
        }, { status: 500 })
    }
}

async function calculateRankings(targetStudent: any, year: number, examType: string) {
    const results: any = {
        matricule: targetStudent.matricule,
        moyenne: targetStudent.moyenne,
        section: targetStudent.section,
        etablissement: targetStudent.etablissement,
    }

    // For BAC and BREVET, use rounded scores for ranking
    const roundedTargetScore = examType === "BAC" || examType === "BREVET" 
        ? Math.round(targetStudent.moyenne * 100) / 100 
        : targetStudent.moyenne;

    // Common base conditions for all exam types
    const baseConditions = {
        year,
        examType
    }

    // Add session type filter for BAC exams
    if (examType === "BAC" && targetStudent.sessionType) {
        (baseConditions as any).sessionType = targetStudent.sessionType
    }

    // 1. Establishment ranking - for BAC: same section only, for others: all students
    if (examType === "BAC") {
        // For BAC: Compare with students in the same establishment AND same section
        // Get all students in the same establishment and section
        const allStudentsInSchool = await prisma.student.findMany({
            where: {
                ...baseConditions,
                etablissement: targetStudent.etablissement,
                section: targetStudent.section
            }
        });

        // Sort students by score (descending) and assign ranks
        const sortedSchoolStudents = allStudentsInSchool.sort((a, b) => {
            const roundedScoreA = Math.round(a.moyenne * 100) / 100;
            const roundedScoreB = Math.round(b.moyenne * 100) / 100;
            return roundedScoreB - roundedScoreA; // Descending order
        });

        // Find the rank of the target student
        let currentSchoolRank = 1;
        let previousSchoolScore = null;
        let studentsWithSameSchoolRank = 0;

        for (const student of sortedSchoolStudents) {
            const roundedScore = Math.round(student.moyenne * 100) / 100;
            
            if (previousSchoolScore !== null && roundedScore !== previousSchoolScore) {
                currentSchoolRank += studentsWithSameSchoolRank;
                studentsWithSameSchoolRank = 0;
            }
            
            if (student.matricule === targetStudent.matricule) {
                results.schoolRank = currentSchoolRank;
                break;
            }
            
            if (roundedScore === previousSchoolScore) {
                studentsWithSameSchoolRank++;
            } else {
                studentsWithSameSchoolRank = 1;
            }
            
            previousSchoolScore = roundedScore;
        }

        // Get total students in same establishment and section
        const totalInSchool = await prisma.student.count({
            where: {
                year,
                examType,
                etablissement: targetStudent.etablissement,
                section: targetStudent.section,
                ...(targetStudent.sessionType && { sessionType: targetStudent.sessionType })
            }
        })
        results.totalInSchool = totalInSchool

    } else {
        // For BREVET and CONCOURS: Compare with students in the same establishment
        const allStudentsInSchool = await prisma.student.findMany({
            where: {
                ...baseConditions,
                etablissement: targetStudent.etablissement
            }
        });

        // Sort students by score (descending) and assign ranks
        const sortedBrevetSchoolStudents = allStudentsInSchool.sort((a, b) => {
            if (examType === "BREVET") {
                const roundedScoreA = Math.round(a.moyenne * 100) / 100;
                const roundedScoreB = Math.round(b.moyenne * 100) / 100;
                return roundedScoreB - roundedScoreA; // Descending order
            } else {
                return b.moyenne - a.moyenne; // Descending order for CONCOURS
            }
        });

        // Find the rank of the target student
        let currentBrevetSchoolRank = 1;
        let previousBrevetSchoolScore = null;
        let studentsWithSameBrevetSchoolRank = 0;

        for (const student of sortedBrevetSchoolStudents) {
            let currentScore;
            if (examType === "BREVET") {
                currentScore = Math.round(student.moyenne * 100) / 100;
            } else {
                currentScore = student.moyenne;
            }
            
            if (previousBrevetSchoolScore !== null && currentScore !== previousBrevetSchoolScore) {
                currentBrevetSchoolRank += studentsWithSameBrevetSchoolRank;
                studentsWithSameBrevetSchoolRank = 0;
            }
            
            if (student.matricule === targetStudent.matricule) {
                results.schoolRank = currentBrevetSchoolRank;
                break;
            }
            
            if (currentScore === previousBrevetSchoolScore) {
                studentsWithSameBrevetSchoolRank++;
            } else {
                studentsWithSameBrevetSchoolRank = 1;
            }
            
            previousBrevetSchoolScore = currentScore;
        }

        // Get total students in same establishment
        const totalInSchool = await prisma.student.count({
            where: {
                year,
                examType,
                etablissement: targetStudent.etablissement
            }
        })
        results.totalInSchool = totalInSchool
    }

    // 3. Wilaya ranking - for all exam types
    if (targetStudent.wilaya) {
        if (examType === "BAC") {
            // For BAC: Compare with students in the same wilaya AND same section
            const allStudentsInWilaya = await prisma.student.findMany({
                where: {
                    ...baseConditions,
                    wilaya: targetStudent.wilaya,
                    section: targetStudent.section
                }
            });

            // Sort students by score (descending) and assign ranks
            const sortedWilayaStudents = allStudentsInWilaya.sort((a, b) => {
                const roundedScoreA = Math.round(a.moyenne * 100) / 100;
                const roundedScoreB = Math.round(b.moyenne * 100) / 100;
                return roundedScoreB - roundedScoreA; // Descending order
            });

            // Find the rank of the target student
            let currentWilayaRank = 1;
            let previousWilayaScore = null;
            let studentsWithSameWilayaRank = 0;

            for (const student of sortedWilayaStudents) {
                const roundedScore = Math.round(student.moyenne * 100) / 100;
                
                if (previousWilayaScore !== null && roundedScore !== previousWilayaScore) {
                    currentWilayaRank += studentsWithSameWilayaRank;
                    studentsWithSameWilayaRank = 0;
                }
                
                if (student.matricule === targetStudent.matricule) {
                    results.wilayaRank = currentWilayaRank;
                    break;
                }
                
                if (roundedScore === previousWilayaScore) {
                    studentsWithSameWilayaRank++;
                } else {
                    studentsWithSameWilayaRank = 1;
                }
                
                previousWilayaScore = roundedScore;
            }

            // Get total students in same wilaya and section
            const totalInWilaya = await prisma.student.count({
                where: {
                    year,
                    examType,
                    wilaya: targetStudent.wilaya,
                    section: targetStudent.section,
                    ...(targetStudent.sessionType && { sessionType: targetStudent.sessionType })
                }
            })
            results.totalInWilaya = totalInWilaya
        } else {
            // For BREVET and CONCOURS: Compare with all students in the same wilaya
            const allStudentsInWilaya = await prisma.student.findMany({
                where: {
                    ...baseConditions,
                    wilaya: targetStudent.wilaya
                }
            });

            // Sort students by score (descending) and assign ranks
            const sortedBrevetWilayaStudents = allStudentsInWilaya.sort((a, b) => {
                if (examType === "BREVET") {
                    const roundedScoreA = Math.round(a.moyenne * 100) / 100;
                    const roundedScoreB = Math.round(b.moyenne * 100) / 100;
                    return roundedScoreB - roundedScoreA; // Descending order
                } else {
                    return b.moyenne - a.moyenne; // Descending order for CONCOURS
                }
            });

            // Find the rank of the target student
            let currentBrevetWilayaRank = 1;
            let previousBrevetWilayaScore = null;
            let studentsWithSameBrevetWilayaRank = 0;

            for (const student of sortedBrevetWilayaStudents) {
                let currentScore;
                if (examType === "BREVET") {
                    currentScore = Math.round(student.moyenne * 100) / 100;
                } else {
                    currentScore = student.moyenne;
                }
                
                if (previousBrevetWilayaScore !== null && currentScore !== previousBrevetWilayaScore) {
                    currentBrevetWilayaRank += studentsWithSameBrevetWilayaRank;
                    studentsWithSameBrevetWilayaRank = 0;
                }
                
                if (student.matricule === targetStudent.matricule) {
                    results.wilayaRank = currentBrevetWilayaRank;
                    break;
                }
                
                if (currentScore === previousBrevetWilayaScore) {
                    studentsWithSameBrevetWilayaRank++;
                } else {
                    studentsWithSameBrevetWilayaRank = 1;
                }
                
                previousBrevetWilayaScore = currentScore;
            }

            // Get total students in same wilaya
            const totalInWilaya = await prisma.student.count({
                where: {
                    year,
                    examType,
                    wilaya: targetStudent.wilaya
                }
            })
            results.totalInWilaya = totalInWilaya
        }
    }

    // 4. National ranking - for all exam types
    if (examType === "BAC") {
        // For BAC: Compare with students in the same section nationwide
        const allStudentsInSection = await prisma.student.findMany({
            where: {
                ...baseConditions,
                section: targetStudent.section
            }
        });

        // Sort students by score (descending) and assign ranks
        const sortedNationalStudents = allStudentsInSection.sort((a, b) => {
            const roundedScoreA = Math.round(a.moyenne * 100) / 100;
            const roundedScoreB = Math.round(b.moyenne * 100) / 100;
            return roundedScoreB - roundedScoreA; // Descending order
        });

        // Find the rank of the target student
        let currentNationalRank = 1;
        let previousNationalScore = null;
        let studentsWithSameNationalRank = 0;

        for (const student of sortedNationalStudents) {
            const roundedScore = Math.round(student.moyenne * 100) / 100;
            
            if (previousNationalScore !== null && roundedScore !== previousNationalScore) {
                currentNationalRank += studentsWithSameNationalRank;
                studentsWithSameNationalRank = 0;
            }
            
            if (student.matricule === targetStudent.matricule) {
                results.generalRank = currentNationalRank;
                break;
            }
            
            if (roundedScore === previousNationalScore) {
                studentsWithSameNationalRank++;
            } else {
                studentsWithSameNationalRank = 1;
            }
            
            previousNationalScore = roundedScore;
        }

        // Get total students in same section nationwide
        const totalStudents = await prisma.student.count({
            where: {
                year,
                examType,
                section: targetStudent.section,
                ...(targetStudent.sessionType && { sessionType: targetStudent.sessionType })
            }
        })
        results.totalStudents = totalStudents
    } else {
        // For BREVET and CONCOURS: Compare with all students nationwide
        const allStudents = await prisma.student.findMany({
            where: baseConditions
        });

        // Sort students by score (descending) and assign ranks
        const sortedBrevetNationalStudents = allStudents.sort((a, b) => {
            if (examType === "BREVET") {
                const roundedScoreA = Math.round(a.moyenne * 100) / 100;
                const roundedScoreB = Math.round(b.moyenne * 100) / 100;
                return roundedScoreB - roundedScoreA; // Descending order
            } else {
                return b.moyenne - a.moyenne; // Descending order for CONCOURS
            }
        });

        // Find the rank of the target student
        let currentBrevetNationalRank = 1;
        let previousBrevetNationalScore = null;
        let studentsWithSameBrevetNationalRank = 0;

        for (const student of sortedBrevetNationalStudents) {
            let currentScore;
            if (examType === "BREVET") {
                currentScore = Math.round(student.moyenne * 100) / 100;
            } else {
                currentScore = student.moyenne;
            }
            
            if (previousBrevetNationalScore !== null && currentScore !== previousBrevetNationalScore) {
                currentBrevetNationalRank += studentsWithSameBrevetNationalRank;
                studentsWithSameBrevetNationalRank = 0;
            }
            
            if (student.matricule === targetStudent.matricule) {
                results.generalRank = currentBrevetNationalRank;
                break;
            }
            
            if (currentScore === previousBrevetNationalScore) {
                studentsWithSameBrevetNationalRank++;
            } else {
                studentsWithSameBrevetNationalRank = 1;
            }
            
            previousBrevetNationalScore = currentScore;
        }

        // Get total students nationwide
        const totalStudents = await prisma.student.count({
            where: {
                year,
                examType
            }
        })
        results.totalStudents = totalStudents
    }

    return results
}
