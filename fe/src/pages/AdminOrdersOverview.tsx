import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, ShoppingBag, ChevronDown, Calendar,
  MapPin, FileText, User as UserIcon, Store, Copy, Check, Utensils
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { ordersApi } from "@/api/orders";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { OrderStatus, Order } from "@/types";

const STATUS_FILTERS: Array<"ALL" | OrderStatus> = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "READY",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_LABELS: Record<"ALL" | OrderStatus, string> = {
  ALL: "All Status",
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  READY: "Sẵn sàng",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
};

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50">
      <td className="p-4 pl-6"><div className="h-3.5 w-28 bg-slate-100 rounded animate-pulse" /></td>
      <td className="p-4"><div className="h-3.5 w-36 bg-slate-100 rounded animate-pulse" /></td>
      <td className="p-4"><div className="h-3.5 w-24 bg-slate-100 rounded animate-pulse" /></td>
      <td className="p-4"><div className="h-5 w-20 bg-slate-100 rounded-full animate-pulse" /></td>
      <td className="p-4"><div className="h-3.5 w-20 bg-slate-100 rounded animate-pulse" /></td>
      <td className="p-4 pr-6 text-right"><div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse ml-auto" /></td>
    </tr>
  );
}

export function AdminOrdersOverview() {
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const PAGE_SIZE = 15;

  const { data: orderPage, isLoading } = useQuery({
    queryKey: ["admin-orders", currentPage],
    queryFn: () => ordersApi.listAllForAdmin(currentPage, PAGE_SIZE),
  });

  const { data: orderDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["admin-order-detail", selectedOrder?.id],
    queryFn: () => ordersApi.get(selectedOrder!.id),
    enabled: !!selectedOrder?.id && isDetailOpen,
  });

  const activeOrder = orderDetail || selectedOrder;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`Đã sao chép ${label}!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const orders = orderPage?.content || [];
  const totalPages = orderPage?.totalPages ?? 1;

  // Lọc client-side
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.restaurantId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Global Orders</h1>
        <p className="text-slate-500 mt-1.5 font-medium">
          Monitor and track all transactions and orders across the NomNom platform.
        </p>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm rounded-2xl bg-white">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9 bg-slate-50 border-transparent rounded-xl h-11 font-medium focus:bg-white focus:border-[#006a62]/30 focus:ring-2 focus:ring-[#006a62]/10 transition-all"
              placeholder="Search by Order ID or Account ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  statusFilter === s
                    ? "bg-[#006a62] text-white shadow-md shadow-[#006a62]/20"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {s === "ALL" ? STATUS_LABELS.ALL : STATUS_LABELS[s as OrderStatus]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4 pl-6 font-semibold">Order ID</th>
                <th className="p-4 font-semibold">Restaurant ID</th>
                <th className="p-4 font-semibold">Customer ID</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">
                  <span className="flex items-center gap-1">Date <ChevronDown className="w-3 h-3" /></span>
                </th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 pr-6 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <div className="bg-slate-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ShoppingBag className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="font-bold text-slate-700">No orders found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order: Order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="p-4 pl-6 font-mono text-xs text-slate-700 font-semibold">
                      #{order.id.slice(0, 8)}...
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-600">
                      {order.restaurantId.slice(0, 8)}...
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-600">
                      {order.customerId.slice(0, 8)}...
                    </td>
                    <td className="p-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="p-4 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(order.createdAt).toLocaleString("vi-VN", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-extrabold text-[#ab3500]">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg hover:border-[#ab3500] hover:text-[#ab3500] font-semibold"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailOpen(true);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-sm text-slate-500 font-medium">
          <div>
            Showing {filteredOrders.length} of {orderPage?.totalElements ?? 0} orders
            {totalPages > 1 && (
              <span className="ml-2 text-slate-400">· Page {currentPage + 1} / {totalPages}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0 || isLoading}
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              className="h-8 rounded-lg font-semibold bg-white"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage + 1 >= totalPages || isLoading}
              onClick={() => setCurrentPage(p => p + 1)}
              className="h-8 rounded-lg font-semibold bg-white"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <ShoppingBag className="w-5 h-5 text-[#ab3500]" />
              Chi tiết đơn hàng
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs mt-0.5">
              Xem toàn bộ thông tin thanh toán, địa chỉ và món ăn trong đơn hàng.
            </DialogDescription>
          </DialogHeader>

          {activeOrder && (
            <div className="space-y-5 pt-3">
              {/* Order Primary Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#ffdbd0]/20 border border-[#ab3500]/20">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-slate-900 text-base">
                      #{activeOrder.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeOrder.id, "Mã đơn hàng")}
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                      title="Sao chép Order ID"
                    >
                      {copiedField === "Mã đơn hàng" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <OrderStatusBadge status={activeOrder.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Đặt lúc: {new Date(activeOrder.createdAt).toLocaleString("vi-VN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs text-slate-500 font-medium">Tổng thanh toán</p>
                  <p className="text-2xl font-extrabold text-[#ab3500]">
                    {formatCurrency(activeOrder.totalAmount)}
                  </p>
                </div>
              </div>

              {/* Delivery & Parties Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" /> Khách hàng
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-slate-700 truncate">
                      {activeOrder.customerId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeOrder.customerId, "Customer ID")}
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded shrink-0 transition-colors"
                      title="Sao chép Customer ID"
                    >
                      {copiedField === "Customer ID" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200/60">
                    <p className="text-[11px] text-slate-400 font-medium">Địa chỉ giao:</p>
                    <p className="text-xs font-medium text-slate-800 mt-0.5 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{activeOrder.deliveryAddress || "Không có địa chỉ"}</span>
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-slate-400" /> Nhà hàng
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-slate-700 truncate">
                      {activeOrder.restaurantId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeOrder.restaurantId, "Restaurant ID")}
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded shrink-0 transition-colors"
                      title="Sao chép Restaurant ID"
                    >
                      {copiedField === "Restaurant ID" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200/60">
                    <p className="text-[11px] text-slate-400 font-medium">Ghi chú của khách:</p>
                    <p className="text-xs text-slate-700 italic mt-0.5 flex items-start gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{activeOrder.note || "Không có ghi chú"}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-[#ab3500]" /> Danh sách món ăn
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    {activeOrder.items?.length || 0} món
                  </span>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                  {isLoadingDetail ? (
                    <div className="p-6 text-center text-slate-400 text-sm">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-[#ab3500] rounded-full animate-spin mx-auto mb-2" />
                      Đang tải danh sách món...
                    </div>
                  ) : !activeOrder.items || activeOrder.items.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">
                      Không có thông tin chi tiết món ăn trong đơn này.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-3 pl-4">Món ăn</th>
                          <th className="p-3 text-center">SL</th>
                          <th className="p-3 text-right">Đơn giá</th>
                          <th className="p-3 pr-4 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeOrder.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 pl-4 font-semibold text-slate-800">
                              {item.name}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-600">
                              ×{item.quantity}
                            </td>
                            <td className="p-3 text-right text-slate-500">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="p-3 pr-4 text-right font-bold text-slate-900">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Footer action */}
              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => setIsDetailOpen(false)}
                  className="bg-[#006a62] hover:bg-[#00524d] text-white rounded-xl font-bold px-6 h-10"
                >
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
