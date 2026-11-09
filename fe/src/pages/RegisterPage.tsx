import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/api/auth";
import { getErrorMessage } from "@/api/apiClient";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import type { Role } from "@/types";

const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80";

const schema = z.object({
  fullName: z.string().min(2, "Vui lòng nhập họ tên"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  role: z.enum(["CUSTOMER", "RESTAURANT_OWNER"]),
});
type FormValues = z.infer<typeof schema>;

type RegisterRole = Extract<Role, "CUSTOMER" | "RESTAURANT_OWNER">;

const ROLES: { value: RegisterRole; label: string; desc: string }[] = [
  { value: "CUSTOMER", label: "Khách hàng", desc: "Đặt món & theo dõi dinh dưỡng" },
  {
    value: "RESTAURANT_OWNER",
    label: "Chủ nhà hàng",
    desc: "Quản lý menu & đơn hàng",
  },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userRole = useAuthStore((s) => s.user?.role);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "CUSTOMER" },
  });

  const role = watch("role");

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await authApi.register(values);
      login(res);
      navigate("/", { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    if (userRole === "RESTAURANT_OWNER") {
      navigate("/owner", { replace: true });
    } else if (userRole === "ADMIN") {
      navigate("/admin", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, userRole, navigate]);

  return (
    <AuthLayout imageUrl={HERO_IMAGE_URL}>
      <img src="/logo.png" alt="NomNom" className="mb-6 mx-auto block h-44 w-auto object-contain" />

      <h1 className="text-3xl font-bold tracking-tight">Tạo tài khoản</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Bắt đầu ăn ngon & lành mạnh cùng NomNom
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        {ROLES.map((r) => (
          <button
            type="button"
            key={r.value}
            onClick={() => setValue("role", r.value)}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              role === r.value
                ? "border-primary bg-primary/5"
                : "border-input hover:bg-accent"
            )}
          >
            <div className="text-sm font-semibold">{r.label}</div>
            <div className="text-xs text-muted-foreground">{r.desc}</div>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <OAuthButtons mode="register" />
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
          <Label htmlFor="fullName">Họ và tên</Label>
          <Input id="fullName" {...register("fullName")} />
          {errors.fullName && (
            <p className="text-xs text-destructive">
              {errors.fullName.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mật khẩu</Label>
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
          {isSubmitting ? "Đang tạo..." : "Đăng ký"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link to="/login" className="font-semibold text-primary">
          Đăng nhập
        </Link>
      </p>
    </AuthLayout>
  );
}
