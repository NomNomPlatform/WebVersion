import { apiClient } from "./apiClient";
import type {
  RecommendationConfigResponse,
  RecommendationRequest,
  RecommendationResponse,
} from "@/types";

export const recommendationsApi = {
  recommend: (payload: RecommendationRequest) =>
    apiClient
      .post<RecommendationResponse>("/recommendations", payload)
      .then((r) => r.data),

  /** Kiểm tra AI có enabled không — FE dùng để ẩn/hiện checkbox. */
  getConfig: () =>
    apiClient
      .get<RecommendationConfigResponse>("/recommendations/config")
      .then((r) => r.data),
};
