import { useNavigate } from "react-router-dom";
import { ShoppingBasket, ShoppingCart, History, Heart, Minus, Plus, X } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export function CartSidebar() {
  const navigate = useNavigate();
  const { items, setQuantity, removeItem, total } = useCartStore();

  return (
    <aside className="flex h-fit flex-col gap-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="font-semibold text-muted-foreground">Your Cart</h2>
        <p className="text-lg font-bold">Ready to eat?</p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShoppingBasket className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-medium">Your cart is empty</p>
          <p className="text-sm text-muted-foreground">
            Add some delicious items from the menu to start your order.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.menuItem.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{i.menuItem.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(i.menuItem.price)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setQuantity(i.menuItem.id, i.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-5 text-center text-sm">{i.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setQuantity(i.menuItem.id, i.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeItem(i.menuItem.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Estimated Total</span>
          <span className="text-lg font-bold">{formatCurrency(total())}</span>
        </div>
        <Button
          id="btn-go-checkout"
          className="w-full"
          disabled={items.length === 0}
          onClick={() => navigate("/checkout")}
        >
          <ShoppingCart className="h-4 w-4" />
          Proceed to Checkout
        </Button>
      </div>

      <div className="space-y-1 border-t pt-4 text-sm">
        <button
          className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-muted-foreground hover:bg-accent"
          onClick={() => navigate("/orders")}
        >
          <History className="h-4 w-4" /> Past Orders
        </button>
        <button className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-muted-foreground hover:bg-accent">
          <Heart className="h-4 w-4" /> Saved Items
        </button>
      </div>
    </aside>
  );
}
