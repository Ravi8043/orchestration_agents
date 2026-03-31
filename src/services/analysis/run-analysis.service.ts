import { AnalysisRunRepository } from "../../repositories/analysis-run.repository.js";
import { DatasetService } from "./dataset.service.js";
import { OrchestratorService } from "../agents/orchestrator.service.js";
import { secondsBetween } from "../../lib/utils/time.js";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors/app-error.js";

export class RunAnalysisService {
  private readonly runRepository = new AnalysisRunRepository();
  private readonly datasetService = new DatasetService();
  private readonly orchestrator = new OrchestratorService();

  async execute(runId: string): Promise<void> {
    const run = await this.runRepository.findById(runId);
    if (!run) {
      throw new AppError("Analysis run not found", 404);
    }

    const startedAt = new Date();
    await this.runRepository.markRunning(runId, env.LLM_MODEL);

    try {
      const dataset = await this.datasetService.buildDataset({
        ticker: run.ticker,
        timeframe: run.timeframe,
        includeSocial: run.includeSocial
      });
      const result = this.orchestrator.run(dataset);

      await this.runRepository.markCompleted({
        id: runId,
        agentOutputs: result.agentOutputs,
        consensusData: result.consensus,
        executionTimeSec: secondsBetween(startedAt, new Date()),
        newsSourcesCount: dataset.newsData.count,
        priceDataPoints: dataset.priceData.dataPoints
      });
    } catch (error) {
      await this.runRepository.incrementRetryCount(runId);
      await this.runRepository.markFailed(
        runId,
        error instanceof Error ? error.message : "Unknown analysis failure"
      );
      throw error;
    }
  }
}
