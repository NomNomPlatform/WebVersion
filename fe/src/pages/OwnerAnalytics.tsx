import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  UtensilsCrossed,
  BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  AnalyticsKpiCard,
  DaysFilter,
  OrderStatusPieChart,
  RevenueOrdersChart,
} from "@/components/analytics/AnalyticsCharts";
import { restaurantsApi } from "@/api/restaurants";
import { ordersApi } from "@/api/orders";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency } from "@/lib/utils";

export function OwnerAnalytics() {
  const user = useAuthStore((s) => s.user);
  const [days, setDays] = useState(30);

  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery({
    queryKey: ["my-restaurant", user?.userId],
    queryFn: () => restaurantsApi.getMy(),
    enabled: !!user?.userId,
  });

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["restaurant-analytics", restaurant?.id, days],
    queryFn: () => ordersApi.restaurantAnalytics(restaurant!.id, days),
    enabled: !!restaurant?.id,
  });

  const isLoading = isLoadingRestaurant || isLoadingAnalytics;

  const completionRate =
    analytics && analytics.totalOrders > 0
      ? Math.round((analytics.completedOrders / analytics.totalOrders) * 100)
      : 0;

  const maxItemQty =
    analytics?.topItems && analytics.topItems.length > 0
      ? Math.max(...analytics.topItems.map((i) => i.totalQuantity))
      : 1;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-[#ab3500]" />
            Phân tích & Báo cáo
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Theo dõi doanh thu, đơn hàng và món ăn bán chạy của{" "}
            <span className="font-bold text-slate-700">
              {restaurant?.name ?? "nhà hàng"}
            </span>
          </p>
        </div>

        <DaysFilter
          days={days}
          onChange={setDays}
          accentClass="bg-[#ab3500] text-white shadow-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-none shadow-sm rounded-2xl bg-white">
                <CardContent className="p-6">
                  <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mb-3" />
                  <div className="h-8 w-28 bg-slate-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="h-80 bg-white rounded-2xl shadow-sm animate-pulse" />
        </div>
      ) : !analytics ? (
        <Card className="border-none shadow-sm rounded-2xl bg-white">
          <CardContent className="p-12 text-center text-slate-500">
            Không thể tải dữ liệu phân tích. Vui lòng thử lại sau.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <AnalyticsKpiCard
              label={`Doanh thu (${days} ngày)`}
              value={formatCurrency(analytics.totalRevenue)}
              icon={Banknote}
              colorClass="text-[#ab3500]"
              bgClass="bg-[#ab3500]/10"
              sub={`Đã giao: ${formatCurrency(analytics.deliveredRevenue)}`}
            />
            <AnalyticsKpiCard
              label="Tổng đơn hàng"
              value={analytics.totalOrders}
              icon={ShoppingBag}
              colorClass="text-blue-600"
              bgClass="bg-blue-50"
              sub={`${analytics.activeOrders} đơn đang xử lý`}
            />
            <AnalyticsKpiCard
              label="Giá trị đơn TB"
              value={formatCurrency(analytics.averageOrderValue)}
              icon={TrendingUp}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-50"
              sub="Tính trên các đơn hợp lệ"
            />
            <AnalyticsKpiCard
              label="Tỷ lệ hoàn thành"
              value={`${completionRate}%`}
              icon={CheckCircle2}
              colorClass="text-teal-600"
              bgClass="bg-teal-50"
              sub={`${analytics.completedOrders} giao · ${analytics.cancelledOrders} hủy`}
            />
          </div>

          {/* Trend Chart */}
          <RevenueOrdersChart
            data={analytics.dailyStats}
            title={`Biểu đồ Doanh thu & Đơn hàng (${days} ngày)`}
            accentColor="#ab3500"
          />

          {/* Bottom Grid: Status Breakdown + Top Selling Items */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <OrderStatusPieChart statusBreakdown={analytics.statusBreakdown} />

            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-[#ab3500]" />
                  Top Món Bán Chạy
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Xếp hạng theo số lượng đã đặt trong {days} ngày qua
                </p>
              </div>
              <CardContent className="p-0">
                {analytics.topItems.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-sm text-slate-400 px-6">
                    Chưa có món ăn nào được đặt trong khoảng thời gian này
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {analytics.topItems.map((item, idx) => {
                      const pct = Math.round((item.totalQuantity / maxItemQty) * 100);
                      return (
                        <div key={item.menuItemId} className="px-6 py-3.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                                  idx === 0
                                    ? "bg-[#ab3500] text-white"
                                    : idx === 1
                                    ? "bg-orange-100 text-[#ab3500]"
                                    : idx === 2
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800 text-sm truncate">
                                {item.name}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-[#ab3500]">
                                {formatCurrency(item.totalRevenue)}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {item.totalQuantity} phần
                              </p>
                            </div>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#ab3500] to-[#ff6b35] rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default OwnerAnalytics;

