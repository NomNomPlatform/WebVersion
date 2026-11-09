import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { ordersApi } from "@/api/orders";
import { paymentsApi } from "@/api/payments";
import { features } from "@/lib/features";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { PaymentStatusBadge } from "@/components/shared/PaymentStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface OrderPaymentSectionProps {
  orderId: string;
  orderStatus: string;
}

function OrderPaymentSection({ orderId, orderStatus }: OrderPaymentSectionProps) {
  const queryClient = useQueryClient();

  const { data: payment, isLoading, error } = useQuery({
    queryKey: ["order-payment", orderId],
    queryFn: () => paymentsApi.getByOrderId(orderId),
    enabled: features.payments,
    retry: false,
  });

  const refundMutation = useMutation({
    mutationFn: (paymentId: string) => paymentsApi.refund(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-payment", orderId] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (err) => {
      alert("Hoàn tiền thất bại: " + (err instanceof Error ? err.message : "Lỗi hệ thống"));
    },
  });

  if (!features.payments) return null;
  if (isLoading) {
    return <span className="text-xs text-muted-foreground">Đang tải thông tin thanh toán...</span>;
  }

  if (error || !payment) {
    return <span className="text-xs text-muted-foreground font-medium">Thanh toán: Tiền mặt (COD)</span>;
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-muted-foreground">Thanh toán:</span>
      <PaymentStatusBadge status={payment.status} />

      {payment.status === "COMPLETED" && orderStatus !== "CANCELLED" && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-destructive hover:bg-destructive/10 text-destructive font-medium px-2.5 py-0"
          onClick={() => {
            if (confirm("Bạn có chắc chắn muốn hoàn tiền cho đơn hàng này?")) {
              refundMutation.mutate(payment.id);
            }
          }}
          disabled={refundMutation.isPending}
        >
          {refundMutation.isPending ? "Đang hoàn tiền..." : "Hoàn tiền"}
        </Button>
      )}
    </div>
  );
}

export function OrderHistoryPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => ordersApi.myOrders(0, 20),
    refetchInterval: 10_000,
  });

  const orders = Array.isArray(data) ? data : data?.content || [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Đơn hàng của tôi</h1>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {isError && <p className="text-destructive">Không tải được đơn hàng.</p>}

      {orders.map((order) => (
        <Card key={order.id}>
          <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">#{order.id.slice(0, 8)}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(order.createdAt).toLocaleString("vi-VN")}
              </p>
              <OrderPaymentSection orderId={order.id} orderStatus={order.status} />
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="font-bold text-primary">
                {formatCurrency(order.totalAmount)}
              </p>
              <OrderStatusBadge status={order.status} />
              {features.orderTracking && order.status === "SHIPPING" && (
                <Button
                  size="sm"
                  className="gap-1 bg-purple-600 text-white hover:bg-purple-700"
                  onClick={() => navigate(`/orders/${order.id}/tracking`)}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Theo dõi đơn
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {!isLoading && orders.length === 0 && (
        <p className="text-muted-foreground">Bạn chưa có đơn hàng nào.</p>
      )}
    </div>
  );
}
