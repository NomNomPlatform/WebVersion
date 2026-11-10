# Postman Collection & Test Scenarios – NomNom Platform

Bộ Postman Collection và Environment phục vụ kiểm thử thủ công và tự động hóa toàn diện cho hệ sinh thái Microservices NomNom (10 services + AI Recommendation + VNPay Gateway).

---

## 1. Hướng dẫn Import vào Postman

1. Mở Postman -> Chọn **Import**.
2. Kéo thả 2 file trong thư mục này:
   - `NomNom.postman_collection.json`
   - `NomNom.postman_environment.json`
3. Ở góc trên bên phải của Postman Workspace, chọn môi trường **NomNom - Local**.

---

## 2. Các Kịch bản Kiểm thử Tự động (E2E Test Scenarios)

Thư mục **`🧪 Test Scenarios (Kịch bản kiểm thử tích hợp E2E)`** chứa 4 luồng kiểm thử tự động, tích hợp sẵn các assertion script (`pm.test`) và tự động trích xuất, truyền biến (`accessToken`, `userId`, `restaurantId`, `orderId`...) giữa các bước:

### 🌟 Scenario 1: Customer Ordering Flow (Full Lifecycle)
Kiểm thử trọn vẹn hành trình khách hàng từ lúc đăng nhập đến khi nhận hàng:
- **1.1 Login Customer:** Đăng nhập tài khoản khách hàng, lưu `accessToken` và `userId`.
- **1.2 Browse Available Restaurants:** Duyệt danh sách quán ăn đang mở cửa, lấy `restaurantId`.
- **1.3 Browse Restaurant Menu Items:** Xem thực đơn của quán, trích xuất `menuItemId` và giá bán.
- **1.4 Place Order (Customer):** Gửi yêu cầu đặt 2 phần món ăn kèm địa chỉ giao hàng và ghi chú. Kiểm tra `status == "PENDING"` và lưu `orderId`.
- **1.5 Verify Order Status is PENDING:** Đọc lại đơn hàng vừa tạo, kiểm tra tổng tiền và trạng thái hợp lệ.
- **1.6 Initiate VNPay Payment:** Tạo yêu cầu thanh toán VNPay Sandbox, xác minh URL chuyển hướng chứa `sandbox.vnpayment.vn`.
- **1.7 Check Customer Order Notifications:** Kiểm tra hộp thư thông báo của khách hàng, đảm bảo sự kiện đặt hàng từ Kafka đã được tạo thành notification.

### 🏪 Scenario 2: Restaurant Owner Menu & Order Fulfillment
Kiểm thử quy trình vận hành quán ăn từ phía Chủ nhà hàng:
- **2.1 Login Restaurant Owner:** Đăng nhập tài khoản đối tác, lưu `ownerAccessToken` và `ownerId`.
- **2.2 Create Restaurant Profile:** Đăng ký quán ăn mới với giờ mở/đóng cửa và địa chỉ.
- **2.3 Add Menu Item with Nutrition Metrics:** Thêm món ăn mới với đầy đủ thông số calo, protein, carbs, chất béo.
- **2.4 Update Menu Item Availability:** Điều chỉnh giá bán và cập nhật thông tin món ăn.
- **2.5 Inspect Restaurant Live Orders:** Theo dõi danh sách đơn hàng đổ về quán thời gian thực.
- **2.6 Transition Order Status to READY:** Xác nhận chuẩn bị xong món, cập nhật trạng thái đơn sang `READY`.
- **2.7 Mark Order as DELIVERED:** Hoàn tất bàn giao đơn hàng cho tài xế/khách, đơn chuyển sang `DELIVERED`.

### 🥗 Scenario 3: AI Health Profiling & Meal Recommendation
Kiểm thử tính năng tính toán dinh dưỡng và gợi ý món ăn thông minh bằng AI:
- **3.1 Login Customer:** Xác thực phiên làm việc của khách hàng.
- **3.2 Update User Health Metrics:** Cập nhật chiều cao, cân nặng, tuổi, giới tính và mức độ vận động.
- **3.3 Verify User Health Profile Summary:** Kiểm tra các chỉ số chuyển hóa được tính toán tự động (BMI, TDEE, Calorie Goal).
- **3.4 Check AI Recommendation Service Capability:** Kiểm tra trạng thái sẵn sàng của AI Service và danh sách AI Providers đang bật (Groq / Gemini).
- **3.5 Generate AI Meal Recommendation:** Gửi yêu cầu AI xếp hạng món ăn phù hợp với bữa trưa (LUNCH) và mức calo mục tiêu kèm giải thích lý do gợi ý.
- **3.6 Review Recommendation Audit History:** Kiểm tra nhật ký gợi ý đã được lưu trữ vào MongoDB RecommendationLog.

