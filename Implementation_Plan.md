# NomNom Microservice — Kế Hoạch Triển Khai Chi Tiết

## Context

NomNom là nền tảng đặt đồ ăn với tính năng AI gợi ý món theo sức khỏe. Codebase hiện tại ở trạng thái **scaffold ~7%**: parent POM đã cấu hình đầy đủ, docker-compose infra sẵn sàng, nhưng **không có business logic nào**. Tất cả 10 service chỉ có `Application.java` rỗng + `application.yml`.

Mục tiêu kế hoạch: giao việc rõ ràng cho 7 thành viên, tránh block lẫn nhau, hoàn thành end-to-end trong 8 tuần.

---

## Tổng Quan Kiến Trúc

```
[React :5173] → [API Gateway :8080] → [User :8081]
                                    → [Restaurant :8082]
                                    → [Menu :8084]
                                    → [Order :8083] ←→ Kafka ←→ [Payment :8085]
                                    → [Recommendation :8086]       ↓ Kafka
                                    → [Notification :8087] ←───────┘

Infrastructure:
  Config Server :8888 (centralized config)
  Eureka Server :8761 (service discovery)
  PostgreSQL :5432 (6 DB riêng biệt)
  MongoDB :27017 (recommendation logs)
  Redis :6379 (caching)
  Kafka :9092 + Zookeeper :2181
```

---

## BƯỚC 0: Thống Nhất Shared Contracts (Cả Team — Trước Khi Code)

> **Phải confirm trước tuần 2.** Member A + B chịu trách nhiệm, cả team phải tuân thủ.

### 1. JWT Payload
```json
{ "sub": "user-uuid", "email": "user@example.com", "role": "CUSTOMER", "iat": 0, "exp": 0 }
```

### 2. Gateway Headers (inject vào mọi downstream request)
```
X-User-Id: <UUID>
X-User-Role: CUSTOMER | RESTAURANT_OWNER | ADMIN
```

### 3. Standard Error Response (tất cả services dùng format này)
```json
{ "timestamp": "2024-01-01T12:00:00", "status": 400, "error": "Bad Request", "message": "...", "path": "/api/..." }
```

### 4. Pagination Response
```json
{ "content": [...], "page": 0, "size": 10, "totalElements": 42, "totalPages": 5, "last": false }
```

---

## Phân Công Chi Tiết Từng Member

---

### MEMBER A — Infrastructure Lead
**Cổng:** 8888, 8761, 8080 | **Deadline:** Tuần 2 | **Độ khó:** ⭐⭐⭐⭐

**Tại sao làm trước:** Tất cả service khác depend vào infra. Nếu A chưa xong, không ai chạy được service.

#### Task 1: Config Server (`infrastructure/config-server/`)
- Tạo `pom.xml` với dep: `spring-cloud-config-server`
- `application.yml`: port 8888, `spring.cloud.config.server.native.search-locations: classpath:/config`
- Tạo 7 file config trong `src/main/resources/config/`:
  - `user-service.yml`, `restaurant-service.yml`, `menu-service.yml`, `order-service.yml`, `payment-service.yml`, `recommendation-service.yml`, `notification-service.yml`
  - Mỗi file chứa: datasource URL, Kafka bootstrap, JWT secret, Redis host

#### Task 2: Eureka Server (`infrastructure/eureka-server/`)
- Tạo `pom.xml` với dep: `spring-cloud-starter-netflix-eureka-server`
- `application.yml`: port 8761, `fetch-registry: false`, `register-with-eureka: false`
- `@EnableEurekaServer` trên Application class

