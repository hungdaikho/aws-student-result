import { PrismaClient } from '@prisma/client'

// We keep a global reference in dev to avoid exhausting connections on hot reload.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

// Lazily create a Prisma client ONLY if DATABASE_URL is present. This prevents
// Next.js build (page data collection) from crashing in environments where the
// legacy Postgres database isn't configured (e.g. Dynamo-only deployments).
export const prisma: PrismaClient | undefined = (() => {
    if (!process.env.DATABASE_URL) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️  DATABASE_URL not set – Prisma client disabled for this build.')
        }
        return undefined
    }
    const client = globalForPrisma.prisma ?? new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        datasources: { db: { url: process.env.DATABASE_URL } },
        // Internal tuning (safe to leave as-is)
        // @ts-expect-error __internal is not officially typed
        __internal: {
            engine: {
                connectionLimit: 5,
                queryTimeout: 15000,
                connectionTimeout: 5000,
                pool: {
                    min: 1,
                    max: 5,
                    acquireTimeoutMillis: 15000,
                    createTimeoutMillis: 15000,
                    destroyTimeoutMillis: 3000,
                    idleTimeoutMillis: 15000,
                    reapIntervalMillis: 500,
                    createRetryIntervalMillis: 100,
                }
            }
        }
    })
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client
    return client
})()

// Helper to explicitly require Prisma when an endpoint truly depends on it.
export function requirePrisma(): PrismaClient {
    if (!prisma) {
        throw new Error('DATABASE_URL not configured – this endpoint requires PostgreSQL.')
    }
    return prisma
}

// Graceful shutdown with timeout
if (prisma) {
    process.on('beforeExit', async () => {
        try {
            await Promise.race([
                prisma.$disconnect(),
                new Promise(resolve => setTimeout(resolve, 5000))
            ])
        } catch (error) {
            console.error('Error disconnecting Prisma:', error)
        }
    })
}

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error)
    try {
        if (prisma) await prisma.$disconnect()
    } catch (disconnectError) {
        console.error('Error disconnecting Prisma on uncaught exception:', disconnectError)
    }
    process.exit(1)
})
