import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'], // Removed 'query' for better performance
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        },
        // Performance optimizations
        __internal: {
            engine: {
                // Optimized connection settings
                connectionLimit: 5, // Reduced for better performance
                queryTimeout: 15000, // Reduced timeout
                connectionTimeout: 5000, // Reduced timeout
                // Connection pooling with optimized settings
                pool: {
                    min: 1,
                    max: 5, // Reduced max connections
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

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Graceful shutdown with timeout
process.on('beforeExit', async () => {
    try {
        await Promise.race([
            prisma.$disconnect(),
            new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
        ])
    } catch (error) {
        console.error('Error disconnecting Prisma:', error)
    }
})

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error)
    try {
        await prisma.$disconnect()
    } catch (disconnectError) {
        console.error('Error disconnecting Prisma on uncaught exception:', disconnectError)
    }
    process.exit(1)
})
