import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import {
  LogOut,
  Search,
  ShoppingBag,
  User as UserIcon,
  UserCircle2,
  LayoutDashboard,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { features } from "@/lib/features";
import { NotificationDropdown } from "@/components/shared/NotificationDropdown";
import { Avatar } from "@/components/shared/Avatar";
import { CartIconButton } from "@/components/shared/CartIconButton";
import { authApi } from "@/api/auth";

const NAV_LINKS = [
  { label: "Browse", to: "/" },
  { label: "Offers", to: "/offers" },
  { label: "Orders", to: "/orders" },
  { label: "Rewards", to: "/rewards" },
];

export function RootLayout() {
  const { isAuthenticated, user, logout, setProfile } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Lấy thông tin đầy đủ để có fullName/avatarUrl hiển thị ở header.
  const { data: me } = useQuery({
    queryKey: ["users-me"],
    queryFn: authApi.me,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (me) {
      setProfile({
        fullName: me.fullName,
        avatarUrl: me.avatarUrl,
      });
    }
  }, [me, setProfile]);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : "/");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
        <div className="container flex h-16 items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="NomNom"
              className="h-14 w-auto object-contain"
            />
          </Link>

          <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search food, restaurants..."
              className="rounded-full bg-muted pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>

          <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated && features.notifications && (
              <NotificationDropdown />
            )}

            {isAuthenticated ? (
              <>
                <CartIconButton />
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Tài khoản"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Avatar
                      src={user?.avatarUrl}
                      name={user?.fullName ?? me?.fullName}
                      email={user?.email}
                      size="sm"
                    />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-card p-2 shadow-md">
                      <div className="flex items-center gap-3 border-b px-2 py-2">
                        <Avatar
                          src={user?.avatarUrl}
                          name={user?.fullName ?? me?.fullName}
                          email={user?.email}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {user?.fullName ?? me?.fullName ?? "Người dùng"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                      <button
                        className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate("/profile");
                        }}
                      >
                        <UserCircle2 className="h-4 w-4" /> Trang cá nhân
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate("/orders");
                        }}
                      >
                        <ShoppingBag className="h-4 w-4" /> Đơn của tôi
                      </button>
                      {user?.role === "RESTAURANT_OWNER" && (
                        <button
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/owner");
                          }}
                        >
                          <LayoutDashboard className="h-4 w-4" /> Trang quản lý
                        </button>
                      )}
                      {user?.role === "ADMIN" && (
                        <button
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/admin");
                          }}
                        >
                          <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                        </button>
                      )}
                      <button
                        className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4" /> Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Tài khoản"
                  onClick={() => navigate("/login")}
                >
                  <UserIcon className="h-5 w-5" />
                </Button>
                <Button size="sm" onClick={() => navigate("/register")}>
                  Đăng ký
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container flex-1 py-8">
        <Outlet />
      </main>

      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          NomNom — Ăn ngon, biết rõ dinh dưỡng © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
