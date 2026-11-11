import type { Request, Response } from "express";
import { processExpiredTransactions } from "../services/scheduler.service";
import { sendSuccess } from "../utils/response";

export async function processExpiredTransactionsHandler(req: Request, res: Response) {
  // In production, an external cron passes an internal secret or bearer token
  const result = await processExpiredTransactions();
  return sendSuccess(res, 200, "Expired transactions processed successfully", result);
}

