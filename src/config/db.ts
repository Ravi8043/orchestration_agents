import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";
import { logger } from "./logger.js";

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: ["warn", "error"]
} as any);

export async function connectDb(): Promise<void> {
  await prisma.$connect();
  logger.info("Postgres connected");
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
  logger.info("Postgres disconnected");
}
