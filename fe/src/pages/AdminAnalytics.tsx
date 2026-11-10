import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Banknote,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Store,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  AnalyticsKpiCard,
  DaysFilter,
  OrderStatusPieChart,
  RevenueOrdersChart,
} from "@/components/analytics/AnalyticsCharts";
import { ordersApi } from "@/api/orders";
import { paymentsApi } from "@/api/payments";
import { restaurantsApi } from "@/api/restaurants";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMethod, Restaurant } from "@/types";

const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string; color: string }> = {
  VNPAY: { label: "VNPay", color: "#006a62" },
  CASH: { label: "Tiền mặt (COD)", color: "#f59e0b" },
  CARD: { label: "Thẻ tín dụng", color: "#6366f1" },
};

export function AdminAnalytics() {
  const [days, setDays] = useState(30);

  const { data: orderAnalytics, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["admin-order-analytics", days],
    queryFn: () => ordersApi.adminAnalytics(days),
  });

  const { data: paymentAnalytics, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["admin-payment-analytics", days],
    queryFn: () => paymentsApi.adminAnalytics(days),
  });

  const { data: restaurantsPage } = useQuery({
    queryKey: ["admin-restaurants-lookup"],
    queryFn: () => restaurantsApi.getAllForAdmin(0, 200),
    staleTime: 60_000,
  });

  const restaurantMap = useMemo(() => {
    const map = new Map<string, Restaurant>();
    (restaurantsPage?.content ?? []).forEach((r) => map.set(r.id, r));
    return map;
  }, [restaurantsPage]);

  const paymentMethodPieData = useMemo(() => {
    if (!paymentAnalytics?.methodBreakdown) return [];
    return paymentAnalytics.methodBreakdown
      .map((item) => ({
        name: PAYMENT_METHOD_META[item.method]?.label ?? item.method,
        value: item.count,
        amount: item.amount,
        color: PAYMENT_METHOD_META[item.method]?.color ?? "#64748b",
      }))
      .filter((d) => d.value > 0);
  }, [paymentAnalytics]);

  const maxRestaurantRevenue = useMemo(() => {
    const list = orderAnalytics?.topRestaurants ?? [];
    if (list.length === 0) return 1;
    return Math.max(...list.map((r) => r.revenue), 1);
  }, [orderAnalytics]);

  const isLoading = isLoadingOrders || isLoadingPayments;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-[#006a62]" />
            Platform Analytics & Reports
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Tổng quan doanh thu toàn sàn (GMV), giao dịch thanh toán và hiệu suất nhà hàng
          </p>
        </div>

        <DaysFilter
          days={days}
          onChange={setDays}
          accentClass="bg-[#006a62] text-white shadow-sm"
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
      ) : !orderAnalytics ? (
        <Card className="border-none shadow-sm rounded-2xl bg-white">
          <CardContent className="p-12 text-center text-slate-500">
            Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <AnalyticsKpiCard
              label={`Tổng GMV (${days} ngày)`}
              value={formatCurrency(orderAnalytics.totalRevenue)}
              icon={Banknote}
              colorClass="text-[#006a62]"
              bgClass="bg-[#006a62]/10"
              sub={`Đã giao: ${formatCurrency(orderAnalytics.deliveredRevenue)}`}
            />
            <AnalyticsKpiCard
              label="Thanh toán thành công"
              value={formatCurrency(paymentAnalytics?.totalCompletedAmount ?? 0)}
              icon={CreditCard}
              colorClass="text-indigo-600"
              bgClass="bg-indigo-50"
              sub={`${paymentAnalytics?.completedCount ?? 0} GD · Hoàn: ${formatCurrency(paymentAnalytics?.totalRefundedAmount ?? 0)}`}
            />
            <AnalyticsKpiCard
              label="Tổng đơn hàng"
              value={orderAnalytics.totalOrders}
              icon={ShoppingBag}
              colorClass="text-blue-600"
              bgClass="bg-blue-50"
              sub={`${orderAnalytics.completedOrders} giao · ${orderAnalytics.cancelledOrders} hủy`}
            />
            <AnalyticsKpiCard
              label="Giá trị đơn TB"
              value={formatCurrency(orderAnalytics.averageOrderValue)}
              icon={TrendingUp}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-50"
              sub={`${orderAnalytics.activeOrders} đơn đang hoạt động`}
            />
          </div>

          {/* Trend Chart */}
          <RevenueOrdersChart
            data={orderAnalytics.dailyStats}
            title={`Biểu đồ GMV & Đơn hàng Toàn sàn (${days} ngày)`}
            accentColor="#006a62"
          />

          {/* Pie Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <OrderStatusPieChart
              statusBreakdown={orderAnalytics.statusBreakdown}
              title="Trạng thái Đơn hàng Toàn sàn"
            />

            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900">Phương thức Thanh toán</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tỷ trọng các giao dịch đã hoàn tất ({paymentAnalytics?.completedCount ?? 0} giao dịch)
                </p>
              </div>
              <CardContent className="p-6">
                {paymentMethodPieData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-sm text-slate-400">
                    Chưa có giao dịch thanh toán thành công trong kỳ này
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="h-56 w-56 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentMethodPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={82}
                            paddingAngle={3}
                          >
                            {paymentMethodPieData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val, _name, props) => [
                              `${val} GD (${formatCurrency(props?.payload?.amount ?? 0)})`,
                              "Thanh toán",
                            ]}
                            contentStyle={{
                              borderRadius: "10px",
                              border: "1px solid #e2e8f0",
                              fontSize: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 w-full space-y-3">
                      {paymentMethodPieData.map((item) => (
                        <div key={item.name} className="space-y-0.5">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="font-medium text-slate-700">{item.name}</span>
                            </div>
                            <span className="font-bold text-slate-900">{item.value} GD</span>
                          </div>
                          <p className="text-xs text-slate-500 pl-5">
                            {formatCurrency(item.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Restaurants Table */}
          <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-[#006a62]" />
                Top Nhà hàng Doanh thu Cao nhất
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Xếp hạng theo tổng doanh thu hợp lệ trong {days} ngày qua
              </p>
            </div>
            <CardContent className="p-0">
              {orderAnalytics.topRestaurants.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400">
                  Chưa có dữ liệu nhà hàng trong khoảng thời gian này
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {orderAnalytics.topRestaurants.map((stat, idx) => {
                    const info = restaurantMap.get(stat.restaurantId);
                    const pct = Math.round((stat.revenue / maxRestaurantRevenue) * 100);
                    return (
                      <div key={stat.restaurantId} className="px-6 py-4 space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                                idx === 0
                                  ? "bg-[#006a62] text-white"
                                  : idx === 1
                                  ? "bg-teal-100 text-[#006a62]"
                                  : idx === 2
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">
                                {info?.name ?? `Restaurant #${stat.restaurantId.slice(0, 8)}`}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {info?.cuisineType ? `${info.cuisineType} · ` : ""}
                                {stat.orderCount} đơn hàng
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-extrabold text-[#006a62]">
                              {formatCurrency(stat.revenue)}
                            </p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#006a62] to-[#00a896] rounded-full"
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
        </>
      )}
    </div>
  );
}

export default AdminAnalytics;

