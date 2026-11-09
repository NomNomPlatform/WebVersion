import { Plus, ImageOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NutritionBadge } from "./NutritionBadge";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem } from "@/types";

interface MenuItemCardProps {
  item: MenuItem;
  onAdd?: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="aspect-[4/3] w-full bg-muted">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
      </div>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{item.name}</h3>
          <span className="shrink-0 font-bold text-primary">
            {formatCurrency(item.price)}
          </span>
        </div>
        {item.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        )}
        <NutritionBadge item={item} />
        {onAdd && (
          <Button
            className="mt-2 w-full"
            size="sm"
            disabled={!item.isAvailable}
            onClick={() => onAdd(item)}
          >
            <Plus className="h-4 w-4" />
            {item.isAvailable ? "Thêm vào giỏ" : "Hết hàng"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
