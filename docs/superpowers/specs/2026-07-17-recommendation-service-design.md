# Recommendation Service — Design Spec

**Ngày:** 2026-07-17
**Service:** `recommendation-service` (cổng 8086)
**Trạng thái hiện tại:** chỉ có `RecommendationApplication.java` rỗng — triển khai từ đầu.

## 1. Mục tiêu

Gợi ý món ăn cho khách hàng theo mục tiêu sức khỏe (TDEE/calories), kết hợp
logic lọc rule-based (luôn có) và xếp hạng/giải thích bằng LLM (khi bật).
Đây là module AI cốt lõi còn thiếu theo Implementation_Plan (milestone Tuần 7).

## 2. Ràng buộc

- **Không dùng Claude API tính phí.** Dùng LLM API miễn phí: **Groq** (chính) và
  **Google Gemini** (fallback). Provider nào không có API key thì tự động bỏ qua.
- Fallback cuối cùng là kết quả rule-based (không phụ thuộc LLM khi demo/chấm).
- Chỉ đọc DB của chính mình (MongoDB `recommendation_logs`, Redis cache). Không
  cross-database. Giao tiếp inter-service qua OpenFeign (REST).
- Tin `X-User-Id` từ Gateway, không tự validate JWT lại.
- API keys nạp qua env var, không commit.

## 3. Kiến trúc & luồng xử lý

```
POST /api/recommendations {restaurantId, mealType, useAi}   (X-User-Id từ Gateway)
  1. Redis check: key "recommend:{userId}:{restaurantId}:{mealType}:{useAi}" → HIT → return
  2. Feign UserHealthClient → GET /api/users/me/health  (lấy tdee, calorieGoal)
  3. Feign MenuClient       → GET /api/restaurants/{restaurantId}/items (paged)
  4. RuleEngine: lọc items có calories ≤ tdee × mealQuota; xếp hạng theo macro fit → top N
  5. useAi=true → AiRankingService:
        Groq → (lỗi/hết quota/không key) → Gemini → (lỗi) → fallback dùng nguyên rule-based
        AI trả: thứ tự ưu tiên + aiExplanation
  6. Cache kết quả vào Redis (TTL 3600s)
  7. Log RecommendationLog vào MongoDB (usedAi=true/false)
  8. Return top 3

GET /api/recommendations/history → đọc MongoDB theo userId, paginated
```

### Trừu tượng hoá LLM provider (điểm thiết kế chính)

- `interface LlmProvider { boolean isEnabled(); Optional<AiResult> rank(String prompt); }`
- `GroqProvider`, `GeminiProvider` cùng implement.
- `AiRankingService` duyệt danh sách provider theo thứ tự cấu hình (`nomnom.ai.order`);
  provider `isEnabled()==false` (không có key) hoặc ném lỗi/timeout thì bỏ qua → provider kế.
- Nếu tất cả provider fail → trả kết quả rule-based nguyên vẹn (usedAi=false).
- Groq: WebClient gọi endpoint OpenAI-compatible. Gemini: WebClient gọi endpoint
  `generativelanguage.googleapis.com`.

## 4. Cấu trúc package

```
com.nomnom.recommendation/
├── controller/RecommendationController.java   # POST /api/recommendations, GET /history
├── dto/
│   ├── RecommendationRequest.java   # restaurantId(UUID), mealType(enum), useAi(bool)
│   ├── RecommendationResponse.java  # List<RecommendedItem>, aiExplanation, usedAi
│   ├── RecommendedItem.java         # itemId, name, calories, macros, price, reason
│   ├── HealthResponse.java          # mirror user-service (bmi, tdee, calorieGoal...)
│   ├── MenuItemDto.java + PageResponse.java  # mirror menu-service
├── client/
│   ├── UserHealthClient.java   # @FeignClient(user-service) GET /api/users/me/health
│   └── MenuClient.java         # @FeignClient(menu-service) GET /api/restaurants/{id}/items
├── domain/
│   ├── MealType.java           # BREAKFAST(.25) LUNCH(.35) DINNER(.30) SNACK(.10)
│   └── RuleEngine.java         # lọc + xếp hạng theo TDEE quota & macro fit (thuần, dễ test)
├── ai/
│   ├── LlmProvider.java        # interface
│   ├── GroqProvider.java       # WebClient, OpenAI-compatible
│   ├── GeminiProvider.java     # WebClient, generativelanguage endpoint
│   ├── AiRankingService.java   # duyệt provider theo thứ tự, fallback
│   └── PromptBuilder.java
├── document/RecommendationLog.java   # @Document MongoDB
├── repository/RecommendationLogRepository.java  # MongoRepository
├── service/RecommendationService.java  # điều phối flow 8 bước, Redis cache
├── config/{RedisConfig, WebClientConfig}.java
└── exception/{GlobalExceptionHandler, ErrorResponse}.java  # format lỗi chuẩn của team
```

`pom.xml` thêm: `spring-boot-starter-data-mongodb`, `spring-boot-starter-data-redis`,
`spring-cloud-starter-openfeign`, `spring-boot-starter-webflux` (WebClient gọi LLM).

## 5. Data model

**RecommendationLog (MongoDB `recommendation_logs`):**
`id, userId(UUID), restaurantId(UUID), mealType(String), recommendedItemIds(List<String>),
aiExplanation(String), usedAi(boolean), createdAt(LocalDateTime)`

**MealType quota:** BREAKFAST 0.25, LUNCH 0.35, DINNER 0.30, SNACK 0.10.
Ngưỡng calo mỗi món = `tdee × quota`.

## 6. Config & API keys

`config-server/src/main/resources/config/recommendation-service.yml` bổ sung:
```yaml
spring:
  data:
    mongodb: { uri: mongodb://mongo:mongo@localhost:27017/recommendation_logs?authSource=admin }
    redis: { host: localhost, port: 6379 }
nomnom:
  ai:
    groq:   { api-key: "${GROQ_API_KEY:}",   model: llama-3.3-70b-versatile, base-url: https://api.groq.com/openai/v1 }
    gemini: { api-key: "${GEMINI_API_KEY:}", model: gemini-2.0-flash }
    order: [groq, gemini]
    timeout-ms: 5000
```
Key nạp qua env var `GROQ_API_KEY`, `GEMINI_API_KEY`. Không key → provider skip.

## 7. Endpoints

- `POST /api/recommendations` — body `{restaurantId, mealType, useAi}`; trả top 3.
- `GET /api/recommendations/history?page=&size=` — lịch sử theo userId (paginated).

Gateway đã có route `/api/recommendations/**` → `lb://recommendation-service`.
Feature flag frontend `recommendations` bật lại sau khi service chạy.

## 8. Test & xử lý lỗi

**Unit test (không cần mạng/DB):**
- `RuleEngineTest`: lọc đúng theo TDEE quota (≥3 bộ input); items vượt quota bị loại; xếp hạng đúng.
- `AiRankingServiceTest`: Groq lỗi → fallback Gemini; cả hai lỗi → dùng rule-based (mock provider).
- `RecommendationServiceTest`: cache HIT không gọi Feign; useAi=false không gọi AI.

**Xử lý lỗi:**
- Feign lỗi (user/menu service down) → 503 với error format chuẩn.
- LLM timeout (5s) hoặc lỗi → bắt và fallback provider/rule-based, không fail request.
- MongoDB log lỗi → chỉ log warning, không chặn response.

## 9. Ngoài phạm vi (YAGNI)

- Không huấn luyện model / embedding / vector DB.
- Không personalize theo lịch sử đặt hàng (chỉ theo health + menu hiện tại).
- Không rate-limit riêng (Gateway đã lo).
