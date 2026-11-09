import { Store, Sparkles, UtensilsCrossed, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const navigate = useNavigate();


  const handleGetStarted = () => {
    onClose();
    navigate('/owner/settings');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all">
      <Card className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border-none overflow-hidden transform animate-in fade-in zoom-in-95 duration-300">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-br from-[#ab3500] to-[#ff6b35] p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                Welcome to NomNom!
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2">
              Chào mừng bạn đến với nền tảng quản lý nhà hàng
            </h1>
            <p className="text-white/90 text-lg">
              Hãy bắt đầu hành trình kinh doanh của bạn với vài bước đơn giản
            </p>
            <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-lg p-3 text-sm">
              <p className="font-semibold">⚠️ Lưu ý quan trọng:</p>
              <p className="text-white/90 mt-1">Nhà hàng của bạn sẽ được admin duyệt trước khi hiển thị cho khách hàng. Quá trình này thường mất 1-2 ngày làm việc.</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-bold text-[#181c20] mb-3">Các bước để bắt đầu:</h2>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-[#ab3500]/5 to-transparent border border-[#ab3500]/10">
                <div className="w-8 h-8 bg-[#ab3500] rounded-full flex items-center justify-center text-white font-bold shrink-0 text-sm">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Store className="w-4 h-4 text-[#ab3500]" />
                    <h3 className="font-bold text-[#181c20] text-sm">Tạo nhà hàng của bạn</h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    Điền thông tin cơ bản về nhà hàng, địa chỉ, loại hình ẩm thực và tải ảnh đại diện
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-[#ff6b35]/5 to-transparent border border-[#ff6b35]/10">
                <div className="w-8 h-8 bg-[#ff6b35] rounded-full flex items-center justify-center text-white font-bold shrink-0 text-sm">
                  2
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <UtensilsCrossed className="w-4 h-4 text-[#ff6b35]" />
                    <h3 className="font-bold text-[#181c20] text-sm">Thêm món ăn vào menu</h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    Tạo thực đơn với hình ảnh, giá cả và thông tin dinh dưỡng cho từng món
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-[#006a62]/5 to-transparent border border-[#006a62]/10">
                <div className="w-8 h-8 bg-[#006a62] rounded-full flex items-center justify-center text-white font-bold shrink-0 text-sm">
                  3
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-[#006a62]" />
                    <h3 className="font-bold text-[#181c20] text-sm">Bắt đầu nhận đơn hàng</h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    Sau khi hoàn tất, nhà hàng của bạn sẽ sẵn sàng để nhận và xử lý đơn hàng từ khách hàng
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleGetStarted}
              className="flex-1 bg-[#ab3500] hover:bg-[#832600] text-white font-bold h-10 px-6 rounded-xl gap-2 shadow-lg shadow-[#ab3500]/20 text-sm"
            >
              Bắt đầu ngay
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
