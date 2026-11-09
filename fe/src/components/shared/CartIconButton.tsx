import { useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { cn } from "@/lib/utils";

/**
 * Selector riêng — giữ reference ổn định nhờ zustand shallow check theo
 * primitive number, tránh re-render thừa khi items không đổi.
 */
const selectCartCount = (s: ReturnType<typeof useCartStore.getState>) =>
  s.items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);

interface CartIconButtonProps {
  className?: string;
}

/**
 * Icon giỏ hàng ở header, kèm badge đỏ hiển thị tổng số lượng món.
 * Click → chuyển sang /checkout. Nếu giỏ trống vẫn cho click (hiển thị trang checkout).
 */
export function CartIconButton({ className }: CartIconButtonProps) {
  const navigate = useNavigate();
  const count = useCartStore(selectCartCount);

  return (
    <button
      type="button"
      aria-label={`Giỏ hàng (${count} món)`}
      onClick={() => navigate("/checkout")}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-md",
        "text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full",
            "bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm",
            "ring-2 ring-card",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