#### Task 3: API Gateway (`infrastructure/api-gateway/`)
- Tạo `pom.xml` với dep: `spring-cloud-starter-gateway`, `spring-cloud-starter-netflix-eureka-client`, `jjwt`
- `application.yml`: 7 route definitions dùng `lb://service-name`
  ```yaml
  routes:
    - id: user-service
      uri: lb://user-service
      predicates: [Path=/api/auth/**, /api/users/**]
    - id: restaurant-service
      uri: lb://restaurant-service  
      predicates: [Path=/api/restaurants/**]
    - id: menu-service
      uri: lb://menu-service
      predicates: [Path=/api/restaurants/*/items/**, /api/items/**]
    - id: order-service
      uri: lb://order-service
      predicates: [Path=/api/orders/**]
    - id: payment-service
      uri: lb://payment-service
      predicates: [Path=/api/payments/**]
    - id: recommendation-service
      uri: lb://recommendation-service
      predicates: [Path=/api/recommendations/**]
    - id: notification-service
      uri: lb://notification-service
      predicates: [Path=/api/notifications/**]
  ```
- Tạo `filter/JwtAuthFilter.java` implement `GlobalFilter`:
  - Whitelist: `/api/auth/register`, `/api/auth/login`, `GET /api/restaurants/**` (public)
  - Validate JWT → extract `sub` (userId) và `role`
  - Inject `X-User-Id` và `X-User-Role` headers
  - Trả 401 nếu token invalid/expired
- Rate limiting: `RequestRateLimiter` filter (10 req/s per IP, dùng Redis)

**Files phải tạo:**
```
infrastructure/config-server/pom.xml
infrastructure/config-server/src/main/resources/application.yml
infrastructure/config-server/src/main/resources/config/*.yml (7 files)
infrastructure/eureka-server/pom.xml
infrastructure/eureka-server/src/main/resources/application.yml
infrastructure/api-gateway/pom.xml
infrastructure/api-gateway/src/main/java/.../ApiGatewayApplication.java
infrastructure/api-gateway/src/main/java/.../filter/JwtAuthFilter.java
infrastructure/api-gateway/src/main/resources/application.yml
```

**Verification:** `GET http://localhost:8888/user-service/default` trả config JSON; `http://localhost:8761` hiện dashboard; `POST /api/auth/login` qua gateway route được đến user-service.

---

### MEMBER B — User Service
**Cổng:** 8081 | **DB:** PostgreSQL `user_db` | **Deadline:** Tuần 3 | **Độ khó:** ⭐⭐⭐

**Dependencies cần thêm vào `services/user-service/pom.xml`:**
```xml
spring-boot-starter-security, spring-boot-starter-data-jpa,
postgresql, jjwt-api (0.11.5), jjwt-impl, jjwt-jackson
```

**Package structure cần tạo:**
```
com.nomnom.user/
├── entity/User.java          # id(UUID), email, passwordHash, fullName, role(enum),
│                             #   height(cm), weight(kg), age, gender(enum), createdAt
├── repository/UserRepository.java   # JpaRepository + findByEmail()
├── dto/
│   ├── RegisterRequest.java  # email, password, fullName, role
│   ├── LoginRequest.java     # email, password
│   ├── LoginResponse.java    # token(String), userId, email, role
│   ├── UpdateProfileRequest.java  # height, weight, age, gender, activityLevel
│   └── HealthResponse.java   # bmi, tdee, calorieGoal, bmiCategory
├── security/
│   ├── JwtService.java       # generateToken(), validateToken(), extractUserId(), extractRole()
│   └── SecurityConfig.java   # permitAll: /auth/**, authenticated: /users/**
├── service/
│   ├── AuthService.java      # register() + login()
│   ├── UserService.java      # findById(), updateProfile()
│   └── HealthService.java    # calculateBmi(), calculateTdee(), calculateCalorieGoal()
└── controller/
    ├── AuthController.java   # POST /api/auth/register, POST /api/auth/login
    └── UserController.java   # GET /users/me, PUT /users/me, GET /users/me/health
```

**Công thức bắt buộc (HealthService.java):**
```java
// BMI
bmi = weightKg / Math.pow(heightM, 2)

// BMR — Harris-Benedict
// Nam: 88.362 + (13.397 × weight) + (4.799 × heightCm) - (5.677 × age)
// Nữ: 447.593 + (9.247 × weight) + (3.098 × heightCm) - (4.330 × age)

// TDEE = BMR × activityMultiplier
// Sedentary=1.2, Light=1.375, Moderate=1.55, Active=1.725, VeryActive=1.9
```

