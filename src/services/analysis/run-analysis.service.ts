import { AnalysisRunRepository } from "../../repositories/analysis-run.repository.js";
import { OrchestratorService } from "../agents/orchestrator.service.js";
import { secondsBetween } from "../../lib/utils/time.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../lib/errors/app-error.js";

export class RunAnalysisService {
  private readonly runRepository = new AnalysisRunRepository();
  private readonly orchestrator = new OrchestratorService();

  /**
   * Execute a full analysis pipeline for a given run.
   *
   * Flow:
   *   1. Load run from DB
   *   2. Mark RUNNING
   *   3. Build dataset (news + price)
   *   4. Run multi-agent orchestration
   *   5. Persist results
   *
   * Called by the BullMQ processor.
   */
  async execute(runId: string): Promise<void> {
    const run = await this.runRepository.findById(runId);
    if (!run) {
      throw new AppError("Analysis run not found", 404);
    }
    if (run.status === "CANCELLED") {
      logger.info({ runId }, "RunAnalysisService: skipping cancelled run");
      return;
    }

    const startedAt = new Date();
    await this.runRepository.markRunning(runId, env.LLM_MODEL);

    logger.info(
      { runId, ticker: run.ticker, timeframe: run.timeframe },
      "RunAnalysisService: starting execution"
    );

    try {
      const context = {
        runId,
        ticker: run.ticker,
        timeframe: run.timeframe,
        includeSocial: run.includeSocial,
      };
      await this.assertRunIsNotCancelled(runId);

      const result = await this.orchestrator.run(context);
      await this.assertRunIsNotCancelled(runId);

      await this.runRepository.markCompleted({
        id: runId,
        agentOutputs: result.agentOutputs,
        consensusData: result.consensus,
        toolTrace: result.toolTrace,
        debateTrace: result.debateTrace,
        executionTimeSec: secondsBetween(startedAt, new Date()),
        newsSourcesCount: this.countNewsSources(result.toolTrace),
        priceDataPoints: this.countPriceDataPoints(result.toolTrace),
      });

      logger.info(
        {
          runId,
          ticker: run.ticker,
          action: result.consensus.action,
          executionTimeSec: secondsBetween(startedAt, new Date()),
        },
        "RunAnalysisService: execution completed"
      );
    } catch (error) {
      const currentRun = await this.runRepository.findById(runId);
      if (currentRun?.status === "CANCELLED") {
        logger.info({ runId, ticker: run.ticker }, "RunAnalysisService: stopped cancelled run");
        return;
      }

      await this.runRepository.incrementRetryCount(runId);
      await this.runRepository.markFailed(
        runId,
        error instanceof Error ? error.message : "Unknown analysis failure"
      );

      logger.error(
        { runId, ticker: run.ticker, err: error },
        "RunAnalysisService: execution failed"
      );

      throw error;
    }
  }

  private async assertRunIsNotCancelled(runId: string): Promise<void> {
    const currentRun = await this.runRepository.findById(runId);
    if (currentRun?.status === "CANCELLED") {
      throw new AppError("Analysis run was cancelled", 409, true);
    }
  }

  private countNewsSources(toolTrace: Array<{ toolName: string; outputSummary: string }>): number {
    const newsCall = toolTrace.find((entry) => entry.toolName === "get_company_news");
    if (!newsCall) return 0;

    const match = newsCall.outputSummary.match(/^(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  private countPriceDataPoints(toolTrace: Array<{ toolName: string; outputSummary: string }>): number {
    const priceCall = toolTrace.find((entry) => entry.toolName === "get_price_snapshot");
    if (!priceCall) return 0;

    const match = priceCall.outputSummary.match(/,\s*(\d+)\s+recent candles/);
    return match ? Number(match[1]) : 0;
  }
}
