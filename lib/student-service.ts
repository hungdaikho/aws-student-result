import { prisma } from './prisma'
import { Student, DataUpload, StatisticsData, LeaderboardStudent } from '../types/student'
import { Student as PrismaStudent } from '@prisma/client'
import { cache, CACHE_KEYS, withCache } from './cache'

// Helper để convert từ Prisma type sang interface type
function convertPrismaStudent(prismaStudent: PrismaStudent): Student {
    return {
        ...prismaStudent,
        examType: prismaStudent.examType as "BAC" | "BREVET" | "CONCOURS" | "EXCELLENCE" | "OTHER",
        sessionType: prismaStudent.sessionType as "NORMALE" | "COMPLEMENTAIRE" | undefined,
        wilaya: prismaStudent.wilaya || undefined,
        moughataa: prismaStudent.moughataa || undefined,
        rang_etablissement: prismaStudent.rang_etablissement || undefined,
        lieu_nais: prismaStudent.lieu_nais || undefined,
        date_naiss: prismaStudent.date_naiss || undefined,
    }
}

// Optimized query options for better performance
const QUERY_OPTIONS = {
    // Use select to only fetch needed fields
    studentSelect: {
        id: true,
        matricule: true,
        nom_complet: true,
        ecole: true,
        etablissement: true,
        moyenne: true,
        rang: true,
        admis: true,
        decision_text: true,
        section: true,
        wilaya: true,
        moughataa: true,
        rang_etablissement: true,
        year: true,
        examType: true,
        sessionType: true,
        lieu_nais: true,
        date_naiss: true,
        createdAt: true,
        updatedAt: true,
    },
    // Optimized leaderboard select
    leaderboardSelect: {
        id: true,
        matricule: true,
        nom_complet: true,
        ecole: true,
        etablissement: true,
        moyenne: true,
        rang: true,
        wilaya: true,
        moughataa: true,
        section: true,
        admis: true,
        decision_text: true,
    }
};

export class StudentService {
    // Tìm học sinh theo matricule with caching
    static findStudentByMatricule = withCache(
        async (matricule: string, year: number, examType: string, sessionType?: string, isDirectClick?: boolean): Promise<Student | null> => {
            try {
                // For CONCOURS exams, search by matricule is not supported for manual search
                if (examType === "CONCOURS" && !isDirectClick) {
                    throw new Error("Search by matricule is not supported for CONCOURS exams");
                }

                // For BAC exams, sessionType is required
                if (examType === "BAC" && !sessionType) {
                    throw new Error("Session type is required for BAC exams");
                }

                // Build where clause based on exam type
                let student;
                
                if (examType === "BAC") {
                    // For BAC exams, use findUnique with sessionType
                    student = await prisma.student.findUnique({
                        where: {
                            matricule_year_examType_sessionType: {
                                matricule,
                                year,
                                examType,
                                sessionType: sessionType as any
                            }
                        },
                        select: QUERY_OPTIONS.studentSelect
                    });
                } else {
                    // For non-BAC exams, sessionType should be null
                    student = await prisma.student.findFirst({
                        where: {
                            matricule,
                            year,
                            examType,
                            sessionType: null
                        },
                        select: QUERY_OPTIONS.studentSelect
                    });
                }

                if (!student) return null
                return convertPrismaStudent(student)
            } catch (error) {
                console.error('Error in findStudentByMatricule:', error);
                throw error;
            }
        },
        (matricule: string, year: number, examType: string, sessionType?: string) => 
            CACHE_KEYS.STUDENT(matricule, year, examType, sessionType),
        10 * 60 * 1000 // 10 minutes cache for student data
    );

    // Find student by matricule and school (for CONCOURS exams with duplicate matricules)
    static findStudentByMatriculeAndSchool = async (matricule: string, year: number, examType: string, schoolName: string): Promise<Student | null> => {
        try {
            console.log(`🔍 Finding student with matricule ${matricule} in school ${schoolName} for ${examType} ${year}`);
            
            // First, let's check what schools exist for this matricule
            const allStudentsWithMatricule = await prisma.student.findMany({
                where: {
                    matricule,
                    year,
                    examType,
                    sessionType: null
                },
                select: {
                    etablissement: true
                },
                distinct: ['etablissement']
            });
            
            console.log(`🔍 Available schools for matricule ${matricule}:`, allStudentsWithMatricule.map(s => s.etablissement));
            
            const student = await prisma.student.findFirst({
                where: {
                    matricule,
                    year,
                    examType,
                    etablissement: schoolName,
                    sessionType: null // CONCOURS exams have null sessionType
                },
                select: QUERY_OPTIONS.studentSelect
            });

            if (student) {
                console.log(`✅ Found student: ${student.nom_complet} in school ${schoolName}`);
                return convertPrismaStudent(student);
            } else {
                console.log(`❌ No student found with matricule ${matricule} in school ${schoolName}`);
                return null;
            }
        } catch (error) {
            console.error('Error in findStudentByMatriculeAndSchool:', error);
            throw error;
        }
    };

