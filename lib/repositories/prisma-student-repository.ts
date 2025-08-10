// Temporary Prisma-backed repository implementing the StudentRepository interface.
import { prisma } from '../prisma';
import { StudentRepository } from './student-repository';
import { Student, DataUpload, StatisticsData } from '../../types/student';
import { StudentService } from '../student-service'; // reuse existing logic gradually

// NOTE: We will progressively move logic out of StudentService into this repo.
export class PrismaStudentRepository implements StudentRepository {
  // Delegate to existing static methods for now (thin wrapper)
  async getByMatricule(matricule: string, year: number, examType: string, sessionType?: string, opts?: { isDirectClick?: boolean }): Promise<Student | null> {
    return StudentService.findStudentByMatricule(matricule, year, examType, sessionType, opts?.isDirectClick);
  }
  async getByMatriculeAndSchool(matricule: string, year: number, examType: string, schoolName: string): Promise<Student | null> {
    return StudentService.findStudentByMatriculeAndSchool(matricule, year, examType, schoolName);
  }
  async getByNameAndSchool(studentName: string, year: number, examType: string, schoolName: string, wilaya?: string): Promise<Student | null> {
    return StudentService.findStudentByNameAndSchool(studentName, year, examType, schoolName, wilaya);
  }
  async getByLocation(wilaya: string, moughataa: string, etablissement: string, year: number, examType: string): Promise<Student | null> {
    return StudentService.findStudentByLocation(wilaya, moughataa, etablissement, year, examType);
  }
  async getByNameAndLocation(studentName: string, wilaya: string, moughataa: string, etablissement: string, year: number, examType: string): Promise<Student | null> {
    return StudentService.findStudentByNameAndLocation(studentName, wilaya, moughataa, etablissement, year, examType);
  }
  async getStudents(year?: number, examType?: string, sessionType?: string): Promise<Student[]> {
    return StudentService.getStudents(year, examType);
  }
  async clearData(year: number, examType: string, sessionType?: string): Promise<number> {
    return StudentService.clearData(year, examType, sessionType);
  }
  async getStatistics(year: number, examType: string, sessionType?: string): Promise<StatisticsData> {
    return StudentService.getStatistics(year, examType, sessionType);
  }
  async getLeaderboard(year: number, examType: string, limit?: number, sessionType?: string): Promise<any> {
    return StudentService.getLeaderboard(year, examType, limit, sessionType);
  }
  async getStudentsByWilaya(wilaya: string, year: number, examType: string): Promise<Student[]> {
    return StudentService.getStudentsByWilaya(wilaya, year, examType);
  }
  async getStudentsByWilayaPaginated(params: { wilaya: string; year: number; examType: string; page: number; limit: number; section: string; sessionType?: string }): Promise<any> {
    return StudentService.getStudentsByWilayaPaginated(params.wilaya, params.year, params.examType, params.page, params.limit, params.section, params.sessionType);
  }
  async getStudentsBySchool(ecole: string, year: number, examType: string, wilaya?: string | null, sessionType?: string): Promise<any[]> {
    return StudentService.getStudentsBySchool(ecole, year, examType, wilaya, sessionType);
  }
  async getUploadHistory(): Promise<DataUpload[]> {
    return StudentService.getUploadHistory();
  }
  async getWilayas(year: number, examType: string, sessionType?: string): Promise<{ [key: string]: string[] }> {
    return StudentService.getWilayas(year, examType, sessionType);
  }
  async uploadStudents(students: Student[]): Promise<{ uploadedCount: number; errors: string[] }> {
    return StudentService.uploadStudents(students);
  }
  async saveUploadInfo(year: number, examType: string, fileName: string, studentCount: number, sessionType?: string): Promise<void> {
    return StudentService.saveUploadInfo(year, examType, fileName, studentCount, sessionType);
  }
}
