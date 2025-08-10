import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const tests = {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION || "local",
      vercelUrl: process.env.VERCEL_URL || "local",
      maxMemory: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || "unknown",
      runtime: process.env.AWS_EXECUTION_ENV || "local",
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json({
      status: "OK",
      message: "Upload API is accessible",
      tests,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    return NextResponse.json({
      status: "OK",
      message: "POST method is working",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
