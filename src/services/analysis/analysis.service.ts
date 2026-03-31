import type { RunStatus } from "@prisma/client";
import { AnalysisRunRepository } from "../../repositories/analysis-run.repository.js";
import { enqueueAnalysisJob } from "./queue.service.js";
import type { AnalyzeRequestInput } from "../../schemas/analysis.schema.js";
import { AppError } from "../../lib/errors/app-error.js";

export class AnalysisService {
  private readonly runRepository = new AnalysisRunRepository();

  async trigger(input: AnalyzeRequestInput) {
    const recentCutoff = new Date(Date.now() - 2 * 60 * 1000);
    const existingRun = await this.runRepository.findRecentPendingOrRunning(input.ticker, recentCutoff);

    if (existingRun) {
      return {
        runId: existingRun.id,
        status: existingRun.status,
        estimatedTime: 45,
        pollUrl: `/api/runs/${existingRun.id}`,
        message: "Using existing pending analysis"
      };
    }

    const run = await this.runRepository.create({
      ticker: input.ticker,
      timeframe: input.timeframe,
      includeSocial: input.includeSocial
    });

    await enqueueAnalysisJob({ runId: run.id });

    return {
      runId: run.id,
      status: "RUNNING" as RunStatus,
      estimatedTime: 45,
      pollUrl: `/api/runs/${run.id}`
    };
  }

  async getRun(runId: string) {
    const run = await this.runRepository.findById(runId);
    if (!run) {
      throw new AppError("Run not found", 404);
    }

    if (run.status === "PENDING" || run.status === "RUNNING") {
      const elapsedTime = Math.floor((Date.now() - run.createdAt.getTime()) / 1000);
      return {
        runId: run.id,
        status: run.status,
        message: "Analysis in progress. Agents are debating.",
        elapsedTime,
        estimatedCompletion: new Date(run.createdAt.getTime() + 45_000).toISOString()
      };
    }

    if (run.status === "FAILED" || run.status === "CANCELLED") {
      return {
        runId: run.id,
        status: run.status,
        error: run.errorMessage ?? "Analysis failed"
      };
    }

    const agentOutputs = Array.isArray(run.agentOutputs) ? run.agentOutputs : [];
    return {
      runId: run.id,
      ticker: run.ticker,
      timeframe: run.timeframe,
      includeSocial: run.includeSocial,
      status: run.status,
      agents: agentOutputs,
      consensus: run.consensusData,
      metadata: {
        llmModel: run.llmModel,
        createdAt: run.createdAt,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        executionTimeSec: run.executionTimeSec,
        retryCount: run.retryCount,
        newsSourcesCount: run.newsSourcesCount,
        priceDataPoints: run.priceDataPoints
      }
    };
  }

  async listRuns(params: { limit: number; ticker?: string; status?: RunStatus }) {
    return this.runRepository.listRecent(params);
  }

  async cancelRun(runId: string) {
    const run = await this.runRepository.findById(runId);
    if (!run) {
      throw new AppError("Run not found", 404);
    }
    if (run.status === "COMPLETED" || run.status === "FAILED" || run.status === "CANCELLED") {
      throw new AppError(`Cannot cancel ${run.status.toLowerCase()} run`, 400);
    }

    await this.runRepository.markCancelled(runId);
    return { message: "Analysis cancelled", runId };
  }

  async stats() {
    return this.runRepository.stats();
  }
}
