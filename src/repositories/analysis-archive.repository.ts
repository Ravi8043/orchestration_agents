import { prisma } from "../config/db.js";

export class AnalysisArchiveRepository {
  async create(input: {
    analysisRunId: string;
    actualOutcome?: string;
    actualPriceChange?: number;
  }): Promise<void> {
    await prisma.analysisArchive.create({
      data: {
        analysisRunId: input.analysisRunId,
        actualOutcome: input.actualOutcome,
        actualPriceChange: input.actualPriceChange
      }
    });
  }
}
