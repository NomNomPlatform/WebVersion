# NomNom Frontend — Tech-Stack & UI Design

## Bối cảnh
Backend NomNom là hệ food-delivery microservice (Spring Boot, gateway `:8080/api`) với điểm khác biệt là **gợi ý món theo sức khỏe** (calories/macros mỗi món, AI recommendation theo TDEE & meal-type). Repo đã có scaffold `frontend/web-app` (Vite, port 5173). Tài liệu này chốt tech-stack và định hướng thiết kế giao diện bám sát 3 vai trò người dùng (CUSTOMER, RESTAURANT_OWNER, ADMIN) và các API hiện có.

**Quyết định đã chốt:** TypeScript · Vite + React SPA · Tailwind + shadcn/ui.

> Vị trí repo: scaffold đang nằm trong `frontend/web-app`. Khuyến nghị dài hạn là tách repo riêng (`nomnom-frontend`) để độc lập CI/CD; giai đoạn học/đồ án có thể giữ trong monorepo cho tiện.

---

## 1. Tech Stack

| Lớp | Lựa chọn | Lý do |
|-----|----------|-------|
| Build/Runtime | **Vite + React 18 + TypeScript** | Khớp scaffold & port 5173; HMR nhanh; SPA đủ cho app sau auth |
| Routing | **react-router-dom v6** | Route theo role, nested layout, `ProtectedRoute` |
| Server state | **@tanstack/react-query v5** | Cache, polling order status, pagination, retry |
| Client state | **zustand** | Auth store (token/user) gọn nhẹ, persist localStorage |
| HTTP | **axios** + interceptor | Inject `Authorization: Bearer`, xử lý 401 → logout |
| Styling | **Tailwind CSS** | Utility-first |
| Components | **shadcn/ui** (Radix + Tailwind) | Copy code vào repo, accessible, dễ theme; có sẵn Form/Dialog/Table/Toast |
| Form | **react-hook-form + zod** | Validate form; zod schema tái dùng làm type |
| Icons | **lucide-react** | Đi kèm shadcn |
| Data validation | **zod** | Parse response theo API contract, type-safe end-to-end |
| Tooling | ESLint + Prettier + (tùy) Vitest + RTL | Chất lượng & test cơ bản |

**Cài đặt định hướng (chạy ở `frontend/web-app`):**
```bash
npm create vite@latest . -- --template react-ts
npm i axios react-router-dom @tanstack/react-query zustand react-hook-form zod @hookform/resolvers lucide-react
npm i -D tailwindcss postcss autoprefixer && npx tailwindcss init -p
npx shadcn@latest init
```

**Vite proxy** (tránh CORS):
```ts
server: { proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } } }
```

---

## 2. Cấu trúc thư mục đề xuất
```
src/
├── api/            # apiClient.ts + module theo service: auth.ts, restaurants.ts, menu.ts, orders.ts, recommendations.ts, notifications.ts
├── types/          # DTO + zod schema khớp backend (User, Restaurant, MenuItem, Order, enums)
├── store/          # authStore.ts (zustand + persist)
├── hooks/          # useAuth, useRestaurants, useOrders (react-query wrappers)
├── components/
│   ├── ui/         # shadcn primitives (button, card, dialog, table, badge...)
│   └── shared/     # MenuItemCard, OrderStatusBadge, NutritionBadge, RecommendationPanel, ProtectedRoute
├── layouts/        # PublicLayout, CustomerLayout, OwnerLayout
├── pages/          # theo vai trò (xem mục 4)
├── lib/            # utils (format tiền, format calo, cn())
└── routes.tsx
```

**Type theo contract** (khớp gateway):
- `Role = CUSTOMER | RESTAURANT_OWNER | ADMIN`
- `OrderStatus = PENDING | CONFIRMED | READY | CANCELLED`
- `Category = MAIN | SIDE | DRINK | DESSERT`
- `MealType = BREAKFAST | LUNCH | DINNER | SNACK`
- Pagination: `PageResponse<T> = { content, page, size, totalElements, totalPages, last }`

---

## 3. Design System (giao diện)

**Định vị thương hiệu:** "ăn ngon — biết rõ dinh dưỡng". Tông ấm, gợi cảm giác đồ ăn nhưng vẫn sạch/health-focused.

