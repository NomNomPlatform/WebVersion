import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Store, UtensilsCrossed, ShoppingBag, Clock,
  CheckCircle2, XCircle, AlertCircle, BarChart3,
  ArrowRight, ChevronRight, Settings, Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { restaurantsApi } from "@/api/restaurants";
import { menuApi } from "@/api/menu";
import { ordersApi } from "@/api/orders";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency } from "@/lib/utils";
import type {
  MenuItem, Order, OrderStatus, PageResponse, Restaurant,
} from "@/types";

/**
 * PageResponse đôi khi trả về list phẳng, đôi khi trả Page<T>. Hàm này
 * trích content bất chấp shape — dùng ở mọi chỗ cần list.
 */
function pageContent<T>(page: PageResponse<T> | T[] | null | undefined): T[] {
  if (!page) return [];
  return Array.isArray(page) ? page : page.content ?? [];
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, colorClass, bgClass, sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  sub?: string;
}) {
  return (
    <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-3xl font-extrabold ${colorClass} leading-none`}>{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1.5 font-medium">{sub}</p>}
          </div>
          <div className={`w-12 h-12 rounded-2xl ${bgClass} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${colorClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Restaurant status badge ──────────────────────────────────────────────────
function StatusBadge({ status }: { status?: Restaurant["status"] }) {
  switch (status) {
    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> Đã duyệt
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" /> Chờ duyệt
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <XCircle className="w-3 h-3" /> Bị từ chối
        </span>
      );
    case "SUSPENDED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <AlertCircle className="w-3 h-3" /> Tạm ngưng
        </span>
      );
    default:
      return <span className="text-slate-400 text-xs">—</span>;
  }
}

// ─── Quick Nav Card ──────────────────────────────────────────────────────────
function QuickNavCard({
  to, icon: Icon, label, description, iconBg, count, countLabel,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  description: string;
  iconBg: string;
  count?: number;
  countLabel?: string;
}) {
  return (
    <Link to={to} className="group block">
      <Card className="border-none shadow-sm rounded-2xl bg-white hover:shadow-md transition-all duration-200">
        <CardContent className="p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-800">{label}</p>
              {count !== undefined && count > 0 && (
                <span className="text-[10px] font-bold bg-[#ff6b35] text-white px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {description}
              {countLabel && count !== undefined && count > 0 ? ` · ${countLabel}` : ""}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Status helpers ──────────────────────────────────────────────────────────
const PENDING_STATUSES: OrderStatus[] = ["PENDING"];
const ACTIVE_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "READY", "SHIPPING"];
const REVENUE_STATUSES: OrderStatus[] = ["CONFIRMED", "READY", "SHIPPING", "DELIVERED"];

function statusLabel(status: OrderStatus): string {
  switch (status) {
    case "PENDING": return "Chờ xác nhận";
    case "CONFIRMED": return "Đã nhận";
    case "READY": return "Sẵn sàng";
    case "SHIPPING": return "Đang giao";
    case "DELIVERED": return "Đã giao";
    case "CANCELLED": return "Đã huỷ";
  }
}

function statusPillClass(status: OrderStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "CONFIRMED":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "READY":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "SHIPPING":
      return "bg-purple-50 text-purple-700 border border-purple-200";
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "CANCELLED":
      return "bg-slate-100 text-slate-600 border border-slate-200";
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function OwnerOverview() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  // Restaurant của owner hiện tại
  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery({
    queryKey: ["my-restaurant", user?.userId],
    queryFn: () => restaurantsApi.getMy(),
    enabled: !!user?.userId,
  });

  // Menu items của restaurant (size lớn để lấy totalElements làm KPI đếm)
  const { data: menuPage } = useQuery({
    queryKey: ["owner-restaurant-menu", restaurant?.id],
    queryFn: () =>
      menuApi.listByRestaurant(restaurant!.id, { page: 0, size: 100 }),
    enabled: !!restaurant?.id,
  });

  // Orders gần đây của restaurant
  const { data: ordersPage, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["restaurant-orders-overview", restaurant?.id],
    queryFn: () => ordersApi.restaurantOrders(restaurant!.id, 0, 50),
    enabled: !!restaurant?.id,
    refetchInterval: 30_000,
  });

  const allOrders: Order[] = useMemo(() => pageContent(ordersPage), [ordersPage]);
  const menuItems: MenuItem[] = useMemo(() => pageContent(menuPage), [menuPage]);

  const stats = useMemo(() => {
    const menuTotal = menuItems.length;
    const menuAvailable = menuItems.filter((m) => m.isAvailable).length;
    const pendingOrders = allOrders.filter((o) =>
      PENDING_STATUSES.includes(o.status)
    ).length;
    const activeOrders = allOrders.filter((o) =>
      ACTIVE_STATUSES.includes(o.status)
    ).length;
    const revenue = allOrders
      .filter((o) => REVENUE_STATUSES.includes(o.status))
      .reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
    return { menuTotal, menuAvailable, pendingOrders, activeOrders, revenue };
  }, [allOrders, menuItems]);

  const recentOrders = useMemo(
    () =>
      [...allOrders]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 5),
    [allOrders]
  );

  // Greeting theo giờ
  const hour = new Date().getHours();
  const greeting =
    hour < 11
      ? "Chào buổi sáng"
      : hour < 18
      ? "Chào buổi chiều"
      : "Chào buổi tối";
  const ownerName =
    user?.fullName?.split(" ").slice(-1)[0] ||
    user?.fullName ||
    "Chủ nhà hàng";

  const todayStr = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Cờ cho biết owner chưa từng có nhà hàng
  const noRestaurantYet =
    !isLoadingRestaurant && (restaurant === null || restaurant === undefined);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* ── Welcome ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {greeting},{" "}
            <span className="text-[#ab3500] capitalize">{ownerName}</span> 👋
          </h1>
          <p className="text-slate-500 mt-1 font-medium">{todayStr}</p>
        </div>
        {restaurant && (
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-500 font-bold uppercase">
                Nhà hàng hiện tại
              </p>
              <p className="text-sm font-bold text-slate-800 truncate max-w-[180px]">
                {restaurant.name}
              </p>
            </div>
            <StatusBadge status={restaurant.status} />
          </div>
        )}
      </div>

      {/* ── CTA khi chưa có nhà hàng ── */}
      {noRestaurantYet && (
        <Card className="border-none shadow-sm rounded-2xl bg-gradient-to-br from-[#ff6b35]/10 to-[#ab3500]/10 overflow-hidden">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white text-[#ab3500] flex items-center justify-center shrink-0 shadow-sm">
              <Store className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-lg">
                Bạn chưa có nhà hàng nào
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Tạo thông tin nhà hàng trong phần Cài đặt để bắt đầu thêm món
                và nhận đơn.
              </p>
            </div>
            <Button
              className="bg-[#ab3500] hover:bg-[#832600] text-white shrink-0"
              onClick={() => navigate("/owner/settings")}
            >
              Tạo nhà hàng <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Món đang bán"
          value={`${stats.menuAvailable}/${stats.menuTotal}`}
          icon={UtensilsCrossed}
          colorClass="text-[#ab3500]"
          bgClass="bg-[#ab3500]/10"
          sub={
            stats.menuTotal === 0
              ? "Chưa có món nào"
              : stats.menuAvailable === stats.menuTotal
              ? "Tất cả món đang bán"
              : `${stats.menuTotal - stats.menuAvailable} món đang ẩn`
          }
        />
        <KpiCard
          label="Đơn đang xử lý"
          value={isLoadingOrders ? "…" : stats.activeOrders}
          icon={ShoppingBag}
          colorClass="text-[#ab3500]"
          bgClass="bg-[#ab3500]/10"
          sub={
            stats.pendingOrders > 0
              ? `${stats.pendingOrders} đơn chờ xác nhận`
              : "Không có đơn chờ"
          }
        />
        <KpiCard
          label="Doanh thu (đã xác nhận)"
          value={isLoadingOrders ? "…" : formatCurrency(stats.revenue)}
          icon={Banknote}
          colorClass="text-[#ab3500]"
          bgClass="bg-[#ab3500]/10"
          sub="Tổng các đơn đã xác nhận & giao"
        />
        <KpiCard
          label="Trạng thái"
          value={
            !restaurant
              ? isLoadingRestaurant
                ? "…"
                : "Chưa có"
              : restaurant.status === "APPROVED"
              ? "Hoạt động"
              : restaurant.status === "PENDING"
              ? "Chờ duyệt"
              : restaurant.status === "REJECTED"
              ? "Bị từ chối"
              : "Tạm ngưng"
          }
          icon={
            !restaurant
              ? AlertCircle
              : restaurant.status === "APPROVED"
              ? CheckCircle2
              : restaurant.status === "PENDING"
              ? Clock
              : restaurant.status === "REJECTED"
              ? XCircle
              : AlertCircle
          }
          colorClass={
            !restaurant
              ? "text-slate-500"
              : restaurant.status === "APPROVED"
              ? "text-[#ab3500]"
              : restaurant.status === "PENDING"
              ? "text-[#ab3500]"
              : restaurant.status === "REJECTED"
              ? "text-red-500"
              : "text-slate-500"
          }
          bgClass={
            !restaurant
              ? "bg-slate-100"
              : restaurant.status === "APPROVED"
              ? "bg-[#ab3500]/10"
              : restaurant.status === "PENDING"
              ? "bg-[#ab3500]/10"
              : restaurant.status === "REJECTED"
              ? "bg-red-50"
              : "bg-slate-100"
          }
          sub={
            restaurant?.status === "APPROVED"
              ? "Đang hiển thị công khai"
              : "Cập nhật trong Settings"
          }
        />
      </div>

      {/* ── Main grid: Quick Nav + Recent Orders ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-3">
          <h2 className="font-bold text-slate-700 px-1">Truy cập nhanh</h2>
          <QuickNavCard
            to="/owner/orders"
            icon={ShoppingBag}
            label="Đơn hàng"
            description="Xem và xử lý đơn từ khách"
            iconBg="bg-[#ab3500]"
            count={stats.pendingOrders}
            countLabel="đơn chờ"
          />
          <QuickNavCard
            to="/owner/menu"
            icon={UtensilsCrossed}
            label="Quản lý menu"
            description={
              stats.menuTotal > 0
                ? `${stats.menuTotal} món · ${stats.menuAvailable} đang bán`
                : "Thêm món cho nhà hàng"
            }
            iconBg="bg-[#ab3500]"
          />
          <QuickNavCard
            to="/owner/analytics"
            icon={BarChart3}
            label="Phân tích"
            description="Xu hướng đơn hàng & doanh thu"
            iconBg="bg-[#ab3500]"
          />
          <QuickNavCard
            to="/owner/settings"
            icon={Settings}
            label="Cài đặt nhà hàng"
            description="Thông tin, giờ mở cửa, ảnh bìa"
            iconBg="bg-slate-400"
          />
        </div>

        {/* Đơn gần đây */}
        <div>
          <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#ab3500]" />
                  Đơn gần đây
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động cập nhật mỗi 30 giây
                </p>
              </div>
              <Link
                to="/owner/orders"
                className="text-xs font-semibold text-[#ab3500] hover:underline flex items-center gap-1"
              >
                Xem tất cả <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {isLoadingOrders ? (
              <div className="p-6 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 bg-slate-50 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-7 h-7 text-amber-500" />
                </div>
                <p className="font-bold text-slate-700">Chưa có đơn hàng</p>
                <p className="text-sm mt-1">
                  {restaurant
                    ? "Đơn mới từ khách sẽ hiện ở đây."
                    : "Tạo nhà hàng trong Settings trước."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#ab3500]/10 text-[#ab3500] flex items-center justify-center font-bold text-xs shrink-0">
                      #{order.id.slice(0, 4)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">
                        {order.items?.length ?? 0} món ·{" "}
                        {formatCurrency(order.totalAmount ?? 0)}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {new Date(order.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${statusPillClass(
                        order.status
                      )}`}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent menu (chỉ khi có restaurant) */}
          {restaurant && menuItems.length > 0 && (
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-[#ab3500]" />
                    Món mới thêm
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    3 món gần nhất trong menu
                  </p>
                </div>
                <Link
                  to="/owner/menu"
                  className="text-xs font-semibold text-[#ab3500] hover:underline flex items-center gap-1"
                >
                  Quản lý <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {menuItems
                  .slice(-3)
                  .reverse()
                  .map((item) => (
                    <div
                      key={item.id}
                      className="px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center text-slate-400 ${item.imageUrl ? 'hidden' : ''}`}>
                          <UtensilsCrossed className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.category}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-[#ab3500] text-sm">
                          {formatCurrency(item.price)}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {item.isAvailable ? (
                            <span className="text-emerald-600 font-medium">Đang bán</span>
                          ) : (
                            <span className="text-slate-400">Đang ẩn</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Banner cảnh báo REJECTED ── */}
      {restaurant?.status === "REJECTED" && (
        <Card className="border-none shadow-sm rounded-2xl bg-red-50 overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-red-900">
                Nhà hàng đã bị admin từ chối
              </p>
              <p className="text-sm text-red-700 mt-1">
                {restaurant.rejectionReason ||
                  "Vui lòng liên hệ admin để biết lý do chi tiết."}
              </p>
            </div>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white shrink-0"
              onClick={() => navigate("/owner/settings")}
            >
              Cập nhật & gửi lại
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default OwnerOverview;
