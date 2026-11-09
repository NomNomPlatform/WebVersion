import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/api/auth";
import { getErrorMessage } from "@/api/apiClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userRole = useAuthStore((s) => s.user?.role);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await authApi.login(values);
      login(res);
      let from = (location.state as { from?: Location })?.from?.pathname;
      if (!from || from === "/") {
        if (res.role === "ADMIN") {
          from = "/admin";
        } else if (res.role === "RESTAURANT_OWNER") {
          from = "/owner";
        } else {
          from = "/";
        }
      }
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  // Nếu đã đăng nhập (vd qua Google) thì tự chuyển trang theo role — tránh user phải back.
  useEffect(() => {
    if (!isAuthenticated) return;
    let from = (location.state as { from?: Location })?.from?.pathname;
    if (!from || from === "/") {
      if (userRole === "ADMIN") from = "/admin";
      else if (userRole === "RESTAURANT_OWNER") from = "/owner";
      else from = "/";
    }
    navigate(from, { replace: true });
  }, [isAuthenticated, userRole, location.state, navigate]);

  return (
    <AuthLayout imageUrl={HERO_IMAGE_URL}>
      <img src="/logo.png" alt="NomNom" className="mb-6 mx-auto block h-44 w-auto object-contain" />

      <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Please enter your details to sign in.
      </p>

      <div className="mt-6">
        <OAuthButtons mode="login" />
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Or continue with email
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mật khẩu</Label>
            <Link
              to="#"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <PasswordInput id="password" {...register("password")} />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Đang đăng nhập..." : "Sign In"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <Link to="/register" className="font-semibold text-primary">
          Sign up for free
        </Link>
      </p>
    </AuthLayout>
  );
}
