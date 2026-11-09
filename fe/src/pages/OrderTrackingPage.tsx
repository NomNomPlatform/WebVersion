import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, Loader2, MapPin, XCircle } from "lucide-react";
import { isAxiosError } from "axios";
import { ordersApi } from "@/api/orders";
import { features } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { OrderTrackingMap } from "@/components/shared/OrderTrackingMap";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { OrderStatus } from "@/types";

const TIMELINE: { status: OrderStatus; label: string }[] = [
  { status: "PENDING", label: "Đã đặt" },
  { status: "CONFIRMED", label: "Đã xác nhận" },
  { status: "READY", label: "Sẵn sàng" },
  { status: "SHIPPING", label: "Đang giao" },
  { status: "DELIVERED", label: "Đã nhận" },
];

function statusIndex(s: OrderStatus): number {
  if (s === "CANCELLED") return -1;
  return TIMELINE.findIndex((t) => t.status === s);
}

export function OrderTrackingPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [arrived, setArrived] = useState(false);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.get(id),
    enabled: Boolean(id) && features.orderTracking,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      // Tắt polling khi đã DELIVERED/CANCELLED, nếu không polling 5s.
      if (status === "DELIVERED" || status === "CANCELLED") return false;
      return 5_000;
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => ordersApi.confirmDelivery(id),
    onSuccess: () => {
      toast.success("Cảm ơn bạn! Đơn hàng đã hoàn tất.");
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (err) => {
      toast.error(
        isAxiosError(err)
          ? err.response?.data?.message ?? "Không xác nhận được đơn hàng"
          : "Lỗi hệ thống",
      );
    },
  });

  if (!features.orderTracking) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        Tính năng theo dõi đơn hàng chưa được bật.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive">Không tải được thông tin đơn hàng.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/orders")}>
          Quay lại danh sách đơn
        </Button>
      </div>
    );
  }

  const currentIdx = statusIndex(order.status);
  const isShipping = order.status === "SHIPPING";
  const isDelivered = order.status === "DELIVERED";
  const isCancelled = order.status === "CANCELLED";

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/orders")}
        className="gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại đơn hàng
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Đơn hàng #{order.id.slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Đặt lúc {new Date(order.createdAt).toLocaleString("vi-VN")}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Timeline */}
      {!isCancelled && (
        <Card>
          <CardContent className="p-4">
            <ol className="flex items-center justify-between gap-2 overflow-x-auto">
              {TIMELINE.map((t, idx) => {
                const done = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <li key={t.status} className="flex flex-1 flex-col items-center text-center">
                    <div
                      className={
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold " +
                        (done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-200 bg-white text-slate-400")
                      }
                    >
                      {isCurrent ? <Loader2 className="h-3 w-3 animate-spin" /> : done ? "✓" : idx + 1}
                    </div>
                    <span
                      className={
                        "mt-2 text-[11px] font-semibold " +
                        (done ? "text-emerald-700" : "text-slate-400")
                      }
                    >
                      {t.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {isCancelled && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4 text-red-700">
            <XCircle className="h-5 w-5" />
            <p className="text-sm font-semibold">Đơn hàng đã bị huỷ.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Map / Status placeholder */}
        <div>
          {isShipping ? (
            <OrderTrackingMap onArrived={() => setArrived(true)} />
          ) : isDelivered ? (
            <DeliveredSummary orderId={order.id} />
          ) : (
            <PreShippingNotice status={order.status} />
          )}
        </div>

        {/* Sidebar: order info + confirm button */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin giao hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p>{order.deliveryAddress || "Không rõ địa chỉ"}</p>
              </div>
              {order.note && (
                <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">
                  Ghi chú: {order.note}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Món ăn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(order.items ?? []).map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    {item.quantity}× {item.name}
                  </span>
                  <span className="text-slate-500">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Tổng cộng</span>
                <span className="text-[#ab3500]">{formatCurrency(order.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>

          {isShipping && (
            <Button
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={!arrived || confirmMutation.isPending}
              onClick={() => confirmMutation.mutate()}
            >
              {confirmMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xác nhận...
                </>
              ) : arrived ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Đã nhận hàng
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Đang chờ shipper...
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const PRE_SHIPPING_MESSAGES: Partial<Record<OrderStatus, string>> = {
  PENDING: "Đơn hàng đang chờ nhà hàng xác nhận.",
  CONFIRMED: "Nhà hàng đang chuẩn bị món của bạn.",
  READY: "Món đã sẵn sàng — sắp được giao. Bản đồ sẽ hiển thị khi shipper bắt đầu giao.",
};

function PreShippingNotice({ status }: { status: OrderStatus }) {
  const message = PRE_SHIPPING_MESSAGES[status] ?? "Đang cập nhật trạng thái...";
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed bg-slate-50 p-8 text-center text-slate-500">
      <Clock className="mb-3 h-10 w-10 text-slate-300" />
      <p className="text-sm font-semibold">{message}</p>
      <p className="mt-1 text-xs">Trang tự động cập nhật mỗi 5 giây.</p>
    </div>
  );
}

function DeliveredSummary({ orderId }: { orderId: string }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
      <CheckCircle2 className="mb-3 h-14 w-14 text-emerald-600" />
      <p className="text-lg font-bold text-emerald-800">Đã giao thành công!</p>
      <p className="mt-1 text-sm text-emerald-700">
        Cảm ơn bạn đã đặt món. Đơn hàng #{orderId.slice(0, 8)} đã hoàn tất.
      </p>
    </div>
  );
}
