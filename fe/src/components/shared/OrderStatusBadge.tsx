import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: "amber" | "blue" | "green" | "red" | "purple" }
> = {
  PENDING: { label: "Chờ xác nhận", variant: "amber" },
  CONFIRMED: { label: "Đã xác nhận", variant: "blue" },
  READY: { label: "Sẵn sàng", variant: "green" },
  SHIPPING: { label: "Đang giao", variant: "purple" },
  DELIVERED: { label: "Đã giao", variant: "green" },
  CANCELLED: { label: "Đã hủy", variant: "red" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
