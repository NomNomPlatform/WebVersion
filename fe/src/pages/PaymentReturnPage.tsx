import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, ArrowRight, Home } from "lucide-react";

/**
 * PaymentReturnPage — Xử lý callback redirect sau thanh toán VNPay.
 * URL mẫu: /payment/return?status=success&orderId=<uuid>
 *          /payment/return?status=failed&orderId=<uuid>&reason=insufficient_funds
 */
export function PaymentReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const status = params.get("status"); // "success" | "failed"
  const orderId = params.get("orderId");
  const reason = params.get("reason");

  const isSuccess = status === "success";

  // Auto-redirect after 5 seconds on success
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => navigate("/orders"), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  return (
    <div className="bg-[#f7f9ff] min-h-screen flex items-center justify-center font-sans px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0px_8px_40px_rgba(0,0,0,0.08)] border border-[#d7dadf]/20 overflow-hidden">
        {/* Status banner */}
        <div
          className={`p-8 flex flex-col items-center text-center gap-4 ${
            isSuccess ? "bg-[#f0fdf4]" : "bg-[#fff5f5]"
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-16 h-16 text-green-500" strokeWidth={1.5} />
          ) : (
            <XCircle className="w-16 h-16 text-red-400" strokeWidth={1.5} />
          )}
          <div>
            <h1 className="text-2xl font-bold text-[#181c20]">
              {isSuccess ? "Payment Successful!" : "Payment Failed"}
            </h1>
            <p className="text-sm text-[#594139] mt-1">
              {isSuccess
                ? "Your order has been placed and is being prepared."
                : reason
                ? `Reason: ${reason}`
                : "Something went wrong. Please try again or use a different payment method."}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          {orderId && (
            <div className="bg-[#f1f4f9] rounded-lg px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-[#594139]">Order ID</span>
              <span className="font-mono font-semibold text-[#181c20] text-xs truncate max-w-[200px]">
                {orderId}
              </span>
            </div>
          )}

          {isSuccess && (
            <p className="text-xs text-[#594139]/60 text-center">
              Redirecting to your orders in 5 seconds…
            </p>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="w-full flex items-center justify-center gap-2 bg-[#ab3500] hover:bg-[#832600] text-white text-sm font-semibold py-3.5 rounded-xl transition-colors"
            >
              View My Orders
              <ArrowRight className="w-4 h-4" />
            </button>

            {!isSuccess && (
              <button
                type="button"
                onClick={() => navigate("/checkout")}
                className="w-full flex items-center justify-center gap-2 bg-white border border-[#e0e3e8] hover:bg-[#f1f4f9] text-[#181c20] text-sm font-semibold py-3.5 rounded-xl transition-colors"
              >
                Try Again
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full flex items-center justify-center gap-2 text-[#594139]/70 hover:text-[#181c20] text-sm font-medium py-2 transition-colors"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentReturnPage;
