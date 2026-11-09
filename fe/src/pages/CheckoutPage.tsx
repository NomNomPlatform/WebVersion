import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBasket } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { ordersApi } from "@/api/orders";
import { getErrorMessage } from "@/api/apiClient";
import {
  AddressSection,
  PaymentSection,
  DeliveryNoteSection,
  OrderSummary,
} from "@/components/checkout";
import type { PaymentMethodId } from "@/components/checkout";

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, restaurantId, clear } = useCartStore();

  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState<string | undefined>(
    undefined,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("cash");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handlePlaceOrder = async () => {
    // Validate address
    if (!address.trim()) {
      setAddressError("Vui lòng nhập địa chỉ giao hàng.");
      return;
    }
    setAddressError(undefined);

    if (!restaurantId || items.length === 0) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await ordersApi.create({
        restaurantId,
        deliveryAddress: address.trim(),
        note: note.trim() || undefined,
        items: items.map((i) => ({
          menuItemId: i.menuItem.id,
          quantity: i.quantity,
        })),
        paymentMethod,
      });

      clear();

      // Nếu backend trả về paymentUrl (chỉ xảy ra với VNPAY),
      // redirect toàn trang sang cổng thanh toán VNPay Sandbox.
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

      // Với CASH hoặc CARD (auto-complete) — chuyển sang trang đơn hàng
      navigate("/orders", { state: { newOrderId: result.order.id } });
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Empty cart guard
  if (items.length === 0) {
    return (
      <div className="bg-[#f7f9ff] min-h-screen flex flex-col font-sans">
        <main className="flex-grow w-full max-w-[1280px] mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-[40px] leading-[48px] sm:text-[48px] sm:leading-[56px] font-bold tracking-tight text-[#ab3500]">
              Checkout
            </h1>
          </div>
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-[#594139]">
            <div className="w-20 h-20 rounded-full bg-[#ffdbd0] flex items-center justify-center">
              <ShoppingBasket className="w-9 h-9 text-[#ab3500]" />
            </div>
            <p className="text-xl font-semibold text-[#181c20]">
              Giỏ hàng của bạn đang trống
            </p>
            <p className="text-sm text-[#594139]/70">
              Thêm món ăn từ nhà hàng trước khi thanh toán.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-2 px-6 py-2.5 rounded-xl bg-[#ab3500] text-white text-sm font-semibold hover:bg-[#832600] transition-colors"
            >
              Khám phá nhà hàng
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-[#f7f9ff] text-[#181c20] min-h-screen flex flex-col font-sans">
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-[40px] leading-[48px] sm:text-[48px] sm:leading-[56px] font-bold tracking-tight text-[#ab3500]">
            Checkout
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left column: form sections */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <AddressSection
              value={address}
              onChange={(v) => {
                setAddress(v);
                if (v.trim()) setAddressError(undefined);
              }}
              error={addressError}
            />

            <PaymentSection value={paymentMethod} onChange={setPaymentMethod} />

            <DeliveryNoteSection value={note} onChange={setNote} />
          </div>

          {/* Right column: order summary + place order */}
          <div className="lg:col-span-4 relative">
            <OrderSummary
              items={items}
              onPlaceOrder={handlePlaceOrder}
              isLoading={isSubmitting}
              error={submitError}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default CheckoutPage;
