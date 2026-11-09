import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Calendar,
  Camera,
  Image as ImageIcon,
  Loader2,
  Mail,
  Ruler,
  Save,
  Shield,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  Weight,
} from "lucide-react";
import { toast } from "sonner";
import { authApi, type UpdateProfilePayload } from "@/api/auth";
import { getErrorMessage } from "@/api/apiClient";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/shared/Avatar";
import { cn } from "@/lib/utils";
import type {
  ActivityLevel,
  Gender,
  User,
} from "@/types";

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: "SEDENTARY", label: "Ít vận động", desc: "Làm việc văn phòng, ít tập" },
  { value: "LIGHT", label: "Nhẹ nhàng", desc: "Tập 1–3 buổi / tuần" },
  { value: "MODERATE", label: "Vừa phải", desc: "Tập 3–5 buổi / tuần" },
  { value: "ACTIVE", label: "Năng động", desc: "Tập 6–7 buổi / tuần" },
  { value: "VERY_ACTIVE", label: "Rất năng động", desc: "Vận động viên / lao động nặng" },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
];

// Giới hạn file upload trước khi resize. Sau khi resize xuống 256x256 JPEG q=0.85,
// output thường < 30KB. Backend cũng giới hạn 5MB, mình match.
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_MAX_DIMENSION = 256;
const AVATAR_JPEG_QUALITY = 0.85;

/**
 * Resize ảnh + nén JPEG trên client trước khi upload.
 * Tiết kiệm băng thông và giảm kích thước qua mạng.
 */
function loadAndResizeImage(
  file: File,
): Promise<{ file: File; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > AVATAR_MAX_DIMENSION || height > AVATAR_MAX_DIMENSION) {
          const ratio = AVATAR_MAX_DIMENSION / Math.max(width, height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas 2D context không khả dụng."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              reject(new Error("Không thể mã hoá ảnh JPEG."));
              return;
            }
            const compressedName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], compressedName, {
              type: "image/jpeg",
            });
            resolve({
              file: compressedFile,
              originalSize: file.size,
              compressedSize: blob.size,
            });
          },
          "image/jpeg",
          AVATAR_JPEG_QUALITY,
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được dữ liệu ảnh."));
    };
    img.src = url;
  });
}

/**
 * Trang quản lý profile cá nhân.
 * - Xem thông tin tài khoản + health summary (BMI / TDEE / calorie goal).
 * - Cập nhật: tên, avatar (paste URL hoặc upload file -> data URL), height/weight/age/gender/activity.
 */
export function ProfilePage() {
  return <ProfileContent />;
}

/**
 * Phần nội dung thuần của trang profile. Được tách ra để có thể nhúng vào
 * {@link OwnerDashboard} layout (qua Outlet) mà không cần lặp lại code.
 */
