import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, ChevronDown, Shield, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { authApi } from "@/api/auth";
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
  const PAGE_SIZE = 15;

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
                      <Button variant="outline" size="sm" className="rounded-lg">
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
    </div>
  );
}
