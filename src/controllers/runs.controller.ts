import type { Request, Response } from "express";
import type { RunStatus } from "../generated/prisma/enums.js";
import { AnalysisService } from "../services/analysis/analysis.service.js";

const analysisService = new AnalysisService();

export async function getRunController(req: Request, res: Response): Promise<void> {
  const result = await analysisService.getRun(req.params.id);
  res.status(200).json(result);
}

export async function listRunsController(req: Request, res: Response): Promise<void> {
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const ticker = typeof req.query.ticker === "string" ? req.query.ticker.toUpperCase() : undefined;
  const status = typeof req.query.status === "string" ? (req.query.status.toUpperCase() as RunStatus) : undefined;
  const result = await analysisService.listRuns({
    limit: Number.isNaN(limit) ? 20 : limit,
    ticker,
    status
  });
  res.status(200).json({ count: result.length, results: result });
}

export async function cancelRunController(req: Request, res: Response): Promise<void> {
  const result = await analysisService.cancelRun(req.params.id);
  res.status(200).json(result);
}

export async function statsController(_req: Request, res: Response): Promise<void> {
  const result = await analysisService.stats();
  res.status(200).json(result);
}
