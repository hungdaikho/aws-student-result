import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// PUT - Update slider image
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, description, imageUrl, order } = body;

    // Validate required fields
    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    const updatedSliderImage = await prisma.sliderImage.update({
      where: { id },
      data: {
        title,
        description,
        imageUrl,
        order: order || 0,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Slider image updated successfully",
      sliderImage: updatedSliderImage 
    });
  } catch (error) {
    console.error("Error updating slider image:", error);
    return NextResponse.json(
      { error: "Failed to update slider image" },
      { status: 500 }
    );
  }
}

// DELETE - Delete slider image
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.sliderImage.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Slider image deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting slider image:", error);
    return NextResponse.json(
      { error: "Failed to delete slider image" },
      { status: 500 }
    );
  }
}

// PATCH - Toggle slider image status or update specific fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { isActive, ...otherFields } = body;

    const updateData: any = {};
    
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }
    
    if (otherFields.title !== undefined) updateData.title = otherFields.title;
    if (otherFields.description !== undefined) updateData.description = otherFields.description;
    if (otherFields.imageUrl !== undefined) updateData.imageUrl = otherFields.imageUrl;
    if (otherFields.order !== undefined) updateData.order = otherFields.order;

    const updatedSliderImage = await prisma.sliderImage.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ 
      success: true, 
      message: "Slider image updated successfully",
      sliderImage: updatedSliderImage 
    });
  } catch (error) {
    console.error("Error updating slider image:", error);
    return NextResponse.json(
      { error: "Failed to update slider image" },
      { status: 500 }
    );
  }
} 