    // Find student by name and school (for CONCOURS exams - more reliable than matricule)
    static findStudentByNameAndSchool = async (studentName: string, year: number, examType: string, schoolName: string, wilaya?: string): Promise<Student | null> => {
        try {
            console.log(`🔍 Finding student with name ${studentName} in school ${schoolName} for ${examType} ${year}`);
            
            const whereClause: any = {
                nom_complet: studentName,
                year,
                examType,
                etablissement: schoolName,
                sessionType: null // CONCOURS exams have null sessionType
            };
            
            // Add wilaya filter if provided
            if (wilaya) {
                whereClause.wilaya = wilaya;
            }
            
            const student = await prisma.student.findFirst({
                where: whereClause,
                select: QUERY_OPTIONS.studentSelect
            });

            if (student) {
                console.log(`✅ Found student: ${student.nom_complet} in school ${schoolName}`);
                return convertPrismaStudent(student);
            } else {
                console.log(`❌ No student found with name ${studentName} in school ${schoolName}`);
                return null;
            }
        } catch (error) {
            console.error('Error in findStudentByNameAndSchool:', error);
            throw error;
        }
    };

    // Find student by wilaya + moughataa + etablissement (for CONCOURS exams - unique combination)
    static findStudentByLocation = async (wilaya: string, moughataa: string, etablissement: string, year: number, examType: string): Promise<Student | null> => {
        try {
            console.log(`🔍 Finding student in wilaya=${wilaya}, moughataa=${moughataa}, etablissement=${etablissement} for ${examType} ${year}`);
            
            const student = await prisma.student.findFirst({
                where: {
                    wilaya,
                    moughataa,
                    etablissement,
                    year,
                    examType,
                    sessionType: null // CONCOURS exams have null sessionType
                },
                select: QUERY_OPTIONS.studentSelect
            });

            if (student) {
                console.log(`✅ Found student: ${student.nom_complet} in ${wilaya}/${moughataa}/${etablissement}`);
                return convertPrismaStudent(student);
            } else {
                console.log(`❌ No student found in ${wilaya}/${moughataa}/${etablissement}`);
                return null;
            }
        } catch (error) {
            console.error('Error in findStudentByLocation:', error);
            throw error;
        }
    };

    // Find student by name + wilaya + moughataa + etablissement (for CONCOURS exams - most unique combination)
    static findStudentByNameAndLocation = async (studentName: string, wilaya: string, moughataa: string, etablissement: string, year: number, examType: string): Promise<Student | null> => {
        try {
            console.log(`🔍 Finding student with name ${studentName} in ${wilaya}/${moughataa}/${etablissement} for ${examType} ${year}`);
            
            // Try exact match first
            let student = await prisma.student.findFirst({
                where: {
                    nom_complet: studentName,
                    wilaya,
                    moughataa,
                    etablissement,
                    year,
                    examType,
                    sessionType: null // CONCOURS exams have null sessionType
                },
                select: QUERY_OPTIONS.studentSelect
            });

            if (student) {
                console.log(`✅ Found student: ${student.nom_complet} in ${wilaya}/${moughataa}/${etablissement}`);
                return convertPrismaStudent(student);
            }

            // If exact match fails, try without etablissement
            console.log(`❌ Exact match failed, trying without etablissement...`);
            student = await prisma.student.findFirst({
                where: {
                    nom_complet: studentName,
                    wilaya,
                    moughataa,
                    year,
                    examType,
                    sessionType: null
                },
                select: QUERY_OPTIONS.studentSelect
            });

            if (student) {
                console.log(`✅ Found student: ${student.nom_complet} in ${wilaya}/${moughataa} (without etablissement filter)`);
                return convertPrismaStudent(student);
            }

            // If still no match, try just name and wilaya
            console.log(`❌ Still no match, trying with just name and wilaya...`);
            student = await prisma.student.findFirst({
                where: {
                    nom_complet: studentName,
                    wilaya,
                    year,
                    examType,
                    sessionType: null
                },
                select: QUERY_OPTIONS.studentSelect
            });

            if (student) {
                console.log(`✅ Found student: ${student.nom_complet} in ${wilaya} (fallback search)`);
                return convertPrismaStudent(student);
            }

            console.log(`❌ No student found with name ${studentName} in any location combination`);
            return null;
        } catch (error) {
            console.error('Error in findStudentByNameAndLocation:', error);
            throw error;
        }
    };