- **Màu sắc:**
  - Primary: cam/đỏ ấm (appetite) — vd `#FF6B35` hoặc `#F4511E`.
  - Accent health: xanh lá (`#22C55E`) cho thông tin calo/macros "tốt".
  - Neutral: gray scale của Tailwind; nền sáng `#FAFAFA`.
  - Semantic status (OrderStatusBadge): PENDING=amber, CONFIRMED=blue, READY=green, CANCELLED=red.
- **Typography:** font sans hiện đại (Inter / Plus Jakarta Sans). Heading đậm, body dễ đọc.
- **Bo góc & bóng:** rounded-xl, shadow nhẹ — cảm giác card món ăn thân thiện.
- **Theme shadcn:** cấu hình CSS variables (`--primary`, `--radius`) để đồng bộ.
- **Responsive:** mobile-first; grid 1→2→3 cột.
- **Dark mode:** optional (shadcn hỗ trợ sẵn), phase sau.

**Component đặc trưng của NomNom:**
- `MenuItemCard`: ảnh, tên, giá, **NutritionBadge** (calo nổi bật + macro P/C/F nhỏ), nút thêm giỏ.
- `NutritionBadge`: chip hiển thị `xxx kcal` + breakdown macro — điểm bán hàng chính của sản phẩm.
- `RecommendationPanel`: chọn meal-type → gọi `/api/recommendations` → render top 3 món kèm lý do AI, badge "AI gợi ý".
- `OrderStatusBadge`: màu theo status; dùng ở tracking và dashboard.
- `HealthSummaryCard`: hiện BMI/TDEE/calorieGoal từ `/api/users/me/health` ở profile.

---

## 4. Bản đồ màn hình theo vai trò

**Public / Guest**
- `RestaurantListPage` — GET `/api/restaurants` (paginated, public), search/filter cuisine.
- `MenuPage` — GET `/api/restaurants/{id}/items`, filter `?category=`, hiện calo mỗi món.
- `Login` / `Register` — chọn role khi đăng ký.

**Customer** (sau đăng nhập)
- Cart (local state) → `CheckoutPage` POST `/api/orders`.
- `OrderTrackingPage` — react-query polling `/api/orders/{id}` mỗi 5s + OrderStatusBadge.
- `OrderHistoryPage` — GET `/api/orders/me`.
- `ProfilePage` — GET/PUT `/api/users/me` + HealthSummaryCard.
- `NotificationsPage` — GET `/api/notifications` (khi service sẵn sàng).
- RecommendationPanel nhúng ở MenuPage/trang chủ.

**Restaurant Owner**
- `OwnerDashboard` — danh sách nhà hàng của mình, đơn theo restaurant.
- Quản lý menu: bảng MenuItem (shadcn Table) + Dialog form thêm/sửa (POST/PUT/DELETE items) với field calo/macro bắt buộc.
- Cập nhật trạng thái đơn: PUT `/api/orders/{id}/status` (PENDING→CONFIRMED→READY).

**Admin** — reserved (backend chưa định nghĩa); để layout chỗ trống, không build sâu.

**Auth & guard:** `authStore` giữ token+user; `ProtectedRoute` redirect nếu thiếu token hoặc sai role; axios interceptor bắt 401 → logout.

---

## 5. Lưu ý tích hợp backend
- Một số service chưa có controller (payment, notification, recommendation) → FE nên feature-flag/ẩn UI tương ứng và dựng mock trước, bật khi API sẵn sàng.
- Mọi request qua gateway `:8080` (proxy `/api`). Token JWT chứa `sub/email/role`; FE đọc role từ response login.
- Error format chuẩn `{ timestamp, status, error, message, path }` → tạo helper hiển thị toast lỗi.

---

## 6. Verification (khi đã implement)
1. `npm run dev` → app chạy `:5173`, proxy `/api` sang `:8080`.
2. Chạy infra backend (`docker-compose.infra.yml`) + user/restaurant/menu/order service.
3. Luồng e2e: Register (CUSTOMER) → Login → RestaurantList → MenuPage thấy calo → thêm giỏ → Checkout tạo order → Tracking polling đổi status.
4. Luồng Owner: Login owner → tạo restaurant → thêm menu item (có macro) → đổi trạng thái đơn.
5. Guard: truy cập route owner khi là customer → bị redirect; xóa token → 401 → logout.
6. (Tùy) Vitest cho util format calo/tiền + render MenuItemCard/OrderStatusBadge.
