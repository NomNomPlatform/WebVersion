import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/types";

const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; variant: "amber" | "blue" | "green" | "red" | "gray" }
> = {
  PENDING:   { label: "Đang xử lý",  variant: "amber" },
  COMPLETED: { label: "Đã thanh toán", variant: "green" },
  FAILED:    { label: "Thất bại",     variant: "red"   },
  REFUNDED:  { label: "Đã hoàn tiền", variant: "gray"  },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return <Badge variant={cfg.variant as Parameters<typeof Badge>[0]["variant"]}>{cfg.label}</Badge>;
}
