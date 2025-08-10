import { Student, DataUpload, StatisticsData } from '../../types/student';

// Interface abstraction for data access so we can swap Prisma/Dynamo.
export interface StudentRepository {
  getByMatricule(matricule: string, year: number, examType: string, sessionType?: string, opts?: { isDirectClick?: boolean }): Promise<Student | null>;
  getByMatriculeAndSchool(matricule: string, year: number, examType: string, schoolName: string): Promise<Student | null>;
  getByNameAndSchool(studentName: string, year: number, examType: string, schoolName: string, wilaya?: string): Promise<Student | null>;
  getByLocation(wilaya: string, moughataa: string, etablissement: string, year: number, examType: string): Promise<Student | null>;
  getByNameAndLocation(studentName: string, wilaya: string, moughataa: string, etablissement: string, year: number, examType: string): Promise<Student | null>;
  getStudents(year?: number, examType?: string, sessionType?: string): Promise<Student[]>;
  clearData(year: number, examType: string, sessionType?: string): Promise<number>;
  getStatistics(year: number, examType: string, sessionType?: string): Promise<StatisticsData>;
  getLeaderboard(year: number, examType: string, limit?: number, sessionType?: string): Promise<any>;
  getStudentsByWilaya(wilaya: string, year: number, examType: string): Promise<Student[]>;
  getStudentsByWilayaPaginated(params: { wilaya: string; year: number; examType: string; page: number; limit: number; section: string; sessionType?: string }): Promise<any>;
  getStudentsBySchool(ecole: string, year: number, examType: string, wilaya?: string | null, sessionType?: string): Promise<any[]>;
  getUploadHistory(): Promise<DataUpload[]>;
  getWilayas(year: number, examType: string, sessionType?: string): Promise<{ [key: string]: string[] }>;
  uploadStudents(students: Student[]): Promise<{ uploadedCount: number; errors: string[] }>;
  saveUploadInfo(year: number, examType: string, fileName: string, studentCount: number, sessionType?: string): Promise<void>;
}
