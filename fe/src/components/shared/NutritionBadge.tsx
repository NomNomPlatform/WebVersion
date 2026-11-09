import { Flame } from "lucide-react";
import { cn, formatCalories } from "@/lib/utils";
import type { MenuItem } from "@/types";

interface NutritionBadgeProps {
  item: Pick<MenuItem, "calories" | "proteinG" | "carbG" | "fatG">;
  className?: string;
}

/** Điểm bán hàng chính của NomNom: calo nổi bật + breakdown macro */
export function NutritionBadge({ item, className }: NutritionBadgeProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="inline-flex items-center gap-1 rounded-full bg-health/10 px-2.5 py-1 text-xs font-bold text-health">
        <Flame className="h-3.5 w-3.5" />
        {formatCalories(item.calories)}
      </span>
      <span className="text-xs text-muted-foreground">
        P {item.proteinG}g · C {item.carbG}g · F {item.fatG}g
      </span>
    </div>
  );
}
