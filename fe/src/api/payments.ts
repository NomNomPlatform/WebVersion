import { apiClient } from "./apiClient";
import type { Payment, InitiatePaymentPayload } from "@/types";

/**
 * paymentsApi — wraps the 3 payment endpoints exposed by payment-service via gateway.
 *
 * POST  /api/payments            — initiate a payment for an order
 * GET   /api/payments/{orderId}  — retrieve payment record by orderId
 * POST  /api/payments/{id}/refund — refund a COMPLETED payment (by payment id, NOT orderId)
 */
export const paymentsApi = {
  /** Initiate a payment (mock 90 % success). Returns the created Payment record. */
  initiate: (payload: InitiatePaymentPayload) =>
    apiClient.post<Payment>("/payments", payload).then((r) => r.data),

  /** Fetch the payment record associated with a given orderId. */
  getByOrderId: (orderId: string) =>
    apiClient
      .get<Payment>(`/payments/${orderId}`)
      .then((r) => r.data),

  /** Refund a COMPLETED payment. Uses the payment's own id (not orderId). */
  refund: (paymentId: string) =>
    apiClient
      .post<Payment>(`/payments/${paymentId}/refund`)
      .then((r) => r.data),
};
