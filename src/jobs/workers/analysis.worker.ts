import { Worker } from "bullmq";
import { env } from "../../config/env.js";
import { disconnectRedis, getRedisConnection } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { connectDb, disconnectDb } from "../../config/db.js";
import { processRunAnalysis } from "../processors/run-analysis.processor.js";

async function startWorker(): Promise<void> {
  await connectDb();

  const worker = new Worker(
    env.ANALYSIS_QUEUE_NAME,
    async (job) => {
      await processRunAnalysis(job.data.runId);
    },
    { connection: getRedisConnection() }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, runId: job.data.runId }, "Analysis job completed");
  });

  worker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, runId: job?.data.runId, err: error }, "Analysis job failed");
  });

  const shutdown = async () => {
    await worker.close();
    await disconnectRedis();
    await disconnectDb();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  logger.info("Analysis worker started");
}

startWorker().catch((error) => {
  logger.error({ err: error }, "Worker startup failed");
  process.exit(1);
});
