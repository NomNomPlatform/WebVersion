import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { restaurantsApi } from "@/api/restaurants";
import { menuApi } from "@/api/menu";
import { useCartStore } from "@/store/cartStore";
import { MenuItemCard } from "@/components/shared/MenuItemCard";
import { RecommendationPanel } from "@/components/shared/RecommendationPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Category, MenuItem } from "@/types";

const CATEGORIES: { value: Category | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "MAIN", label: "Món chính" },
  { value: "SIDE", label: "Món phụ" },
  { value: "DRINK", label: "Đồ uống" },
  { value: "DESSERT", label: "Tráng miệng" },
];

export function MenuPage() {
  const { id = "" } = useParams();
  const [category, setCategory] = useState<Category | "ALL">("ALL");
  const addItem = useCartStore((s) => s.addItem);
  const cartRestaurantId = useCartStore((s) => s.restaurantId);
  const clearCart = useCartStore((s) => s.clear);

  const restaurantQuery = useQuery({
    queryKey: ["restaurant", id],
    queryFn: () => restaurantsApi.get(id),
    enabled: !!id,
  });

  const menuQuery = useQuery({
    queryKey: ["menu", id, category],
    queryFn: () =>
      menuApi.listByRestaurant(id, {
        category: category === "ALL" ? undefined : category,
      }),
    enabled: !!id,
  });

  const handleAdd = (item: MenuItem) => {
    // Giỏ hiện tại đang chứa món của nhà hàng khác → xác nhận trước khi thay thế.
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

  return (
    <div className="space-y-6">
      {restaurantQuery.data && (
        <div>
          <h1 className="text-2xl font-extrabold">{restaurantQuery.data.name}</h1>
          <p className="text-muted-foreground">
            {restaurantQuery.data.description}
          </p>
        </div>
      )}

      {id && <RecommendationPanel restaurantId={id} />}

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Button
            key={c.value}
            variant={category === c.value ? "default" : "outline"}
            size="sm"
            className={cn(category !== c.value && "bg-background")}
            onClick={() => setCategory(c.value)}
          >
            {c.label}
          </Button>
        ))}
      </div>

      {menuQuery.isLoading && (
        <p className="text-muted-foreground">Đang tải thực đơn...</p>
      )}
      {menuQuery.isError && (
        <p className="text-destructive">Không tải được thực đơn.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {menuQuery.data?.content.map((item) => (
          <MenuItemCard key={item.id} item={item} onAdd={handleAdd} />
        ))}
      </div>

      {menuQuery.data?.content.length === 0 && (
        <p className="text-muted-foreground">Chưa có món trong mục này.</p>
      )}
    </div>
  );
}
