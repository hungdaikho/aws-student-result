import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const examType = searchParams.get('examType') || 'CONCOURS'

    const whereClause: any = { examType }
    if (year) {
      whereClause.year = parseInt(year)
    }

    const thresholds = await prisma.concoursThreshold.findMany({
      where: whereClause,
      orderBy: [
        { year: 'desc' },
        { wilaya: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: thresholds
    })
  } catch (error) {
    console.error('Error fetching concours thresholds:', error)
    return NextResponse.json(
      { error: 'Failed to fetch thresholds' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { year, examType, wilaya, threshold, description } = body

    // Validate required fields
    if (!year || !examType || threshold === undefined) {
      return NextResponse.json(
        { error: 'Year, examType, and threshold are required' },
        { status: 400 }
      )
    }

    // Create or update threshold
    const thresholdData = await prisma.concoursThreshold.upsert({
      where: {
        year_examType_wilaya: {
          year: parseInt(year),
          examType,
          wilaya: wilaya || null
        }
      },
      update: {
        threshold: parseFloat(threshold),
        description,
        updatedAt: new Date()
      },
      create: {
        year: parseInt(year),
        examType,
        wilaya: wilaya || null,
        threshold: parseFloat(threshold),
        description
      }
    })

    return NextResponse.json({
      success: true,
      data: thresholdData
    })
  } catch (error) {
    console.error('Error creating/updating concours threshold:', error)
    return NextResponse.json(
      { error: 'Failed to save threshold' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Threshold ID required' },
        { status: 400 }
      )
    }

    await prisma.concoursThreshold.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting concours threshold:', error)
    return NextResponse.json(
      { error: 'Failed to delete threshold' },
      { status: 500 }
    )
  }
}


