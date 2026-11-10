import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { DailyOrderStat, OrderStatus } from "@/types";

export const DAY_OPTIONS = [7, 30, 90] as const;

export function DaysFilter({
  days,
  onChange,
  accentClass = "bg-[#ab3500] text-white shadow-sm",
}: {
  days: number;
  onChange: (days: number) => void;
  accentClass?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
      {DAY_OPTIONS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            days === d
              ? accentClass
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {d} ngày
        </button>
      ))}
    </div>
  );
}

export function AnalyticsKpiCard({
  label,
  value,
  icon: Icon,
  colorClass,
  bgClass,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  sub?: string;
}) {
  return (
    <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className={`text-2xl xl:text-3xl font-extrabold ${colorClass} leading-tight truncate`}>
              {value}
            </p>
            {sub && <p className="text-xs text-slate-400 mt-1.5 font-medium">{sub}</p>}
          </div>
          <div className={`w-11 h-11 rounded-2xl ${bgClass} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${colorClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

function formatCompactVnd(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export function RevenueOrdersChart({
  data,
  title = "Xu hướng Doanh thu & Đơn hàng",
  accentColor = "#ab3500",
}: {
  data: DailyOrderStat[];
  title?: string;
  accentColor?: string;
}) {
  const [metric, setMetric] = useState<"revenue" | "orderCount">("revenue");

  const chartData = data.map((d) => ({
    ...d,
    shortDate: formatShortDate(d.date),
  }));

  return (
    <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi biến động theo từng ngày trong kỳ
          </p>
        </div>
        <div className="inline-flex bg-slate-100 rounded-lg p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMetric("revenue")}
            className={`px-3 py-1 rounded-md transition-colors ${
              metric === "revenue"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Doanh thu
          </button>
          <button
            type="button"
            onClick={() => setMetric("orderCount")}
            className={`px-3 py-1 rounded-md transition-colors ${
              metric === "orderCount"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Số đơn
          </button>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accentColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="shortDate"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  metric === "revenue" ? formatCompactVnd(Number(v)) : String(v)
                }
                allowDecimals={false}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: "12px",
                }}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.date
                    ? `Ngày ${payload[0].payload.date}`
                    : ""
                }
                formatter={(value) => {
                  const num = Number(value ?? 0);
                  return metric === "revenue"
                    ? [formatCurrency(num), "Doanh thu"]
                    : [`${num} đơn`, "Số đơn hàng"];
                }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={accentColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#grad-${metric})`}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; color: string }
> = {
  DELIVERED: { label: "Đã giao", color: "#10b981" },
  CONFIRMED: { label: "Đã xác nhận", color: "#3b82f6" },
  READY: { label: "Sẵn sàng", color: "#14b8a6" },
  SHIPPING: { label: "Đang giao", color: "#8b5cf6" },
  PENDING: { label: "Chờ xác nhận", color: "#f59e0b" },
  CANCELLED: { label: "Đã hủy", color: "#ef4444" },
};

export function OrderStatusPieChart({
  statusBreakdown,
  title = "Tỷ lệ Trạng thái Đơn hàng",
}: {
  statusBreakdown: Record<OrderStatus, number>;
  title?: string;
}) {
  const pieData = (Object.keys(ORDER_STATUS_META) as OrderStatus[])
    .map((status) => ({
      name: ORDER_STATUS_META[status].label,
      value: statusBreakdown?.[status] ?? 0,
      color: ORDER_STATUS_META[status].color,
    }))
    .filter((d) => d.value > 0);

  return (
    <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">Phân bổ theo trạng thái xử lý</p>
      </div>
      <CardContent className="p-6">
        {pieData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-400">
            Chưa có dữ liệu đơn hàng trong kỳ này
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-56 w-56 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`${val} đơn`, "Số lượng"]}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full space-y-2.5">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

