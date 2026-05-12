import type { Request, Response } from "express";
import { AnalysisService } from "../services/analysis/analysis.service.js";

const analysisService = new AnalysisService(); //creating an obj of the service

export async function triggerAnalysisController(req: Request, res: Response): Promise<void> {
  const result = await analysisService.trigger(req.body);
  res.status(202).json(result);
}
