import type { Request, Response } from "express";
import {
  acceptTransactionProof,
  getOrganizerDashboardSummary,
  getOrganizerDashboardTimeseries,
  getOrganizerEventAttendees,
  getOrganizerTransactions,
  rejectTransactionProof,
  getOrganizerEvents,
} from "../services/organizer.service";
import { sendSuccess } from "../utils/response";

export async function getDashboardSummaryHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const summary = await getOrganizerDashboardSummary(organizerId);
  return sendSuccess(res, 200, "Dashboard summary retrieved successfully", summary);
}

export async function getDashboardTimeseriesHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const granularity = (req.query.granularity as "day" | "month" | "year") || "day";
  const eventId = req.query.eventId as string | undefined;

  const timeseries = await getOrganizerDashboardTimeseries(organizerId, granularity, eventId);
  return sendSuccess(res, 200, "Dashboard timeseries retrieved successfully", timeseries);
}

export async function getEventAttendeesHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const eventId = String(req.params.eventId);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;

  const result = await getOrganizerEventAttendees(organizerId, eventId, page, limit, search);
  return sendSuccess(res, 200, "Event attendees retrieved successfully", result);
}

export async function getOrganizerTransactionsHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const result = await getOrganizerTransactions(organizerId, status, page, limit);
  return sendSuccess(res, 200, "Organizer transactions retrieved successfully", result);
}

export async function acceptTransactionHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const transactionId = String(req.params.transactionId);

  const updated = await acceptTransactionProof(organizerId, transactionId);
  return sendSuccess(res, 200, "Payment proof accepted successfully", updated);
}

export async function rejectTransactionHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const transactionId = String(req.params.transactionId);
  const { reason } = req.body;

  const updated = await rejectTransactionProof(organizerId, transactionId, reason);
  return sendSuccess(res, 200, "Payment proof rejected successfully", updated);
}

export async function getOrganizerEventsHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const events = await getOrganizerEvents(organizerId);
  return sendSuccess(res, 200, "Organizer events retrieved successfully", events);
}
