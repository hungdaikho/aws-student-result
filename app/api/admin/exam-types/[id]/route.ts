import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if exam type exists
    const examType = await prisma.examType.findUnique({
      where: { id },
    });

    if (!examType) {
      return NextResponse.json(
        { error: "Exam type not found" },
        { status: 404 }
      );
    }

    // Check if there are any students associated with this exam type
    const studentCount = await prisma.student.count({
      where: {
        examType: examType.code,
        year: examType.year,
        sessionType: examType.sessionType,
      },
    });

    if (studentCount > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete exam type. There are ${studentCount} students associated with this exam type. Please delete the student data first.` 
        },
        { status: 400 }
      );
    }

    // Delete the exam type
    await prisma.examType.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true, 
      message: `Exam type "${examType.name}" deleted successfully` 
    });
  } catch (error) {
    console.error("Error deleting exam type:", error);
    return NextResponse.json(
      { error: "Failed to delete exam type" },
      { status: 500 }
    );
  }
} 