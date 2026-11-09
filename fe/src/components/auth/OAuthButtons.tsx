import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { useGoogleIdentity } from "@/hooks/useGoogleIdentity";
import { GOOGLE_CLIENT_ID, isGoogleLoginConfigured } from "@/lib/google";

type Mode = "login" | "register";

interface OAuthButtonsProps {
  /** "register" tự động hợp nhất account và đưa về trang chủ. */
  mode?: Mode;
  className?: string;
}

export function OAuthButtons({ mode = "login", className }: OAuthButtonsProps) {
  const login = useAuthStore((s) => s.login);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);

  const googleMutation = useMutation({
    mutationFn: (idToken: string) => authApi.googleLogin({ idToken }),
    onSuccess: (res) => {
      login(res);
      // Redirect theo role như login thường — login store + navigate phía trang.
      // Trang cha sẽ tự navigate sau khi `isAuthenticated` đổi.
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Đăng nhập Google thất bại.";
      toast.error(message);
    },
  });

  const { ready, configured } = useGoogleIdentity({
    clientId: configured_for_google() ? GOOGLE_CLIENT_ID : undefined,
    onCredential: (idToken) => {
      googleMutation.mutate(idToken);
    },
  });

  // Khi GIS sẵn sàng + DOM có container -> render nút chính hãng Google bên trong
  useEffect(() => {
    if (!ready) return;
    if (!buttonRef.current) return;
    if (!window.google?.accounts?.id) return;
    try {
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: mode === "register" ? "signup_with" : "signin_with",
        shape: "rect",
        width: 320,
        locale: "vi",
      });
      setTriggered(true);
    } catch (err) {
      console.error("[OAuthButtons] GIS renderButton failed", err);
    }
  }, [ready, mode]);

  if (!configured) {
    // Không cấu hình -> vẫn cho hiện nút nhưng disabled để design không vỡ,
    // kèm tooltip giải thích để dev dễ debug.
    return (
      <div className={className}>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-3 h-10 text-sm font-semibold opacity-50 cursor-not-allowed"
            title="Google OAuth chưa được cấu hình (thiếu VITE_GOOGLE_CLIENT_ID)"
          >
            <GoogleGlyph />
            Google
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-3 h-10 text-sm font-semibold opacity-50 cursor-not-allowed"
            title="Apple OAuth chưa được cấu hình"
          >
            <AppleGlyph />
            Apple
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Đăng nhập Google tạm thời chưa khả dụng — vui lòng dùng email/mật khẩu.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Vùng chứa — GIS sẽ render nút chính hãng vào đây */}
      <div
        ref={buttonRef}
        className="flex w-full justify-center [&>div]:w-full"
      />
      {!triggered && (
        <button
          type="button"
          disabled
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border bg-background px-3 h-10 text-sm font-semibold"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải Google…
        </button>
      )}
      {googleMutation.isPending && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Đang đăng nhập bằng Google…
        </p>
      )}
    </div>
  );
}

function configured_for_google(): boolean {
  return isGoogleLoginConfigured;
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.67-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.12-1.44.35-2.1V7.06H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.97 10.97 0 0 0 12 1 10.99 10.99 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M16.36 1.43c.1 1.02-.27 2-.91 2.74-.66.78-1.7 1.38-2.74 1.3-.12-1 .31-2.03.94-2.74.7-.77 1.85-1.36 2.71-1.3Zm2.62 17.1c-.55 1.2-.81 1.74-1.52 2.79-.99 1.48-2.39 3.33-4.12 3.35-1.54.02-1.94-1-4.02-.99-2.08.01-2.52.99-4.06.97-1.73-.02-3.05-1.69-4.04-3.17C-1.18 18 -.46 12.62 2.4 9.7c1.43-1.47 3.05-1.7 4.16-1.7.95 0 2.5.94 3.1.94.6 0 1.9-1.16 3.74-1.16.84 0 2.91.07 4.33 2.15-3.61 1.92-3.03 6.6.85 8.3-.4 1.04-.3.78-.6 0Z" />
    </svg>
  );
}
