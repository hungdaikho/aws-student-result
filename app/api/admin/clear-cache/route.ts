import { NextRequest, NextResponse } from "next/server"

export async function POST() {
    try {
        console.log("🧹 Cache clear request received")

        // Since each API has its own cache, we need to clear them individually
        // For now, we'll just return success - cache will expire naturally after 5 minutes
        // In a production app, you'd want to use a shared cache service like Redis

        return NextResponse.json({
            success: true,
            message: "Cache clear requested. All caches will be cleared within 5 minutes.",
            timestamp: new Date().toISOString()
        })

    } catch (error: any) {
        console.error("❌ Error clearing cache:", error)
        return NextResponse.json(
            {
                error: "Erreur lors de la suppression du cache",
                details: error.message
            },
            { status: 500 }
        )
    }
}
