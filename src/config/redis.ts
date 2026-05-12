import { Redis } from "ioredis";
import { env } from "./env.js";

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  redisConnection ??= new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null
  });

  return redisConnection;
}

export async function disconnectRedis(): Promise<void> {
  if (!redisConnection) return;

  await redisConnection.quit();
  redisConnection = null;
}
