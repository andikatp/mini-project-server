import type { Request, Response } from "express";
import { uploadImageToCloudinary } from "../services/cloudinary.service";
import {
  cancelTransactionByCustomer,
  createTransaction,
  getCustomerTransactions,
  getTransactionDetail,
  previewCheckout,
  uploadPaymentProof,
} from "../services/transaction.service";
import { compressImage } from "../utils/image.compress";
import { sendSuccess } from "../utils/response";
import { ValidationError } from "../errors";

export async function previewCheckoutHandler(req: Request, res: Response) {
  const customerId = req.user!.id;
  const { eventId, items, voucherCode, couponCode, usePoints } = req.body;
  const preview = await previewCheckout(
    customerId,
    eventId,
    items,
    voucherCode,
    couponCode,
    usePoints,
  );
  return sendSuccess(res, 200, "Checkout preview calculated successfully", preview);
}

export async function createTransactionHandler(req: Request, res: Response) {
  const customerId = req.user!.id;
  const { eventId, items, voucherCode, couponCode, usePoints } = req.body;
  const transaction = await createTransaction(
    customerId,
    eventId,
    items,
    voucherCode,
    couponCode,
    usePoints,
  );
  return sendSuccess(res, 201, "Transaction created successfully", transaction);
}

export async function getCustomerTransactionsHandler(req: Request, res: Response) {
  const customerId = req.user!.id;
  const transactions = await getCustomerTransactions(customerId);
  return sendSuccess(res, 200, "Transactions retrieved successfully", transactions);
}

export async function getTransactionDetailHandler(req: Request, res: Response) {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const transactionId = String(req.params.transactionId);
  const transaction = await getTransactionDetail(userId, userRole, transactionId);
  return sendSuccess(res, 200, "Transaction details retrieved successfully", transaction);
}

export async function cancelCustomerTransactionHandler(req: Request, res: Response) {
  const customerId = req.user!.id;
  const transactionId = String(req.params.transactionId);
  const canceled = await cancelTransactionByCustomer(customerId, transactionId);
  return sendSuccess(res, 200, "Transaction canceled successfully", canceled);
}

export async function uploadPaymentProofHandler(req: Request, res: Response) {
  const customerId = req.user!.id;
  const transactionId = String(req.params.transactionId);

  if (!req.file) {
    throw new ValidationError("Payment proof image file is required");
  }

  const compressed = await compressImage(req.file.buffer);
  const uploadResult = await uploadImageToCloudinary(compressed, {
    folder: "mini-project/payment-proofs",
  });

  const transaction = await uploadPaymentProof(
    customerId,
    transactionId,
    uploadResult.secure_url,
  );

  return sendSuccess(res, 200, "Payment proof uploaded successfully", transaction);
}
