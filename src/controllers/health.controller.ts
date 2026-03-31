import type { Request, Response } from "express";

export function healthController(_req: Request, res: Response): void {
  res.status(200).json({
    status: "ok",
    service: "sentiment-server",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
}
