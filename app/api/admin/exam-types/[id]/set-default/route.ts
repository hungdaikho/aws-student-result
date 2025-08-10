import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // First, unset all exam types as default
    await prisma.examType.updateMany({
      where: {
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Then, set the specified exam type as default
    const updatedExamType = await prisma.examType.update({
      where: {
        id: id,
      },
      data: {
        isDefault: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Type d'examen défini par défaut avec succès",
      data: updatedExamType,
    });
  } catch (error: any) {
    console.error("Error setting default exam type:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la définition du type d'examen par défaut",
      },
      { status: 500 }
    );
  }
} 