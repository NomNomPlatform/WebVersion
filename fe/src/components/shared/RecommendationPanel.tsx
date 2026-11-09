import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Flame,
  Activity,
  Target,
  Wheat,
  Hourglass,
  Brain,
  Utensils,
} from "lucide-react";
import { isAxiosError } from "axios";
import { recommendationsApi } from "@/api/recommendations";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { features } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatCalories, formatCurrency } from "@/lib/utils";
import type {
  MealType,
  RecommendedItem,
  RecommendationResponse,
} from "@/types";

interface RecommendationPanelProps {
  restaurantId: string;
}

const MEAL_TYPES: { value: MealType; label: string; quota: number; hint: string }[] = [
  { value: "BREAKFAST", label: "Bữa sáng", quota: 0.25, hint: "Bữa đầu ngày, ~25% calo" },
  { value: "LUNCH",     label: "Bữa trưa", quota: 0.35, hint: "Bữa chính, ~35% calo" },
  { value: "DINNER",    label: "Bữa tối",  quota: 0.30, hint: "Bữa cuối ngày, ~30% calo" },
  { value: "SNACK",     label: "Ăn nhẹ",   quota: 0.10, hint: "Ăn vặt, ~10% calo" },
];

const MEAL_TYPE_QUOTAS: Record<MealType, number> = {
  BREAKFAST: 0.25,
  LUNCH: 0.35,
  DINNER: 0.30,
  SNACK: 0.10,
};

/** Gợi ý món theo TDEE cá nhân — điểm bán hàng chính của NomNom. */
export function RecommendationPanel({ restaurantId }: RecommendationPanelProps) {
  const token = useAuthStore((s) => s.token);
  const [mealType, setMealType] = useState<MealType>("LUNCH");

  // Health summary: BMI / TDEE / calorieGoal — backend tự tính từ profile.
  const healthQuery = useQuery({
    queryKey: ["users", "me", "health"],
    queryFn: () => authApi.health(),
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: false,
  });

  // AI providers status — ẩn/hiện toggle AI và hiển thị provider.
  const configQuery = useQuery({
    queryKey: ["recommendations", "config"],
    queryFn: () => recommendationsApi.getConfig(),
    staleTime: 5 * 60_000,
  });

  const aiAvailable = configQuery.data?.aiEnabled ?? true;
  const [useAi, setUseAi] = useState(true);

  const mutation = useMutation({
    mutationFn: () =>
      recommendationsApi.recommend({
        restaurantId,
        mealType,
        useAi: useAi && aiAvailable,
      }),
  });

  if (!features.recommendations) return null;

  const health = healthQuery.data;
  const hasHealth = Boolean(health && health.tdee > 0);
  const mealQuota = MEAL_TYPE_QUOTAS[mealType];
  const mealCalorieTarget = hasHealth && health ? health.calorieGoal * mealQuota : 0;

  return (
    <Card className="border-health/30 bg-health/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-health" />
          Gợi ý món phù hợp sức khỏe
        </CardTitle>
        <CardDescription>
          Dựa trên nhu cầu calo (TDEE) của bạn cho từng bữa ăn.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!token ? (
          <NotLoggedInNotice />
        ) : (
          <>
            <HealthSummary
              health={health}
              isLoading={healthQuery.isLoading}
              isError={healthQuery.isError}
            />
            <MissingProfileNotice show={healthQuery.isSuccess && !hasHealth} />

            <MealTypePicker value={mealType} onChange={setMealType} />

            {hasHealth && mealCalorieTarget > 0 && (
              <MealTargetExplainer
                calorieGoal={health!.calorieGoal}
                mealType={mealType}
                target={mealCalorieTarget}
                matched={mutation.data?.context?.matchedItemsCount}
              />
            )}

            <AiToggle
              checked={useAi && aiAvailable}
              disabled={!aiAvailable}
              available={aiAvailable}
              providers={configQuery.data?.enabledProviders ?? []}
              onChange={setUseAi}
            />

            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !hasHealth}
            >
              {mutation.isPending ? "Đang gợi ý..." : "Gợi ý món cho tôi"}
            </Button>
            {!hasHealth && (
              <p className="text-xs text-muted-foreground">
                Bổ sung chiều cao, cân nặng và mức vận động trong hồ sơ để
                nhận gợi ý.
              </p>
            )}

            {mutation.isError && (
              <p className="text-sm text-destructive">
                {isAxiosError(mutation.error) &&
                mutation.error.response?.status === 503
                  ? "Dịch vụ gợi ý tạm thời không sẵn sàng. Vui lòng thử lại sau."
                  : "Không lấy được gợi ý. Vui lòng thử lại."}
              </p>
            )}

            {mutation.isSuccess && (
              <RecommendationResult
                response={mutation.data}
                mealType={mealType}
                fallbackTarget={mealCalorieTarget}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function NotLoggedInNotice() {
  return (
    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      <Link to="/login" className="font-semibold text-primary underline">
        Đăng nhập
      </Link>{" "}
      và cập nhật hồ sơ sức khỏe (chiều cao, cân nặng, mức vận động) để nhận
      gợi ý món theo nhu cầu calo của bạn.
    </div>
  );
}

function MissingProfileNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      Chưa có chỉ số sức khỏe — hãy cập nhật{" "}
      <Link to="/profile" className="font-semibold underline">
        hồ sơ
      </Link>{" "}
      (chiều cao, cân nặng, mức vận động) để nhận TDEE.
    </div>
  );
}

function HealthSummary({
  health,
  isLoading,
  isError,
}: {
  health: { tdee: number; calorieGoal: number; bmiCategory?: string } | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <p className="text-xs text-muted-foreground">Đang tải chỉ số sức khỏe…</p>
    );
  }
  if (isError || !health || health.tdee <= 0) {
    return null;
  }
  return (
    <div className="rounded-lg border border-health/30 bg-background p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-health">
        <Activity className="h-3.5 w-3.5" />
        Chỉ số của bạn
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <HealthStat
          icon={<Target className="h-3.5 w-3.5" />}
          label="TDEE"
          value={`${Math.round(health.tdee)} kcal/ngày`}
        />
        <HealthStat
          icon={<Wheat className="h-3.5 w-3.5" />}
          label="Mục tiêu"
          value={`${Math.round(health.calorieGoal)} kcal/ngày`}
        />
        {health.bmiCategory && (
          <HealthStat
            icon={<Hourglass className="h-3.5 w-3.5" />}
            label="BMI"
            value={health.bmiCategory}
          />
        )}
      </div>
    </div>
  );
}

function HealthStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function MealTargetExplainer({
  calorieGoal,
  mealType,
  target,
  matched,
}: {
  calorieGoal: number;
  mealType: MealType;
  target: number;
  matched?: number;
}) {
  const pct = Math.round((target / calorieGoal) * 100);
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
      <p>
        <span className="font-semibold text-foreground">Khẩu phần khuyến nghị</span>
        {" = mục tiêu calo hằng ngày × tỉ lệ phân bổ cho mỗi bữa. "}
        Bữa {mealTypeLabel(mealType).toLowerCase()} được phân bổ{" "}
        <span className="font-semibold text-foreground">{pct}%</span> mục tiêu
        (≈ {formatCalories(target)}). NomNom chấm điểm mỗi món theo khẩu phần này.
      </p>
      {typeof matched === "number" && matched > 0 && (
        <p className="mt-1">
          Đang xem <span className="font-semibold text-foreground">{matched}</span>{" "}
          món hợp lệ từ menu nhà hàng.
        </p>
      )}
    </div>
  );
}

