import type { AnalysisRun, RunStatus, Prisma } from "../generated/prisma/client.js";
import { prisma } from "../config/db.js";
import type { AgentOutput, ConsensusData } from "../types/analysis.types.js";

type RunCreateInput = {
  ticker: string;
  timeframe: string;
  includeSocial: boolean;
  status?: RunStatus;
};

export class AnalysisRunRepository {
  async create(input: RunCreateInput): Promise<AnalysisRun> {
    return prisma.analysisRun.create({
      data: {
        ticker: input.ticker,
        timeframe: input.timeframe,
        includeSocial: input.includeSocial,
        status: input.status ?? "PENDING"
      }
    });
  }

  async findById(id: string): Promise<AnalysisRun | null> {
    return prisma.analysisRun.findUnique({ where: { id } });
  }

  async findRecentPendingOrRunning(ticker: string, since: Date): Promise<AnalysisRun | null> {
    return prisma.analysisRun.findFirst({
      where: {
        ticker,
        status: { in: ["PENDING", "RUNNING"] },
        createdAt: { gte: since }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async markRunning(id: string, llmModel: string): Promise<void> {
    await prisma.analysisRun.update({
      where: { id },
      data: { status: "RUNNING", startedAt: new Date(), llmModel }
    });
  }

  async markCompleted(input: {
    id: string;
    agentOutputs: AgentOutput[];
    consensusData: ConsensusData;
    executionTimeSec: number;
    newsSourcesCount: number;
    priceDataPoints: number;
  }): Promise<void> {
    await prisma.analysisRun.update({
      where: { id: input.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        executionTimeSec: input.executionTimeSec,
        agentOutputs: input.agentOutputs as unknown as Prisma.InputJsonValue,
        consensusData: input.consensusData as unknown as Prisma.InputJsonValue,
        newsSourcesCount: input.newsSourcesCount,
        priceDataPoints: input.priceDataPoints
      }
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await prisma.analysisRun.update({
      where: { id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage
      }
    });
  }

  async markCancelled(id: string): Promise<void> {
    await prisma.analysisRun.update({
      where: { id },
      data: { status: "CANCELLED", completedAt: new Date(), errorMessage: "Cancelled by user" }
    });
  }

  async incrementRetryCount(id: string): Promise<void> {
    await prisma.analysisRun.update({
      where: { id },
      data: { retryCount: { increment: 1 } }
    });
  }

  async listRecent(params: {
    limit: number;
    ticker?: string;
    status?: RunStatus;
  }): Promise<AnalysisRun[]> {
    return prisma.analysisRun.findMany({
      where: {
        ticker: params.ticker,
        status: params.status
      },
      orderBy: { createdAt: "desc" },
      take: params.limit
    });
  }

  async stats(): Promise<{
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    pendingRuns: number;
    topTickers: Array<{ ticker: string; count: number }>;
    runsLast24h: number;
  }> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [totalRuns, completedRuns, failedRuns, pendingRuns, topTickerRows, runsLast24h] =
      await Promise.all([
        prisma.analysisRun.count(),
        prisma.analysisRun.count({ where: { status: "COMPLETED" } }),
        prisma.analysisRun.count({ where: { status: "FAILED" } }),
        prisma.analysisRun.count({ where: { status: { in: ["PENDING", "RUNNING"] } } }),
        prisma.analysisRun.groupBy({
          by: ["ticker"],
          _count: { ticker: true },
          orderBy: { _count: { ticker: "desc" } },
          take: 10
        }),
        prisma.analysisRun.count({ where: { createdAt: { gte: dayAgo } } })
      ]);

    return {
      totalRuns,
      completedRuns,
      failedRuns,
      pendingRuns,
      topTickers: topTickerRows.map((row) => ({ ticker: row.ticker, count: row._count.ticker })),
      runsLast24h
    };
  }
}
