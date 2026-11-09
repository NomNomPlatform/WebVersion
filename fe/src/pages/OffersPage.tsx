import { Link } from "react-router-dom";
import { Gift, Percent, Truck, Tag, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Offer {
  id: string;
  title: string;
  description: string;
  /** Discount hiển thị dạng "GIẢM 20%" hay "Freeship" v.v. */
  badge: string;
  /** Điều kiện áp dụng */
  terms: string;
  expiresAt: string;
  /** Gradient class cho hero của card */
  gradient: string;
  icon: React.ElementType;
}

/**
 * Trang Offers — hiển thị các chương trình khuyến mãi hiện có.
 *
 * Backend hiện chưa có endpoint promotion; danh sách dưới đây là
 * static mock phục vụ UI. Khi backend bổ sung endpoint, chỉ cần
 * thay mảng này bằng `useQuery` + `promotionsApi.list()`.
 */
const OFFERS: Offer[] = [
  {
    id: "welcome-15",
    title: "Giảm 15% đơn đầu tiên",
    description:
      "Khách hàng mới đăng ký nhận ngay ưu đãi 15% cho đơn hàng đầu tiên trên NomNom.",
    badge: "GIẢM 15%",
    terms: "Áp dụng đơn từ 100.000đ. Tối đa 50.000đ.",
    expiresAt: "30/09/2026",
    gradient: "from-orange-400 to-pink-500",
    icon: Gift,
  },
  {
    id: "freeship-30k",
    title: "Freeship đơn từ 200k",
    description:
      "Miễn phí giao hàng cho đơn từ 200.000đ tại khu vực nội thành TP.HCM và Hà Nội.",
    badge: "FREESHIP",
    terms: "Bán kính 10km. Không áp dụng ngày lễ.",
    expiresAt: "31/08/2026",
    gradient: "from-emerald-400 to-teal-600",
    icon: Truck,
  },
  {
    id: "healthy-25",
    title: "Healthy Monday — Giảm 25%",
    description:
      "Mỗi thứ 2 hàng tuần, giảm 25% cho toàn bộ món trong danh mục Healthy (calories thấp).",
    badge: "GIẢM 25%",
    terms: "Chỉ áp dụng thứ 2. Tối đa 40.000đ.",
    expiresAt: "Định kỳ thứ 2",
    gradient: "from-violet-500 to-purple-600",
    icon: Sparkles,
  },
  {
    id: "combo-meal",
    title: "Combo meal tiết kiệm",
    description:
      "Mua combo 1 món chính + 1 đồ uống bất kỳ chỉ từ 79.000đ tại các nhà hàng tham gia.",
    badge: "COMBO 79K",
    terms: "Áp dụng nhà hàng có gắn nhãn Combo.",
    expiresAt: "15/09/2026",
    gradient: "from-amber-400 to-orange-600",
    icon: Tag,
  },
  {
    id: "vip-30",
    title: "VIP loyalty — Giảm 30%",
    description:
      "Khách đặt ≥ 10 đơn/tháng được tự động nâng hạng VIP với ưu đãi giảm 30% cả tháng.",
    badge: "VIP -30%",
    terms: "Điều kiện: ≥ 10 đơn hoàn thành trong 30 ngày.",
    expiresAt: "Chương trình thường niên",
    gradient: "from-rose-500 to-red-600",
    icon: Percent,
  },
  {
    id: "weekend-buffet",
    title: "Weekend buffet giảm 40%",
    description:
      "Thứ 7 & CN, giảm 40% cho set buffet trưa tại các nhà hàng đối tác Premium.",
    badge: "GIẢM 40%",
    terms: "Buffet trưa thứ 7, CN. Đặt bàn trước 24h.",
    expiresAt: "Mỗi cuối tuần",
    gradient: "from-sky-400 to-blue-600",
    icon: Percent,
  },
];

export function OffersPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-orange-100 to-pink-100 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge className="mb-3 bg-primary text-primary-foreground">
              Ưu đãi hôm nay
            </Badge>
            <h1 className="max-w-2xl text-3xl font-extrabold leading-tight text-slate-900">
              Tiết kiệm hơn mỗi ngày với{" "}
              <span className="text-primary">NomNom Offers</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Tổng hợp các chương trình khuyến mãi đang có hiệu lực trên toàn
              hệ thống. Cập nhật liên tục.
            </p>
          </div>
          <Link
            to="/restaurants"
            className={cn(
              buttonVariants({ size: "lg" }),
              "shrink-0"
            )}
          >
            Đặt ngay <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Offer cards grid */}
      <section>
        <h2 className="mb-4 text-xl font-bold">
          Tất cả ưu đãi ({OFFERS.length})
        </h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {OFFERS.map((offer) => {
            const Icon = offer.icon;
            return (
              <Card
                key={offer.id}
                className="group overflow-hidden border-none shadow-sm transition-shadow hover:shadow-lg"
              >
                {/* Gradient hero */}
                <div
                  className={cn(
                    "relative flex h-32 items-center justify-center bg-gradient-to-br text-white",
                    offer.gradient
                  )}
                >
                  <Icon className="h-14 w-14 opacity-90" />
                  <div className="absolute left-4 top-4">
                    <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 shadow-sm">
                      {offer.badge}
                    </span>
                  </div>
                </div>
                <CardContent className="space-y-3 p-5">
                  <h3 className="text-lg font-bold text-slate-900">
                    {offer.title}
                  </h3>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {offer.description}
                  </p>
                  <div className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
                    <p>
                      <span className="font-semibold text-slate-700">
                        Điều kiện:
                      </span>{" "}
                      {offer.terms}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">
                        Hạn:
                      </span>{" "}
                      {offer.expiresAt}
                    </p>
                  </div>
                  <Link
                    to="/restaurants"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                    )}
                  >
                    Áp dụng ngay <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Footer note */}
      <section className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Mọi ưu đãi có thể thay đổi theo từng thời điểm. Vui lòng đọc kỹ điều
        kiện trước khi áp dụng.
      </section>
    </div>
  );
}

export default OffersPage;