import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Award, Crown, Medal, Star, Trophy, ArrowRight, ShoppingBag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ordersApi } from "@/api/orders";
import { useAuthStore } from "@/store/authStore";
import { cn, formatCurrency } from "@/lib/utils";

/** Thanh tiến trình tối giản — tránh tạo thêm UI primitive mới. */
function Progress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-slate-200",
        className
      )}
    >
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface Tier {
  name: string;
  icon: React.ElementType;
  /** Ngưỡng đơn tối thiểu để đạt tier */
  threshold: number;
  /** Số đơn tối đa tier này cover (exclusive). Infinity cho tier cao nhất. */
  ceiling: number;
  benefits: string[];
  color: string;
  bgColor: string;
  ringColor: string;
}

const TIERS: Tier[] = [
  {
    name: "Bronze",
    icon: Medal,
    threshold: 0,
    ceiling: 3,
    benefits: ["Tích điểm cơ bản", "Ưu đãi sinh nhật"],
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    ringColor: "ring-amber-300",
  },
  {
    name: "Silver",
    icon: Award,
    threshold: 3,
    ceiling: 7,
    benefits: [
      "Giảm 5% mỗi đơn",
      "Freeship đơn từ 150k",
      "Ưu tiên hỗ trợ",
    ],
    color: "text-slate-700",
    bgColor: "bg-slate-100",
    ringColor: "ring-slate-400",
  },
  {
    name: "Gold",
    icon: Trophy,
    threshold: 7,
    ceiling: 15,
    benefits: [
      "Giảm 10% mỗi đơn",
      "Freeship không điều kiện",
      "Đặt bàn ưu tiên",
    ],
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    ringColor: "ring-yellow-400",
  },
  {
    name: "VIP",
    icon: Crown,
    threshold: 15,
    ceiling: Infinity,
    benefits: [
      "Giảm 15% mỗi đơn",
      "Quà tặng độc quyền hàng tháng",
      "Hỗ trợ riêng 24/7",
      "Mời dự sự kiện VIP",
    ],
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    ringColor: "ring-rose-400",
  },
];

function computeTier(orderCount: number): {
  current: Tier;
  next: Tier | null;
  progressPct: number;
  ordersToNext: number | null;
} {
  const current =
    TIERS.find(
      (t) => orderCount >= t.threshold && orderCount < t.ceiling
    ) ?? TIERS[TIERS.length - 1];
  const next =
    TIERS.find((t) => t.threshold > current.threshold) ?? null;

  const range = current.ceiling === Infinity ? 1 : current.ceiling - current.threshold;
  const inTier = orderCount - current.threshold;
  const progressPct = Math.min(100, Math.round((inTier / range) * 100));
  const ordersToNext = next ? next.threshold - orderCount : null;

  return { current, next, progressPct, ordersToNext };
}

export function RewardsPage() {
  const user = useAuthStore((s) => s.user);

  const { data: ordersPage, isLoading } = useQuery({
    queryKey: ["my-orders-rewards"],
    queryFn: () => ordersApi.myOrders(0, 200),
    enabled: !!user?.userId,
  });

  const orders = useMemo(() => {
    const page = ordersPage;
    if (!page) return [];
    return Array.isArray(page) ? page : page.content ?? [];
  }, [ordersPage]);

  const stats = useMemo(() => {
    const total = orders.length;
    const completed = orders.filter(
      (o) => o.status === "CONFIRMED" || o.status === "READY"
    ).length;
    const spent = orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
    return { total, completed, spent };
  }, [orders]);

  const { current, next, progressPct, ordersToNext } = computeTier(stats.total);
  const CurrentIcon = current.icon;

  return (
    <div className="space-y-8">
      {/* Hero / Tier card */}
      <Card className="overflow-hidden border-none shadow-lg">
        <div
          className={`flex flex-col gap-6 p-8 ${current.bgColor} sm:flex-row sm:items-center sm:justify-between`}
        >
          <div className="flex items-start gap-5">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full bg-white ring-4 ${current.ringColor} shadow-md`}
            >
              <CurrentIcon className={`h-10 w-10 ${current.color}`} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Hạng thành viên hiện tại
              </p>
              <h1 className={`mt-1 text-4xl font-extrabold ${current.color}`}>
                {current.name}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Xin chào{" "}
                <span className="font-semibold">
                  {user?.fullName ?? "bạn"}
                </span>{" "}
                — bạn đã hoàn thành{" "}
                <span className="font-bold">{stats.total}</span> đơn trên NomNom.
              </p>
            </div>
          </div>
          <Link
            to="/"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-primary hover:bg-primary/90 shrink-0"
            )}
          >
            Đặt thêm món <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Progress to next tier */}
        {next && (
          <CardContent className="space-y-3 border-t bg-white p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">
                Tiến trình lên {next.name}
              </span>
              <span className="text-muted-foreground">
                Còn {ordersToNext} đơn nữa
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </CardContent>
        )}
        {!next && (
          <CardContent className="border-t bg-white p-6 text-center">
            <p className="font-bold text-rose-700">
              🎉 Bạn đã đạt hạng cao nhất — NomNom VIP!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cảm ơn bạn đã trung thành với NomNom.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Tổng đơn
            </p>
            <p className="mt-1 text-3xl font-extrabold text-primary">
              {isLoading ? "…" : stats.total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Đơn hoàn thành
            </p>
            <p className="mt-1 text-3xl font-extrabold text-emerald-600">
              {isLoading ? "…" : stats.completed}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Tổng chi tiêu
            </p>
            <p className="mt-1 text-3xl font-extrabold text-amber-600">
              {isLoading ? "…" : formatCurrency(stats.spent)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tất cả các hạng */}
      <section>
        <h2 className="mb-4 text-xl font-bold">Tất cả hạng thành viên</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => {
            const Icon = t.icon;
            const isCurrent = t.name === current.name;
            const achieved = stats.total >= t.threshold;
            return (
              <Card
                key={t.name}
                className={`relative overflow-hidden transition-all ${
                  isCurrent
                    ? `ring-2 ${t.ringColor} shadow-md`
                    : achieved
                    ? "opacity-90"
                    : "opacity-60"
                }`}
              >
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${t.bgColor}`}
                    >
                      <Icon className={`h-6 w-6 ${t.color}`} />
                    </div>
                    {isCurrent && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                        Hiện tại
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${t.color}`}>
                      {t.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Từ {t.threshold} đơn{" "}
                      {t.ceiling === Infinity
                        ? "trở lên"
                        : `đến ${t.ceiling - 1} đơn`}
                    </p>
                  </div>
                  <ul className="space-y-1 text-xs">
                    {t.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-1.5">
                        <Star
                          className={`mt-0.5 h-3 w-3 shrink-0 ${t.color}`}
                        />
                        <span className="text-muted-foreground">{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA cuối */}
      <Card className="border-none bg-gradient-to-r from-primary/5 via-orange-50 to-pink-50">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Sẵn sàng lên hạng tiếp theo?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Đặt thêm vài món để mở khoá ưu đãi mới.
            </p>
          </div>
          <Link to="/" className={cn(buttonVariants())}>
            Khám phá nhà hàng <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default RewardsPage;