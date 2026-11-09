import { useState } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-7 w-7 text-xs",
  sm: "h-9 w-9 text-sm",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
};

const FALLBACK_PALETTE = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-orange-100 text-orange-700",
];

/** Tính chỉ số màu fallback dựa trên email/name — ổn định giữa các render. */
function paletteIndex(seed: string | null | undefined): number {
  const s = (seed ?? "").trim().toLowerCase();
  if (!s) return 0;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % FALLBACK_PALETTE.length;
}

function initialsFor(name?: string | null, email?: string | null): string {
  const source = (name && name.trim()) || (email && email.split("@")[0]) || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar có hỗ trợ URL (Google/social) và fallback chữ cái đầu nhiều màu.
 * - Fallback khi src không có / load lỗi.
 * - 5 size preset để khớp với mọi ngữ cảnh (header, comment, profile page...).
 */
export function Avatar({
  src,
  name,
  email,
  size = "md",
  className,
}: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;
  const fallbackIdx = paletteIndex(name || email);
  const palette = FALLBACK_PALETTE[fallbackIdx];

  if (showImage) {
    return (
      <img
        src={src}
        alt={name || email || "avatar"}
        referrerPolicy="no-referrer"
        onError={() => setErrored(true)}
        className={cn(
          "inline-block shrink-0 rounded-full object-cover ring-1 ring-border",
          SIZE_MAP[size],
          className
        )}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-border select-none",
        SIZE_MAP[size],
        palette,
        className
      )}
    >
      {initialsFor(name, email)}
    </span>
  );
}
