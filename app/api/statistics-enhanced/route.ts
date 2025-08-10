import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || "2025");
    const examType = searchParams.get("examType") || "BAC";
    const sessionType = searchParams.get("sessionType");

    // Build where clause with session type for BAC
    const whereClause: any = { year, examType: examType as any };
    if (examType === "BAC" && sessionType) {
      whereClause.sessionType = sessionType;
    }

    // Get basic statistics
    const totalStudents = await prisma.student.count({
      where: whereClause,
    });

    const admittedStudents = await prisma.student.count({
      where: { ...whereClause, admis: true },
    });

    const averageScore = await prisma.student.aggregate({
      where: whereClause,
      _avg: { moyenne: true },
    });

    // Get school statistics
    const schoolStats = await prisma.student.groupBy({
      by: ["etablissement"],
      where: whereClause,
      _count: { id: true },
      _avg: { moyenne: true },
    });

    // Get admitted students count per school
    const admittedCounts = await prisma.student.groupBy({
      by: ["etablissement"],
      where: { ...whereClause, admis: true },
      _count: { id: true },
    });

    // Create a map for quick lookup
    const admittedMap = new Map(admittedCounts.map(item => [item.etablissement, item._count.id]));

    // Calculate success rates and sort schools (only schools with >30 students)
    const schoolsWithRates = schoolStats
      .filter((school) => school._count.id > 30) // Only schools with more than 30 students
      .map((school) => {
        const admittedCount = admittedMap.get(school.etablissement) || 0;
        return {
          name: school.etablissement,
          totalStudents: school._count.id,
          admittedStudents: admittedCount,
          successRate: school._count.id > 0 ? (admittedCount / school._count.id) * 100 : 0,
          averageScore: school._avg.moyenne || 0,
        };
      })
      .sort((a, b) => b.successRate - a.successRate);

    const top5Schools = schoolsWithRates.slice(0, 5);
    const bottom5Schools = schoolsWithRates.slice(-5).reverse();

    

    // Get section statistics (for BAC only)
    let sectionStats: any[] = [];
    if (examType === "BAC") {
      const sectionData = await prisma.student.groupBy({
        by: ["section"],
        where: { year, examType: examType as any },
        _count: { id: true },
      });

      // Get admitted students count per section
      const admittedSectionCounts = await prisma.student.groupBy({
        by: ["section"],
        where: { year, examType: examType as any, admis: true },
        _count: { id: true },
      });

      const admittedSectionMap = new Map(admittedSectionCounts.map(item => [item.section, item._count.id]));

      sectionStats = sectionData.map((section) => {
        const admittedCount = admittedSectionMap.get(section.section) || 0;
        return {
          name: section.section,
          total: section._count.id,
          admitted: admittedCount,
          rate: section._count.id > 0 ? ((admittedCount / section._count.id) * 100).toFixed(1) : "0.0",
        };
      });
    }

    // Get wilaya statistics
    const wilayaData = await prisma.student.groupBy({
      by: ["wilaya"],
      where: { year, examType: examType as any },
      _count: { id: true },
    });

    // Get admitted students count per wilaya
    const admittedWilayaCounts = await prisma.student.groupBy({
      by: ["wilaya"],
      where: { year, examType: examType as any, admis: true },
      _count: { id: true },
    });

    const admittedWilayaMap = new Map(admittedWilayaCounts.map(item => [item.wilaya, item._count.id]));

    const wilayaStats = wilayaData
      .filter((wilaya) => wilaya.wilaya) // Filter out null wilayas
      .map((wilaya) => {
        const admittedCount = admittedWilayaMap.get(wilaya.wilaya!) || 0;
        return {
          name: wilaya.wilaya!,
          total: wilaya._count.id,
          admitted: admittedCount,
          rate: wilaya._count.id > 0 ? ((admittedCount / wilaya._count.id) * 100).toFixed(1) : "0.0",
        };
      })
      .sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));

    const result = {
      success: true,
      basicStats: {
        totalStudents,
        admittedStudents,
        admissionRate: totalStudents > 0 ? ((admittedStudents / totalStudents) * 100).toFixed(1) : "0.0",
        averageScore: averageScore._avg.moyenne ? averageScore._avg.moyenne.toFixed(2) : "0.00",
      },
      schoolStats: {
        top5Schools,
        bottom5Schools,
      },

      sectionStats,
      wilayaStats,
      year,
      examType,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching enhanced statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch enhanced statistics" },
      { status: 500 }
    );
  }
} 