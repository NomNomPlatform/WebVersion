import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingBag, ChevronDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { ordersApi } from "@/api/orders";
import { formatCurrency } from "@/lib/utils";
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
  const PAGE_SIZE = 15;

  const { data: orderPage, isLoading } = useQuery({
    queryKey: ["admin-orders", currentPage],
    queryFn: () => ordersApi.listAllForAdmin(currentPage, PAGE_SIZE),
  });

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
                      <Button variant="outline" size="sm" className="rounded-lg">
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
    </div>
  );
}