**Unit tests bắt buộc:**
- `AuthServiceTest`: register email trùng → 409; login sai password → 401
- `HealthServiceTest`: BMI đúng với ≥ 3 bộ số input; TDEE đúng cho cả nam/nữ
- `UserControllerTest`: gọi `/users/me` không token → 401

**Coordination:** Member G cần endpoint `/api/auth/login` để test frontend. Chia sẻ LoginResponse format sớm.

---

### MEMBER C — Restaurant + Menu Service
**Cổng:** 8082, 8084 | **DB:** PostgreSQL `restaurant_db`, `menu_db` | **Deadline:** Tuần 4 | **Độ khó:** ⭐⭐

**Dependencies thêm vào cả 2 pom.xml:**
```xml
spring-boot-starter-data-jpa, postgresql
```

#### Restaurant Service (`services/restaurant-service/`)
```
com.nomnom.restaurant/
├── entity/Restaurant.java    # id(UUID), ownerId(UUID), name, description, address,
│                             #   phone, cuisineType, imageUrl, isActive, createdAt
├── entity/OperatingHours.java  # restaurant(FK), dayOfWeek, openTime, closeTime
├── repository/RestaurantRepository.java  # findByOwnerId(), findByIsActiveTrue(Pageable)
├── dto/RestaurantRequest.java, RestaurantResponse.java
├── service/RestaurantService.java
└── controller/RestaurantController.java
    # GET /api/restaurants (public, paginated)
    # GET /api/restaurants/{id} (public)
    # POST /api/restaurants (RESTAURANT_OWNER only)
    # PUT /api/restaurants/{id} (ownership check)
    # DELETE /api/restaurants/{id} (ownership check, soft delete isActive=false)
```

**Multi-tenant rule — KHÔNG ĐƯỢC bỏ qua:**
```java
if (!restaurant.getOwnerId().equals(UUID.fromString(request.getHeader("X-User-Id")))) {
    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your restaurant");
}
```

#### Menu Service (`services/menu-service/`)
```
com.nomnom.menu/
├── entity/MenuItem.java      # id, restaurantId, name, description, price(BigDecimal),
│                             #   calories(Integer), proteinG, carbG, fatG (Double),
│                             #   category(enum: MAIN/SIDE/DRINK/DESSERT),
│                             #   imageUrl, isAvailable(Boolean)
├── repository/MenuItemRepository.java  # findByRestaurantIdAndIsAvailableTrue(UUID, Pageable)
│                                       # findByRestaurantIdAndCategory(UUID, String, Pageable)
├── service/MenuItemService.java
└── controller/MenuItemController.java
    # GET /api/restaurants/{id}/items?category=MAIN (public, paginated)
    # POST /api/restaurants/{id}/items (RESTAURANT_OWNER + ownership check)
    # PUT /api/items/{id} (ownership check via restaurantId → Restaurant Service call)
    # DELETE /api/items/{id} (soft delete: isAvailable = false)
```

> **CRITICAL:** `calories`, `proteinG`, `carbG`, `fatG` là **mandatory fields** — Member F depend vào đây. Validate không được null khi tạo menu item.

**Coordination với Member F:** Confirm format của `GET /api/restaurants/{id}/items` response trước tuần 5. Member F sẽ dùng OpenFeign gọi endpoint này.

---

### MEMBER D — Order Service (PHỨC TẠP NHẤT)
**Cổng:** 8083 | **DB:** PostgreSQL `order_db` | **Deadline:** Tuần 5 | **Độ khó:** ⭐⭐⭐⭐⭐

**Dependencies thêm vào pom.xml:**
```xml
spring-boot-starter-data-jpa, postgresql, spring-kafka,
spring-cloud-starter-openfeign
```

**Entity:**
```
Order: id(UUID), customerId, restaurantId, status(enum: PENDING/CONFIRMED/CANCELLED/READY),
       totalAmount(BigDecimal), deliveryAddress, note, createdAt, updatedAt
OrderItem: id, order(FK), menuItemId, name, quantity, unitPrice, calories
```

