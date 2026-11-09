// Domain types khớp với API contract của NomNom backend (gateway :8080/api)

export type Role = "CUSTOMER" | "RESTAURANT_OWNER" | "ADMIN";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "READY"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED";

export type RestaurantStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type Category = "MAIN" | "SIDE" | "DRINK" | "DESSERT";

export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export type Gender = "MALE" | "FEMALE" | "OTHER";

/** Nguồn đăng ký của user (match enum AuthProvider phía backend). */
export type AuthProvider = "LOCAL" | "GOOGLE";

export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHT"
  | "MODERATE"
  | "ACTIVE"
  | "VERY_ACTIVE";

/** Response chuẩn cho mọi endpoint phân trang */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

/** Error format chuẩn từ gateway/services */
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

// ---- Auth & User ----
export interface LoginResponse {
  token: string;
  userId: string;
  email: string;
  role: Role;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl?: string;
  provider?: AuthProvider;
  height?: number;
  weight?: number;
  age?: number;
  gender?: Gender;
  activityLevel?: ActivityLevel;
  createdAt?: string;
}

export interface HealthResponse {
  bmi: number;
  bmiCategory: string;
  tdee: number;
  calorieGoal: number;
}

// ---- Restaurant ----
export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  cuisineType: string;
  imageUrl?: string;
  status: RestaurantStatus;
  rejectionReason?: string;
  suspendReason?: string;
  createdAt: string;
}

// ---- Menu ----
export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  category: Category;
  imageUrl?: string;
  isAvailable: boolean;
}

// ---- Order ----
export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryAddress: string;
  note?: string;
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
  /** VNPay redirect URL — chỉ có khi paymentMethod là VNPAY */
  paymentUrl?: string;
}

// ---- Payment ----
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitiatePaymentPayload {
  orderId: string;
  amount: number;
}

// ---- Recommendation ----
export interface RecommendationRequest {
  restaurantId: string;
  mealType: MealType;
  useAi: boolean;
}

export interface RecommendedItem {
  itemId: string;
  name: string;
  calories: number;
  proteinG?: number;
  carbG?: number;
  fatG?: number;
  price: number;
  reason?: string;
}

export interface RecommendationResponse {
  items: RecommendedItem[];
  aiExplanation?: string;
  usedAi: boolean;
  /**
   * Bối cảnh cá nhân hoá — FE dùng để hiển thị "TDEE của bạn → target cho bữa
   * đã chọn → món gợi ý chiếm bao nhiêu %". Có thể undefined với response
   * từ cache cũ; FE nên fallback tính quota khi thiếu.
   */
  context?: RecommendationContext;
}

export interface RecommendationContext {
  /** TDEE lấy từ user-service (kcal/ngày). */
  tdee: number;
  /** Mục tiêu calo (kcal/ngày). */
  calorieGoal: number;
  /** Tên bữa: BREAKFAST/LUNCH/DINNER/SNACK. */
  mealType: MealType;
  /** Tỉ lệ phân bổ calo cho bữa đó (vd 0.35 cho LUNCH). */
  mealQuota: number;
  /** Khẩu phần calo khuyến nghị cho bữa đó = calorieGoal * mealQuota. */
  mealCalorieTarget: number;
  /** Số món đã được rule engine lọc xong (sau filter & rank). */
  matchedItemsCount: number;
  /** Tổng số món trong menu của nhà hàng. */
  candidatesCount: number;
}

export interface RecommendationConfigResponse {
  aiEnabled: boolean;
  enabledProviders: string[];
  maxResults: number;
}

// ---- Notification ----
export type NotificationType =
  | "ORDER_PLACED"
  | "ORDER_CONFIRMED"
  | "ORDER_READY"
  | "ORDER_SHIPPING"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

