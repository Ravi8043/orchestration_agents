import { Queue } from "bullmq";
import { env } from "../../config/env.js";
import { getRedisConnection } from "../../config/redis.js";

export interface AnalysisJobData {
  runId: string;
}

let analysisQueue: Queue<AnalysisJobData> | null = null;

function getAnalysisQueue(): Queue<AnalysisJobData> {
  analysisQueue ??= new Queue<AnalysisJobData>(env.ANALYSIS_QUEUE_NAME, {
    connection: getRedisConnection()
  });

  return analysisQueue;
}

export async function enqueueAnalysisJob(data: AnalysisJobData): Promise<void> {
  await getAnalysisQueue().add("run-analysis", data, {
    jobId: data.runId,
    attempts: env.ANALYSIS_RETRY_ATTEMPTS,
    backoff: { type: "fixed", delay: env.ANALYSIS_BACKOFF_MS },
    removeOnComplete: 200,
    removeOnFail: 200
  });
}

export async function cancelAnalysisJob(runId: string): Promise<boolean> {
  const job = await getAnalysisQueue().getJob(runId);
  if (!job) return false;

  const state = await job.getState();
  if (state === "active") return false;

  await job.remove();
  return true;
}
