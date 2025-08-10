import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || "2025");
    const examType = searchParams.get("examType") || "BAC";
    const section = searchParams.get("section");
    const wilaya = searchParams.get("wilaya");
    const sessionType = searchParams.get("sessionType");
    const sortBy = searchParams.get("sortBy") || "moyenne";
    const order = searchParams.get("order") || "desc";
    const limit = parseInt(searchParams.get("limit") || "100");

    if (!section && examType === "BAC") {
      return NextResponse.json(
        { error: "Section is required for BAC exams" },
        { status: 400 }
      );
    }

    const whereClause: any = {
      year,
      examType: examType as any,
    };

    if (section) {
      whereClause.section = section;
    }

    if (wilaya) {
      whereClause.wilaya = wilaya;
    }

    // Add session type filter for BAC exams
    if (examType === "BAC" && sessionType) {
      whereClause.sessionType = sessionType;
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      orderBy: {
        [sortBy]: order as "asc" | "desc",
      },
      take: limit,
      select: {
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
        lieu_nais: true,
        date_naiss: true,
      },
    });

    // Get section statistics
    const sectionStatsWhereClause: any = { year, examType: examType as any };
    if (examType === "BAC" && sessionType) {
      sectionStatsWhereClause.sessionType = sessionType;
    }

    const sectionStats = await prisma.student.groupBy({
      by: ["section"],
      where: sectionStatsWhereClause,
      _count: { _all: true },
      _sum: { moyenne: true },
      _avg: { moyenne: true },
    });

    const sectionStatistics = sectionStats.map((stat) => ({
      name: stat.section,
      total: stat._count._all || 0,
      admitted: 0, // We'll calculate this separately
      successRate: 0, // We'll calculate this separately
      averageScore: stat._avg.moyenne || 0,
    }));

    // Get wilaya statistics for this section
    const wilayaStats = await prisma.student.groupBy({
      by: ["wilaya"],
      where: { ...whereClause },
      _count: { _all: true },
      _sum: { moyenne: true },
      _avg: { moyenne: true },
    });

    const wilayaStatistics = wilayaStats
      .filter((stat) => stat.wilaya)
      .map((stat) => ({
        name: stat.wilaya!,
        total: stat._count._all || 0,
        admitted: 0, // We'll calculate this separately
        successRate: 0, // We'll calculate this separately
        averageScore: stat._avg.moyenne || 0,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    const result = {
      success: true,
      students,
      sectionStatistics,
      wilayaStatistics,
      filters: {
        year,
        examType,
        section,
        wilaya,
        sortBy,
        order,
        limit,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching section students:", error);
    return NextResponse.json(
      { error: "Failed to fetch section students" },
      { status: 500 }
    );
  }
} 