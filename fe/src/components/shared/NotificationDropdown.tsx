import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, ShieldAlert, CheckCircle, PackageOpen, Truck, FileText, BellOff, Loader2 } from "lucide-react";
import { notificationsApi } from "@/api/notifications";
import type { NotificationType } from "@/types";
import { Button } from "@/components/ui/button";

const TYPE_CONFIGS: Record<NotificationType, {
  icon: typeof FileText;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  ORDER_PLACED: {
    icon: FileText,
    iconColor: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-100 dark:border-amber-900/30",
    label: "Đơn hàng mới",
  },
  ORDER_CONFIRMED: {
    icon: CheckCircle,
    iconColor: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    borderColor: "border-indigo-100 dark:border-indigo-900/30",
    label: "Đã xác nhận",
  },
  ORDER_READY: {
    icon: PackageOpen,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-100 dark:border-emerald-900/30",
    label: "Sẵn sàng giao",
  },
  ORDER_SHIPPING: {
    icon: Truck,
    iconColor: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-100 dark:border-purple-900/30",
    label: "Đang giao",
  },
  ORDER_DELIVERED: {
    icon: CheckCircle,
    iconColor: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-900/30",
    label: "Đã giao",
  },
  ORDER_CANCELLED: {
    icon: ShieldAlert,
    iconColor: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
    borderColor: "border-rose-100 dark:border-rose-900/30",
    label: "Đã hủy",
  },
};

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0 || diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(0, 20),
    refetchInterval: 10000, // Tự động làm mới mỗi 10 giây
  });

  const notifications = pageData?.content || [];
  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const unreadCount = unreadNotifications.length;

  const readMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: async () => {
      const promises = unreadNotifications.map((n) => notificationsApi.markAsRead(n.id));
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    readMutation.mutate(id);
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unreadCount > 0) {
      readAllMutation.mutate();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Thông báo"
        className="relative hover:bg-accent hover:text-accent-foreground transition-all duration-300"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? "animate-swing" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 md:w-96 rounded-xl border bg-card p-0 shadow-lg ring-1 ring-black/5 z-50 overflow-hidden transition-all duration-200 ease-out transform scale-100 origin-top-right">
          <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <span>Thông báo</span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  {unreadCount} mới
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={readAllMutation.isPending}
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1 disabled:opacity-50 transition-colors"
              >
                {readAllMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs font-medium">Đang tải thông báo...</span>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-xs text-destructive gap-1">
                <span className="font-semibold">Lỗi tải thông báo</span>
                <span>Không thể kết nối đến máy chủ thông báo.</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <BellOff className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground/80">Không có thông báo</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Bạn sẽ thấy các cập nhật đơn hàng ở đây.</p>
                </div>
              </div>
            ) : (
              notifications.map((notification) => {
                const config = TYPE_CONFIGS[notification.type as NotificationType] || {
                  icon: Bell,
                  iconColor: "text-muted-foreground",
                  bgColor: "bg-muted",
                  borderColor: "border-border",
                  label: "Thông báo",
                };
                const Icon = config.icon;

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 p-4 transition-all duration-200 hover:bg-muted/40 cursor-pointer ${
                      !notification.isRead ? "bg-primary/5 border-l-2 border-l-primary" : ""
                    }`}
                    onClick={(e) => !notification.isRead && handleMarkAsRead(notification.id, e)}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${config.bgColor} ${config.borderColor}`}
                    >
                      <Icon className={`h-4.5 w-4.5 ${config.iconColor}`} />
                    </div>

                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {config.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                      <h4 className={`text-sm leading-snug truncate ${!notification.isRead ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                        {notification.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-normal line-clamp-2">
                        {notification.body}
                      </p>
                    </div>

                    {!notification.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        disabled={readMutation.isPending}
                        className="shrink-0 h-5 w-5 flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-primary hover:bg-muted transition-all duration-200"
                        title="Đánh dấu đã đọc"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
