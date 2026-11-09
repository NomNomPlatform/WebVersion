import { ImageOff, MapPin, UtensilsCrossed } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Restaurant } from "@/types";

interface RestaurantCardProps {
  restaurant: Restaurant;
  className?: string;
}

/**
 * Card hiển thị một nhà hàng trong danh sách Browse.
 * - Ảnh cover tỉ lệ 16:9.
 * - Tên + cuisine badge + địa chỉ (1 dòng).
 * - Hover: đổ bóng nhẹ.
 *
 * Toàn bộ card là một thẻ <a> điều hướng sang /restaurants/:id (MenuPage).
 */
export function RestaurantCard({ restaurant, className }: RestaurantCardProps) {
  return (
    <Card
      className={cn(
        "group overflow-hidden transition-shadow hover:shadow-lg",
        className
      )}
    >
      <a href={`/restaurants/${restaurant.id}`} className="block">
        <div className="aspect-video w-full bg-muted overflow-hidden">
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-10 w-10" />
            </div>
          )}
        </div>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-bold leading-tight text-slate-800">
              {restaurant.name}
            </h3>
            {restaurant.cuisineType && (
              <Badge variant="secondary" className="shrink-0">
                {restaurant.cuisineType}
              </Badge>
            )}
          </div>
          {restaurant.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {restaurant.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{restaurant.address}</span>
          </div>
          <div className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-primary">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Xem thực đơn →
          </div>
        </CardContent>
      </a>
    </Card>
  );
}