import { Router } from "express";
import {
  cancelRunController,
  getRunController,
  listRunsController,
  statsController
} from "../controllers/runs.controller.js";

export const runsRouter = Router();

runsRouter.get("/runs/:id", getRunController);
runsRouter.get("/runs", listRunsController);
runsRouter.delete("/runs/:id", cancelRunController);
runsRouter.get("/stats", statsController);
