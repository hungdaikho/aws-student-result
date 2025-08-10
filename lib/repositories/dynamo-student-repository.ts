import { GetCommand, QueryCommand, BatchWriteCommand, BatchWriteCommandInput, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, DYNAMO_TABLE } from '../dynamo';
import { StudentRepository } from './student-repository';
import { Student, DataUpload, StatisticsData } from '../../types/student';

// ===== Key builders & helpers (simple initial design) =====
const normSession = (examType: string, sessionType?: string) => (examType === 'BAC' ? (sessionType || 'NORMALE') : 'NULL');
const pkStudent = (matricule: string, year: number, examType: string, sessionType?: string) => `STUDENT#${matricule}#${year}#${examType}#${normSession(examType, sessionType)}`;
const revScore = (score: number) => {
  // Assume score scale 0..20 (or 0..400) -> choose 0..1000 base to reverse order
  const base = 100000; // large to keep ordering stable
  const scaled = Math.round((score || 0) * 1000);
  const rev = base - scaled;
  return rev.toString().padStart(6, '0');
};
const gsiWilayaPK = (wilaya: string|undefined, examType: string, year: number, sessionType?: string) => `WILAYA#${wilaya || 'UNKNOWN'}#${examType}#${year}#${normSession(examType, sessionType)}`;
const gsiSchoolPK = (school: string, examType: string, year: number, sessionType?: string) => `SCHOOL#${school}#${examType}#${year}#${normSession(examType, sessionType)}`;
const gsiLeaderPK = (examType: string, year: number, section: string|undefined, sessionType?: string) => `LEADER#${examType}#${year}#${section || 'Other'}#${normSession(examType, sessionType)}`;
const uploadPK = (year: number, examType: string, sessionType?: string) => `UPLOAD#${examType}#${year}#${normSession(examType, sessionType)}`;

// Cursor encode/decode
const encodeCursor = (key: any) => key ? Buffer.from(JSON.stringify(key)).toString('base64') : undefined;
const decodeCursor = (cursor?: string) => cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined;

