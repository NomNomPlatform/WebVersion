import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LoginResponse, Role } from "@/types";
import { clearToken, setToken } from "@/api/apiClient";

export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
  /** Tên hiển thị — kéo về từ /users/me hoặc login response (Google trả fullName). */
  fullName?: string;
  /** URL ảnh đại diện. */
  avatarUrl?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (res: LoginResponse) => void;
  logout: () => void;
  setProfile: (patch: Partial<Pick<AuthUser, "fullName" | "avatarUrl">>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (res) => {
        setToken(res.token);
        set({
          token: res.token,
          user: { userId: res.userId, email: res.email, role: res.role },
          isAuthenticated: true,
        });
      },
      logout: () => {
        clearToken();
        set({ token: null, user: null, isAuthenticated: false });
      },
      setProfile: (patch) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : state.user,
        })),
    }),
    {
      name: "nomnom_auth",
    }
  )
);