export function ProfileContent() {
  const queryClient = useQueryClient();
  const setProfile = useAuthStore((s) => s.setProfile);
  const authUser = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: me, isLoading, isError } = useQuery({
    queryKey: ["users-me"],
    queryFn: authApi.me,
    staleTime: 60_000,
  });

  // Đồng bộ cache vào authStore để avatar / name hiển thị khắp UI ngay lập tức.
  useEffect(() => {
    if (me?.fullName || me?.avatarUrl) {
      setProfile({
        fullName: me.fullName,
        avatarUrl: me.avatarUrl,
      });
    }
  }, [me, setProfile]);

  const initialForm = useMemo<FormState>(() => buildInitialForm(me), [me]);

  const [form, setForm] = useState<FormState>(initialForm);
  const [fileMeta, setFileMeta] = useState<
    | { name: string; originalSize: number; compressedSize: number }
    | null
  >(null);
  const [isResizing, setIsResizing] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => authApi.uploadAvatar(file),
    onSuccess: (data) => {
      toast.success("Đã cập nhật ảnh đại diện.");
      queryClient.setQueryData(["users-me"], data);
      setProfile({ fullName: data.fullName, avatarUrl: data.avatarUrl });
      setForm((f) => ({ ...f, avatarUrl: data.avatarUrl ?? undefined }));
      setFileMeta(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // Re-sync form khi data /me load xong
  useEffect(() => {
    setForm(initialForm);
    setFileMeta(null);
    setIsResizing(false);
  }, [initialForm]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => authApi.updateMe(payload),
    onSuccess: (data) => {
      toast.success("Đã cập nhật hồ sơ.");
      queryClient.setQueryData(["users-me"], data);
      queryClient.invalidateQueries({ queryKey: ["users-me-health"] });
      setProfile({ fullName: data.fullName, avatarUrl: data.avatarUrl });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handlePickFile = () => {
    if (isResizing || uploadMutation.isPending) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset giá trị input để chọn lại cùng file vẫn trigger onChange.
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp hình ảnh.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Ảnh quá lớn — tối đa 5MB.");
      return;
    }
    setIsResizing(true);
    try {
      const { file: compressedFile, originalSize, compressedSize } =
        await loadAndResizeImage(file);
      setFileMeta({
        name: compressedFile.name,
        originalSize,
        compressedSize,
      });
      uploadMutation.mutate(compressedFile, {
        onSettled: () => setIsResizing(false),
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setIsResizing(false);
    }
  };

  const handleClearAvatar = () => {
    setFileMeta(null);
    setForm((f) => ({ ...f, avatarUrl: undefined }));
    uploadMutation.reset();
    updateMutation.mutate({
      fullName: form.fullName.trim() || undefined,
      avatarUrl: null,
      height: numOrNull(form.height),
      weight: numOrNull(form.weight),
      age: numOrInt(form.age),
      gender: form.gender || null,
      activityLevel: form.activityLevel || null,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UpdateProfilePayload = {
      fullName: form.fullName.trim() || undefined,
      avatarUrl: form.avatarUrl || null,
      height: numOrNull(form.height),
      weight: numOrNull(form.weight),
      age: numOrInt(form.age),
      gender: form.gender || null,
      activityLevel: form.activityLevel || null,
    };
    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải hồ sơ…
      </div>
    );
  }

  if (isError || !me) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Không tải được thông tin tài khoản. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {/* Avatar + basic info */}
        <Card>
          <CardHeader>
            <CardTitle>Hồ sơ cá nhân</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <Avatar
                      src={form.avatarUrl}
                      name={form.fullName}
                      email={authUser?.email}
                      size="xl"
                      className="ring-2 ring-border"
                    />
                    <button
                      type="button"
                      onClick={handlePickFile}
                      className="absolute bottom-0 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background transition-transform hover:scale-105"
                      aria-label="Đổi ảnh đại diện"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePickFile}
                      disabled={isResizing || uploadMutation.isPending}
                    >
                      {isResizing || uploadMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      {form.avatarUrl ? "Đổi ảnh" : "Tải ảnh lên"}
                    </Button>
                    {form.avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAvatar}
                        disabled={isResizing || uploadMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Bỏ ảnh
                      </Button>
                    )}
                  </div>
                  {uploadMutation.isError && (
                    <p className="text-xs text-destructive">
                      {getErrorMessage(uploadMutation.error)}
                    </p>
                  )}
                  {fileMeta && !uploadMutation.isError && (
                    <p className="text-xs text-muted-foreground">
                      Đã chọn: {fileMeta.name} ·{" "}
                      {formatBytes(fileMeta.originalSize)} →{" "}
                      {formatBytes(fileMeta.compressedSize)} (sau khi nén)
                    </p>
                  )}
                </div>

              <div className="space-y-2">
                <div>
                  <p className="text-lg font-bold">{me.fullName}</p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {me.email}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={me.role} />
                  {me.provider && <ProviderBadge provider={me.provider} />}
                  <JoinedBadge createdAt={me.createdAt} />
                </div>
              </div>
            </div>

            <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
              <Field
                label="Họ và tên"
                icon={<UserIcon className="h-4 w-4" />}
                htmlFor="fullName"
              >
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                  placeholder="Nhập họ và tên"
                />
              </Field>

              <Field
                label="Chiều cao (cm)"
                icon={<Ruler className="h-4 w-4" />}
                htmlFor="height"
              >
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  min={50}
                  max={250}
                  value={form.height ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, height: e.target.value }))
                  }
                />
              </Field>

              <Field
                label="Cân nặng (kg)"
                icon={<Weight className="h-4 w-4" />}
                htmlFor="weight"
              >
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min={20}
                  max={300}
                  value={form.weight ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, weight: e.target.value }))
                  }
                />
              </Field>

              <Field
                label="Tuổi"
                icon={<Calendar className="h-4 w-4" />}
                htmlFor="age"
              >
                <Input
                  id="age"
                  type="number"
                  step="1"
                  min={10}
                  max={120}
                  value={form.age ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, age: e.target.value }))
                  }
                />
              </Field>

              <Field label="Giới tính" htmlFor="gender">
                <div className="flex gap-2">
                  {GENDER_OPTIONS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, gender: g.value }))}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                        form.gender === g.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-input hover:bg-accent"
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="sm:col-span-2 space-y-2">
                <Label className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Mức vận động
                </Label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {ACTIVITY_OPTIONS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, activityLevel: a.value }))
                      }
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        form.activityLevel === a.value
                          ? "border-primary bg-primary/5"
                          : "border-input hover:bg-accent"
                      )}
                    >
                      <div className="text-sm font-semibold">{a.label}</div>
                      <div className="text-xs text-muted-foreground">{a.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <ProfileSidebar userId={me.id} />
    </div>
  );
}

