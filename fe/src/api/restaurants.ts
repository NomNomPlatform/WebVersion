import { apiClient } from "./apiClient";
import type { PageResponse, Restaurant } from "@/types";

export interface RestaurantPayload {
  name: string;
  description: string;
  address: string;
  phone: string;
  cuisineType: string;
  imageUrl?: string;
}

export const restaurantsApi = {
  list: (page = 0, size = 12) =>
    apiClient
      .get<PageResponse<Restaurant>>("/restaurants", {
        params: { page, size },
      })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Restaurant>(`/restaurants/${id}`).then((r) => r.data),

  getMy: () =>
    apiClient.get<Restaurant | null>("/restaurants/my").then((r) => r.data ? r.data : null),

  create: (payload: RestaurantPayload) =>
    apiClient.post<Restaurant>("/restaurants", payload).then((r) => r.data),

  update: (id: string, payload: Partial<RestaurantPayload>) =>
    apiClient
      .put<Restaurant>(`/restaurants/${id}`, payload)
      .then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/restaurants/${id}`).then((r) => r.data),

  getPending: (page = 0, size = 50) =>
    apiClient
      .get<PageResponse<Restaurant>>("/restaurants/admin/pending", {
        params: { page, size },
      })
      .then((r) => r.data),

  getAllForAdmin: (page = 0, size = 100) =>
    apiClient
      .get<PageResponse<Restaurant>>("/restaurants/admin/all", {
        params: { page, size },
      })
      .then((r) => r.data),

  approve: (id: string) =>
    apiClient.post<Restaurant>(`/restaurants/admin/${id}/approve`).then((r) => r.data),

  reject: (id: string, reason?: string) =>
    apiClient.post<Restaurant>(`/restaurants/admin/${id}/reject`, reason).then((r) => r.data),

  resubmit: (id: string) =>
    apiClient.post<Restaurant>(`/restaurants/${id}/resubmit`).then((r) => r.data),

  suspend: (id: string, reason?: string) =>
    apiClient.post<Restaurant>(`/restaurants/admin/${id}/suspend`, reason).then((r) => r.data),

  activate: (id: string) =>
    apiClient.post<Restaurant>(`/restaurants/admin/${id}/activate`).then((r) => r.data),
};
