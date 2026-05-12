import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";
import { logger } from "./logger.js";

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: ["warn", "error"]
} as any);

export async function connectDb(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info("Postgres connected");
  } catch (err) {
    logger.error({ err }, "DB connection failed");
    process.exit(1);
  }
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
  logger.info("Postgres disconnected");
}