    // Lấy tất cả học sinh theo năm và loại thi with optimized query
    static async getStudents(year?: number, examType?: string): Promise<Student[]> {
        try {
            const where: any = {}

            if (year) where.year = year
            if (examType) where.examType = examType

            const students = await prisma.student.findMany({
                where,
                select: QUERY_OPTIONS.studentSelect,
                orderBy: {
                    rang: 'asc'
                }
            })

            return students.map(convertPrismaStudent)
        } catch (error) {
            console.error('Error in getStudents:', error);
            throw error;
        }
    }

    // Xóa dữ liệu theo năm và loại thi with transaction
    static async clearData(year: number, examType: string, sessionType?: string): Promise<number> {
        try {
            const result = await prisma.$transaction(async (tx) => {
                const whereClause: any = { year, examType };
                if (sessionType) {
                    whereClause.sessionType = sessionType;
                }

                const deleteResult = await tx.student.deleteMany({
                    where: whereClause
                })

                await tx.dataUpload.deleteMany({
                    where: whereClause
                })

                return deleteResult.count
            })

            // Clear related caches
            cache.delete(CACHE_KEYS.STATISTICS(year, examType, sessionType));
            cache.delete(CACHE_KEYS.LEADERBOARD(year, examType, sessionType));
            cache.delete(CACHE_KEYS.WILAYAS(year, examType, sessionType));
            cache.delete(CACHE_KEYS.DATABASE_INFO);

            return result
        } catch (error) {
            console.error('Error in clearData:', error);
            throw error;
        }
    }

    // Lấy thống kê with caching and optimized queries
    static getStatistics = withCache(
        async (year: number, examType: string, sessionType?: string): Promise<StatisticsData> => {
            try {
                const whereClause: any = { year, examType };
                if (examType === "BAC") {
                    // For BAC exams, session type is required
                    if (!sessionType) {
                        throw new Error("Session type is required for BAC exams");
                    }
                    whereClause.sessionType = sessionType;
                } else {
                    // For non-BAC exams, sessionType should be null
                    whereClause.sessionType = null;
                }

                // Use Promise.all for parallel queries
                const [totalStudents, admittedStudents, averageScore, allStudents] = await Promise.all([
                    prisma.student.count({ where: whereClause }),
                    prisma.student.count({ where: { ...whereClause, admis: true } }),
                    prisma.student.aggregate({
                        where: whereClause,
                        _avg: { moyenne: true }
                    }),
                    prisma.student.findMany({
                        where: whereClause,
                        select: {
                            admis: true,
                            moyenne: true,
                            section: true,
                            wilaya: true
                        }
                    })
                ]);

                const admissionRate = totalStudents > 0 ? (admittedStudents / totalStudents) * 100 : 0;
                
                // Calculate sessionnaireRate (students with moyenne >= 8 but not admitted)
                const sessionnaireStudents = allStudents.filter(s => !s.admis && s.moyenne >= 8).length;
                const sessionnaireRate = totalStudents > 0 ? ((sessionnaireStudents / totalStudents) * 100).toFixed(1) : "0.0";

                // Section statistics
                const sectionStats = allStudents.reduce((acc, student) => {
                    const section = student.section || 'Non spécifié';
                    if (!acc[section]) {
                        acc[section] = { total: 0, admitted: 0 };
                    }
                    acc[section].total++;
                    if (student.admis) acc[section].admitted++;
                    return acc;
                }, {} as Record<string, { total: number, admitted: number }>);

                const sectionStatsArray = Object.entries(sectionStats)
                    .map(([name, stats]) => ({
                        name,
                        total: stats.total,
                        admitted: stats.admitted,
                        rate: stats.total > 0 ? ((stats.admitted / stats.total) * 100).toFixed(1) : "0.0"
                    }))
                    .sort((a, b) => b.total - a.total);

                // Wilaya statistics
                const wilayaStats = allStudents.reduce((acc, student) => {
                    const wilaya = student.wilaya || 'Non spécifié';
                    if (!acc[wilaya]) {
                        acc[wilaya] = { total: 0, admitted: 0 };
                    }
                    acc[wilaya].total++;
                    if (student.admis) acc[wilaya].admitted++;
                    return acc;
                }, {} as Record<string, { total: number, admitted: number }>);

                const wilayaStatsArray = Object.entries(wilayaStats)
                    .map(([name, stats]) => ({
                        name,
                        total: stats.total,
                        admitted: stats.admitted,
                        rate: stats.total > 0 ? ((stats.admitted / stats.total) * 100).toFixed(1) : "0.0"
                    }))
                    .sort((a, b) => b.total - a.total);

                return {
                    totalStudents,
                    admittedStudents,
                    admissionRate: (Math.round(admissionRate * 100) / 100).toString(),
                    sessionnaireRate,
                    averageScore: (averageScore._avg.moyenne ? Math.round(averageScore._avg.moyenne * 100) / 100 : 0).toString(),
                    sectionStats: sectionStatsArray,
                    wilayaStats: wilayaStatsArray,
                    year,
                    examType: examType as "BAC" | "BREVET" | "CONCOURS" | "OTHER"
                };
            } catch (error) {
                console.error('Error in getStatistics:', error);
                throw error;
            }
        },
        (year: number, examType: string, sessionType?: string) => 
            CACHE_KEYS.STATISTICS(year, examType, sessionType),
        5 * 60 * 1000 // 5 minutes cache for statistics
    );