### 🛡️ Scenario 4: Security, Negative Cases & Role Access Control
Kiểm thử bảo mật, phân quyền RBAC và xử lý ngoại lệ:
- **4.1 Unauthorized Access to Orders without Token:** Gọi API qua Gateway không kèm token -> Mong đợi `401 Unauthorized`.
- **4.2 Customer Accessing Owner Endpoints (Forbidden):** Khách hàng cố tình can thiệp đổi trạng thái đơn của quán -> Mong đợi `403 Forbidden`.
- **4.3 Login with Wrong Password:** Đăng nhập với mật khẩu sai -> Mong đợi `401 Unauthorized`.
- **4.4 Retrieve Non-Existent Order:** Tra cứu đơn hàng với UUID không tồn tại -> Mong đợi `404 Not Found`.
- **4.5 Validation Error (Invalid Payment Amount):** Gửi yêu cầu thanh toán với `amount = 0` -> Mong đợi `400 Bad Request`.

---

## 3. Chạy Tự động Hóa với Newman CLI

Bạn có thể chạy toàn bộ test suite hoặc từng kịch bản đơn lẻ bằng Newman trong terminal:

```bash
# 1. Chạy toàn bộ collection
npx newman run postman/NomNom.postman_collection.json \
  -e postman/NomNom.postman_environment.json \
  --reporters cli

# 2. Chỉ chạy kịch bản Scenario 1 (Customer Ordering)
npx newman run postman/NomNom.postman_collection.json \
  -e postman/NomNom.postman_environment.json \
  --folder "Scenario 1 - Customer Ordering Flow (Full Lifecycle)"

# 3. Chỉ chạy kịch bản Scenario 3 (AI Recommendation)
npx newman run postman/NomNom.postman_collection.json \
  -e postman/NomNom.postman_environment.json \
  --folder "Scenario 3 - AI Health Profiling & Meal Recommendation"
```

---

## 4. Bảng Biến Môi Trường (Environment Variables)

| Tên biến | Giá trị mặc định (Local) | Mô tả |
|---|---|---|
| `gatewayUrl` | http://localhost:8080 | API Gateway (Reverse proxy & JWT filter) |
| `userServiceUrl` | http://localhost:8081 | User Service (Tài khoản, hồ sơ & sức khỏe) |
| `restaurantServiceUrl` | http://localhost:8082 | Restaurant Service (Thông tin nhà hàng) |
| `orderServiceUrl` | http://localhost:8083 | Order Service (Xử lý đơn & Kafka producer) |
| `menuServiceUrl` | http://localhost:8084 | Menu Service (Thực đơn & dinh dưỡng) |
| `paymentServiceUrl` | http://localhost:8085 | Payment Service (VNPay Gateway Sandbox) |
| `recommendationServiceUrl` | http://localhost:8086 | AI Recommendation Service (RuleEngine & LLM) |
| `notificationServiceUrl` | http://localhost:8087 | Notification Service (Kafka consumer) |
| `accessToken` / `userId` | *(Tự động điền)* | JWT Token và UUID của Customer |
| `ownerAccessToken` / `ownerId` | *(Tự động điền)* | JWT Token và UUID của Restaurant Owner |
| `restaurantId` | *(Tự động điền)* | UUID nhà hàng đang thao tác |
| `menuItemId` | *(Tự động điền)* | UUID món ăn đang thao tác |
| `orderId` | *(Tự động điền)* | UUID đơn hàng vừa tạo |
| `paymentId` | *(Tự động điền)* | UUID giao dịch thanh toán |
| `vnpayPaymentUrl` | *(Tự động điền)* | URL thanh toán sandbox được VNPay cấp phát |
