import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Sparkles, ArrowRight, Store, Gift } from "lucide-react";
import { toast } from "sonner";
import { restaurantsApi } from "@/api/restaurants";
import { menuApi } from "@/api/menu";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { FoodCard } from "@/components/shared/FoodCard";
import { RestaurantCard } from "@/components/shared/RestaurantCard";
import { CartSidebar } from "@/components/shared/CartSidebar";
import { cn } from "@/lib/utils";
import type { MenuItem, Restaurant } from "@/types";

const RECOMMENDED_RESTAURANT_COUNT = 6;

export function HomePage() {
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.toLowerCase() ?? "";
  const addItem = useCartStore((s) => s.addItem);
  const cartRestaurantId = useCartStore((s) => s.restaurantId);
  const clearCart = useCartStore((s) => s.clear);

  const handleAdd = (item: MenuItem) => {
    if (cartRestaurantId && cartRestaurantId !== item.restaurantId) {
      const ok = window.confirm(
        "Giỏ hàng hiện đang chứa món từ nhà hàng khác. Thay thế toàn bộ giỏ bằng món mới?",
      );
      if (!ok) return;
      clearCart();
    }
    addItem(item);
    toast.success(`Đã thêm "${item.name}" vào giỏ`);
  };

  const { data: restaurantPage, isLoading, isError } = useQuery({
    queryKey: ["restaurants", "home"],
    queryFn: () => restaurantsApi.list(0, 24),
  });

  const restaurants = restaurantPage?.content ?? [];

  const cuisines = useMemo(
    () => Array.from(new Set(restaurants.map((r) => r.cuisineType).filter(Boolean))),
    [restaurants]
  );

  const filteredRestaurants = restaurants.filter(
    (r) =>
      (!activeCuisine || r.cuisineType === activeCuisine) &&
      (!query || r.name.toLowerCase().includes(query))
  );

  const recommendedRestaurants = filteredRestaurants.slice(0, RECOMMENDED_RESTAURANT_COUNT);
  const browseRestaurants = filteredRestaurants.slice(0, 12);

  const menuQueries = useQueries({
    queries: recommendedRestaurants.map((r) => ({
      queryKey: ["menu", "home", r.id],
      queryFn: () => menuApi.listByRestaurant(r.id, { size: 1 }),
      enabled: recommendedRestaurants.length > 0,
    })),
  });

  const restaurantById = new Map<string, Restaurant>(restaurants.map((r) => [r.id, r]));

  const recommendedItems = menuQueries
    .map((q) => q.data?.content?.[0])
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-10">
        {/* ─── Hero ─── */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-orange-50 via-orange-100 to-pink-50 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="max-w-md text-3xl font-extrabold leading-tight text-slate-900">
                Taste the <span className="text-primary">extraordinary</span> today.
              </h1>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">
                Khám phá nhà hàng quanh bạn, xem calo & macro từng món trước khi đặt.
              </p>
              <Button
                className="mt-5"
                onClick={() => (window.location.href = "/restaurants")}
              >
                Explore Your Menu <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* ─── Cuisine filter ─── */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCuisine(null)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              activeCuisine === null
                ? "bg-primary text-primary-foreground"
                : "border bg-background hover:bg-accent"
            )}
          >
            All
          </button>
          {cuisines.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCuisine(c)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                activeCuisine === c
                  ? "bg-primary text-primary-foreground"
                  : "border bg-background hover:bg-accent"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* ─── Browse All Restaurants ─── */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <Store className="h-5 w-5 text-primary" />
                Browse All Restaurants
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tất cả nhà hàng đang hoạt động trên NomNom.
              </p>
            </div>
            <Link
              to="/restaurants"
              className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading && (
            <p className="text-muted-foreground">Đang tải...</p>
          )}
          {isError && (
            <p className="text-destructive">
              Không tải được danh sách nhà hàng. Kiểm tra backend (:8080) đang chạy.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {browseRestaurants.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>

          {!isLoading && !isError && browseRestaurants.length === 0 && (
            <p className="text-muted-foreground">Chưa có nhà hàng nào.</p>
          )}
        </section>

        {/* ─── Offers preview ─── */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <Gift className="h-5 w-5 text-primary" />
                Today's Offers
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ưu đãi hấp dẫn đang có hiệu lực.
              </p>
            </div>
            <Link
              to="/offers"
              className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <OfferPreviewCard
              to="/offers"
              gradient="from-orange-400 to-pink-500"
              badge="GIẢM 15%"
              title="Giảm 15% đơn đầu tiên"
              description="Khách hàng mới nhận ngay ưu đãi 15% cho đơn đầu tiên."
            />
            <OfferPreviewCard
              to="/offers"
              gradient="from-emerald-400 to-teal-600"
              badge="FREESHIP"
              title="Freeship đơn từ 200k"
              description="Miễn phí giao hàng cho đơn từ 200.000đ nội thành."
            />
            <OfferPreviewCard
              to="/offers"
              gradient="from-violet-500 to-purple-600"
              badge="GIẢM 25%"
              title="Healthy Monday"
              description="Thứ 2 hàng tuần — giảm 25% món healthy."
            />
          </div>
        </section>

        {/* ─── AI Recommended ─── */}
        <section id="recommended" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Recommended for You
            </h2>
          </div>

          {!isLoading && recommendedItems.length === 0 && !isError && (
            <p className="text-muted-foreground">Chưa có món nào để gợi ý.</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recommendedItems.map((item) => {
              const restaurant = restaurantById.get(item.restaurantId);
              return (
                <FoodCard
                  key={item.id}
                  item={item}
                  restaurantName={restaurant?.name ?? ""}
                  cuisineType={restaurant?.cuisineType}
                  onAdd={handleAdd}
                />
              );
            })}
          </div>
        </section>
      </div>

      <CartSidebar />
    </div>
  );
}

/* ─── Sub-component ─────────────────────────────────────────────────────── */

interface OfferPreviewCardProps {
  to: string;
  gradient: string;
  badge: string;
  title: string;
  description: string;
}

function OfferPreviewCard({
  to, gradient, badge, title, description,
}: OfferPreviewCardProps) {
  return (
    <Link
      to={to}
      className="group overflow-hidden rounded-2xl border-none bg-card shadow-sm transition-shadow hover:shadow-lg"
    >
      <div
        className={cn(
          "relative flex h-24 items-center justify-center bg-gradient-to-br text-white",
          gradient
        )}
      >
        <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 shadow-sm">
          {badge}
        </span>
      </div>
      <div className="space-y-1 p-4">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {description}
        </p>
        <p className="flex items-center gap-1 pt-1 text-xs font-semibold text-primary group-hover:underline">
          Xem chi tiết <ArrowRight className="h-3 w-3" />
        </p>
      </div>
    </Link>
  );
}