    // Lấy leaderboard  
    // For BAC: returns object grouped by sections with top 10 each
    // For BREVET: returns array of top 10 students (Top 10 Mauritanie)
    static async getLeaderboard(year: number, examType: string, limit: number = 100, sessionType?: string) {
        const whereClause: any = { year, examType };
        if (examType === "BAC") {
            // For BAC exams, session type is required
            if (sessionType) {
                whereClause.sessionType = sessionType;
            } else {
                // If no session type provided for BAC, this should not happen
                // but for robustness, we'll filter by null sessionType
                whereClause.sessionType = null;
            }
        } else {
            // For non-BAC exams, sessionType should be null
            whereClause.sessionType = null;
        }

        if (examType === "BAC") {
            // For BAC: return object grouped by sections with top 10 ADMITTED students each
            const students = await prisma.student.findMany({
                where: {
                    ...whereClause,
                    admis: true  // ⭐ CHỈ LẤY HỌC SINH ĐÃ ĐƯỢC ADMIS
                },
                orderBy: {
                    moyenne: 'desc'  // ⭐ SẮP XẾP THEO ĐIỂM GIẢM DẦN
                },
                select: QUERY_OPTIONS.leaderboardSelect
            })

            // Group by section and calculate stats
            const grouped: { [key: string]: any } = {}
            const sectionStats: { [key: string]: { total: number, admitted: number, totalScore: number } } = {}

            // First pass: collect all students by section
            for (const student of students) {
                const section = student.section || 'Other'

                // Initialize section array
                if (!grouped[section]) {
                    grouped[section] = []
                }

                // Add student to section (already sorted by moyenne desc)
                grouped[section].push({
                    matricule: student.matricule,
                    nom_complet: student.nom_complet,
                    ecole: student.ecole,
                    etablissement: student.etablissement,
                    moyenne: student.moyenne,
                    rang: student.rang,
                    wilaya: student.wilaya,
                    moughataa: student.moughataa,
                    section: student.section,
                    admis: student.admis,
                    decision_text: student.decision_text
                })
            }

            // Second pass: limit to top 10 per section and calculate stats
            for (const [section, sectionStudents] of Object.entries(grouped)) {
                // Limit to top 10 students (highest scores first)
                grouped[section] = sectionStudents.slice(0, 10)

                // Calculate section stats based on ALL students in that section
                const whereCondition: any = { ...whereClause };

                if (section === 'Other') {
                    whereCondition.section = null
                } else {
                    whereCondition.section = section
                }

                const allSectionStudents = await prisma.student.findMany({
                    where: whereCondition,
                    select: QUERY_OPTIONS.leaderboardSelect
                })

                const totalInSection = allSectionStudents.length
                const admittedInSection = allSectionStudents.filter(s => s.admis).length
                const totalScoreInSection = allSectionStudents.reduce((sum, s) => sum + s.moyenne, 0)

                sectionStats[section] = {
                    total: totalInSection,
                    admitted: admittedInSection,
                    totalScore: totalScoreInSection
                }
            }

            // Add section statistics to each section
            const result: { [key: string]: any } = {}
            for (const [section, students] of Object.entries(grouped)) {
                const stats = sectionStats[section]
                result[section] = {
                    students: students,
                    stats: {
                        total: stats.total,
                        admitted: stats.admitted,
                        admissionRate: stats.total > 0 ? Number(((stats.admitted / stats.total) * 100).toFixed(1)) : 0,
                        averageScore: stats.total > 0 ? Number((stats.totalScore / stats.total).toFixed(2)) : 0
                    }
                }
            }

            return result
        } else {
            // For BREVET, CONCOURS, and EXCELLENCE: return array of top 10 ADMITTED students only
            const students = await prisma.student.findMany({
                where: {
                    ...whereClause,
                    admis: true  // ⭐ CHỈ LẤY HỌC SINH ĐÃ ĐƯỢC ADMIS
                },
                orderBy: {
                    moyenne: 'desc'  // ⭐ SẮP XẾP THEO ĐIỂM GIẢM DẦN
                },
                take: 10, // Always limit to top 10 for BREVET and CONCOURS
                select: QUERY_OPTIONS.leaderboardSelect
            })

            return students.map(student => ({
                matricule: student.matricule,
                nom_complet: student.nom_complet,
                ecole: student.ecole,
                etablissement: student.etablissement,
                moyenne: student.moyenne,
                rang: student.rang,
                wilaya: student.wilaya || undefined,
                moughataa: student.moughataa || undefined,
                section: student.section,
                admis: student.admis,
                decision_text: student.decision_text
            }))
        }
    }

