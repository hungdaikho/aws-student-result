import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const sliderImages = await prisma.sliderImage.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ success: true, sliderImages });
  } catch (error) {
    console.error("Error fetching slider images:", error);
    return NextResponse.json(
      { error: "Failed to fetch slider images" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, imageUrl, order } = body;

    // Validate required fields
    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    const sliderImage = await prisma.sliderImage.create({
      data: {
        title,
        description,
        imageUrl,
        order: order || 0,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, sliderImage });
  } catch (error) {
    console.error("Error creating slider image:", error);
    return NextResponse.json(
      { error: "Failed to create slider image" },
      { status: 500 }
    );
  }
} 