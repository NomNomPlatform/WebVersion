import axios, { AxiosError } from "axios";
import type { ApiError } from "@/types";

const TOKEN_KEY = "nomnom_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) =>
  localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/** Axios instance đi qua API gateway (Vite proxy /api -> :8080) */
export const apiClient = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Tự inject JWT vào mọi request
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Bắt 401 -> clear token & điều hướng về login
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      clearToken();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/** Trích message lỗi thân thiện từ ApiError */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    return apiError?.message ?? error.message;
  }
  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}
