import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Store, Truck } from "lucide-react";
import {
  MOCK_SHIPPER,
  STEP_INTERVAL_MS,
  defaultCustomerPos,
  defaultRestaurantPos,
  generateRoute,
  getShipperPosition,
  haversineKm,
  type LatLng,
} from "@/lib/mockTracking";

const SHIPPER_ICON = L.divIcon({
  className: "shipper-marker",
  html: `<div style="font-size:32px;line-height:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🛵</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const RESTAURANT_ICON = L.divIcon({
  className: "restaurant-marker",
  html: `<div style="font-size:32px;line-height:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🏪</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const CUSTOMER_ICON = L.divIcon({
  className: "customer-marker",
  html: `<div style="font-size:32px;line-height:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

/** Tính bounds ban đầu để fit cả nhà hàng + khách. */
function FitBounds({ a, b }: { a: LatLng; b: LatLng }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([a.lat, a.lng], [b.lat, b.lng]);
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [map, a, b]);
  return null;
}

interface OrderTrackingMapProps {
  /** Callback khi shipper đến nơi (progress >= 0.95) — dùng để hiện nút "Đã nhận hàng". */
  onArrived?: () => void;
}

export function OrderTrackingMap({ onArrived }: OrderTrackingMapProps) {
  const restaurant = useMemo(() => defaultRestaurantPos(), []);
  const customer = useMemo(() => defaultCustomerPos(), []);
  const route = useMemo(() => generateRoute(restaurant, customer), [restaurant, customer]);
  const totalKm = useMemo(() => haversineKm(restaurant, customer), [restaurant, customer]);

  const [step, setStep] = useState(0);
  const totalSteps = route.length - 1;
  const progress = totalSteps === 0 ? 0 : step / totalSteps;
  const shipperPos = getShipperPosition(route, progress);

  const onArrivedRef = useRef(onArrived);
  onArrivedRef.current = onArrived;

  useEffect(() => {
    if (step >= totalSteps) return;
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= totalSteps) {
          clearInterval(id);
          return s;
        }
        const next = s + 1;
        if (next >= totalSteps * 0.95) {
          onArrivedRef.current?.();
        }
        return next;
      });
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [step, totalSteps]);

  // Đường đã đi (xám) + đường còn lại (xanh dashed)
  const traveledPath = route.slice(0, step + 1);
  const remainingPath = route.slice(step);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <MapContainer
          center={restaurant}
          zoom={14}
          scrollWheelZoom={false}
          className="h-[420px] w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds a={restaurant} b={customer} />

          <Marker position={restaurant} icon={RESTAURANT_ICON}>
            <Popup>Nhà hàng</Popup>
          </Marker>
          <Marker position={customer} icon={CUSTOMER_ICON}>
            <Popup>Địa chỉ giao hàng</Popup>
          </Marker>
          <Marker position={shipperPos} icon={SHIPPER_ICON} zIndexOffset={1000}>
            <Popup>{MOCK_SHIPPER.name} — {MOCK_SHIPPER.phone}</Popup>
          </Marker>

          {traveledPath.length > 1 && (
            <Polyline
              positions={traveledPath}
              pathOptions={{ color: "#94a3b8", weight: 4, opacity: 0.7 }}
            />
          )}
          {remainingPath.length > 1 && (
            <Polyline
              positions={remainingPath}
              pathOptions={{
                color: "#8b5cf6",
                weight: 4,
                opacity: 0.7,
                dashArray: "8 8",
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Shipper info card */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-2xl">
          🛵
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-900">{MOCK_SHIPPER.name}</p>
          <p className="text-sm text-slate-500">
            {MOCK_SHIPPER.vehicle} · ⭐ {MOCK_SHIPPER.rating}
          </p>
          <p className="text-xs text-slate-400">
            <a href={`tel:${MOCK_SHIPPER.phone}`} className="hover:underline">
              {MOCK_SHIPPER.phone}
            </a>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-slate-400">Còn lại</p>
          <p className="text-lg font-extrabold text-purple-700">
            {totalKm.toFixed(1)} km
          </p>
        </div>

        {/* Progress bar */}
        <div className="sm:col-span-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-700 transition-all duration-700"
              style={{ width: `${Math.min(100, progress * 100)}%` }}
            />
          </div>
          <p className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Store className="h-3 w-3" />
              Nhà hàng
            </span>
            <span>{Math.round(progress * 100)}%</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Bạn
            </span>
          </p>
        </div>
      </div>

      {progress >= 0.95 ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <Truck className="h-4 w-4" />
          Shipper đã đến nơi! Vui lòng xác nhận bên dưới.
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Shipper sẽ cập nhật vị trí sau mỗi vài giây. Trang này tự động
          làm mới — bạn không cần tải lại.
        </p>
      )}
    </div>
  );
}
