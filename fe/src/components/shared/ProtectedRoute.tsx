import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import type { Role } from "@/types";

interface ProtectedRouteProps {
  /** Nếu set, chỉ cho phép các role này; sai role -> về trang chủ */
  allow?: Role[];
}

export function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allow && user && !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
