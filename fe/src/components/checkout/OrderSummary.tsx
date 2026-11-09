import { ArrowRight, Lock, AlertCircle, ShoppingBasket, ImageOff } from "lucide-react";
import type { CartItem } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";

const DELIVERY_FEE = 25_000;   // 25.000 ₫ fixed fee
const TAX_RATE = 0.08;          // 8% VAT

interface OrderSummaryProps {
  items: CartItem[];
  onPlaceOrder: () => void;
  isLoading: boolean;
  error: string | null;
}

export function OrderSummary({
  items,
  onPlaceOrder,
  isLoading,
  error,
}: OrderSummaryProps) {
  const subtotal = items.reduce(
    (sum, i) => sum + i.menuItem.price * i.quantity,
    0
  );
  const taxes = subtotal * TAX_RATE;
  const total = subtotal + DELIVERY_FEE + taxes;

  return (
    <div className="sticky top-8 bg-white rounded-xl shadow-[0px_8px_30px_rgba(0,0,0,0.06)] border border-[#d7dadf]/20 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#e5e8ee] bg-[#f1f4f9]/50">
        <h2 className="text-2xl leading-8 font-semibold text-[#181c20]">
          Order Summary
        </h2>
        <p className="text-sm text-[#594139]/70 mt-0.5">
          {items.length} {items.length === 1 ? "item" : "items"}
        </p>
      </div>

      <div className="p-6">
        {/* Items list */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-[#594139]/60">
            <ShoppingBasket className="w-8 h-8" />
            <p className="text-sm">Your cart is empty</p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {items.map(({ menuItem, quantity }) => (
              <div
                key={menuItem.id}
                className="flex justify-between items-start gap-3"
              >
                <div className="flex gap-3 min-w-0">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#ffdbd0]">
                    {menuItem.imageUrl ? (
                      <img
                        src={menuItem.imageUrl}
                        alt={menuItem.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#ab3500]">
                        <ImageOff className="h-5 w-5" />
                      </div>
                    )}
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ab3500] px-1 text-[10px] font-bold text-white shadow ring-2 ring-white">
                      {quantity}x
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-[#181c20] leading-snug">
                      {menuItem.name}
                    </h3>
                    <p className="text-xs text-[#594139]">
                      {formatCurrency(menuItem.price)} each
                    </p>
                  </div>
                </div>
                <span className="text-base font-semibold text-[#181c20] shrink-0">
                  {formatCurrency(menuItem.price * quantity)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <div className="space-y-2 py-4 border-y border-[#e5e8ee]">
          <div className="flex justify-between items-center text-[#594139]">
            <span className="text-base">Subtotal</span>
            <span className="text-base">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-[#594139]">
            <span className="text-base">Delivery Fee</span>
            <span className="text-base">{formatCurrency(DELIVERY_FEE)}</span>
          </div>
          <div className="flex justify-between items-center text-[#594139]">
            <span className="text-base">VAT (8%)</span>
            <span className="text-base">{formatCurrency(taxes)}</span>
          </div>
        </div>

        <div className="flex justify-between items-center py-4">
          <span className="text-2xl font-semibold text-[#181c20]">Total</span>
          <span className="text-[28px] font-bold text-[#ab3500] tracking-tight">
            {formatCurrency(total)}
          </span>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Place Order button */}
        <button
          type="button"
          id="btn-place-order"
          onClick={onPlaceOrder}
          disabled={isLoading || items.length === 0}
          className="w-full bg-[#ab3500] hover:bg-[#832600] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold py-4 rounded-xl shadow-lg shadow-[#ab3500]/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Placing Order...
            </>
          ) : (
            <>
              Place Order
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <div className="mt-4 flex items-center justify-center gap-1 text-[#594139]/60">
          <Lock className="w-4 h-4" />
          <p className="text-xs">Secure checkout encrypted by SSL</p>
        </div>
      </div>
    </div>
  );
}
