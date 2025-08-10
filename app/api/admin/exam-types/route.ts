import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const examTypes = await prisma.examType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, examTypes });
  } catch (error) {
    console.error("Error fetching exam types:", error);
    return NextResponse.json(
      { error: "Failed to fetch exam types" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, year, description, hasSections, hasDecision, requiresThreshold, sessionType } = body;

    // Validate required fields
    if (!name || !code || !year) {
      return NextResponse.json(
        { error: "Name, code, and year are required" },
        { status: 400 }
      );
    }

    // Check if exam type already exists for this year and session type
    const existingExamType = await prisma.examType.findFirst({
      where: {
        OR: [
          { name, year: parseInt(year), sessionType: sessionType || null },
          { code, year: parseInt(year), sessionType: sessionType || null }
        ]
      }
    });

    if (existingExamType) {
      return NextResponse.json(
        { error: "Exam type with this name or code already exists for this year and session type" },
        { status: 400 }
      );
    }

    const examType = await prisma.examType.create({
      data: {
        name,
        code,
        year: parseInt(year),
        description,
        hasSections: hasSections || false,
        hasDecision: hasDecision !== false, // Default to true
        requiresThreshold: requiresThreshold || false,
        isActive: true,
        sessionType: sessionType || null,
      },
    });

    return NextResponse.json({ success: true, examType });
  } catch (error) {
    console.error("Error creating exam type:", error);
    return NextResponse.json(
      { error: "Failed to create exam type" },
      { status: 500 }
    );
  }
} 