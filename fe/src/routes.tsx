import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "@/layouts/RootLayout";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { HomePage } from "@/pages/HomePage";
import { MenuPage } from "@/pages/MenuPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { OrderHistoryPage } from "@/pages/OrderHistoryPage";
import { OrderTrackingPage } from "@/pages/OrderTrackingPage";
import { OwnerDashboard } from "@/pages/OwnerDashboard";
import { PaymentReturnPage } from "@/pages/PaymentReturnPage";
import { MenuManagement } from "@/pages/MenuManagement";
import { RestaurantSettings } from "@/pages/RestaurantSettings";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { AdminRestaurantManagement } from "@/pages/AdminRestaurantManagement";
import { AdminOverview } from "@/pages/AdminOverview";
import { AdminUserManagement } from "@/pages/AdminUserManagement";
import { AdminOrdersOverview } from "@/pages/AdminOrdersOverview";
import { AdminPlatformSettings } from "@/pages/AdminPlatformSettings";
import { BrowseAllPage } from "@/pages/BrowseAllPage";
import { OffersPage } from "@/pages/OffersPage";
import { RewardsPage } from "@/pages/RewardsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { LiveOrdersPage } from "@/pages/LiveOrdersPage";
import { ProfilePage, ProfileContent } from "@/pages/ProfilePage";
import { OwnerOverview } from "@/pages/OwnerOverview";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "restaurants", element: <BrowseAllPage /> },
      { path: "restaurants/:id", element: <MenuPage /> },
      { path: "offers", element: <OffersPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },

      // VNPay payment return callback (public — no auth required)
      { path: "payment/return", element: <PaymentReturnPage /> },
      // Authed (mọi role đã đăng nhập)
      {
        element: <ProtectedRoute />,
        children: [
          { path: "checkout", element: <CheckoutPage /> },
          { path: "orders", element: <OrderHistoryPage /> },
          { path: "orders/:id/tracking", element: <OrderTrackingPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "rewards", element: <RewardsPage /> },
        ],
      },

      { path: "*", element: <NotFoundPage /> },
    ],
  },
  
  // Dashboard riêng cho Owner (Không nằm trong RootLayout để không bị dính Header/Footer)
  {
    element: <ProtectedRoute allow={["RESTAURANT_OWNER"]} />,
    children: [
      {
        path: "/owner",
        element: <OwnerDashboard />,
        children: [
          { index: true, element: <OwnerOverview /> },
          { path: "orders", element: <LiveOrdersPage /> },
          { path: "menu", element: <MenuManagement /> },
          { path: "settings", element: <RestaurantSettings /> },
          { path: "profile", element: <ProfileContent /> },
        ],
      },
    ],
  },

  // Dashboard riêng cho Admin
  {
    element: <ProtectedRoute allow={["ADMIN"]} />,
    children: [
      {
        path: "/admin",
        element: <AdminDashboard />,
        children: [
          { index: true, element: <AdminOverview /> },
          { path: "restaurants", element: <AdminRestaurantManagement /> },
          { path: "users", element: <AdminUserManagement /> },
          { path: "orders", element: <AdminOrdersOverview /> },
          { path: "settings", element: <AdminPlatformSettings /> },
        ],
      },
    ],
  }
]);