function MealTypePicker({
  value,
  onChange,
}: {
  value: MealType;
  onChange: (v: MealType) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Utensils className="h-3.5 w-3.5" />
        Chọn bữa
      </div>
      <div className="flex flex-wrap gap-2">
        {MEAL_TYPES.map((m) => (
          <Button
            key={m.value}
            variant={value === m.value ? "default" : "outline"}
            size="sm"
            title={m.hint}
            className={cn(value !== m.value && "bg-background")}
            onClick={() => onChange(m.value)}
          >
            {m.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function AiToggle({
  checked,
  disabled,
  available,
  providers,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  available: boolean;
  providers: string[];
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-1">
      <label
        className={cn(
          "flex items-center gap-2 text-sm",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-health disabled:cursor-not-allowed"
        />
        <Brain className="h-3.5 w-3.5 text-health" />
        <span className="font-semibold">Xếp hạng & giải thích bằng AI</span>
      </label>
      <p className="text-xs text-muted-foreground">
        {available
          ? `Đang dùng: ${providers.join(", ") || "AI"}.`
          : "AI tạm không khả dụng — sẽ dùng quy tắc dinh dưỡng."}
      </p>
    </div>
  );
}

interface RecommendationResultProps {
  response: RecommendationResponse;
  mealType: MealType;
  fallbackTarget: number;
}

function RecommendationResult({ response, mealType, fallbackTarget }: RecommendationResultProps) {
  const items = response.items;
  const context = response.context;

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
        Chưa tìm được món phù hợp với bữa này. Thử bữa ăn khác nhé.
      </p>
    );
  }

  const target =
    context && context.mealType === mealType && context.mealCalorieTarget > 0
      ? context.mealCalorieTarget
      : fallbackTarget;
  const aiUsed = response.usedAi;

  return (
    <div className="space-y-3 rounded-lg border border-health/30 bg-background p-3">
      <header className="flex flex-wrap items-center gap-2">
        <Badge variant={aiUsed ? "health" : "blue"}>
          {aiUsed ? "Gợi ý bởi AI" : "Theo quy tắc dinh dưỡng"}
        </Badge>
        {target > 0 && (
          <Badge variant="amber">
            Khẩu phần khuyến nghị: {formatCalories(target)}
          </Badge>
        )}
      </header>

      {response.aiExplanation && (
        <p className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
          {response.aiExplanation}
        </p>
      )}

      <ul className="space-y-2">
        {items.map((item) => (
          <RecommendedItemRow
            key={item.itemId}
            item={item}
            target={target}
          />
        ))}
      </ul>

      {target > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Mỗi món là 1 phần ăn độc lập — gợi ý dựa trên khẩu phần khuyến nghị
          của bạn cho bữa {mealTypeLabel(mealType).toLowerCase()}.
        </p>
      )}
    </div>
  );
}

function RecommendedItemRow({
  item,
  target,
}: {
  item: RecommendedItem;
  target: number;
}) {
  const fillPct =
    target > 0 && item.calories
      ? Math.min(100, Math.round((item.calories / target) * 100))
      : 0;
  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{item.name}</p>
          {item.reason && (
            <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
          )}
          {target > 0 && item.calories && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-health"
                style={{ width: `${fillPct}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-health">
            <Flame className="h-3.5 w-3.5" />
            {formatCalories(item.calories)}
          </span>
          <span className="text-sm font-semibold">
            {formatCurrency(item.price)}
          </span>
        </div>
      </div>
    </li>
  );
}

function mealTypeLabel(mt: MealType): string {
  return MEAL_TYPES.find((m) => m.value === mt)?.label ?? mt;
}
