import { apiClient } from "./apiClient";
import type { Notification, PageResponse } from "@/types";

export const notificationsApi = {
  list: (page = 0, size = 20) =>
    apiClient
      .get<PageResponse<Notification>>("/notifications", {
        params: { page, size },
      })
      .then((r) => r.data),

  markAsRead: (id: string) =>
    apiClient.put<void>(`/notifications/${id}/read`).then((r) => r.data),
};
