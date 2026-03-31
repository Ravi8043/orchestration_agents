import { RunAnalysisService } from "../../services/analysis/run-analysis.service.js";

const runAnalysisService = new RunAnalysisService();

export async function processRunAnalysis(runId: string): Promise<void> {
  await runAnalysisService.execute(runId);
}
