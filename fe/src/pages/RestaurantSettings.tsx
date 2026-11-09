import { useState, useEffect } from "react";
import { Settings, MapPin, Phone, Image as ImageIcon, Upload, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { restaurantsApi, type RestaurantPayload } from "@/api/restaurants";
import { toast } from "sonner";
import type { RestaurantStatus } from "@/types";

export function RestaurantSettings() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<RestaurantPayload>>({
    name: "",
    description: "",
    address: "",
    phone: "",
    cuisineType: "",
    imageUrl: "",
  });

  const [isDirty, setIsDirty] = useState(false);

  // Fetch restaurant
  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["my-restaurant", user?.userId],
    queryFn: async () => {
      return await restaurantsApi.getMy();
    },
    enabled: !!user?.userId,
  });

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || "",
        description: restaurant.description || "",
        address: restaurant.address || "",
        phone: restaurant.phone || "",
        cuisineType: restaurant.cuisineType || "",
        imageUrl: restaurant.imageUrl || "",
      });
      setIsDirty(false);
    }
  }, [restaurant]);

  const handleChange = (field: keyof RestaurantPayload, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Kích thước ảnh quá lớn (vượt quá 5MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange("imageUrl", reader.result as string);
      };
      reader.onerror = () => {
        toast.error("Không thể đọc được ảnh này");
      };
      reader.readAsDataURL(file);
    }
  };

  const createMutation = useMutation({
    mutationFn: (payload: RestaurantPayload) => restaurantsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-restaurant"] });
      toast.success("Tạo nhà hàng thành công!");
      setIsDirty(false);
    },
    onError: (err: any) => toast.error(err?.message || "Lỗi khi tạo nhà hàng"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<RestaurantPayload> }) =>
      restaurantsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-restaurant"] });
      toast.success("Cập nhật thông tin thành công!");
      setIsDirty(false);
    },
    onError: (err: any) => toast.error(err?.message || "Lỗi khi cập nhật nhà hàng"),
  });

  const resubmitMutation = useMutation({
    mutationFn: (id: string) => restaurantsApi.resubmit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-restaurant"] });
      toast.success("Gửi lại yêu cầu thành công!");
    },
    onError: (err: any) => toast.error(err?.message || "Lỗi khi gửi lại yêu cầu"),
  });



  const handleSave = () => {
    if (!formData.name || !formData.address) {
      toast.error("Tên nhà hàng và địa chỉ không được để trống!");
      return;
    }

    if (restaurant) {
      updateMutation.mutate({ id: restaurant.id, payload: formData });
    } else {
      createMutation.mutate(formData as RestaurantPayload);
    }
  };



  const handleDiscard = () => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || "",
        description: restaurant.description || "",
        address: restaurant.address || "",
        phone: restaurant.phone || "",
        cuisineType: restaurant.cuisineType || "",
        imageUrl: restaurant.imageUrl || "",
      });
    } else {
      setFormData({ name: "", description: "", address: "", phone: "", cuisineType: "", imageUrl: "" });
    }
    setIsDirty(false);
  };

  if (isLoading) {
    return <div className="p-8">Loading settings...</div>;
  }

  const getStatusConfig = (status: RestaurantStatus) => {
    switch (status) {
      case "PENDING":
        return {
          icon: Clock,
          color: "bg-yellow-100 text-yellow-700 border-yellow-200",
          text: "Chờ duyệt"
        };
      case "APPROVED":
        return {
          icon: CheckCircle,
          color: "bg-green-100 text-green-700 border-green-200",
          text: "Đã duyệt"
        };
      case "REJECTED":
        return {
          icon: XCircle,
          color: "bg-red-100 text-red-700 border-red-200",
          text: "Đã từ chối"
        };
      case "SUSPENDED":
        return {
          icon: AlertCircle,
          color: "bg-orange-100 text-orange-700 border-orange-200",
          text: "Đã khóa"
        };
      default:
        return {
          icon: Clock,
          color: "bg-gray-100 text-gray-700 border-gray-200",
          text: "Unknown"
        };
    }
  };

  const statusConfig = restaurant ? getStatusConfig(restaurant.status as RestaurantStatus) : null;
  const StatusIcon = statusConfig?.icon || Clock;

  return (
    <div className="pb-32 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#181c20] tracking-tight">
              {restaurant ? "Restaurant Settings" : "Create Restaurant"}
            </h1>
            <p className="text-slate-500 mt-1.5 text-base">
              {restaurant ? "Manage your restaurant profile and settings" : "Set up your restaurant to get started"}
            </p>
          </div>
          {restaurant && statusConfig && (
            <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-sm font-semibold ${statusConfig.color} shadow-sm`}>
              <StatusIcon className="w-4 h-4" />
              {statusConfig.text}
            </div>
          )}
        </div>

        {restaurant && restaurant.status === 'PENDING' && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-900 px-6 py-4 rounded-2xl flex items-start gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-900">Đang chờ phê duyệt</p>
              <p className="text-sm mt-1 text-amber-700 leading-relaxed">
                Nhà hàng của bạn đã được đăng ký thành công và đang chờ Admin hệ thống phê duyệt (thường mất 1-2 ngày làm việc). Bạn sẽ tạm thời chưa thể sử dụng các tính năng như Menu hay Live Orders cho đến khi được duyệt.
              </p>
            </div>
          </div>
        )}

        {restaurant && restaurant.status === 'REJECTED' && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 text-red-900 px-6 py-4 rounded-2xl flex items-start gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-red-900">Đã bị từ chối</p>
              <p className="text-sm mt-1 text-red-700 leading-relaxed">
                {restaurant.rejectionReason || "Nhà hàng của bạn đã bị từ chối. Vui lòng xem lại thông tin và gửi lại yêu cầu."}
              </p>
              <Button
                onClick={() => resubmitMutation.mutate(restaurant.id)}
                disabled={resubmitMutation.isPending}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white"
              >
                {resubmitMutation.isPending ? "Đang gửi..." : "Gửi lại yêu cầu"}
              </Button>
            </div>
          </div>
        )}

        {restaurant && restaurant.status === 'SUSPENDED' && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 text-orange-900 px-6 py-4 rounded-2xl flex items-start gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-orange-900">Đã bị khóa</p>
              <p className="text-sm mt-1 text-orange-700 leading-relaxed">
                {restaurant.suspendReason || "Nhà hàng của bạn đã bị tạm ngừng hoạt động. Vui lòng liên hệ Admin để biết thêm chi tiết."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Main Form */}
        <div className="lg:col-span-8 space-y-6">
          {/* Basic Info Card */}
          <Card className="border-none shadow-lg rounded-3xl bg-white overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#f7f9ff] to-white px-8 py-6 border-b border-slate-100">
              <CardTitle className="text-xl font-bold text-[#181c20] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ab3500] to-[#ff6b35] flex items-center justify-center shadow-md">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-[#181c20] uppercase tracking-wide text-xs">Restaurant Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. The Golden Harvest Grill" 
                  className="bg-slate-50 border-slate-200 h-12 px-4 rounded-2xl font-medium text-base focus:ring-2 focus:ring-[#ff6b35]/20 focus:border-[#ff6b35]" 
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-bold text-[#181c20] uppercase tracking-wide text-xs">Description</Label>
                <textarea 
                  className="w-full min-h-[140px] p-4 text-base rounded-2xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/20 focus:border-[#ff6b35] transition-all resize-y leading-relaxed" 
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Tell your customers about your restaurant, your specialties, and what makes you unique..."
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-[#181c20] uppercase tracking-wide text-xs">Cuisine Type</Label>
                <Input 
                  value={formData.cuisineType} 
                  onChange={(e) => handleChange("cuisineType", e.target.value)}
                  placeholder="e.g. Italian, Vietnamese, Fast Food, Fusion" 
                  className="bg-slate-50 border-slate-200 h-12 px-4 rounded-2xl font-medium text-base focus:ring-2 focus:ring-[#ff6b35]/20 focus:border-[#ff6b35]" 
                />
              </div>
              
              <div className="pt-4">
                <Label className="text-sm font-bold text-[#181c20] uppercase tracking-wide text-xs mb-4 block">Cover Image</Label>
                <div className="flex gap-6 items-start">
                  {formData.imageUrl ? (
                    <div className="relative group">
                      <div className="h-48 w-80 rounded-2xl overflow-hidden shadow-lg border-2 border-slate-200">
                        <img 
                          src={formData.imageUrl} 
                          alt="Restaurant cover" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-2xl flex items-center justify-center">
                        <Label htmlFor="image-upload" className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg text-[#181c20] font-semibold text-sm flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" /> Change Cover
                        </Label>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 w-80 rounded-2xl bg-gradient-to-br from-[#ab3500]/5 to-[#ff6b35]/5 border-2 border-dashed border-[#ab3500]/30 flex flex-col items-center justify-center cursor-pointer hover:from-[#ab3500]/10 hover:to-[#ff6b35]/10 transition-all group">
                      <Label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6 text-[#ab3500]" />
                        </div>
                        <span className="text-sm font-semibold text-[#ab3500]">Upload Cover Image</span>
                        <span className="text-xs text-slate-500 mt-1">Max 5MB</span>
                      </Label>
                    </div>
                  )}
                  <input 
                    id="image-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Contact Info */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-lg rounded-3xl bg-white overflow-hidden sticky top-6">
            <CardHeader className="bg-gradient-to-r from-[#f7f9ff] to-white px-8 py-6 border-b border-slate-100">
              <CardTitle className="text-xl font-bold text-[#181c20] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#006a62] to-[#70f8e8] flex items-center justify-center shadow-md">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                Contact & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-[#181c20] uppercase tracking-wide text-xs">Store Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input 
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="123 Street Name, City" 
                    className="pl-12 bg-slate-50 border-slate-200 h-12 rounded-2xl font-medium text-base focus:ring-2 focus:ring-[#006a62]/20 focus:border-[#006a62]" 
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-bold text-[#181c20] uppercase tracking-wide text-xs">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input 
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+1 (555) 012-3456" 
                    className="pl-12 bg-slate-50 border-slate-200 h-12 rounded-2xl font-medium text-base focus:ring-2 focus:ring-[#006a62]/20 focus:border-[#006a62]" 
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Contact Support</p>
                      <p className="text-xs text-slate-500">Need help? Contact us</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      {isDirty && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-4rem)] max-w-4xl p-5 px-8 bg-white/95 backdrop-blur-xl border border-slate-200 flex flex-wrap sm:flex-nowrap justify-between items-center z-50 rounded-3xl shadow-[0_12px_40px_rgb(0,0,0,0.15)]">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-[#ff6b35] animate-pulse shadow-lg shadow-[#ff6b35]/50"></div>
            <div>
              <h4 className="text-base font-bold text-[#181c20]">Unsaved Changes</h4>
              <p className="text-sm text-slate-500 font-medium">You have modified your restaurant settings.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <Button 
              onClick={handleDiscard} 
              variant="ghost" 
              className="text-slate-600 font-semibold hover:bg-slate-100 h-11 px-6 rounded-2xl"
            >
              Discard
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-to-r from-[#ab3500] to-[#ff6b35] hover:from-[#832600] hover:to-[#e55a2b] text-white font-bold h-11 px-8 rounded-2xl shadow-lg shadow-[#ab3500]/25"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
