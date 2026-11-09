import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/api/orders";
import { restaurantsApi } from "@/api/restaurants";
import { useAuthStore } from "@/store/authStore";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Loader2, SlidersHorizontal, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import type { OrderStatus, Order, OrderItem } from "@/types";

type FilterTab = "ALL" | OrderStatus;
type SortKey = "newest" | "oldest" | "price_high" | "price_low";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xác nhận" },
  { value: "CONFIRMED", label: "Đã nhận" },
  { value: "READY", label: "Sẵn sàng" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "DELIVERED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export function LiveOrdersPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  // Fetch restaurant
  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery({
    queryKey: ["my-restaurant", user?.userId],
    queryFn: async () => {
      const res = await restaurantsApi.list();
      const list = Array.isArray(res) ? res : res?.content || [];
      return list.find((r) => r.ownerId === user?.userId);
    },
    enabled: !!user?.userId,
  });

  // Fetch orders
  const { data: orders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["restaurant-orders", restaurant?.id],
    queryFn: () => ordersApi.restaurantOrders(restaurant!.id, 0, 50),
    enabled: !!restaurant?.id,
    refetchInterval: 15000,
  });

  const allOrders: Order[] = useMemo(() => {
    const list = Array.isArray(orders) ? orders : orders?.content || [];
    // Filter
    const filtered = filterTab === "ALL"
      ? list
      : list.filter((o: Order) => o.status === filterTab);
    // Sort
    return [...filtered].sort((a: Order, b: Order) => {
      switch (sortKey) {
        case "oldest": return +new Date(a.createdAt) - +new Date(b.createdAt);
        case "price_high": return (b.totalAmount ?? 0) - (a.totalAmount ?? 0);
        case "price_low": return (a.totalAmount ?? 0) - (b.totalAmount ?? 0);
        default: return +new Date(b.createdAt) - +new Date(a.createdAt); // newest
      }
    });
  }, [orders, filterTab, sortKey]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success("Cập nhật trạng thái thành công");
      queryClient.invalidateQueries({
        queryKey: ["restaurant-orders", restaurant?.id],
      });
    },
    onError: (err) => {
      toast.error(
        "Lỗi cập nhật: " +
          (err instanceof Error ? err.message : "Lỗi hệ thống"),
      );
    },
  });

  // Count per tab
  const allOrdersRaw: Order[] = Array.isArray(orders) ? orders : orders?.content || [];
  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { ALL: allOrdersRaw.length } as Record<FilterTab, number>;
    FILTER_TABS.forEach(tab => {
      if (tab.value !== "ALL") {
        counts[tab.value] = allOrdersRaw.filter((o: Order) => o.status === tab.value).length;
      }
    });
    return counts;
  }, [allOrdersRaw]);

  if (isLoadingRestaurant) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-slate-700">Chưa có nhà hàng</h2>
        <p className="text-muted-foreground mt-2">
          Vui lòng tạo nhà hàng trước khi quản lý đơn.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Live Orders</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Cập nhật mỗi 15 giây
        </div>
      </div>

      {/* Filter Tabs + Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterTab(tab.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                filterTab === tab.value
                  ? "bg-[#ab3500] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
              {tabCounts[tab.value] > 0 && (
                <span className={`ml-1.5 text-xs ${filterTab === tab.value ? "text-white/80" : "text-slate-400"}`}>
                  {tabCounts[tab.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <Select value={sortKey} onValueChange={(v: string) => setSortKey(v as SortKey)} className="w-44">
            <SelectContent>
              <SelectItem value="newest">Mới nhất</SelectItem>
              <SelectItem value="oldest">Cũ nhất</SelectItem>
              <SelectItem value="price_high">Giá cao → thấp</SelectItem>
              <SelectItem value="price_low">Giá thấp → cao</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Order Grid */}
      {isLoadingOrders ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="bg-slate-50 pb-4">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="w-24 h-5 bg-slate-200 rounded animate-pulse" />
                    <div className="w-32 h-4 bg-slate-200 rounded animate-pulse" />
                  </div>
                  <div className="w-20 h-6 bg-slate-200 rounded-full animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="w-full h-12 bg-slate-100 rounded animate-pulse" />
                <div className="w-full h-16 bg-slate-100 rounded animate-pulse" />
                <div className="w-full h-8 bg-slate-100 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : allOrders.length === 0 ? (
        <Card className="bg-slate-50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
            <p>Không có đơn hàng nào.</p>
            <p className="text-sm mt-1">Thử chọn filter khác.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allOrders.map((order: Order) => (
              <Card key={order.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-slate-50 border-b pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-800">
                        #{order.id.slice(0, 8)}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(order.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-4 flex flex-col justify-between">
                  <div className="space-y-3 mb-3">
                    {/* Food summary */}
                    {order.items && order.items.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-[#ab3500]/10 flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4 text-[#ab3500]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {order.items.map((item: OrderItem) => item.name).join(", ")}
                          </p>
                          <p className="text-xs text-slate-500">{order.items.length} món</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        Khách hàng:
                      </span>
                      <p className="text-sm font-medium">
                        {order.deliveryAddress || "Không rõ địa chỉ"}
                      </p>
                      {order.note && (
                        <p className="text-xs italic text-amber-600 mt-1">
                          Ghi chú: {order.note}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold text-sm">
                      <span>Tổng cộng:</span>
                      <span className="text-[#ab3500]">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-4 border-t">
                    {order.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          className="flex-1 bg-[#006a62] hover:bg-[#00514b] text-white"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: order.id,
                              status: "CONFIRMED",
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                        >
                          Xác nhận đơn
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: order.id,
                              status: "CANCELLED",
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                        >
                          Hủy
                        </Button>
                      </>
                    )}
                    {order.status === "CONFIRMED" && (
                      <Button
                        size="sm"
                        className="w-full bg-[#ab3500] hover:bg-[#832600] text-white"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: order.id,
                            status: "READY",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        Báo Xong (Ready)
                      </Button>
                    )}
                    {order.status === "READY" && (
                      <Button
                        size="sm"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: order.id,
                            status: "SHIPPING",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        🛵 Bắt đầu giao
                      </Button>
                    )}
                    {order.status === "SHIPPING" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full bg-purple-50 text-purple-700"
                        disabled
                      >
                        🛵 Đang giao hàng...
                      </Button>
                    )}
                    {order.status === "DELIVERED" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full bg-emerald-50 text-emerald-700"
                        disabled
                      >
                        ✅ Đã giao thành công
                      </Button>
                    )}
                    {order.status === "CANCELLED" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full bg-slate-100 text-slate-500"
                        disabled
                      >
                        Đã hủy
                      </Button>
                    )}
                    {order.status !== "PENDING" &&
                      order.status !== "CONFIRMED" &&
                      order.status !== "READY" &&
                      order.status !== "SHIPPING" &&
                      order.status !== "DELIVERED" &&
                      order.status !== "CANCELLED" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full bg-slate-100 text-slate-500"
                          disabled
                        >
                          Không có hành động
                        </Button>
                      )}
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}
