/*
  Warnings:

  - A unique constraint covering the columns `[matricule,year,examType,sessionType]` on the table `students` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."students_matricule_year_examType_key";

-- CreateIndex
CREATE UNIQUE INDEX "students_matricule_year_examType_sessionType_key" ON "public"."students"("matricule", "year", "examType", "sessionType");
