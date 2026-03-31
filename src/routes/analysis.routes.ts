import { Router } from "express";
import { triggerAnalysisController } from "../controllers/analysis.controller.js";
import { analysisRateLimiter } from "../middleware/rate-limit.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { analyzeRequestSchema } from "../schemas/analysis.schema.js";

export const analysisRouter = Router();

analysisRouter.post("/analysis", analysisRateLimiter, validateBody(analyzeRequestSchema), triggerAnalysisController);
