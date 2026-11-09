import { apiClient } from "./apiClient";
import type { Category, MenuItem, PageResponse } from "@/types";

export interface MenuItemPayload {
  name: string;
  description: string;
  price: number;
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  category: Category;
  imageUrl?: string;
  isAvailable?: boolean;
}

export const menuApi = {
  listByRestaurant: (
    restaurantId: string,
    opts: { category?: Category; page?: number; size?: number } = {}
  ) =>
    apiClient
      .get<PageResponse<MenuItem>>(`/restaurants/${restaurantId}/items`, {
        params: {
          category: opts.category,
          page: opts.page ?? 0,
          size: opts.size ?? 50,
        },
      })
      .then((r) => r.data),

  create: (restaurantId: string, payload: MenuItemPayload) =>
    apiClient
      .post<MenuItem>(`/restaurants/${restaurantId}/items`, payload)
      .then((r) => r.data),

  update: (itemId: string, payload: Partial<MenuItemPayload>) =>
    apiClient.put<MenuItem>(`/items/${itemId}`, payload).then((r) => r.data),

  remove: (itemId: string) =>
    apiClient.delete(`/items/${itemId}`).then((r) => r.data),
};