**Package structure:**
```
com.nomnom.order/
├── entity/Order.java, OrderItem.java
├── repository/OrderRepository.java  # findByCustomerId(UUID, Pageable)
├── client/PaymentClient.java        # @FeignClient(name="payment-service")
│                                    # POST /api/payments
├── event/                           # POJOs: OrderPlacedEvent, OrderConfirmedEvent,
│   └── ...                          #   OrderCancelledEvent, OrderReadyEvent
├── kafka/
│   ├── OrderEventPublisher.java     # KafkaTemplate: send to order.placed, order.confirmed, etc.
│   └── PaymentEventConsumer.java    # @KafkaListener: payment.completed, payment.failed
├── service/OrderService.java
└── controller/OrderController.java
    # POST /api/orders → tạo PENDING + gọi PaymentClient + publish order.placed
    # GET /api/orders/{id}
    # GET /api/orders/me (từ X-User-Id header)
    # PUT /api/orders/{id}/status (RESTAURANT_OWNER)
    # DELETE /api/orders/{id} (chỉ PENDING + chỉ customer đó)
```

**Saga Choreography Flow (document trong README của service):**
```
1. POST /api/orders → Order PENDING → publish "order.placed"
2. PaymentClient.processPayment() (OpenFeign → synchronous)
   ├── (async) Payment service → publish "payment.completed"
   │     → PaymentEventConsumer → Order CONFIRMED → publish "order.confirmed"
   └── (async) Payment service → publish "payment.failed"
         → PaymentEventConsumer → Order CANCELLED → publish "order.cancelled"
3. Restaurant owner PUT /orders/{id}/status → READY → publish "order.ready"
```

**Kafka config trong `application.yml`:**
```yaml
spring.kafka:
  bootstrap-servers: localhost:9092
  consumer:
    group-id: order-service
    auto-offset-reset: earliest
    key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
    value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
  producer:
    key-serializer: org.apache.kafka.common.serialization.StringSerializer
    value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
```

**Coordination với Member E:** Event POJOs (`OrderPlacedEvent`, `OrderConfirmedEvent`, etc.) phải được agree về format trước khi cả 2 implement Kafka consumers. Tạo shared schema document.

---

### MEMBER E — Payment + Notification Service
**Cổng:** 8085, 8087 | **DB:** PostgreSQL `payment_db`, `notification_db` | **Deadline:** Tuần 6 | **Độ khó:** ⭐⭐⭐

**Dependencies cho cả 2 pom.xml:**
```xml
spring-boot-starter-data-jpa, postgresql, spring-kafka
```

#### Payment Service (`services/payment-service/`)
```
com.nomnom.payment/
├── entity/Payment.java       # id, orderId(UUID), amount, status(enum: PENDING/COMPLETED/FAILED/REFUNDED),
│                             #   transactionId(UUID.randomUUID), createdAt
├── repository/PaymentRepository.java  # findByOrderId(UUID)
├── kafka/PaymentEventPublisher.java   # publish payment.completed / payment.failed
├── service/PaymentService.java
└── controller/PaymentController.java
    # POST /api/payments → mock 90% success → publish event
    # GET /api/payments/{orderId}
    # POST /api/payments/{id}/refund → update REFUNDED
```

**Mock logic bắt buộc:**
```java
boolean success = new Random().nextDouble() > 0.1; // 90% success
```

#### Notification Service (`services/notification-service/`)
```
com.nomnom.notification/
├── entity/Notification.java  # id, userId(UUID), title, body, type, isRead(Boolean), createdAt
├── repository/NotificationRepository.java  # findByUserIdOrderByCreatedAtDesc(UUID, Pageable)
├── kafka/OrderEventConsumer.java   # @KafkaListener: order.placed, order.confirmed, order.ready, order.cancelled
├── service/NotificationService.java  # save() + sendToUser(userId, title, body, type)
└── controller/NotificationController.java
    # GET /api/notifications (lấy từ X-User-Id, paginated)
    # PUT /api/notifications/{id}/read
```

