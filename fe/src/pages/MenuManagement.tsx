import { useState } from "react";
import { Plus, Trash2, X, Edit, Upload, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { menuApi, type MenuItemPayload } from "@/api/menu";
import { restaurantsApi } from "@/api/restaurants";
import type { Category, MenuItem } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export function MenuManagement() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<Category | "ALL">("ALL");
  const [activeStatus, setActiveStatus] = useState<"ALL" | "AVAILABLE" | "UNAVAILABLE">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => { } });

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm });
  };

  // Form state
  const [formData, setFormData] = useState<Partial<MenuItemPayload>>({
    name: "",
    description: "",
    price: 0,
    calories: 0,
    proteinG: 0,
    carbG: 0,
    fatG: 0,
    category: "MAIN",
    imageUrl: "",
  });

  // Fetch restaurant
  const { data: restaurant } = useQuery({
    queryKey: ["my-restaurant", user?.userId],
    queryFn: async () => {
      return await restaurantsApi.getMy();
    },
    enabled: !!user?.userId,
  });

  const restaurantId = restaurant?.id;

  // Fetch menu items
  const { data: menuPage, isLoading } = useQuery({
    queryKey: ["menu-items", restaurantId, activeCategory],
    queryFn: () =>
      menuApi.listByRestaurant(restaurantId!, {
        category: activeCategory !== "ALL" ? activeCategory : undefined,
        size: 100,
      }),
    enabled: !!restaurantId,
  });

  const items = (menuPage?.content || []).filter(item => {
    if (activeStatus === "AVAILABLE" && !item.isAvailable) return false;
    if (activeStatus === "UNAVAILABLE" && item.isAvailable) return false;
    return true;
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: MenuItemPayload) => menuApi.create(restaurantId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items", restaurantId] });
      setIsModalOpen(false);
      toast.success("Món mới đã được thêm thành công!");
    },
    onError: (err: any) => toast.error(err?.message || "Lỗi khi thêm món mới"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<MenuItemPayload> }) =>
      menuApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items", restaurantId] });
      setIsModalOpen(false);
      toast.success("Cập nhật món ăn thành công!");
    },
    onError: (err: any) => toast.error(err?.message || "Lỗi khi cập nhật món"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => menuApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items", restaurantId] });
      toast.success("Đã xóa món ăn khỏi thực đơn!");
    },
    onError: (err: any) => toast.error(err?.message || "Lỗi khi xóa món ăn"),
  });

  const handleToggleClick = (item: MenuItem) => {
    confirmAction(
      "Xác nhận thay đổi trạng thái",
      `Bạn có chắc muốn ${item.isAvailable ? 'TẠM NGƯNG' : 'MỞ BÁN LẠI'} món "${item.name}" không?`,
      () => {
        const isNowAvailable = !item.isAvailable;
        updateMutation.mutate({
          id: item.id,
          payload: { ...item, isAvailable: isNowAvailable },
        });
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    );
  };

  const handleDeleteClick = (item: MenuItem) => {
    confirmAction(
      "Xác nhận xóa món ăn",
      `Bạn có chắc chắn muốn xóa món "${item.name}" vĩnh viễn không? Thao tác này không thể hoàn tác.`,
      () => {
        deleteMutation.mutate(item.id);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    );
  };

  const handleSaveClick = () => {
    if (!formData.name || !formData.price) {
      toast.error("Tên món và Giá tiền không được để trống!");
      return;
    }

    if (editingItem) {
      confirmAction(
        "Xác nhận cập nhật",
        `Bạn có chắc chắn muốn lưu các thay đổi cho món "${formData.name}" không?`,
        () => {
          updateMutation.mutate({ id: editingItem.id, payload: formData });
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      );
    } else {
      createMutation.mutate({ ...formData, isAvailable: true } as MenuItemPayload);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp hình ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước ảnh quá lớn (vượt quá 5MB)");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Đang tải ảnh món ăn lên...");
    try {
      const imageUrl = await menuApi.uploadImage(file);
      setFormData((prev) => ({ ...prev, imageUrl }));
      toast.success("Tải ảnh món ăn thành công!", { id: toastId });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Lỗi khi tải ảnh lên", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const openAddModal = () => {
    if (!restaurantId) {
      toast.error("Tài khoản của bạn chưa có nhà hàng! Vui lòng tạo nhà hàng trước.");
      return;
    }
    setEditingItem(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      calories: 0,
      proteinG: 0,
      carbG: 0,
      fatG: 0,
      category: "MAIN",
      imageUrl: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      calories: item.calories,
      proteinG: item.proteinG,
      carbG: item.carbG,
      fatG: item.fatG,
      category: item.category,
      imageUrl: item.imageUrl || "",
    });
    setIsModalOpen(true);
  };

  const categoriesList = [
    { name: "All items", value: "ALL" },
    { name: "Main", value: "MAIN" },
    { name: "Side", value: "SIDE" },
    { name: "Drink", value: "DRINK" },
    { name: "Dessert", value: "DESSERT" },
  ];

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#181c20]">Menu Management</h1>
          <p className="text-muted-foreground mt-1">
            Customize your offerings and track dish performance for {restaurant?.name || "your restaurant"}.
          </p>
        </div>
        <Button onClick={openAddModal} className="bg-[#ab3500] hover:bg-[#832600] text-white gap-2 h-10 px-6 rounded-lg">
          <Plus className="w-4 h-4" /> Add New Item
        </Button>
      </div>

      <div className="flex gap-8 items-start flex-col sm:flex-row">
        {/* Filters Sidebar */}
        <div className="w-full sm:w-64 shrink-0 space-y-6">
          {/* Categories Card */}
          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-4">
              <div className="text-xs font-bold text-muted-foreground mb-4 mt-2 uppercase tracking-widest pl-2">
                Categories
              </div>
              <div className="space-y-1.5">
                {categoriesList.map((c) => (
                  <div
                    key={c.value}
                    onClick={() => setActiveCategory(c.value as Category | "ALL")}
                    className={`flex justify-between items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-semibold transition-all ${activeCategory === c.value
                        ? "bg-[#ff6b35] text-white shadow-md shadow-[#ff6b35]/20"
                        : "hover:bg-slate-50 text-[#181c20]"
                      }`}
                  >
                    <span>{c.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-4">
              <div className="text-xs font-bold text-muted-foreground mb-4 mt-2 uppercase tracking-widest pl-2">
                Status
              </div>
              <div className="space-y-1.5">
                {[
                  { name: "All Status", value: "ALL" },
                  { name: "Available", value: "AVAILABLE" },
                  { name: "Unavailable", value: "UNAVAILABLE" }
                ].map((s) => (
                  <div
                    key={s.value}
                    onClick={() => setActiveStatus(s.value as any)}
                    className={`flex justify-between items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-semibold transition-all ${activeStatus === s.value
                        ? "bg-[#ff6b35] text-white shadow-md shadow-[#ff6b35]/20"
                        : "hover:bg-slate-50 text-[#181c20]"
                      }`}
                  >
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 w-full">
          {!restaurantId ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-white border-2 border-dashed rounded-2xl">
              <p>Fetching your restaurant info or you don't have a restaurant yet.</p>
              <Button onClick={() => toast("Cần tạo Restaurant thông qua API")} variant="link" className="text-[#ab3500]">How to fix?</Button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#ab3500] animate-spin"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              <p>No menu items found.</p>
              <Button onClick={openAddModal} variant="link" className="text-[#ab3500]">Create one now</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="border-none shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="relative h-48 bg-slate-100 group shrink-0">
                    <img
                      src={item.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"}
                      alt={item.name}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${!item.isAvailable ? "grayscale opacity-70" : ""
                        }`}
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-extrabold text-[#181c20] shadow-sm">
                      {formatCurrency(item.price)}
                    </div>
                    {!item.isAvailable && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-[#181c20]/80 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg">
                          Unavailable
                        </span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <h3 className="font-bold text-[#181c20] text-lg leading-tight line-clamp-2">{item.name}</h3>
                        {/* Custom Toggle */}
                        <div
                          onClick={() => handleToggleClick(item)}
                          className={`w-10 h-6 rounded-full flex items-center shrink-0 p-0.5 cursor-pointer transition-colors ${item.isAvailable ? "bg-[#006a62]" : "bg-slate-200"
                            }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${item.isAvailable ? "translate-x-4" : "translate-x-0"
                              }`}
                          ></div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-5">
                        <span className="text-xs px-2.5 py-1 rounded-md font-semibold bg-slate-100 text-slate-600">
                          {item.category}
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-md font-medium border border-slate-200 text-slate-500">
                          {item.calories} kcal
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        onClick={() => openEditModal(item)}
                        variant="secondary"
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-[#181c20] font-semibold h-9 rounded-lg"
                      >
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(item)}
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-destructive hover:bg-red-50 h-9 w-9 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all">
          <Card className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border-none overflow-hidden transform animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 text-[#ab3500] rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-[#181c20] mb-2">{confirmConfig.title}</h2>
              <p className="text-slate-500 text-sm">{confirmConfig.message}</p>
            </div>
            <div className="flex border-t bg-slate-50">
              <button
                onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-4 text-slate-500 font-semibold hover:bg-slate-100 transition-colors border-r"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmConfig.onConfirm}
                className="flex-1 py-4 text-[#ab3500] font-bold hover:bg-orange-100 transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white rounded-2xl shadow-xl border-none">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-[#181c20]">{editingItem ? "Edit Item" : "Add New Item"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <CardContent className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Avocado Toast"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A short description"
                />
              </div>

              {/* Browse Image from Computer */}
              <div className="space-y-2">
                <Label>Image</Label>
                <div className="flex items-center gap-4">
                  {formData.imageUrl && formData.imageUrl.trim() !== "" && (
                    <div className="relative w-16 h-16 rounded-lg border overflow-hidden shrink-0 bg-slate-100 group">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      {!isUploading && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                          title="Xóa ảnh"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <Label htmlFor="image-upload" className={`cursor-pointer ${isUploading ? 'pointer-events-none opacity-60' : ''}`}>
                      <div className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-50 transition-colors w-full text-sm font-medium text-slate-600 justify-center">
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                            <span>Đang tải ảnh lên...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>{formData.imageUrl ? "Đổi ảnh món ăn (Max 5MB)" : "Upload Image (Max 5MB)"}</span>
                          </>
                        )}
                      </div>
                    </Label>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      disabled={isUploading}
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (₫)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="e.g. 45000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                  >
                    <option value="MAIN">Main</option>
                    <option value="SIDE">Side</option>
                    <option value="DRINK">Drink</option>
                    <option value="DESSERT">Dessert</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Calories</Label>
                  <Input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Protein (g)</Label>
                  <Input
                    type="number"
                    value={formData.proteinG}
                    onChange={(e) => setFormData({ ...formData, proteinG: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carb (g)</Label>
                  <Input
                    type="number"
                    value={formData.carbG}
                    onChange={(e) => setFormData({ ...formData, carbG: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fat (g)</Label>
                  <Input
                    type="number"
                    value={formData.fatG}
                    onChange={(e) => setFormData({ ...formData, fatG: Number(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveClick}
                disabled={createMutation.isPending || updateMutation.isPending || isUploading}
                className="bg-[#ab3500] hover:bg-[#832600] text-white"
              >
                {isUploading ? "Uploading image..." : (createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingItem ? "Save Changes" : "Create Item"))}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
