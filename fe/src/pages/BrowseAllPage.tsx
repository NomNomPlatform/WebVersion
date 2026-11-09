import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Store } from "lucide-react";
import { restaurantsApi } from "@/api/restaurants";
import { RestaurantCard } from "@/components/shared/RestaurantCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CartSidebar } from "@/components/shared/CartSidebar";

/**
 * Trang Browse All Restaurants — danh sách đầy đủ các nhà hàng APPROVED.
 * Hỗ trợ:
 *   - Search theo tên / address / cuisine (client-side filter).
 *   - Filter theo cuisineType (chips).
 *   - Grid responsive 1/2/3 cột.
 *
 * Lưu ý: BE chỉ trả về các nhà hàng APPROVED ở endpoint public
 * `GET /api/restaurants` nên không cần filter status phía client.
 */
export function BrowseAllPage() {
  const [search, setSearch] = useState("");
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["restaurants", "browse-all"],
    queryFn: () => restaurantsApi.list(0, 100),
  });

  const restaurants = data?.content ?? [];

  const cuisines = useMemo(
    () =>
      Array.from(
        new Set(restaurants.map((r) => r.cuisineType).filter(Boolean))
      ).sort(),
    [restaurants]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (activeCuisine && r.cuisineType !== activeCuisine) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        (r.cuisineType ?? "").toLowerCase().includes(q)
      );
    });
  }, [restaurants, search, activeCuisine]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
              <Store className="h-6 w-6 text-primary" />
              Browse All Restaurants
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Khám phá tất cả nhà hàng đang hoạt động trên NomNom.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, địa chỉ, loại ẩm thực..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-full bg-muted pl-9"
          />
        </div>

        {/* Cuisine chips */}
        {cuisines.length > 0 && (
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
        )}

        {/* Loading / Error / Empty */}
        {isLoading && (
          <p className="text-muted-foreground">Đang tải danh sách nhà hàng…</p>
        )}
        {isError && (
          <p className="text-destructive">
            Không tải được danh sách nhà hàng. Kiểm tra backend (:8080) đang chạy.
          </p>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed bg-muted/30 p-12 text-center">
            <Store className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 font-semibold text-slate-700">
              Không tìm thấy nhà hàng phù hợp
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Thử đổi từ khoá hoặc bỏ bộ lọc cuisine.
            </p>
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              Hiển thị {filtered.length} / {restaurants.length} nhà hàng
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} />
              ))}
            </div>
          </>
        )}
      </div>

      <CartSidebar />
    </div>
  );
}

export default BrowseAllPage;