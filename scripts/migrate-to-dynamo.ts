// Migration skeleton: Prisma -> DynamoDB
// Usage: pnpm ts-node scripts/migrate-to-dynamo.ts <year> <examType> [sessionType]
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { DynamoStudentRepository } from '../lib/repositories/dynamo-student-repository'
import { Student } from '../types/student'

async function main() {
  const repo = new DynamoStudentRepository()
  const year = Number(process.argv[2]) || new Date().getFullYear()
  const examType = process.argv[3] || 'BAC'
  const sessionType = process.argv[4]

  console.log(`[migrate] Start export from Prisma year=${year} examType=${examType} sessionType=${sessionType || 'NULL'}`)

  const where: any = { year, examType }
  if (examType === 'BAC') {
    where.sessionType = sessionType || 'NORMALE'
  } else {
    where.sessionType = null
  }

  const BATCH = 500
  let skip = 0
  let total = 0
  while (true) {
    const students = await prisma.student.findMany({ where, skip, take: BATCH })
    if (students.length === 0) break
    skip += students.length
    total += students.length
    console.log(`[migrate] Fetched batch size=${students.length} accumulated=${total}`)

    const mapped: Student[] = students.map(s => ({
      matricule: s.matricule,
      nom_complet: s.nom_complet,
      moyenne: s.moyenne,
      rang: s.rang,
      admis: s.admis,
      section: s.section,
      ecole: s.ecole,
      etablissement: s.etablissement,
      rang_etablissement: (s as any).rang_etablissement || null,
      wilaya: s.wilaya || undefined,
      moughataa: s.moughataa || undefined,
      examType: s.examType as any,
      year: s.year,
      sessionType: (s.sessionType as any) || undefined,
      decision_text: s.decision_text || '',
    }))

    const res = await repo.uploadStudents(mapped)
    if (res.errors.length) {
      console.warn(`[migrate] Errors in batch:`, res.errors.slice(0,3))
    }
  }

  console.log(`[migrate] Completed migration total=${total}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