// Generic scan helper (WARNING: expensive, only for initial fallback)
async function scanAll(filter?: { [k: string]: any }, limit?: number) {
  // NOTE: For production large datasets, replace by precomputed aggregates / targeted queries.
  const items: any[] = [];
  let ExclusiveStartKey: any | undefined = undefined;
  let fetched = 0;
  do {
    const cmd = new ScanCommand({
      TableName: DYNAMO_TABLE,
      ExclusiveStartKey,
      // Basic filter expression if provided
    });
    const res: any = await ddb.send(cmd);
    if (res.Items) {
      for (const it of res.Items) {
        items.push(it);
        fetched++;
        if (limit && fetched >= limit) return items;
      }
    }
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

export class DynamoStudentRepository implements StudentRepository {
  async getByMatricule(matricule: string, year: number, examType: string, sessionType?: string): Promise<Student | null> {
    const res = await ddb.send(new GetCommand({
      TableName: DYNAMO_TABLE,
      Key: { PK: pkStudent(matricule, year, examType, sessionType), SK: 'META' }
    }));
    return res.Item ? this.mapItemToStudent(res.Item) : null;
  }
  // Placeholders for unimplemented methods: throw to signal dev work remaining.
  async getByMatriculeAndSchool(matricule: string, year: number, examType: string, schoolName: string): Promise<Student | null> {
    // Fallback: scan by composite criteria (could be optimized by adding a GSI on matricule)
    const items = await scanAll();
    const match = items.find(i => i.matricule === matricule && i.etablissement === schoolName && i.year === year && i.examType === examType);
    return match ? this.mapItemToStudent(match) : null;
  }
  async getByNameAndSchool(studentName: string, year: number, examType: string, schoolName: string, wilaya?: string): Promise<Student | null> {
    const items = await scanAll();
    const match = items.find(i => i.nom_complet === studentName && i.etablissement === schoolName && i.year === year && i.examType === examType && (!wilaya || i.wilaya === wilaya));
    return match ? this.mapItemToStudent(match) : null;
  }
  async getByLocation(wilaya: string, moughataa: string, etablissement: string, year: number, examType: string): Promise<Student | null> {
    const items = await scanAll();
    const match = items.find(i => i.wilaya === wilaya && i.moughataa === moughataa && i.etablissement === etablissement && i.year === year && i.examType === examType);
    return match ? this.mapItemToStudent(match) : null;
  }
  async getByNameAndLocation(studentName: string, wilaya: string, moughataa: string, etablissement: string, year: number, examType: string): Promise<Student | null> {
    const items = await scanAll();
    const match = items.find(i => i.nom_complet === studentName && i.wilaya === wilaya && i.moughataa === moughataa && i.etablissement === etablissement && i.year === year && i.examType === examType);
    return match ? this.mapItemToStudent(match) : null;
  }
  async getStudents(year?: number, examType?: string): Promise<Student[]> {
    const items = await scanAll();
    return items
      .filter(i => (!year || i.year === year) && (!examType || i.examType === examType) && i.SK === 'META')
      .sort((a,b) => (a.rang||0) - (b.rang||0))
      .map(i => this.mapItemToStudent(i));
  }
  async clearData(year: number, examType: string, sessionType?: string): Promise<number> {
    const sess = normSession(examType, sessionType);
    const items = await scanAll();
    const targets = items.filter(i => i.year === year && i.examType === examType && normSession(examType, i.sessionType) === sess);
    let deleted = 0;
    for (const chunk of chunkArray(targets, 25)) {
      const req: BatchWriteCommandInput = { RequestItems: { [DYNAMO_TABLE]: chunk.map(it => ({ DeleteRequest: { Key: { PK: it.PK, SK: it.SK } } })) } };
      await ddb.send(new BatchWriteCommand(req));
      deleted += chunk.length;
    }
    return deleted;
  }
  async getStatistics(year: number, examType: string, sessionType?: string): Promise<StatisticsData> {
    const sess = normSession(examType, sessionType);
    const items = (await scanAll()).filter(i => i.year === year && i.examType === examType && normSession(examType, i.sessionType) === sess && i.SK === 'META');
    const totalStudents = items.length;
    const admittedStudents = items.filter(i => i.admis).length;
    const averageScore = totalStudents ? (items.reduce((s,i)=>s+(i.moyenne||0),0)/totalStudents) : 0;
    const sessionnaireStudents = items.filter(i => !i.admis && (i.moyenne||0) >= 8).length;
    const sectionMap: Record<string,{total:number;admitted:number}> = {};
    const wilayaMap: Record<string,{total:number;admitted:number}> = {};
    for (const i of items) {
      const section = i.section || 'Non spécifié';
      sectionMap[section] = sectionMap[section] || { total:0, admitted:0 };
      sectionMap[section].total++; if (i.admis) sectionMap[section].admitted++;
      const wilaya = i.wilaya || 'Non spécifié';
      wilayaMap[wilaya] = wilayaMap[wilaya] || { total:0, admitted:0 };
      wilayaMap[wilaya].total++; if (i.admis) wilayaMap[wilaya].admitted++;
    }
    const sectionStats = Object.entries(sectionMap).map(([name,v]) => ({ name, total: v.total, admitted: v.admitted, rate: v.total? ((v.admitted/v.total)*100).toFixed(1):'0.0' })).sort((a,b)=>b.total-a.total);
    const wilayaStats = Object.entries(wilayaMap).map(([name,v]) => ({ name, total: v.total, admitted: v.admitted, rate: v.total? ((v.admitted/v.total)*100).toFixed(1):'0.0' })).sort((a,b)=>b.total-a.total);
    return {
      totalStudents,
      admittedStudents,
      admissionRate: totalStudents? ((admittedStudents/totalStudents)*100).toFixed(2):'0',
      sessionnaireRate: totalStudents? ((sessionnaireStudents/totalStudents)*100).toFixed(1):'0.0',
      averageScore: averageScore.toFixed(2),
      sectionStats,
      wilayaStats,
      year,
      examType: examType as any
    };
  }
  async getLeaderboard(year: number, examType: string, limit: number = 100, sessionType?: string): Promise<any> {
    const items = (await scanAll()).filter(i => i.year === year && i.examType === examType && i.SK === 'META');
    const admitted = items.filter(i => i.admis);
    if (examType === 'BAC') {
      const bySection: Record<string, any[]> = {};
      for (const s of admitted) {
        const section = s.section || 'Other';
        bySection[section] = bySection[section] || [];
        bySection[section].push(s);
      }
      const result: any = {};
      for (const [section, arr] of Object.entries(bySection)) {
        arr.sort((a,b)=> (b.moyenne||0)-(a.moyenne||0));
        const top10 = arr.slice(0,10).map(x => this.projectLeaderboardStudent(x));
        const total = arr.length;
        const admittedCnt = arr.filter(x=>x.admis).length;
        const avg = total? arr.reduce((s,x)=>s+(x.moyenne||0),0)/total : 0;
        result[section] = { students: top10, stats: { total, admitted: admittedCnt, admissionRate: total? Number(((admittedCnt/total)*100).toFixed(1)):0, averageScore: Number(avg.toFixed(2)) } };
      }
      return result;
    } else {
      admitted.sort((a,b)=> (b.moyenne||0)-(a.moyenne||0));
      return admitted.slice(0,10).map(x => this.projectLeaderboardStudent(x));
    }
  }
  async getStudentsByWilaya(wilaya: string, year: number, examType: string): Promise<Student[]> {
    const all = (await scanAll()).filter(i => i.wilaya === wilaya && i.year === year && i.examType === examType && i.SK==='META');
    return all.sort((a,b)=> (b.moyenne||0)-(a.moyenne||0)).map(i=>this.mapItemToStudent(i));
  }
  async getStudentsByWilayaPaginated(params: { wilaya: string; year: number; examType: string; page: number; limit: number; section: string; sessionType?: string }): Promise<any> {
    const { wilaya, year, examType, page, limit, section } = params;
    const all = (await this.getStudentsByWilaya(wilaya, year, examType)).filter(s => section==='all' || s.section === section);
    const totalCount = all.length;
    const totalPages = Math.ceil(totalCount/limit);
    const slice = all.slice((page-1)*limit, (page-1)*limit + limit);
    const admittedCount = all.filter(s=>s.admis).length;
    const averageScore = all.length? Number((all.reduce((sum,s)=>sum+(s.moyenne||0),0)/all.length).toFixed(2)):0;
    const sections = [...new Set(all.map(s=>s.section))].sort();
    return { students: slice.map(s=>({ matricule: s.matricule, nom_complet: s.nom_complet, moyenne: s.moyenne, rang: s.rang, admis: s.admis, section: s.section, ecole: s.ecole, etablissement: s.etablissement })), totalCount, totalPages, currentPage: page, admittedCount, averageScore, sections };
  }
  async getStudentsBySchool(ecole: string, year: number, examType: string, wilaya?: string | null): Promise<any[]> {
    const all = (await scanAll()).filter(i => i.etablissement === ecole && i.year === year && i.examType === examType && (!wilaya || i.wilaya === wilaya));
    return all.sort((a,b)=> (b.moyenne||0)-(a.moyenne||0)).map(i => ({
      matricule: i.matricule,
      nom_complet: i.nom_complet,
      moyenne: i.moyenne,
      rang: i.rang,
      rang_etablissement: i.rang_etablissement || undefined,
      admis: i.admis,
      decision_text: i.decision_text || '',
      section: i.section,
      wilaya: i.wilaya
    }));
  }
  async getUploadHistory(): Promise<DataUpload[]> {
    const items = (await scanAll()).filter(i => i.PK && typeof i.PK === 'string' && i.PK.startsWith('UPLOAD#'));
    return items.sort((a,b)=> (b.uploadedAt||'').localeCompare(a.uploadedAt||''))
      .map(i => ({ year: i.year, examType: i.examType, sessionType: i.sessionType || undefined, fileName: i.fileName, studentCount: i.studentCount, uploadedAt: i.uploadedAt? new Date(i.uploadedAt): undefined }));
  }
  async getWilayas(year: number, examType: string): Promise<{ [key: string]: string[] }> {
    const items = (await scanAll()).filter(i => i.year === year && i.examType === examType && i.wilaya && i.etablissement);
    const map: Record<string, Set<string>> = {};
    for (const it of items) {
      const w = it.wilaya as string;
      map[w] = map[w] || new Set();
      map[w].add(it.etablissement);
    }
    const result: Record<string,string[]> = {};
    for (const [w, set] of Object.entries(map)) result[w] = Array.from(set).sort();
    return result;
  }

  async uploadStudents(students: Student[]): Promise<{ uploadedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let uploadedCount = 0;
    const CHUNK = 25;
    for (let i = 0; i < students.length; i += CHUNK) {
      const batch = students.slice(i, i + CHUNK);
      const nowIso = new Date().toISOString();
      const request: BatchWriteCommandInput = {
        RequestItems: {
          [DYNAMO_TABLE]: batch.map(s => {
            const rev = revScore(s.moyenne || 0);
            return ({
              PutRequest: {
                Item: {
                  PK: pkStudent(s.matricule, s.year, s.examType, s.sessionType),
                  SK: 'META',
                  matricule: s.matricule,
                  year: s.year,
                  examType: s.examType,
                  sessionType: s.sessionType || null,
                  nom_complet: s.nom_complet,
                  moyenne: s.moyenne,
                  rang: s.rang,
                  section: s.section || null,
                  ecole: s.ecole,
                  etablissement: s.etablissement,
                  wilaya: s.wilaya || null,
                  moughataa: s.moughataa || null,
                  admis: s.admis,
                  decision_text: s.decision_text || '',
                  createdAt: nowIso,
                  updatedAt: nowIso,
                  // GSI attributes
                  GSI1PK: gsiWilayaPK(s.wilaya, s.examType, s.year, s.sessionType),
                  GSI1SK: `SCORE#${rev}#${s.matricule}`,
                  GSI2PK: gsiSchoolPK(s.etablissement, s.examType, s.year, s.sessionType),
                  GSI2SK: `SCORE#${rev}#${s.matricule}`,
                  GSI3PK: gsiLeaderPK(s.examType, s.year, s.section || 'Other', s.sessionType),
                  GSI3SK: `SCORE#${rev}#${s.matricule}`
                }
              }
            });
          })
        }
      };
      const resp = await ddb.send(new BatchWriteCommand(request));
      const unprocessed = resp.UnprocessedItems?.[DYNAMO_TABLE] || [];
      uploadedCount += batch.length - unprocessed.length;
      if (unprocessed.length) {
        try {
          await new Promise(r => setTimeout(r, 250));
          await ddb.send(new BatchWriteCommand({ RequestItems: { [DYNAMO_TABLE]: unprocessed } }));
          uploadedCount += unprocessed.length;
        } catch (e: any) {
          errors.push(`Retry failed for ${unprocessed.length} items: ${e.message}`);
        }
      }
    }
    return { uploadedCount, errors };
  }

  async saveUploadInfo(year: number, examType: string, fileName: string, studentCount: number, sessionType?: string): Promise<void> {
    await ddb.send(new BatchWriteCommand({
      RequestItems: {
        [DYNAMO_TABLE]: [
          { PutRequest: { Item: { PK: uploadPK(year, examType, sessionType), SK: `TS#${Date.now()}`, year, examType, sessionType: sessionType || null, fileName, studentCount, uploadedAt: new Date().toISOString(), entity: 'UPLOAD_RECORD' } } }
        ]
      }
    }));
  }

  private mapItemToStudent(item: any): Student {
    return {
      matricule: item.matricule,
      nom_complet: item.nom_complet,
      moyenne: item.moyenne,
      rang: item.rang,
      admis: item.admis,
      section: item.section || null,
      ecole: item.ecole,
      etablissement: item.etablissement,
      rang_etablissement: item.rang_etablissement || null,
      wilaya: item.wilaya || null,
      moughataa: item.moughataa || null,
      examType: item.examType,
      year: item.year,
      sessionType: item.sessionType || undefined,
      decision_text: item.decision_text || '',
      // Fields not yet included can be added later
    };
  }

  private projectLeaderboardStudent(i: any) {
    return {
      matricule: i.matricule,
      nom_complet: i.nom_complet,
      ecole: i.ecole,
      etablissement: i.etablissement,
      moyenne: i.moyenne,
      rang: i.rang,
      wilaya: i.wilaya || undefined,
      section: i.section || 'Other'
    };
  }
}

// Utility to chunk arrays
function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size));
  return out;
}
