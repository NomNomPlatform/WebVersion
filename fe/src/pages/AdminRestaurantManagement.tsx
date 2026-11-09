import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Search, Filter, Store, MapPin, Phone, Utensils,
  CheckCircle2, Clock, XCircle, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { restaurantsApi } from "@/api/restaurants";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Restaurant } from "@/types";

export function AdminRestaurantManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED">("ALL");
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [restaurantToAction, setRestaurantToAction] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data: restaurantsPage, isLoading } = useQuery({
    queryKey: ["admin-restaurants", currentPage],
    queryFn: () => restaurantsApi.getAllForAdmin(currentPage, PAGE_SIZE),
  });

  const restaurants = restaurantsPage?.content || [];
  const totalPages = restaurantsPage?.totalPages ?? 1;

  const approveMutation = useMutation({
    mutationFn: (id: string) => restaurantsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      toast.success("Restaurant approved successfully!");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to approve restaurant"),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => restaurantsApi.suspend(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      toast.success("Restaurant suspended successfully!");
      setSuspendDialogOpen(false);
      setRestaurantToAction(null);
      setSuspendReason("");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to suspend restaurant"),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => restaurantsApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      toast.success("Restaurant activated successfully!");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to activate restaurant"),
  });

  const handleSuspendClick = (id: string) => {
    setRestaurantToAction(id);
    setSuspendReason("");
    setSuspendDialogOpen(true);
  };

  const handleConfirmSuspend = () => {
    if (restaurantToAction) {
      suspendMutation.mutate({ id: restaurantToAction, reason: suspendReason });
    }
  };

  const handleRejectClick = (id: string) => {
    setRestaurantToAction(id);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (restaurantToAction) {
      rejectMutation.mutate({ id: restaurantToAction, reason: rejectReason });
      setRejectDialogOpen(false);
      setRestaurantToAction(null);
      setRejectReason("");
    }
  };

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => restaurantsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      toast.success("Restaurant rejected successfully!");
      setRejectDialogOpen(false);
      setRestaurantToAction(null);
      setRejectReason("");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to reject restaurant"),
  });

  const handleViewDetails = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setDetailDialogOpen(true);
  };

  const filteredRestaurants = restaurants.filter(r => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (searchTerm && !r.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>;
      case "PENDING":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case "REJECTED":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case "SUSPENDED":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300"><AlertCircle className="w-3.5 h-3.5" /> Suspended</span>;
      default:
        // Default to APPROVED for now if status is missing because we just added it to the DB
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#181c20] tracking-tight">Restaurant Management</h1>
        <p className="text-slate-500 mt-1.5 font-medium">
          Monitor and manage all restaurants operating on the NomNom platform.
        </p>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              className="pl-9 bg-slate-50 border-transparent focus:bg-white focus:border-[#006a62]/30 focus:ring-2 focus:ring-[#006a62]/10 rounded-xl h-11 w-full transition-all font-medium" 
              placeholder="Search by restaurant name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {["ALL", "APPROVED", "PENDING", "SUSPENDED", "REJECTED"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  statusFilter === status 
                    ? "bg-[#006a62] text-white shadow-md shadow-[#006a62]/20" 
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {status === "ALL" ? "All Status" : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
            <Button variant="outline" className="h-10 rounded-xl border-slate-200 text-slate-600 font-semibold gap-2 ml-2">
              <Filter className="w-4 h-4" /> More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4 pl-6 font-semibold">Restaurant</th>
                <th className="p-4 font-semibold">Owner ID</th>
                <th className="p-4 font-semibold">Cuisine / Contact</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Created</th>
                <th className="p-4 pr-6 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#006a62] animate-spin mb-4"></div>
                      <p className="font-medium">Loading restaurants...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRestaurants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Store className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="font-bold text-slate-700 text-lg">No restaurants found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredRestaurants.map((restaurant) => (
                  <tr key={restaurant.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                          {restaurant.imageUrl ? (
                            <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover" />
                          ) : (
                            <Store className="w-6 h-6 text-slate-400 m-3" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 line-clamp-1">{restaurant.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-[250px]">{restaurant.address}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-600">
                      <div className="truncate max-w-[120px]" title={restaurant.ownerId}>{restaurant.ownerId.substring(0, 8)}...</div>
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-medium">
                      <div className="space-y-0.5">
                        {restaurant.cuisineType && (
                          <div className="font-semibold text-slate-700">{restaurant.cuisineType}</div>
                        )}
                        <div className="text-slate-500">{restaurant.phone || "—"}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(restaurant.status)}
                    </td>
                    <td className="p-4 text-xs text-slate-500 font-medium">
                      {restaurant.createdAt
                        ? new Date(restaurant.createdAt).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {restaurant.status === 'PENDING' ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewDetails(restaurant)}
                            >
                              View
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => approveMutation.mutate(restaurant.id)}
                              disabled={approveMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRejectClick(restaurant.id)}
                              disabled={rejectMutation.isPending}
                            >
                              Reject
                            </Button>
                          </>
                        ) : restaurant.status === 'APPROVED' ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewDetails(restaurant)}
                            >
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleSuspendClick(restaurant.id)}
                              disabled={suspendMutation.isPending}
                            >
                              Suspend
                            </Button>
                          </>
                        ) : restaurant.status === 'SUSPENDED' ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewDetails(restaurant)}
                            >
                              View
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => activateMutation.mutate(restaurant.id)}
                              disabled={activateMutation.isPending}
                            >
                              Activate
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewDetails(restaurant)}
                            >
                              View
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-sm text-slate-500 font-medium">
          <div>
            Showing {filteredRestaurants.length} of {restaurantsPage?.totalElements ?? 0} restaurants
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
              className="h-8 rounded-lg font-semibold"
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

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Restaurant</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for suspending this restaurant. This will help the owner understand why their restaurant was suspended.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Enter suspension reason..."
            value={suspendReason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSuspendReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSuspend}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject with Reason Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Restaurant</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this restaurant. This will help the owner understand what needs to be improved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmReject}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restaurant Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Restaurant Details</DialogTitle>
          </DialogHeader>
          {selectedRestaurant && (
            <div className="space-y-6">
              {/* Restaurant Image */}
              {selectedRestaurant.imageUrl && (
                <div className="w-full h-48 rounded-xl overflow-hidden bg-slate-100">
                  <img 
                    src={selectedRestaurant.imageUrl} 
                    alt={selectedRestaurant.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedRestaurant.name}</h3>
                  <div className="mt-2">{getStatusBadge(selectedRestaurant.status)}</div>
                </div>

                {selectedRestaurant.description && (
                  <div>
                    <p className="text-sm text-slate-500 font-semibold mb-1">Description</p>
                    <p className="text-slate-700">{selectedRestaurant.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500 font-semibold">Address</p>
                      <p className="text-slate-700">{selectedRestaurant.address}</p>
                    </div>
                  </div>

                  {selectedRestaurant.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-500 font-semibold">Phone</p>
                        <p className="text-slate-700">{selectedRestaurant.phone}</p>
                      </div>
                    </div>
                  )}

                  {selectedRestaurant.cuisineType && (
                    <div className="flex items-start gap-3">
                      <Utensils className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-500 font-semibold">Cuisine Type</p>
                        <p className="text-slate-700">{selectedRestaurant.cuisineType}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Store className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500 font-semibold">Owner ID</p>
                      <p className="text-slate-700 font-mono text-sm">{selectedRestaurant.ownerId}</p>
                    </div>
                  </div>
                </div>

                {selectedRestaurant.createdAt && (
                  <div>
                    <p className="text-sm text-slate-500 font-semibold">Created At</p>
                    <p className="text-slate-700">
                      {new Date(selectedRestaurant.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
