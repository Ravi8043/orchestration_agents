import { Router } from "express";
import { analysisRouter } from "./analysis.routes.js";
import { healthRouter } from "./health.routes.js";
import { runsRouter } from "./runs.routes.js";
import { chatbotRouter } from "./chatbot.routes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(analysisRouter);
apiRouter.use(runsRouter);
apiRouter.use(chatbotRouter);
