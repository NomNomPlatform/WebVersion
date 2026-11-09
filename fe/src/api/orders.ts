import { apiClient } from "./apiClient";
import type { Order, OrderStatus, PageResponse } from "@/types";

export interface CreateOrderPayload {
  restaurantId: string;
  deliveryAddress: string;
  note?: string;
  items: { menuItemId: string; quantity: number }[];
  /** Phương thức thanh toán: "cash" | "vnpay" | "card" */
  paymentMethod?: string;
}

/** Response từ POST /api/orders — chứa order và paymentUrl (nếu VNPAY) */
export interface CreateOrderResponse {
  order: Order;
  paymentUrl?: string | null;
}

export const ordersApi = {
  create: (payload: CreateOrderPayload) =>
    apiClient
      .post<CreateOrderResponse>("/orders", {
        ...payload,
        paymentMethod: (payload.paymentMethod ?? "cash").toUpperCase(),
      })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),

  myOrders: (page = 0, size = 10) =>
    apiClient
      .get<PageResponse<Order>>("/orders/me", { params: { page, size } })
      .then((r) => r.data),

  restaurantOrders: (restaurantId: string, page = 0, size = 20) =>
    apiClient
      .get<PageResponse<Order>>(`/orders/restaurant/${restaurantId}`, { params: { page, size } })
      .then((r) => r.data),

  listAllForAdmin: (page = 0, size = 20) =>
    apiClient
      .get<PageResponse<Order>>("/orders/admin/all", { params: { page, size } })
      .then((r) => r.data),

  updateStatus: (id: string, status: OrderStatus) =>
    apiClient
      .put<Order>(`/orders/${id}/status`, { status })
      .then((r) => r.data),

  confirmDelivery: (id: string) =>
    apiClient.put<void>(`/orders/${id}/delivered`).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.delete(`/orders/${id}`).then((r) => r.data),
};
