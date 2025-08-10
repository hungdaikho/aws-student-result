export interface Student {
    id?: string
    matricule: string
    nom_complet: string
    ecole: string
    etablissement: string
    moyenne: number
    rang: number
    admis: boolean
    decision_text: string
    section: string
    wilaya?: string
    moughataa?: string  // For CONCOURS exams - district/center
    rang_etablissement?: number
    year: number
    examType: "BAC" | "BREVET" | "CONCOURS" | "EXCELLENCE" | "OTHER"
    sessionType?: "NORMALE" | "COMPLEMENTAIRE"
    lieu_nais?: string
    date_naiss?: string
    createdAt?: Date
    updatedAt?: Date
}

export interface DataUpload {
    id?: string
    year: number
    examType: "BAC" | "BREVET" | "CONCOURS" | "EXCELLENCE" | "OTHER"
    sessionType?: "NORMALE" | "COMPLEMENTAIRE"
    fileName: string
    studentCount: number
    uploadedAt?: Date
}

export interface ExamTypeConfig {
    id?: string
    name: string
    code: string
    description?: string
    hasSections: boolean
    hasDecision: boolean
    requiresThreshold: boolean
    isActive: boolean
    createdAt?: Date
    updatedAt?: Date
}

export interface SliderImage {
    id?: string
    title?: string
    description?: string
    imageUrl: string
    order: number
    isActive: boolean
    createdAt?: Date
    updatedAt?: Date
}

export interface StudentSearchResult extends Student { }

export interface StatisticsData {
    totalStudents: number
    admittedStudents: number
    admissionRate: string
    sessionnaireRate: string
    averageScore: string
    sectionStats: Array<{
        name: string
        total: number
        admitted: number
        rate: string
    }>
    wilayaStats: Array<{
        name: string
        total: number
        admitted: number
        rate: string
    }>
    year: number
    examType: "BAC" | "BREVET" | "CONCOURS" | "EXCELLENCE" | "OTHER"
}

export interface LeaderboardStudent {
    matricule: string
    nom_complet: string
    ecole: string
    etablissement: string
    moyenne: number
    rang: number
    wilaya?: string
    section: string
}

export interface SchoolStats {
    name: string
    totalStudents: number
    admittedStudents: number
    successRate: number
    averageScore: number
}

export interface StudentAgeStats {
    youngestStudents: Student[]
    oldestStudents: Student[]
}