    // Lấy học sinh theo wilaya
    static async getStudentsByWilaya(wilaya: string, year: number, examType: string): Promise<Student[]> {
        try {
            const whereClause: any = {
                wilaya,
                year,
                examType
            };

            // For non-BAC exams (CONCOURS, BREVET, EXCELLENCE), sessionType should be null
            if (examType !== "BAC") {
                whereClause.sessionType = null;
            }

            const students = await prisma.student.findMany({
                where: whereClause,
                orderBy: {
                    moyenne: 'desc'  // ⭐ SẮP XẾP THEO ĐIỂM GIẢM DẦN
                },
                select: QUERY_OPTIONS.studentSelect
            })

            return students.map(convertPrismaStudent)
        } catch (error) {
            console.error('Error in getStudentsByWilaya:', error);
            throw error;
        }
    }

    // Lấy học sinh theo wilaya với pagination
    static async getStudentsByWilayaPaginated(wilaya: string, year: number, examType: string, page: number, limit: number, section: string, sessionType?: string) {
        try {
            const offset = (page - 1) * limit

            // Build where condition
            const whereCondition: any = {
                wilaya,
                year,
                examType
            }

            // Add session type filter for BAC exams
            if (examType === "BAC" && sessionType) {
                whereCondition.sessionType = sessionType;
            } else if (examType !== "BAC") {
                // For non-BAC exams (CONCOURS, BREVET, EXCELLENCE), sessionType should be null
                whereCondition.sessionType = null;
            }

            if (section !== "all") {
                whereCondition.section = section
            }

            // Get total count
            const totalCount = await prisma.student.count({
                where: whereCondition
            })

            // Get students with pagination
            const students = await prisma.student.findMany({
                where: whereCondition,
                orderBy: {
                    moyenne: 'desc'  // ⭐ SẮP XẾP THEO ĐIỂM GIẢM DẦN
                },
                skip: offset,
                take: limit,
                select: QUERY_OPTIONS.studentSelect
            })

            // Get statistics
            const statsWhereCondition: any = {
                wilaya,
                year,
                examType
            }

            // Add session type filter for BAC exams
            if (examType === "BAC" && sessionType) {
                statsWhereCondition.sessionType = sessionType;
            } else if (examType !== "BAC") {
                // For non-BAC exams (CONCOURS, BREVET, EXCELLENCE), sessionType should be null
                statsWhereCondition.sessionType = null;
            }

            const allStudents = await prisma.student.findMany({
                where: statsWhereCondition,
                select: {
                    admis: true,
                    moyenne: true,
                    section: true
                }
            })

            const admittedCount = allStudents.filter(s => s.admis).length
            const averageScore = allStudents.length > 0
                ? (allStudents.reduce((sum, s) => sum + s.moyenne, 0) / allStudents.length)
                : 0

            // Get unique sections
            const sections = [...new Set(allStudents.map(s => s.section))].sort()

            const totalPages = Math.ceil(totalCount / limit)

            return {
                students: students.map(student => ({
                    matricule: student.matricule,
                    nom_complet: student.nom_complet,
                    moyenne: student.moyenne,
                    rang: student.rang,
                    admis: student.admis,
                    section: student.section,
                    ecole: student.ecole,
                    etablissement: student.etablissement
                })),
                totalCount,
                totalPages,
                currentPage: page,
                admittedCount,
                averageScore: Number(averageScore.toFixed(2)),
                sections
            }
        } catch (error) {
            console.error('Error in getStudentsByWilayaPaginated:', error);
            throw error;
        }
    }

