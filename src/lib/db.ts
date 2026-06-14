import 'server-only'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  if (tursoUrl && tursoToken) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const libsqlModule = require('@prisma/adapter-libsql')

      // Try both export names for compatibility
      const PrismaLibSql = libsqlModule.PrismaLibSql || libsqlModule.PrismaLibSQL

      if (!PrismaLibSql) {
        console.error('[db] ERROR: PrismaLibSql not found in @prisma/adapter-libsql. Available exports:', Object.keys(libsqlModule))
        // Fall through to local SQLite
      } else {
        const adapter = new PrismaLibSql({
          url: tursoUrl,
          authToken: tursoToken,
        })

        return new PrismaClient({ adapter })
      }
    } catch (err) {
      console.error('[db] ERROR: Failed to create Turso adapter:', err)
      // Fall through to local SQLite
    }
  }

  // Local SQLite for development
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

export function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

// Lazy-initialized singleton via Proxy
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb()
    const value = (client as Record<string, unknown>)[prop as string]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})
