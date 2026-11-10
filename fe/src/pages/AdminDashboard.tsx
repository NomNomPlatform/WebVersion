import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search, LayoutDashboard, Store, Users,
  ShoppingBag, BarChart3, Settings, LogOut, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { restaurantsApi } from "@/api/restaurants";
import { NotificationDropdown } from "@/components/shared/NotificationDropdown";

const NAV_ITEMS = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/admin/restaurants", icon: Store, label: "Restaurants" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/orders", icon: ShoppingBag, label: "Global Orders" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/admin/settings", icon: Settings, label: "Platform Settings" },
];

export function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const logout = useAuthStore(s => s.logout);
  const user = useAuthStore(s => s.user);

  // Lấy số nhà hàng PENDING để hiển thị badge
  const { data: restaurantsPage } = useQuery({
    queryKey: ["admin-restaurants", 0],
    queryFn: () => restaurantsApi.getAllForAdmin(0, 100),
  });

  const pendingCount = restaurantsPage?.content?.filter(r => r.status === "PENDING").length ?? 0;

  const isActive = (item: typeof NAV_ITEMS[number]) => {
    if (item.exact) return currentPath === item.to;
    return currentPath.startsWith(item.to);
  };

  const adminInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "AD";

  return (
    <div className="flex bg-[#f7f9ff] h-screen w-screen overflow-hidden relative">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col justify-between shrink-0 shadow-sm z-10">
        <div>
          {/* Logo */}
          <div className="p-6 pb-4">
            <img
              src="/logo.png"
              alt="NomNom"
              className="h-12 w-auto object-contain"
            />
            <p className="mt-2 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
              Admin · Platform Control
            </p>
          </div>

          <div className="mx-4 h-px bg-slate-100 mb-3" />

          {/* Nav */}
          <nav className="flex flex-col gap-0.5 px-3">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all group relative ${
                    active
                      ? "bg-[#006a62]/10 text-[#006a62] font-semibold"
                      : "font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {/* Active indicator */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#006a62] rounded-r-full" />
                  )}
                  <Icon className={`w-4 h-4 ${active ? "text-[#006a62]" : "text-slate-400 group-hover:text-slate-600"}`} />
                  <span className="flex-1">{item.label}</span>
                  {/* Badge PENDING chỉ hiện ở Restaurants */}
                  {item.label === "Restaurants" && pendingCount > 0 && (
                    <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                      {pendingCount}
                    </span>
                  )}
                  {active && <ChevronRight className="w-3 h-3 text-[#006a62]" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer — admin info + logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          {/* Admin info */}
          <div className="flex items-center gap-3 px-2 py-2 mb-3 rounded-xl bg-white border border-slate-100 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#006a62] to-[#00a896] flex items-center justify-center text-white font-bold text-xs shrink-0">
              {adminInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {user?.email ?? "admin@nomnom.vn"}
              </p>
              <span className="text-[10px] font-bold text-[#006a62] bg-[#006a62]/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                Admin
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => { logout(); navigate("/login"); }}
            className="w-full text-slate-500 hover:text-red-600 hover:bg-red-50 justify-start gap-3 font-medium text-sm h-9 rounded-xl"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f7f9ff]">
        {/* Top Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-slate-50 border-transparent focus:bg-white focus:border-[#006a62]/30 focus:ring-2 focus:ring-[#006a62]/10 rounded-full h-10 w-full transition-all"
                placeholder="Search across platform..."
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* System status badge */}
            <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              System Live
            </div>

            {/* Bell with pending badge */}
            <NotificationDropdown />

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#006a62] to-[#00a896] flex items-center justify-center text-white font-bold text-sm ml-1 shadow-sm border-2 border-white ring-2 ring-slate-100 cursor-pointer">
              {adminInitials}
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
