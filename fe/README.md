# NomNom — Web App (Frontend)

Frontend cho nền tảng food-delivery NomNom. Hiển thị calo/macro từng món và (sau này) gợi ý món theo sức khỏe.

## Tech stack
Vite · React 18 · TypeScript · Tailwind CSS · shadcn-style UI · React Router v6 · TanStack Query v5 · Zustand · Axios · React Hook Form + Zod.

## Chạy dev
```bash
npm install
npm run dev   # http://localhost:5173
```
Dev server proxy `/api` → API gateway `http://localhost:8080` (xem `vite.config.ts`). Cần backend NomNom (ít nhất user/restaurant/menu/order service + gateway) đang chạy để gọi API thật.

## Lệnh
- `npm run dev` — chạy dev server
- `npm run build` — typecheck + build production (`dist/`)
- `npm run preview` — xem thử bản build

## Cấu trúc
```
src/
├── api/         # apiClient + module theo service (auth, restaurants, menu, orders, recommendations)
├── types/       # DTO + enums khớp API contract backend
├── store/       # authStore (Zustand + persist)
├── lib/         # utils, feature flags
├── components/
│   ├── ui/      # primitives kiểu shadcn (button, card, input, badge, label)
│   └── shared/  # MenuItemCard, NutritionBadge, OrderStatusBadge, ProtectedRoute
├── layouts/     # RootLayout
├── pages/       # Login, Register, RestaurantList, Menu, OrderHistory, OwnerDashboard
├── routes.tsx
├── App.tsx
└── main.tsx
```

## Trạng thái
Đã có: auth (login/register theo role), danh sách nhà hàng, menu với calo/macro, lịch sử đơn, khung guard theo role.
Chưa hoàn thiện (feature-flag tắt ở `src/lib/features.ts` vì backend chưa có controller): recommendation, notification, payment. OwnerDashboard CRUD đầy đủ là bước tiếp theo.

Xem định hướng thiết kế chi tiết tại `../FRONTEND_DESIGN.md`.