    // Lấy học sinh theo école
    static async getStudentsBySchool(ecole: string, year: number, examType: string, wilaya?: string | null, sessionType?: string) {
        try {
            const whereClause: any = {
                etablissement: ecole,
                year,
                examType
            };

            // Add session type filter for BAC exams
            if (examType === "BAC" && sessionType) {
                whereClause.sessionType = sessionType;
            } else if (examType !== "BAC") {
                // For non-BAC exams (CONCOURS, BREVET, EXCELLENCE), sessionType should be null
                whereClause.sessionType = null;
            }

            // Add wilaya filter if provided
            if (wilaya) {
                whereClause.wilaya = wilaya;
            }

            const students = await prisma.student.findMany({
                where: whereClause,
                orderBy: {
                    moyenne: 'desc'  // ⭐ SẮP XẾP THEO ĐIỂM GIẢM DẦN
                },
                select: QUERY_OPTIONS.studentSelect
            })

            return students.map(student => ({
                matricule: student.matricule,
                nom_complet: student.nom_complet,
                moyenne: student.moyenne,
                rang: student.rang,
                rang_etablissement: student.rang_etablissement || undefined,
                admis: student.admis,
                decision_text: student.decision_text,
                section: student.section,
                wilaya: student.wilaya || undefined
            }))
        } catch (error) {
            console.error('Error in getStudentsBySchool:', error);
            throw error;
        }
    }

    // Lấy danh sách các upload
    static async getUploadHistory(): Promise<DataUpload[]> {
        try {
            const uploads = await prisma.dataUpload.findMany({
                orderBy: {
                    uploadedAt: 'desc'
                }
            })

            return uploads.map(upload => ({
                ...upload,
                examType: upload.examType as "BAC" | "BREVET" | "CONCOURS" | "OTHER",
                sessionType: upload.sessionType as "NORMALE" | "COMPLEMENTAIRE" | undefined
            }))
        } catch (error) {
            console.error('Error in getUploadHistory:', error);
            throw error;
        }
    }

    // Lấy danh sách wilayas
    static async getWilayas(year: number, examType: string, sessionType?: string): Promise<{ [key: string]: string[] }> {
        try {
            const whereClause: any = { year, examType };
            if (examType === "BAC") {
                // For BAC exams, session type is required
                if (sessionType) {
                    whereClause.sessionType = sessionType;
                } else {
                    // If no session type provided for BAC, this should not happen
                    // but for robustness, we'll filter by null sessionType
                    whereClause.sessionType = null;
                }
            } else {
                // For non-BAC exams, sessionType should be null
                whereClause.sessionType = null;
            }
            whereClause.wilaya = { not: null };

            const students = await prisma.student.findMany({
                where: whereClause,
                select: {
                    wilaya: true,
                    etablissement: true
                },
                distinct: ['wilaya', 'etablissement']
            })

            // Group establishments by wilaya
            const wilayaEstablishments: { [key: string]: Set<string> } = {}
            for (const student of students) {
                const wilaya = student.wilaya!
                const etablissement = student.etablissement

                if (!wilayaEstablishments[wilaya]) {
                    wilayaEstablishments[wilaya] = new Set()
                }
                wilayaEstablishments[wilaya].add(etablissement)
            }

            // Convert Sets to sorted arrays
            const result: { [key: string]: string[] } = {}
            for (const [wilaya, establishments] of Object.entries(wilayaEstablishments)) {
                result[wilaya] = Array.from(establishments).sort()
            }

            return result
        } catch (error) {
            console.error('Error in getWilayas:', error);
            throw error;
        }
    }

