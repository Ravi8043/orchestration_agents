import { Queue } from "bullmq";
import { env } from "../../config/env.js";
import { redisConnection } from "../../config/redis.js";

export interface AnalysisJobData {
  runId: string;
}

export const analysisQueue = new Queue<AnalysisJobData>(env.ANALYSIS_QUEUE_NAME, {
  connection: redisConnection
});

export async function enqueueAnalysisJob(data: AnalysisJobData): Promise<void> {
  await analysisQueue.add("run-analysis", data, {
    attempts: env.ANALYSIS_RETRY_ATTEMPTS,
    backoff: { type: "fixed", delay: env.ANALYSIS_BACKOFF_MS },
    removeOnComplete: 200,
    removeOnFail: 200
  });
}
