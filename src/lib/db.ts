import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

/**
 * One Prisma client per process, created on first use so importing the data layer opens no pool.
 * Uses Neon's pooled DATABASE_URL (migrations use DATABASE_URL_UNPOOLED, see prisma.config.ts).
 * shortcut: no attachDatabasePool from @vercel/functions yet, add it when deploying to Vercel Fluid compute.
 */
export function db(): PrismaClient {
  const url = process.env["DATABASE_URL"];
  if (!url)
    throw new Error(
      "DATABASE_URL is not set: run `neon env pull`, or set CATALOG_SOURCE=mock to use the mock catalog",
    );
  globalForPrisma.prisma ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  return globalForPrisma.prisma;
}
