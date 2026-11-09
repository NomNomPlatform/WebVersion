import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MenuItem } from "@/types";

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface CartState {
  restaurantId: string | null;
  items: CartItem[];
  addItem: (item: MenuItem) => void;
  removeItem: (menuItemId: string) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  clear: () => void;
  total: () => number;
}

// Một giỏ hàng chỉ chứa món của một nhà hàng; thêm món từ nhà hàng khác sẽ thay thế giỏ hiện tại.
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      items: [],
      addItem: (item) => {
        const { restaurantId, items } = get();
        if (restaurantId !== item.restaurantId) {
          set({ restaurantId: item.restaurantId, items: [{ menuItem: item, quantity: 1 }] });
          return;
        }
        const existing = items.find((i) => i.menuItem.id === item.id);
        if (existing) {
          set({
            items: items.map((i) =>
              i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          });
        } else {
          set({ items: [...items, { menuItem: item, quantity: 1 }] });
        }
      },
      removeItem: (menuItemId) => {
        const items = get().items.filter((i) => i.menuItem.id !== menuItemId);
        set({ items, restaurantId: items.length ? get().restaurantId : null });
      },
      setQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.menuItem.id === menuItemId ? { ...i, quantity } : i
          ),
        });
      },
      clear: () => set({ items: [], restaurantId: null }),
      total: () =>
        get().items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0),
    }),
    { name: "nomnom_cart" }
  )
);
