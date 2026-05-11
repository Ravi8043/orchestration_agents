import { AnalysisRunRepository } from "../../repositories/analysis-run.repository.js";
import { OrchestratorService } from "../agents/orchestrator.service.js";
import { DatasetService } from "../market/dataset.service.js";
import { secondsBetween } from "../../lib/utils/time.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../lib/errors/app-error.js";

export class RunAnalysisService {
  private readonly runRepository = new AnalysisRunRepository();
  private readonly orchestrator = new OrchestratorService();
  private readonly datasetService = new DatasetService();

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

    const startedAt = new Date();
    await this.runRepository.markRunning(runId, env.LLM_MODEL);

    logger.info(
      { runId, ticker: run.ticker, timeframe: run.timeframe },
      "RunAnalysisService: starting execution"
    );

    try {
      // Phase 1: Build the aggregated dataset
      const dataset = await this.datasetService.buildDataset({
        ticker: run.ticker,
        timeframe: run.timeframe,
        includeSocial: run.includeSocial,
      });

      // Phase 2: Run multi-agent orchestration
      const result = await this.orchestrator.run(dataset);

      // Phase 3: Persist results
      await this.runRepository.markCompleted({
        id: runId,
        agentOutputs: result.agentOutputs,
        consensusData: result.consensus,
        executionTimeSec: secondsBetween(startedAt, new Date()),
        newsSourcesCount: dataset.newsData.count,
        priceDataPoints: dataset.priceData.dataPoints,
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
}