interface FormState {
  fullName: string;
  avatarUrl?: string;
  height?: string;
  weight?: string;
  age?: string;
  gender?: Gender;
  activityLevel?: ActivityLevel;
}

function buildInitialForm(me: User | undefined): FormState {
  return {
    fullName: me?.fullName ?? "",
    avatarUrl: me?.avatarUrl ?? undefined,
    height: me?.height != null ? String(me.height) : "",
    weight: me?.weight != null ? String(me.weight) : "",
    age: me?.age != null ? String(me.age) : "",
    gender: me?.gender,
    activityLevel: me?.activityLevel,
  };
}

function numOrNull(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function numOrInt(v: string | undefined): number | null {
  const n = numOrNull(v);
  if (n == null) return null;
  return Math.round(n);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function Field({ label, htmlFor, icon, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="flex items-center gap-2">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}

function RoleBadge({ role }: { role: User["role"] }) {
  const map: Record<User["role"], { label: string; cls: string }> = {
    CUSTOMER: { label: "Khách hàng", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    RESTAURANT_OWNER: { label: "Chủ nhà hàng", cls: "bg-violet-50 text-violet-700 border-violet-200" },
    ADMIN: { label: "Quản trị viên", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  };
  const cfg = map[role] ?? { label: role, cls: "bg-slate-50 text-slate-700 border-slate-200" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        cfg.cls
      )}
    >
      <ShieldCheck className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function ProviderBadge({ provider }: { provider: NonNullable<User["provider"]> }) {
  if (provider === "GOOGLE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <GoogleGlyph /> Liên kết Google
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
      <Mail className="h-3 w-3" />
      Tài khoản email
    </span>
  );
}

function JoinedBadge({ createdAt }: { createdAt?: string }) {
  if (!createdAt) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
      <Calendar className="h-3 w-3" />
      Tham gia {new Date(createdAt).toLocaleDateString("vi-VN")}
    </span>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3">
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

interface ProfileSidebarProps {
  userId: string;
}

function ProfileSidebar({ userId }: ProfileSidebarProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["users-me-health"],
    queryFn: authApi.health,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Thông tin sức khỏe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tính toán…
            </div>
          ) : !data ? (
            <p className="text-muted-foreground">
              Hãy bổ sung chiều cao, cân nặng và mức vận động để xem BMI & TDEE.
            </p>
          ) : (
            <div className="grid gap-3">
              <Stat
                label="BMI"
                value={data.bmi.toFixed(1)}
                hint={data.bmiCategory}
              />
              <Stat label="TDEE" value={`${Math.round(data.tdee)} kcal/ngày`} />
              <Stat
                label="Mục tiêu calo"
                value={`${Math.round(data.calorieGoal)} kcal/ngày`}
                highlight
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bảo mật</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            User ID: <span className="font-mono text-foreground">{userId.slice(0, 8)}…</span>
          </p>
          <p>
            Để đổi mật khẩu, vui lòng dùng trang{" "}
            <span className="font-semibold text-foreground">Forgot Password</span>{" "}
            (đang phát triển).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-extrabold text-foreground">{value}</div>
      {hint && (
        <div className="text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

export default ProfilePage;