    // Upload students data
    static async uploadStudents(students: Student[]): Promise<{ uploadedCount: number, errors: string[] }> {
        try {
            const errors: string[] = []
            let uploadedCount = 0

            // Create a transaction with timeout
            const result = await prisma.$transaction(async (tx) => {
                const BATCH_SIZE = 1000 // Increased batch size for better performance

                for (let i = 0; i < students.length; i += BATCH_SIZE) {
                    const batch = students.slice(i, i + BATCH_SIZE)
                    const batchNumber = Math.floor(i / BATCH_SIZE) + 1
                    const totalBatches = Math.ceil(students.length / BATCH_SIZE)
                    console.log(`[StudentService] Processing batch ${batchNumber}/${totalBatches} (${batch.length} students)`)

                    try {
                        // Use createMany for better performance
                        const result = await tx.student.createMany({
                            data: batch,
                            skipDuplicates: true
                        })
                        uploadedCount += result.count
                        console.log(`[StudentService] Batch ${batchNumber} successful: ${result.count} students created`)
                    } catch (error: any) {
                        console.log(`[StudentService] Batch ${batchNumber} createMany failed: ${error.message}, using upserts`)
                        
                        // Fallback to individual upserts for duplicates
                        let batchUploaded = 0
                        for (const student of batch) {
                            try {
                                await tx.student.upsert({
                                    where: {
                                        matricule_year_examType_sessionType: {
                                            matricule: student.matricule,
                                            year: student.year,
                                            examType: student.examType,
                                            sessionType: student.sessionType as any || null
                                        }
                                    },
                                    update: student,
                                    create: student
                                })
                                batchUploaded++
                            } catch (upsertError: any) {
                                const errorMsg = `Failed to upsert student ${student.matricule}: ${upsertError.message}`
                                console.error(errorMsg)
                                errors.push(errorMsg)
                            }
                        }
                        uploadedCount += batchUploaded
                        console.log(`[StudentService] Batch ${batchNumber} upserts completed: ${batchUploaded} students`)
                    }
                }

                return { uploadedCount, errors }
            }, {
                timeout: 300000, // 5 minutes timeout
                maxWait: 10000   // Wait up to 10 seconds to start
            })

            console.log(`[StudentService] Upload completed. Success: ${result.uploadedCount}, Errors: ${result.errors.length}`)
            return result

        } catch (error: any) {
            console.error(`[StudentService] Transaction failed:`, error)
            throw new Error(`Database transaction failed: ${error.message}`)
        }
    }

    // Save upload info
    static async saveUploadInfo(year: number, examType: string, fileName: string, studentCount: number, sessionType?: string): Promise<void> {
        try {
            await prisma.dataUpload.create({
                data: {
                    year,
                    examType,
                    sessionType: sessionType as any || null,
                    fileName,
                    studentCount,
                    uploadedAt: new Date()
                }
            })
            console.log(`[StudentService] Upload record created: ${fileName} with ${studentCount} students`)
        } catch (error: any) {
            console.error(`[StudentService] Failed to save upload info:`, error)
            throw new Error(`Failed to save upload info: ${error.message}`)
        }
    }
}

// ============================
// Repository factory (feature flag based)
// ============================
// This allows gradual migration to DynamoDB without rewriting all call sites immediately.
import { StudentRepository } from './repositories/student-repository'
import { PrismaStudentRepository } from './repositories/prisma-student-repository'
import { DynamoStudentRepository } from './repositories/dynamo-student-repository'

let _repo: StudentRepository | null = null
export function getStudentRepository(): StudentRepository {
    if (_repo) return _repo
    const useDynamo = process.env.FEATURE_DYNAMO === 'true'
    _repo = useDynamo ? new DynamoStudentRepository() : new PrismaStudentRepository()
    return _repo
}

// Example helper (can be used in API routes later):
export async function repoFindByMatricule(matricule: string, year: number, examType: string, sessionType?: string, isDirectClick?: boolean) {
    return getStudentRepository().getByMatricule(matricule, year, examType, sessionType, { isDirectClick })
}