**Kafka consumers (NotificationService phải handle):**
- `order.placed` → notify `restaurantOwnerId`: "Đơn hàng mới #{orderId}"
- `order.confirmed` → notify `customerId`: "Đơn hàng #{orderId} đã được xác nhận"
- `order.ready` → notify `customerId`: "Đơn hàng #{orderId} đã sẵn sàng!"
- `order.cancelled` → notify cả `customerId` và `restaurantOwnerId`

> **Lưu ý:** Notification service cần `restaurantOwnerId` trong event payload. Member D phải include field này vào `OrderPlacedEvent`.

---

### MEMBER F — AI Recommendation Service
**Cổng:** 8086 | **DB:** MongoDB `recommendation_logs`, Redis cache | **Deadline:** Tuần 7 | **Độ khó:** ⭐⭐⭐⭐

**Dependencies thêm vào pom.xml:**
```xml
spring-boot-starter-data-mongodb, spring-boot-starter-data-redis,
spring-cloud-starter-openfeign, spring-boot-starter-web
```

**Clients (OpenFeign):**
```java
@FeignClient(name = "user-service")
interface UserHealthClient {
    @GetMapping("/api/users/{userId}/health")  // Member B expose endpoint này
    HealthResponse getUserHealth(@PathVariable UUID userId,
                                  @RequestHeader("X-User-Id") String userId);
}

@FeignClient(name = "menu-service")  
interface MenuClient {
    @GetMapping("/api/restaurants/{restaurantId}/items")
    PageResponse<MenuItemDto> getMenuItems(@PathVariable UUID restaurantId,
                                           @RequestParam String category);
}
```

**Document (MongoDB):**
```java
@Document(collection = "recommendation_logs")
class RecommendationLog {
    @Id String id;
    UUID userId, restaurantId;
    String mealType;
    List<String> recommendedItemIds;
    String aiExplanation;
    boolean usedAi;
    LocalDateTime createdAt;
}
```

**Redis cache:**
```java
String cacheKey = "recommend:" + userId + ":" + restaurantId + ":" + mealType;
// TTL: 3600s
```

**Processing flow:**
```
1. Check Redis → cache HIT → return immediately
2. GET user health (Feign → User Service /users/{id}/health)
3. GET menu items (Feign → Menu Service /restaurants/{id}/items)
4. Filter: items.calories ≤ tdee × mealTypePercentage
5. if use_ai=true: POST to Claude API (model: claude-3-haiku-20240307, max_tokens: 500)
6. Cache result (Redis, TTL 1h)
7. Log to MongoDB
8. Return top 3 recommendations
```

**Calorie quota:**
```java
enum MealType { BREAKFAST(0.25), LUNCH(0.35), DINNER(0.30), SNACK(0.10) }
```

**Claude API call (RestTemplate/WebClient):**
```
POST https://api.anthropic.com/v1/messages
Headers: x-api-key, anthropic-version: 2023-06-01
Body: { model, max_tokens, messages: [{role: user, content: prompt}] }
```

**Endpoints:**
```
POST /api/recommendations  (body: restaurantId, mealType, use_ai)
GET /api/recommendations/history  (lấy từ MongoDB, paginated)
```

**Lấy Claude API key:** Liên hệ giảng viên hoặc dùng key test. Set qua env var `CLAUDE_API_KEY`.

**Coordination với Member B + C:** Cần User Health endpoint và Menu Item format. Không code phần gọi Feign trước khi 2 service này chạy được.

---

### MEMBER G — React Frontend
**Cổng:** 5173 | **Deadline:** Tuần 8 | **Độ khó:** ⭐⭐⭐

**Setup project:**
```bash
cd frontend/web-app
npm create vite@latest . -- --template react
npm install axios react-router-dom @tanstack/react-query zustand tailwindcss
```

**Pages phải implement:**
```
src/pages/
├── LoginPage.jsx          # Form → POST /api/auth/login → lưu token vào Zustand + localStorage
├── RegisterPage.jsx       # Form → POST /api/auth/register
├── RestaurantListPage.jsx # GET /api/restaurants (paginated, public)
├── MenuPage.jsx           # GET /api/restaurants/{id}/items + hiện calories mỗi món
├── CartPage.jsx           # Local state (không cần API)
├── CheckoutPage.jsx       # POST /api/orders
├── OrderTrackingPage.jsx  # GET /api/orders/{id} (polling mỗi 5s)
├── OrderHistoryPage.jsx   # GET /api/orders/me
└── OwnerDashboard.jsx     # Quản lý menu + GET /api/orders (filter by restaurant)
```

