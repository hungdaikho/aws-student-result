import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const sliderImages = await prisma.sliderImage.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        order: true,
      },
    });

    return NextResponse.json({ success: true, images: sliderImages });
  } catch (error) {
    console.error("Error fetching slider images:", error);
    return NextResponse.json(
      { error: "Failed to fetch slider images" },
      { status: 500 }
    );
  }
} 