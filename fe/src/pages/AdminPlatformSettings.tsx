import { Settings, User, Zap, Bell, CreditCard, Sparkles, Info, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { features } from "@/lib/features";

function FeatureFlag({
  icon: Icon,
  label,
  description,
  enabled,
  iconBg,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  enabled: boolean;
  iconBg: string;
}) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-slate-800 text-sm">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">
        {enabled ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inactive
          </span>
        )}
      </div>
    </div>
  );
}

export function AdminPlatformSettings() {
  const user = useAuthStore(s => s.user);

  const adminInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "AD";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Platform Settings</h1>
        <p className="text-slate-500 mt-1.5 font-medium">
          Manage platform configuration, feature flags, and admin profile.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin Profile Card */}
        <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#f7f9ff] to-white px-6 py-5 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#006a62] to-[#00a896] flex items-center justify-center shadow-sm">
                <User className="w-4 h-4 text-white" />
              </div>
              Admin Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* Avatar section */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#006a62] to-[#00a896] flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
                {adminInitials}
              </div>
              <div>
                <p className="font-bold text-slate-800 text-lg">{user?.email?.split("@")[0] ?? "Admin"}</p>
                <p className="text-sm text-slate-500">{user?.email ?? "admin@nomnom.vn"}</p>
                <span className="inline-block mt-1 text-[10px] font-bold text-[#006a62] bg-[#006a62]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  System Administrator
                </span>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Info rows */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Role</p>
                  <p className="font-semibold text-slate-800">ADMIN</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">User ID</p>
                  <p className="font-mono text-xs text-slate-700 bg-slate-50 px-2 py-1 rounded-lg mt-0.5 truncate max-w-[200px]">
                    {user?.userId ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags Card */}
        <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#f7f9ff] to-white px-6 py-5 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
                <Zap className="w-4 h-4 text-white" />
              </div>
              Feature Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-xs text-slate-500 mb-4 font-medium">
              Current platform feature status. Edit via <code className="bg-slate-100 px-1 rounded text-xs">src/lib/features.ts</code>.
            </p>
            <FeatureFlag
              icon={Sparkles}
              label="AI Recommendations"
              description="Claude AI menu suggestions based on TDEE"
              enabled={features.recommendations}
              iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
            />
            <FeatureFlag
              icon={Bell}
              label="Notifications"
              description="Order status push notifications"
              enabled={features.notifications}
              iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            <FeatureFlag
              icon={CreditCard}
              label="VNPay Payments"
              description="Online payment gateway integration"
              enabled={features.payments}
              iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
          </CardContent>
        </Card>
      </div>

      {/* Platform Info Card */}
      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#f7f9ff] to-white px-6 py-5 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-sm">
              <Info className="w-4 h-4 text-white" />
            </div>
            Platform Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Application", value: "NomNom" },
              { label: "Version", value: "1.0.0" },
              { label: "Architecture", value: "Microservices" },
              { label: "Gateway Port", value: ":8080" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">{label}</p>
                <p className="font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>

          <div className="h-px bg-slate-100 my-5" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "User Service", value: ":8081" },
              { label: "Restaurant Service", value: ":8082" },
              { label: "Order Service", value: ":8083" },
              { label: "Menu Service", value: ":8084" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">{label}</p>
                <p className="font-mono text-sm font-bold text-[#006a62]">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <Settings className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          <span className="font-bold">Note:</span> These settings are read-only in this version. 
          Configuration changes are managed via environment variables and <code className="bg-amber-100 px-1 rounded text-xs">src/lib/features.ts</code>.
        </p>
      </div>
    </div>
  );
}
