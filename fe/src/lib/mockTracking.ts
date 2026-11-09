/**
 * Mock data + helpers cho order tracking. Không cần BE support —
 * tọa độ nhà hàng/khách hardcode ở HCM City center.
 *
 * Animation: 20 bước, mỗi bước 4 giây → 80 giây tổng thể.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Tọa độ mặc định khu vực trung tâm HCM. */
const DEFAULT_RESTAURANT: LatLng = { lat: 10.7769, lng: 106.7009 };
const DEFAULT_CUSTOMER: LatLng = { lat: 10.7856, lng: 106.7157 };

export const TRACKING_STEPS = 20;
export const STEP_INTERVAL_MS = 4_000; // 4s × 20 = 80s tổng

export const MOCK_SHIPPER = {
  name: "Nguyễn Văn Tài",
  phone: "0901 234 567",
  vehicle: "Honda Wave — 59P1-12345",
  rating: 4.9,
};

/**
 * Tạo route gồm N điểm nội suy tuyến tính giữa from → to.
 * Đủ mượt cho animation 20 bước; nếu cần cong theo đường phố có thể
 * thay bằng OSRM/Mapbox Directions API sau.
 */
export function generateRoute(from: LatLng, to: LatLng, steps = TRACKING_STEPS): LatLng[] {
  return Array.from({ length: steps + 1 }, (_, i) => ({
    lat: from.lat + (to.lat - from.lat) * (i / steps),
    lng: from.lng + (to.lng - from.lng) * (i / steps),
  }));
}

/**
 * Tính vị trí shipper dựa trên progress (0..1).
 * progress = 0 → ở nhà hàng, progress = 1 → ở chỗ khách.
 */
export function getShipperPosition(route: LatLng[], progress: number): LatLng {
  if (route.length === 0) return DEFAULT_RESTAURANT;
  if (route.length === 1) return route[0];
  const clamped = Math.max(0, Math.min(1, progress));
  const scaled = clamped * (route.length - 1);
  const lower = Math.floor(scaled);
  const upper = Math.min(route.length - 1, lower + 1);
  const t = scaled - lower;
  return {
    lat: route[lower].lat + (route[upper].lat - route[lower].lat) * t,
    lng: route[lower].lng + (route[upper].lng - route[lower].lng) * t,
  };
}

/** Fallback: tọa độ mặc định nếu order không có lat/lng. */
export function defaultRestaurantPos(): LatLng {
  return { ...DEFAULT_RESTAURANT };
}

export function defaultCustomerPos(): LatLng {
  return { ...DEFAULT_CUSTOMER };
}

/** Tính khoảng cách đường chim bay giữa 2 LatLng (km). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
