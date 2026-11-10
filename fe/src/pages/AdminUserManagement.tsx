import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Users, ChevronDown, Shield, User as UserIcon,
  Mail, Calendar, Activity, Copy, Check, HeartPulse
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { authApi } from "@/api/auth";
import { toast } from "sonner";
import type { User } from "@/types";

type RoleFilter = "ALL" | "CUSTOMER" | "RESTAURANT_OWNER" | "ADMIN";

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  CUSTOMER: { label: "Customer", color: "bg-blue-50 text-blue-700 border-blue-200" },
  RESTAURANT_OWNER: { label: "Owner", color: "bg-violet-50 text-violet-700 border-violet-200" },
  ADMIN: { label: "Admin", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50">
      <td className="p-4 pl-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="p-4"><div className="h-3.5 w-20 bg-slate-100 rounded animate-pulse" /></td>
      <td className="p-4"><div className="h-5 w-24 bg-slate-100 rounded-full animate-pulse" /></td>
      <td className="p-4"><div className="h-3.5 w-24 bg-slate-100 rounded animate-pulse" /></td>
      <td className="p-4 pr-6 text-right"><div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse ml-auto" /></td>
    </tr>
  );
}

export function AdminUserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const PAGE_SIZE = 15;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`Đã sao chép ${label}!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getActivityLabel = (level?: string) => {
    switch (level) {
      case "SEDENTARY": return "Ít vận động (Ngồi nhiều)";
      case "LIGHT": return "Vận động nhẹ (1-3 ngày/tuần)";
      case "MODERATE": return "Vừa phải (3-5 ngày/tuần)";
      case "ACTIVE": return "Năng động (6-7 ngày/tuần)";
      case "VERY_ACTIVE": return "Rất năng động (Cường độ cao)";
      default: return level || "Chưa thiết lập";
    }
  };

  const getGenderLabel = (g?: string) => {
    switch (g) {
      case "MALE": return "Nam";
      case "FEMALE": return "Nữ";
      case "OTHER": return "Khác";
      default: return g || "Chưa thiết lập";
    }
  };

  const calculateBmi = (height?: number, weight?: number) => {
    if (!height || !weight || height <= 0 || weight <= 0) return null;
    const hM = height / 100;
    const bmi = +(weight / (hM * hM)).toFixed(1);
    let category = "Bình thường";
    let color = "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (bmi < 18.5) {
      category = "Thiếu cân";
      color = "text-blue-700 bg-blue-50 border-blue-200";
    } else if (bmi >= 23 && bmi < 25) {
      category = "Tiền béo phì";
      color = "text-amber-700 bg-amber-50 border-amber-200";
    } else if (bmi >= 25) {
      category = "Thừa cân / Béo phì";
      color = "text-rose-700 bg-rose-50 border-rose-200";
    }
    return { bmi, category, color };
  };

  const { data: userPage, isLoading } = useQuery({
    queryKey: ["admin-users", currentPage],
    queryFn: () => authApi.listUsers(currentPage, PAGE_SIZE),
  });

  const users = userPage?.content || [];
  const totalPages = userPage?.totalPages ?? 1;

  // Lọc client-side theo SearchTerm và Role
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const getRoleBadge = (role: string) => {
    const config = ROLE_CONFIG[role] || { label: role, color: "bg-slate-50 text-slate-700 border-slate-200" };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
        <Shield className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
        <p className="text-slate-500 mt-1.5 font-medium">
          Monitor and manage registered users on the NomNom platform.
        </p>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm rounded-2xl bg-white">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9 bg-slate-50 border-transparent rounded-xl h-11 font-medium focus:bg-white focus:border-[#006a62]/30 focus:ring-2 focus:ring-[#006a62]/10 transition-all"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {(["ALL", "CUSTOMER", "RESTAURANT_OWNER", "ADMIN"] as RoleFilter[]).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  roleFilter === role
                    ? "bg-[#006a62] text-white shadow-md shadow-[#006a62]/20"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {role === "ALL" ? "All Roles" : role === "RESTAURANT_OWNER" ? "Owners" : role.charAt(0) + role.slice(1).toLowerCase()}
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
                <th className="p-4 pl-6 font-semibold">User</th>
                <th className="p-4 font-semibold">
                  <span className="flex items-center gap-1">Joined <ChevronDown className="w-3 h-3" /></span>
                </th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Height / Weight</th>
                <th className="p-4 pr-6 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    <div className="bg-slate-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="font-bold text-slate-700">No users found</p>
                    <p className="text-sm mt-1">Try adjusting your search criteria or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: User) => (
                  <tr key={user.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <UserIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight">{user.fullName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-medium">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "—"}
                    </td>
                    <td className="p-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-medium">
                      {user.height && user.weight ? (
                        <span>{user.height} cm / {user.weight} kg</span>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg hover:border-[#006a62] hover:text-[#006a62] font-semibold"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsDetailOpen(true);
                        }}
                      >
                        View Details
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
            Showing {filteredUsers.length} of {userPage?.totalElements ?? 0} users
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

      {/* User Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl p-6">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <UserIcon className="w-5 h-5 text-[#006a62]" />
              Chi tiết người dùng
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs mt-0.5">
              Xem toàn bộ thông tin tài khoản và chỉ số thể trạng của người dùng.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5 pt-3">
              {/* Profile Card */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                  {selectedUser.avatarUrl ? (
                    <img
                      src={selectedUser.avatarUrl}
                      alt={selectedUser.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">
                      {selectedUser.fullName}
                    </h3>
                    {getRoleBadge(selectedUser.role)}
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {selectedUser.provider || "LOCAL"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{selectedUser.email}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedUser.email, "Email")}
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                      title="Sao chép Email"
                    >
                      {copiedField === "Email" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span className="font-mono truncate">ID: {selectedUser.id}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedUser.id, "User ID")}
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                      title="Sao chép User ID"
                    >
                      {copiedField === "User ID" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Account Meta Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-white">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Ngày tham gia
                  </p>
                  <p className="font-bold text-slate-800 text-sm">
                    {selectedUser.createdAt
                      ? new Date(selectedUser.createdAt).toLocaleDateString("vi-VN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Không có dữ liệu"}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-100 bg-white">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-400" /> Phân quyền hệ thống
                  </p>
                  <p className="font-bold text-slate-800 text-sm">
                    {selectedUser.role}
                  </p>
                </div>
              </div>

              {/* Health Profile */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-rose-500" /> Hồ sơ thể trạng & Dinh dưỡng
                  </h4>
                  {calculateBmi(selectedUser.height, selectedUser.weight) && (
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${calculateBmi(selectedUser.height, selectedUser.weight)?.color}`}>
                      BMI {calculateBmi(selectedUser.height, selectedUser.weight)?.bmi} · {calculateBmi(selectedUser.height, selectedUser.weight)?.category}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-medium">Chiều cao</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">
                      {selectedUser.height ? `${selectedUser.height} cm` : "—"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-medium">Cân nặng</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">
                      {selectedUser.weight ? `${selectedUser.weight} kg` : "—"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-medium">Độ tuổi</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">
                      {selectedUser.age ? `${selectedUser.age} tuổi` : "—"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-medium">Giới tính</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">
                      {getGenderLabel(selectedUser.gender)}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">Mức độ hoạt động thể chất</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {getActivityLabel(selectedUser.activityLevel)}
                    </p>
                  </div>
                  <Activity className="w-5 h-5 text-[#006a62]/60" />
                </div>
              </div>

              {/* Footer action */}
              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => setIsDetailOpen(false)}
                  className="bg-[#006a62] hover:bg-[#00524d] text-white rounded-xl font-bold px-6 h-10"
                >
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
