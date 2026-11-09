// Feature flags — bật/tắt tính năng theo từng giai đoạn.
export const features = {
  recommendations: true,
  notifications: true,
  payments: true,  // VNPay Sandbox đã tích hợp
  orderTracking: true,  // Map tracking cho đơn SHIPPING
} as const;


