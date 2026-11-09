import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store, Users, ShoppingBag, Clock, CheckCircle2,
  XCircle, AlertCircle, TrendingUp, ArrowRight, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { restaurantsApi } from "@/api/restaurants";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import type { Restaurant } from "@/types";

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  sub?: string;
}) {
  return (
    <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-3xl font-extrabold ${color} leading-none`}>{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1.5 font-medium">{sub}</p>}
          </div>
          <div className={`w-12 h-12 rounded-2xl ${bgColor} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  switch (status) {
    case "APPROVED":
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
    case "PENDING":
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" /> Pending</span>;
    case "REJECTED":
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3 h-3" /> Rejected</span>;
    case "SUSPENDED":
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200"><AlertCircle className="w-3 h-3" /> Suspended</span>;
    default:
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
  }
}

// ─── Quick Nav Card ───────────────────────────────────────────────────────────
function QuickNavCard({
  to, icon: Icon, label, description, iconBg, count,
}: {
  to: string; icon: React.ElementType; label: string;
  description: string; iconBg: string; count?: number;
}) {
  return (
    <Link to={to} className="group block">
      <Card className="border-none shadow-sm rounded-2xl bg-white hover:shadow-md transition-all duration-200 cursor-pointer">
        <CardContent className="p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-800">{label}</p>
              {count !== undefined && count > 0 && (
                <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AdminOverview() {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();

  const { data: restaurantsPage, isLoading } = useQuery({
    queryKey: ["admin-restaurants", 0],
    queryFn: () => restaurantsApi.getAllForAdmin(0, 100),
  });

  const restaurants: Restaurant[] = restaurantsPage?.content ?? [];

  const stats = useMemo(() => {
    const total = restaurantsPage?.totalElements ?? 0;
    const pending = restaurants.filter(r => r.status === "PENDING").length;
    const approved = restaurants.filter(r => r.status === "APPROVED").length;
    const suspended = restaurants.filter(r => r.status === "SUSPENDED").length;
    return { total, pending, approved, suspended };
  }, [restaurants, restaurantsPage]);

  const pendingRestaurants = useMemo(
    () => restaurants.filter(r => r.status === "PENDING").slice(0, 5),
    [restaurants]
  );

  const approveMutation = useMutation({
    mutationFn: (id: string) => restaurantsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      toast.success("Restaurant approved!");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => restaurantsApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      toast.success("Restaurant rejected.");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to reject"),
  });

  // Greeting theo giờ
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const adminName = user?.email?.split("@")[0] ?? "Admin";

  const now = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-8 max-w-6xl">
      {/* ── Welcome Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {greeting},{" "}
            <span className="text-[#006a62] capitalize">{adminName}</span> 👋
          </h1>
          <p className="text-slate-500 mt-1 font-medium">{now}</p>
        </div>
        <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm font-medium">
          <span className="text-[#006a62] font-bold">NomNom</span> Platform v1.0
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-none shadow-sm rounded-2xl bg-white">
              <CardContent className="p-6">
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mb-3" />
                <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Total Restaurants"
            value={stats.total}
            icon={Store}
            color="text-[#006a62]"
            bgColor="bg-[#006a62]/10"
            sub="All statuses"
          />
          <KpiCard
            label="Pending Approval"
            value={stats.pending}
            icon={Clock}
            color="text-amber-600"
            bgColor="bg-amber-50"
            sub={stats.pending > 0 ? "Needs review" : "All clear"}
          />
          <KpiCard
            label="Approved"
            value={stats.approved}
            icon={CheckCircle2}
            color="text-emerald-600"
            bgColor="bg-emerald-50"
            sub="Active on platform"
          />
          <KpiCard
            label="Suspended"
            value={stats.suspended}
            icon={AlertCircle}
            color="text-slate-600"
            bgColor="bg-slate-100"
            sub={stats.suspended > 0 ? "Requires attention" : "None suspended"}
          />
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Pending Table */}
        <div className="xl:col-span-2">
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Pending Approval
                  {stats.pending > 0 && (
                    <span className="text-xs font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                      {stats.pending}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Restaurants awaiting your review</p>
              </div>
              <Link
                to="/admin/restaurants"
                className="text-xs font-semibold text-[#006a62] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : pendingRestaurants.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="font-bold text-slate-700">All caught up!</p>
                <p className="text-sm mt-1">No pending restaurants to review.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {pendingRestaurants.map((r) => (
                  <div key={r.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/60 transition-colors">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                      {r.imageUrl
                        ? <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Store className="w-5 h-5 text-slate-400" /></div>
                      }
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{r.name}</p>
                      <p className="text-xs text-slate-500 truncate">{r.address}</p>
                    </div>
                    {/* Status */}
                    <StatusBadge status={r.status} />
                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-[#006a62] hover:bg-[#00524d] text-white h-8 px-4 rounded-lg text-xs font-bold"
                        onClick={() => approveMutation.mutate(r.id)}
                        disabled={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-4 rounded-lg text-xs font-bold"
                        onClick={() => rejectMutation.mutate(r.id)}
                        disabled={rejectMutation.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Navigation */}
        <div className="space-y-4">
          <h2 className="font-bold text-slate-700 px-1">Quick Navigation</h2>
          <QuickNavCard
            to="/admin/restaurants"
            icon={Store}
            label="Restaurants"
            description="Manage all restaurants"
            iconBg="bg-gradient-to-br from-[#006a62] to-[#00a896]"
            count={stats.pending}
          />
          <QuickNavCard
            to="/admin/users"
            icon={Users}
            label="Users"
            description="View platform users"
            iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
          />
          <QuickNavCard
            to="/admin/orders"
            icon={ShoppingBag}
            label="Global Orders"
            description="Monitor all orders"
            iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
          />
          <QuickNavCard
            to="/admin/settings"
            icon={TrendingUp}
            label="Platform Settings"
            description="Feature flags & config"
            iconBg="bg-gradient-to-br from-slate-500 to-slate-700"
          />
        </div>
      </div>
    </div>
  );
}
