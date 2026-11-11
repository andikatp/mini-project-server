import type { Request, Response } from "express";
import {
  cancelOrganizerEvent,
  createEventVoucher,
  createOrganizerEvent,
  createTicketType,
  getEventVouchers,
  getPublicEventDetail,
  listCategories,
  listPublicEvents,
  publishOrganizerEvent,
  updateEventVoucher,
  updateOrganizerEvent,
  updateTicketType,
} from "../services/event.service";
import { sendSuccess } from "../utils/response";

export async function listCategoriesHandler(_req: Request, res: Response) {
  const categories = await listCategories();
  return sendSuccess(res, 200, "Categories retrieved successfully", categories);
}

export async function listPublicEventsHandler(req: Request, res: Response) {
  const result = await listPublicEvents({
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 10,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    category: typeof req.query.category === "string" ? req.query.category : undefined,
    city: typeof req.query.city === "string" ? req.query.city : undefined,
  });
  return sendSuccess(res, 200, "Events retrieved successfully", result);
}

export async function getPublicEventDetailHandler(req: Request, res: Response) {
  const eventId = String(req.params.eventId);
  const event = await getPublicEventDetail(eventId);
  return sendSuccess(res, 200, "Event detail retrieved successfully", event);
}

export async function createOrganizerEventHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const event = await createOrganizerEvent(organizerId, req.body);
  return sendSuccess(res, 201, "Event created successfully", event);
}

export async function updateOrganizerEventHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const eventId = String(req.params.eventId);
  const event = await updateOrganizerEvent(organizerId, eventId, req.body);
  return sendSuccess(res, 200, "Event updated successfully", event);
}

export async function publishOrganizerEventHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const eventId = String(req.params.eventId);
  const event = await publishOrganizerEvent(organizerId, eventId);
  return sendSuccess(res, 200, "Event published successfully", event);
}

export async function cancelOrganizerEventHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const eventId = String(req.params.eventId);
  const event = await cancelOrganizerEvent(organizerId, eventId);
  return sendSuccess(res, 200, "Event canceled successfully", event);
}

export async function createTicketTypeHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const eventId = String(req.params.eventId);
  const ticket = await createTicketType(organizerId, eventId, req.body);
  return sendSuccess(res, 201, "Ticket type created successfully", ticket);
}

export async function updateTicketTypeHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const ticketTypeId = String(req.params.ticketTypeId);
  const ticket = await updateTicketType(organizerId, ticketTypeId, req.body);
  return sendSuccess(res, 200, "Ticket type updated successfully", ticket);
}

export async function createEventVoucherHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const eventId = String(req.params.eventId);
  const voucher = await createEventVoucher(organizerId, eventId, req.body);
  return sendSuccess(res, 201, "Event voucher created successfully", voucher);
}

export async function getEventVouchersHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const eventId = String(req.params.eventId);
  const vouchers = await getEventVouchers(organizerId, eventId);
  return sendSuccess(res, 200, "Event vouchers retrieved successfully", vouchers);
}

export async function updateEventVoucherHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const voucherId = String(req.params.voucherId);
  const voucher = await updateEventVoucher(organizerId, voucherId, req.body);
  return sendSuccess(res, 200, "Event voucher updated successfully", voucher);
}

