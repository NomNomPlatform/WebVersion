import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Search, Bell, LayoutDashboard, ShoppingBag,
  UtensilsCrossed, BarChart3, Settings, LogOut, AlertCircle, UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { WelcomeModal } from "@/components/owner/WelcomeModal";
import { useQuery } from "@tanstack/react-query";
import { restaurantsApi } from "@/api/restaurants";
import { authApi } from "@/api/auth";
import { Avatar } from "@/components/shared/Avatar";
import { useState, useEffect } from "react";

export function OwnerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const logout = useAuthStore(s => s.logout);
  const user = useAuthStore(s => s.user);
  const setProfile = useAuthStore(s => s.setProfile);

  const { data: me } = useQuery({
    queryKey: ["users-me"],
    queryFn: authApi.me,
    enabled: !!user?.userId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (me) {
      setProfile({ fullName: me.fullName, avatarUrl: me.avatarUrl });
    }
  }, [me, setProfile]);
  
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Fetch restaurant
  const { data: restaurant } = useQuery({
    queryKey: ["my-restaurant", user?.userId],
    queryFn: async () => {
      return await restaurantsApi.getMy();
    },
    enabled: !!user?.userId,
  });

  // Check if user should see welcome modal
  useEffect(() => {
    if (restaurant === undefined) return; // Still loading
    
    // Luôn hiển thị nếu chưa có nhà hàng (bắt buộc)
    if (!restaurant) {
      setShowWelcomeModal(true);
    }
  }, [restaurant]);


  return (
    <div className="flex bg-[#f7f9ff] h-screen w-screen overflow-hidden relative">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6">
            <img
              src="/logo.png"
              alt="NomNom"
              className="h-12 w-auto object-contain"
            />
            <p className="text-sm text-muted-foreground mt-3">
              Restaurant Manager
            </p>
          </div>

          <nav className="mt-2 flex flex-col gap-1 px-3">
            <Link
              to="/owner"
              className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors ${currentPath === "/owner" ? "bg-[#ff6b35]/10 text-[#ab3500] font-semibold border-r-4 border-[#ab3500]" : "text-muted-foreground hover:bg-slate-100"}`}
            >
              <LayoutDashboard className="w-4 h-4" /> Overview
            </Link>
            <Link
              to="/owner/orders"
              className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors ${currentPath.includes("/owner/orders") ? "bg-[#ff6b35]/10 text-[#ab3500] font-semibold border-r-4 border-[#ab3500]" : "text-muted-foreground hover:bg-slate-100"}`}
            >
              <ShoppingBag className="w-4 h-4" /> Live Orders
            </Link>
            <Link
              to="/owner/menu"
              className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors ${currentPath.includes("/owner/menu") ? "bg-[#ff6b35]/10 text-[#ab3500] font-semibold border-r-4 border-[#ab3500]" : "text-muted-foreground hover:bg-slate-100"}`}
            >
              <UtensilsCrossed className="w-4 h-4" /> Menu
            </Link>
            <button className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:bg-slate-100 rounded-md transition-colors w-full text-left">
              <BarChart3 className="w-4 h-4" /> Analytics
            </button>
            <Link
              to="/owner/settings"
              className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors ${currentPath.includes("/owner/settings") ? "bg-[#ff6b35]/10 text-[#ab3500] font-semibold border-r-4 border-[#ab3500]" : "text-muted-foreground hover:bg-slate-100"}`}
            >
              <Settings className="w-4 h-4" /> Settings
            </Link>
            <Link
              to="/owner/profile"
              className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors ${currentPath.includes("/owner/profile") ? "bg-[#ff6b35]/10 text-[#ab3500] font-semibold border-r-4 border-[#ab3500]" : "text-muted-foreground hover:bg-slate-100"}`}
            >
              <UserCircle2 className="w-4 h-4" /> Profile
            </Link>
          </nav>
        </div>

        <div className="p-4 space-y-3">
          <Button className="w-full bg-[#ab3500] hover:bg-[#832600] text-white">
            Go Pro
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="w-full text-slate-500 hover:text-red-600 hover:bg-red-50 justify-start gap-3"
          >
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-slate-50 border-transparent focus:bg-white rounded-full h-10 w-full"
                placeholder="Search dashboard..."
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-semibold text-[#006a62] bg-[#70f8e8]/30 px-4 py-1.5 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#006a62]"></span>{" "}
              Status: Open
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-500 rounded-full hover:bg-slate-100"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-500 rounded-full hover:bg-slate-100"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <button
              type="button"
              onClick={() => navigate("/owner/profile")}
              aria-label="Trang cá nhân"
              className="ml-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar
                src={user?.avatarUrl}
                name={user?.fullName ?? me?.fullName}
                email={user?.email}
                size="sm"
              />
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {(!restaurant || restaurant.status !== 'APPROVED') &&
          !["/owner", "/owner/settings", "/owner/profile"].includes(currentPath) ? (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8 bg-white border border-slate-200 shadow-sm rounded-2xl">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 flex items-center justify-center rounded-full mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Tính năng đang bị khóa</h2>
              <p className="text-slate-600 max-w-md">
                {!restaurant
                  ? "Vui lòng tạo thông tin nhà hàng trong mục Settings để sử dụng tính năng này."
                  : "Nhà hàng của bạn đang trong trạng thái chờ duyệt hoặc bị tạm ngưng. Vui lòng quay lại sau khi được hệ thống phê duyệt."}
              </p>
              <Button onClick={() => navigate('/owner/settings')} className="mt-6 bg-[#ab3500] hover:bg-[#832600] text-white">
                Tới trang Cài đặt
              </Button>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>

      {/* Welcome Modal */}
      <WelcomeModal 
        isOpen={showWelcomeModal} 
        onClose={() => setShowWelcomeModal(false)} 
      />
    </div>
  );
}
