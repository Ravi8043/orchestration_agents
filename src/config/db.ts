import { PrismaClient } from "../generated/prisma/client.js";
import { logger } from "./logger.js";

export const prisma = new PrismaClient({
  log: ["warn", "error"]
} as any);

export async function connectDb(): Promise<void> {
  await prisma.$connect();
  logger.info("Postgres connected");
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
  logger.info("Postgres disconnected");
}
