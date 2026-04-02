import { Redis } from "ioredis";
import { RedisMemoryServer } from "redis-memory-server";

const redisServer = new RedisMemoryServer();
const host = await redisServer.getHost();
const port = await redisServer.getPort();

export const redisConnection = new Redis(port, host, {
  maxRetriesPerRequest: null
});