**Components:**
```
src/components/
├── RecommendationPanel.jsx  # POST /api/recommendations + hiển thị kết quả AI
├── MenuItemCard.jsx         # Hiện: tên, giá, ảnh, calories, macros
├── OrderStatusBadge.jsx     # Color-coded: PENDING/CONFIRMED/CANCELLED/READY
└── ProtectedRoute.jsx       # Redirect nếu không có token
```

**Auth store (Zustand):**
```js
// src/store/authStore.js
const useAuthStore = create((set) => ({
  token: localStorage.getItem('token'),
  user: null,
  login: (token, user) => { localStorage.setItem('token', token); set({ token, user }) },
  logout: () => { localStorage.removeItem('token'); set({ token: null, user: null }) }
}))
```

**API client:**
```js
// src/api/apiClient.js — Axios instance tự động inject token
const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

**Vite proxy (vite.config.js):**
```js
server: { proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } } }
```

**Coordination:** Cần Member B xong login endpoint trước tuần 5 để test auth flow.

---

## Timeline & Milestones

| Tuần | Deadline | Ai | Mốc kiểm tra |
|------|----------|----|---------------|
| 2 | **Infra chạy** | A | `http://localhost:8761` hiện services; Config Server trả config; Gateway route được |
| 3 | **Auth end-to-end** | A+B | `POST /api/auth/register` → `POST /api/auth/login` → `GET /api/users/me` qua Gateway |
| 4 | **Restaurant+Menu** | C | Tạo restaurant, add menu item (có calories) qua Postman |
| 5 | **Order+Payment Saga** | D+E | Đặt hàng → Kafka events → order CONFIRMED → notification lưu DB |
| 6 | **Frontend auth flow** | G | Login → xem restaurant list → xem menu với calorie |
| 7 | **AI Recommendation** | F | POST `/api/recommendations?use_ai=true` trả top 3 món |
| 8 | **Integration test** | All | Full flow từ React: đăng ký → đặt hàng → nhận notification |

---

## Dependency Graph (Ai Block Ai)

```
Member A (Infra)
    └──→ Tất cả members khác depend (không ai run được service nếu A chưa xong Eureka+Config)

Member B (User Service)
    └──→ Member F (cần /users/me/health endpoint)
    └──→ Member G (cần /auth/login)

Member C (Menu Service)
    └──→ Member F (cần /restaurants/{id}/items response format)

Member D (Order Service)
    └──→ Member E (cần OrderPlacedEvent/OrderConfirmedEvent schema)
    └──→ Member E (cần PaymentClient interface)

Member E (Payment)
    └──→ Member D (feedback loop: payment events → order status update)
```

---

## Shared Files Cần Tạo Sớm (Trước Tuần 3)

1. **Kafka Event POJOs** — Member D tạo, share cho Member E:
   ```
   OrderPlacedEvent: orderId, customerId, restaurantId, restaurantOwnerId, totalAmount
   OrderConfirmedEvent: orderId, customerId
   OrderCancelledEvent: orderId, customerId, restaurantOwnerId, reason
   OrderReadyEvent: orderId, customerId
   PaymentCompletedEvent: orderId, paymentId, amount
   PaymentFailedEvent: orderId, reason
   ```
   → Đặt trong shared module hoặc copy vào cả 2 service (copy đơn giản hơn cho project học)

2. **`.env.local` template** (KHÔNG commit):
   ```env
   POSTGRES_HOST=localhost  POSTGRES_PORT=5432  POSTGRES_USER=postgres  POSTGRES_PASSWORD=postgres
   MONGO_HOST=localhost  MONGO_PORT=27017
   REDIS_HOST=localhost  REDIS_PORT=6379
   KAFKA_BOOTSTRAP_SERVERS=localhost:9092
   JWT_SECRET=nomnom_super_secret_change_in_production_min_32_chars
   EUREKA_SERVER_URL=http://localhost:8761/eureka
   CLAUDE_API_KEY=sk-ant-...
   ```

