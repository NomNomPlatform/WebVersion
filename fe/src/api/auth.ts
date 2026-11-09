import { apiClient } from "./apiClient";
import type {
  HealthResponse,
  LoginResponse,
  Role,
  User,
  PageResponse,
  ActivityLevel,
  Gender,
} from "@/types";

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface GoogleLoginPayload {
  /** id_token trả về bởi Google Identity Services (gapi/GSI). */
  idToken: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  avatarUrl?: string | null;
  height?: number | null;
  weight?: number | null;
  age?: number | null;
  gender?: Gender | null;
  activityLevel?: ActivityLevel | null;
}

export const authApi = {
  listUsers: (page = 0, size = 10) =>
    apiClient
      .get<PageResponse<User>>("/users/admin/all", { params: { page, size } })
      .then((r) => r.data),

  register: (payload: RegisterPayload) =>
    apiClient
      .post<LoginResponse>("/auth/register", payload)
      .then((r) => r.data),

  login: (payload: LoginPayload) =>
    apiClient.post<LoginResponse>("/auth/login", payload).then((r) => r.data),

  /** Đăng nhập bằng Google — FE gửi id_token do Google Identity Services cấp. */
  googleLogin: (payload: GoogleLoginPayload) =>
    apiClient
      .post<LoginResponse>("/auth/google", payload)
      .then((r) => r.data),

  me: () => apiClient.get<User>("/users/me").then((r) => r.data),

  updateMe: (payload: UpdateProfilePayload) =>
    apiClient.put<User>("/users/me", payload).then((r) => r.data),

  health: () =>
    apiClient.get<HealthResponse>("/users/me/health").then((r) => r.data),

  /**
   * Upload ảnh đại diện (multipart/form-data, field name = "file").
   * Trả về {@code UserResponse} mới với {@code avatarUrl} là URL tương đối
   * trỏ tới {@code GET /api/users/avatars/&lt;uuid&gt;.&lt;ext&gt;}.
   */
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient
      .post<User>("/users/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