---

## Verification End-to-End

```bash
# 1. Start infra
docker compose -f docker-compose.infra.yml up -d

# 2. Start services theo thứ tự
cd infrastructure/config-server && mvn spring-boot:run
cd infrastructure/eureka-server && mvn spring-boot:run
cd infrastructure/api-gateway && mvn spring-boot:run
# Sau đó start tất cả business services song song

# 3. Test auth flow
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","fullName":"Test User","role":"CUSTOMER"}'

TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}' | jq -r .token)

curl http://localhost:8080/api/users/me -H "Authorization: Bearer $TOKEN"

# 4. Test order saga
curl -X POST http://localhost:8080/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"...","items":[...],"deliveryAddress":"..."}'

# 5. Xem Kafka events
# http://localhost:8090 (Kafka UI)

# 6. Xem registered services
# http://localhost:8761 (Eureka Dashboard)

# 7. Xem Swagger từng service
# http://localhost:808X/swagger-ui.html
```

---

## Lưu Ý Quan Trọng Cho Tất Cả Members

1. **Không validate JWT lại trong business service** — Gateway đã làm, chỉ tin `X-User-Id` header
2. **Mỗi service chỉ được đọc DB của mình** — không cross-database
3. **Giao tiếp inter-service** chỉ qua REST (OpenFeign) hoặc Kafka
4. **KHÔNG commit** `.env`, API keys, credentials
5. **Git branch per service:** `feature/user-service`, `feature/order-service`, v.v.
6. **Commit format:** `feat(user-service): implement JWT login endpoint`

---

## Quy Trình Làm Việc Với Git (Bắt Buộc Cho Cả Team)

> Mô hình: **feature-branch → Pull Request → merge vào `dev`**. Không ai commit thẳng vào `dev` hoặc `main`.

### Các nhánh chính
- `main` — nhánh ổn định, chỉ release. **Không push trực tiếp.**
- `dev` — nhánh tích hợp, tất cả PR merge vào đây. **Không push trực tiếp.**
- `feature/<service>` — nhánh làm việc của từng member (theo issue đảm nhận).

### Quy trình 6 bước

```bash
# 1. Luôn cập nhật dev mới nhất TRƯỚC khi tạo nhánh (tránh nhánh bị cũ)
git checkout dev
git pull origin dev

# 2. Tạo nhánh từ dev theo service/issue đảm nhận
git checkout -b feature/user-service        # ví dụ Member B

# 3. Tiến hành task → commit theo chuẩn Conventional Commit
git add .
git commit -m "feat(user-service): implement JWT login endpoint (#issue)"

# 4. (Định kỳ) Đồng bộ dev vào nhánh để giảm conflict khi merge
git fetch origin
git merge origin/dev        # hoặc: git rebase origin/dev

# 5. Push nhánh và mở Pull Request vào dev
git push -u origin feature/user-service
# → Tạo Pull Request: base = dev, compare = feature/user-service

# 6. Báo Leader review & merge PR (xem quy tắc bên dưới)
```

### Quy tắc Pull Request
- **Base branch:** luôn là `dev` (không phải `main`).
- **Tiêu đề PR** theo chuẩn commit: `feat(scope): mô tả ngắn gọn (#số_issue)`.
- **Điều kiện merge:** ≥ 1 Reviewer approve **và** CI/build pass.
- **Người merge:** Leader/Tech Lead bấm merge (member chỉ tạo PR và báo Leader).
- **Sau khi merge:** xóa nhánh feature đã merge.
  ```bash
  git checkout dev && git pull origin dev
  git branch -d feature/user-service
  git push origin --delete feature/user-service
  ```

### Xử lý conflict
- Conflict được giải quyết **trên nhánh feature** (bước 4), không để Leader gánh khi merge.
- Sau khi resolve: `git add <files>` → `git commit` → `git push`.
