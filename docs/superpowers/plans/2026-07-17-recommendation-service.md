# Recommendation Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng recommendation-service (cổng 8086) gợi ý top-3 món ăn theo TDEE của khách, kết hợp lọc rule-based + xếp hạng/giải thích bằng LLM miễn phí (Groq → Gemini → fallback rule-based).

**Architecture:** Spring Boot service đọc health của khách (Feign → user-service, forward JWT) và menu (Feign → menu-service, public), lọc theo hạn mức calo của bữa ăn bằng `RuleEngine` thuần, tuỳ chọn xếp hạng lại bằng `AiRankingService` (duyệt danh sách `LlmProvider` có fallback), cache kết quả vào Redis (TTL 1h) và log vào MongoDB.

**Tech Stack:** Java 17, Spring Boot, Spring Cloud OpenFeign, Spring Data MongoDB, Spring Data Redis, Spring WebFlux (WebClient gọi LLM), Lombok, JUnit 5 + Mockito.

**Spec:** `docs/superpowers/specs/2026-07-17-recommendation-service-design.md`

**Package gốc:** `com.nomnom.recommendation` — tất cả path dưới đây rút gọn `SRC = services/recommendation-service/src/main/java/com/nomnom/recommendation`, `TEST = services/recommendation-service/src/test/java/com/nomnom/recommendation`.

**Lưu ý build:** Chạy Maven từ thư mục con: `cd services/recommendation-service && mvn ...`. Test đơn lẻ: `mvn -q test -Dtest=ClassName`.

---

### Task 1: Dependencies & bật annotation

**Files:**
- Modify: `services/recommendation-service/pom.xml`
- Modify: `SRC/RecommendationApplication.java`

- [ ] **Step 1: Thêm dependencies vào `pom.xml`** (chèn vào trong `<dependencies>`, cạnh các dep hiện có)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

- [ ] **Step 2: Bật Feign trên Application class**

```java
package com.nomnom.recommendation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class RecommendationApplication {
    public static void main(String[] args) {
        SpringApplication.run(RecommendationApplication.class, args);
    }
}
```

- [ ] **Step 3: Build để xác nhận dep tải được**

Run: `cd services/recommendation-service && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add services/recommendation-service/pom.xml services/recommendation-service/src/main/java/com/nomnom/recommendation/RecommendationApplication.java
git commit -m "feat(recommendation-service): add mongodb/redis/feign/webflux deps"
```

---

### Task 2: MealType + DTO/mirror types

**Files:**
- Create: `SRC/domain/MealType.java`
- Create: `SRC/dto/HealthDto.java`
- Create: `SRC/dto/MenuItemDto.java`
- Create: `SRC/dto/PageResponse.java`
- Create: `SRC/dto/RecommendationRequest.java`
- Create: `SRC/dto/RecommendedItem.java`
- Create: `SRC/dto/RecommendationResponse.java`

- [ ] **Step 1: `MealType.java`** — enum kèm hạn mức calo mỗi bữa

```java
package com.nomnom.recommendation.domain;

public enum MealType {
    BREAKFAST(0.25), LUNCH(0.35), DINNER(0.30), SNACK(0.10);

    private final double quota;

    MealType(double quota) { this.quota = quota; }

    public double getQuota() { return quota; }
}
```

- [ ] **Step 2: `HealthDto.java`** — mirror của user-service `HealthResponse`

```java
package com.nomnom.recommendation.dto;

import lombok.Data;

@Data
public class HealthDto {
    private double bmi;
    private String bmiCategory;
    private double tdee;
    private double calorieGoal;
}
```

- [ ] **Step 3: `MenuItemDto.java`** — mirror của menu-service `MenuItemResponse` (chỉ field cần dùng)

```java
package com.nomnom.recommendation.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class MenuItemDto {
    private UUID id;
    private UUID restaurantId;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer calories;
    private Double proteinG;
    private Double carbG;
    private Double fatG;
    private String category;
    private String imageUrl;
    private Boolean isAvailable;
}
```

- [ ] **Step 4: `PageResponse.java`** — khớp format phân trang chuẩn của team

```java
package com.nomnom.recommendation.dto;

import lombok.Data;
import java.util.List;

@Data
public class PageResponse<T> {
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean last;
}
```

- [ ] **Step 5: `RecommendationRequest.java`**

```java
package com.nomnom.recommendation.dto;

import com.nomnom.recommendation.domain.MealType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class RecommendationRequest {
    @NotNull
    private UUID restaurantId;
    @NotNull
    private MealType mealType;
    private boolean useAi = false;
}
```

- [ ] **Step 6: `RecommendedItem.java`**

```java
package com.nomnom.recommendation.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class RecommendedItem {
    private UUID itemId;
    private String name;
    private Integer calories;
    private Double proteinG;
    private Double carbG;
    private Double fatG;
    private BigDecimal price;
    private String reason;
}
```

- [ ] **Step 7: `RecommendationResponse.java`**

```java
package com.nomnom.recommendation.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class RecommendationResponse {
    private List<RecommendedItem> items;
    private String aiExplanation;
    private boolean usedAi;
}
```

- [ ] **Step 8: Compile + commit**

Run: `cd services/recommendation-service && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS

```bash
git add services/recommendation-service/src/main/java/com/nomnom/recommendation/domain services/recommendation-service/src/main/java/com/nomnom/recommendation/dto
git commit -m "feat(recommendation-service): add MealType and DTO types"
```

---

### Task 3: RuleEngine (TDD)

Lọc món có `calories <= tdee * mealType.quota`, xếp hạng theo độ "vừa" calo (gần ngưỡng nhất, không vượt) rồi ưu tiên protein cao. Bỏ món `isAvailable == false` hoặc `calories == null`.

**Files:**
- Create: `SRC/domain/RuleEngine.java`
- Test: `TEST/domain/RuleEngineTest.java`

- [ ] **Step 1: Viết test thất bại** `RuleEngineTest.java`

```java
package com.nomnom.recommendation.domain;

import com.nomnom.recommendation.dto.MenuItemDto;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RuleEngineTest {

    private final RuleEngine engine = new RuleEngine();

    private MenuItemDto item(String name, Integer calories, Double protein, boolean available) {
        MenuItemDto i = new MenuItemDto();
        i.setId(UUID.randomUUID());
        i.setName(name);
        i.setCalories(calories);
        i.setProteinG(protein);
        i.setIsAvailable(available);
        return i;
    }

    @Test
    void filtersOutItemsAboveQuota() {
        // tdee 2000, LUNCH quota 0.35 -> ngưỡng 700 kcal
        List<MenuItemDto> menu = List.of(
                item("Salad", 400, 20.0, true),
                item("Big Burger", 900, 30.0, true));

        List<MenuItemDto> result = engine.filterAndRank(menu, 2000, MealType.LUNCH, 3);

        assertThat(result).extracting(MenuItemDto::getName).containsExactly("Salad");
    }

    @Test
    void skipsUnavailableAndNullCalories() {
        List<MenuItemDto> menu = List.of(
                item("Available", 300, 20.0, true),
                item("Unavailable", 300, 20.0, false),
                item("NoCalories", null, 20.0, true));

        List<MenuItemDto> result = engine.filterAndRank(menu, 2000, MealType.LUNCH, 3);

        assertThat(result).extracting(MenuItemDto::getName).containsExactly("Available");
    }

    @Test
    void ranksClosestToQuotaThenHigherProteinFirstAndLimitsTopN() {
        // ngưỡng 700; cả 3 hợp lệ
        List<MenuItemDto> menu = List.of(
                item("Low", 300, 10.0, true),
                item("NearHigherProtein", 680, 40.0, true),
                item("NearLowerProtein", 680, 15.0, true),
                item("Mid", 500, 25.0, true));

        List<MenuItemDto> result = engine.filterAndRank(menu, 2000, MealType.LUNCH, 2);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("NearHigherProtein");
        assertThat(result.get(1).getName()).isEqualTo("NearLowerProtein");
    }
}
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `cd services/recommendation-service && mvn -q test -Dtest=RuleEngineTest`
Expected: FAIL (RuleEngine chưa tồn tại — compile error)

- [ ] **Step 3: Cài đặt `RuleEngine.java`**

```java
package com.nomnom.recommendation.domain;

import com.nomnom.recommendation.dto.MenuItemDto;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Component
public class RuleEngine {

    /**
     * Lọc món phù hợp bữa ăn theo TDEE và xếp hạng.
     * Ngưỡng calo = tdee * mealType.quota. Loại món không available, calories null,
     * hoặc calories > ngưỡng. Xếp hạng: gần ngưỡng nhất trước (khoảng cách nhỏ),
     * đồng hạng thì protein cao trước. Trả tối đa topN.
     */
    public List<MenuItemDto> filterAndRank(List<MenuItemDto> menu, double tdee,
                                           MealType mealType, int topN) {
        double threshold = tdee * mealType.getQuota();
        return menu.stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsAvailable()))
                .filter(i -> i.getCalories() != null)
                .filter(i -> i.getCalories() <= threshold)
                .sorted(Comparator
                        .comparingDouble((MenuItemDto i) -> threshold - i.getCalories())
                        .thenComparing(Comparator.comparingDouble(
                                (MenuItemDto i) -> proteinOrZero(i)).reversed()))
                .limit(topN)
                .toList();
    }

    private double proteinOrZero(MenuItemDto i) {
        return i.getProteinG() == null ? 0.0 : i.getProteinG();
    }

    // giữ để tránh warning unused import trong một số IDE
    private boolean notNull(Object o) { return Objects.nonNull(o); }
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `cd services/recommendation-service && mvn -q test -Dtest=RuleEngineTest`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add services/recommendation-service/src/main/java/com/nomnom/recommendation/domain/RuleEngine.java services/recommendation-service/src/test/java/com/nomnom/recommendation/domain/RuleEngineTest.java
git commit -m "feat(recommendation-service): add RuleEngine with tests"
```

---

### Task 4: Feign clients + forward JWT

user-service `/api/users/me/health` tự validate JWT → phải forward header `Authorization`. menu-service `/api/restaurants/{id}/items` là public → không cần header.

**Files:**
- Create: `SRC/client/UserHealthClient.java`
- Create: `SRC/client/MenuClient.java`
- Create: `SRC/config/FeignAuthForwardConfig.java`

- [ ] **Step 1: `FeignAuthForwardConfig.java`** — copy Authorization từ request hiện tại sang Feign

```java
package com.nomnom.recommendation.config;

import feign.RequestInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class FeignAuthForwardConfig {

    @Bean
    public RequestInterceptor authForwardInterceptor() {
        return template -> {
            if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
                String auth = attrs.getRequest().getHeader("Authorization");
                if (auth != null && !auth.isBlank()) {
                    template.header("Authorization", auth);
                }
            }
        };
    }
}
```

- [ ] **Step 2: `UserHealthClient.java`**

```java
package com.nomnom.recommendation.client;

import com.nomnom.recommendation.config.FeignAuthForwardConfig;
import com.nomnom.recommendation.dto.HealthDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

@FeignClient(name = "user-service", configuration = FeignAuthForwardConfig.class)
public interface UserHealthClient {

    @GetMapping("/api/users/me/health")
    HealthDto getMyHealth();
}
```

- [ ] **Step 3: `MenuClient.java`**

```java
package com.nomnom.recommendation.client;

import com.nomnom.recommendation.dto.MenuItemDto;
import com.nomnom.recommendation.dto.PageResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

@FeignClient(name = "menu-service")
public interface MenuClient {

    @GetMapping("/api/restaurants/{restaurantId}/items")
    PageResponse<MenuItemDto> getItems(@PathVariable("restaurantId") UUID restaurantId,
                                       @RequestParam(value = "size", defaultValue = "100") int size);
}
```

- [ ] **Step 4: Compile + commit**

Run: `cd services/recommendation-service && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS

```bash
git add services/recommendation-service/src/main/java/com/nomnom/recommendation/client services/recommendation-service/src/main/java/com/nomnom/recommendation/config/FeignAuthForwardConfig.java
git commit -m "feat(recommendation-service): add Feign clients with JWT forwarding"
```

---

### Task 5: MongoDB log document + repository

**Files:**
- Create: `SRC/document/RecommendationLog.java`
- Create: `SRC/repository/RecommendationLogRepository.java`

- [ ] **Step 1: `RecommendationLog.java`**

```java
package com.nomnom.recommendation.document;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@Document(collection = "recommendation_logs")
public class RecommendationLog {
    @Id
    private String id;
    private UUID userId;
    private UUID restaurantId;
    private String mealType;
    private List<String> recommendedItemIds;
    private String aiExplanation;
    private boolean usedAi;
    private LocalDateTime createdAt;
}
```

- [ ] **Step 2: `RecommendationLogRepository.java`**

```java
package com.nomnom.recommendation.repository;

import com.nomnom.recommendation.document.RecommendationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.UUID;

public interface RecommendationLogRepository extends MongoRepository<RecommendationLog, String> {
    Page<RecommendationLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
}
```

- [ ] **Step 3: Compile + commit**

Run: `cd services/recommendation-service && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS

```bash
git add services/recommendation-service/src/main/java/com/nomnom/recommendation/document services/recommendation-service/src/main/java/com/nomnom/recommendation/repository
git commit -m "feat(recommendation-service): add MongoDB recommendation log"
```

---

### Task 6: LLM providers + AiRankingService (TDD)

`AiRankingService` nhận danh sách rule-based đã lọc, duyệt các `LlmProvider` theo thứ tự; provider đầu tiên `isEnabled()` và trả kết quả thì dùng, lỗi/timeout thì thử provider kế; hết provider → trả `AiResult` rỗng (báo hiệu dùng nguyên rule-based).

**Files:**
- Create: `SRC/ai/AiResult.java`
- Create: `SRC/ai/LlmProvider.java`
- Create: `SRC/ai/PromptBuilder.java`
- Create: `SRC/ai/AiRankingService.java`
- Create: `SRC/ai/GroqProvider.java`
- Create: `SRC/ai/GeminiProvider.java`
- Create: `SRC/config/AiProperties.java`
- Test: `TEST/ai/AiRankingServiceTest.java`

- [ ] **Step 1: `AiResult.java`** — kết quả AI: thứ tự itemId ưu tiên + giải thích

```java
package com.nomnom.recommendation.ai;

import java.util.List;

public record AiResult(List<String> orderedItemIds, String explanation) {
    public static AiResult empty() {
        return new AiResult(List.of(), null);
    }

    public boolean isEmpty() {
        return orderedItemIds == null || orderedItemIds.isEmpty();
    }
}
```

- [ ] **Step 2: `LlmProvider.java`**

```java
package com.nomnom.recommendation.ai;

import java.util.Optional;

public interface LlmProvider {
    String name();
    boolean isEnabled();
    /** Trả Optional.empty() nếu lỗi/không dùng được; ngoại lệ cũng coi như bỏ qua. */
    Optional<AiResult> rank(String prompt);
}
```

- [ ] **Step 3: Viết test thất bại** `AiRankingServiceTest.java`

```java
package com.nomnom.recommendation.ai;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class AiRankingServiceTest {

    private LlmProvider provider(String name, boolean enabled, Optional<AiResult> result) {
        return new LlmProvider() {
            public String name() { return name; }
            public boolean isEnabled() { return enabled; }
            public Optional<AiResult> rank(String prompt) { return result; }
        };
    }

    @Test
    void usesFirstEnabledProviderThatSucceeds() {
        AiResult r = new AiResult(List.of("a", "b"), "because");
        AiRankingService svc = new AiRankingService(List.of(
                provider("groq", true, Optional.of(r)),
                provider("gemini", true, Optional.of(new AiResult(List.of("x"), "no")))));

        AiResult out = svc.rank("prompt");

        assertThat(out.orderedItemIds()).containsExactly("a", "b");
        assertThat(out.explanation()).isEqualTo("because");
    }

    @Test
    void fallsBackToNextProviderWhenFirstDisabledOrFails() {
        AiResult r = new AiResult(List.of("g"), "gemini result");
        AiRankingService svc = new AiRankingService(List.of(
                provider("groq", false, Optional.empty()),          // disabled
                provider("broken", true, Optional.empty()),         // enabled nhưng fail
                provider("gemini", true, Optional.of(r))));

        AiResult out = svc.rank("prompt");

        assertThat(out.orderedItemIds()).containsExactly("g");
    }

    @Test
    void returnsEmptyWhenAllProvidersUnavailable() {
        AiRankingService svc = new AiRankingService(List.of(
                provider("groq", false, Optional.empty()),
                provider("gemini", true, Optional.empty())));

        assertThat(svc.rank("prompt").isEmpty()).isTrue();
    }

    @Test
    void swallowsProviderExceptionAndContinues() {
        LlmProvider throwing = new LlmProvider() {
            public String name() { return "throwing"; }
            public boolean isEnabled() { return true; }
            public Optional<AiResult> rank(String prompt) { throw new RuntimeException("boom"); }
        };
        AiResult r = new AiResult(List.of("ok"), "e");
        AiRankingService svc = new AiRankingService(List.of(throwing,
                provider("gemini", true, Optional.of(r))));

        assertThat(svc.rank("prompt").orderedItemIds()).containsExactly("ok");
    }
}
```

- [ ] **Step 4: Chạy test để xác nhận fail**

Run: `cd services/recommendation-service && mvn -q test -Dtest=AiRankingServiceTest`
Expected: FAIL (AiRankingService chưa tồn tại)

- [ ] **Step 5: Cài đặt `AiRankingService.java`**

```java
package com.nomnom.recommendation.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class AiRankingService {

    private final List<LlmProvider> providers;

    public AiRankingService(List<LlmProvider> providers) {
        this.providers = providers;
    }

    /** Duyệt provider theo thứ tự; trả AiResult đầu tiên dùng được, hoặc empty. */
    public AiResult rank(String prompt) {
        for (LlmProvider p : providers) {
            if (!p.isEnabled()) {
                continue;
            }
            try {
                Optional<AiResult> result = p.rank(prompt);
                if (result.isPresent() && !result.get().isEmpty()) {
                    log.info("AI ranking bởi provider {}", p.name());
                    return result.get();
                }
            } catch (Exception ex) {
                log.warn("Provider {} lỗi, thử provider kế: {}", p.name(), ex.getMessage());
            }
        }
        log.info("Không provider AI nào dùng được, fallback rule-based");
        return AiResult.empty();
    }
}
```

- [ ] **Step 6: Chạy test để xác nhận pass**

Run: `cd services/recommendation-service && mvn -q test -Dtest=AiRankingServiceTest`
Expected: PASS (4 test)

- [ ] **Step 7: `AiProperties.java`** — bind `nomnom.ai.*`

```java
package com.nomnom.recommendation.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Data
@Component
@ConfigurationProperties(prefix = "nomnom.ai")
public class AiProperties {
    private Provider groq = new Provider();
    private Provider gemini = new Provider();
    private List<String> order = List.of("groq", "gemini");
    private long timeoutMs = 5000;

    @Data
    public static class Provider {
        private String apiKey = "";
        private String model;
        private String baseUrl;
    }
}
```

- [ ] **Step 8: `PromptBuilder.java`**

```java
package com.nomnom.recommendation.ai;

import com.nomnom.recommendation.dto.MenuItemDto;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PromptBuilder {

    public String build(double tdee, String mealType, List<MenuItemDto> candidates) {
        String menuLines = candidates.stream()
                .map(i -> "- id=" + i.getId() + " | " + i.getName()
                        + " | " + i.getCalories() + " kcal"
                        + " | protein " + i.getProteinG() + "g")
                .collect(Collectors.joining("\n"));
        return """
                Bạn là chuyên gia dinh dưỡng. Khách có TDEE ~ %.0f kcal/ngày, đang chọn món cho bữa %s.
                Danh sách món ứng viên (đã lọc theo hạn mức calo):
                %s

                Hãy xếp hạng tối đa 3 món phù hợp nhất cho mục tiêu sức khỏe.
                Trả về DUY NHẤT JSON hợp lệ dạng:
                {"orderedItemIds":["<id>","<id>","<id>"],"explanation":"<giải thích ngắn tiếng Việt>"}
                Chỉ dùng id có trong danh sách trên.
                """.formatted(tdee, mealType, menuLines);
    }
}
```

- [ ] **Step 9: `GroqProvider.java`** — WebClient OpenAI-compatible, parse JSON trả về

```java
package com.nomnom.recommendation.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nomnom.recommendation.config.AiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
public class GroqProvider implements LlmProvider {

    private final AiProperties props;
    private final ObjectMapper mapper = new ObjectMapper();
    private final WebClient webClient = WebClient.builder().build();

    public GroqProvider(AiProperties props) {
        this.props = props;
    }

    @Override
    public String name() { return "groq"; }

    @Override
    public boolean isEnabled() {
        return props.getGroq().getApiKey() != null && !props.getGroq().getApiKey().isBlank();
    }

    @Override
    public Optional<AiResult> rank(String prompt) {
        AiProperties.Provider cfg = props.getGroq();
        String baseUrl = cfg.getBaseUrl() != null ? cfg.getBaseUrl() : "https://api.groq.com/openai/v1";
        Map<String, Object> body = Map.of(
                "model", cfg.getModel() != null ? cfg.getModel() : "llama-3.3-70b-versatile",
                "temperature", 0.2,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(Map.of("role", "user", "content", prompt)));

        String response = webClient.post()
                .uri(baseUrl + "/chat/completions")
                .header("Authorization", "Bearer " + cfg.getApiKey())
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofMillis(props.getTimeoutMs()))
                .block();

        return parseOpenAiStyle(response);
    }

    private Optional<AiResult> parseOpenAiStyle(String response) {
        try {
            JsonNode root = mapper.readTree(response);
            String content = root.path("choices").get(0).path("message").path("content").asText();
            return Optional.of(parseContent(content, mapper));
        } catch (Exception ex) {
            log.warn("Parse Groq response lỗi: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    /** Dùng chung: parse chuỗi JSON {"orderedItemIds":[...],"explanation":"..."}. */
    static AiResult parseContent(String content, ObjectMapper mapper) throws Exception {
        JsonNode node = mapper.readTree(content);
        List<String> ids = new ArrayList<>();
        node.path("orderedItemIds").forEach(n -> ids.add(n.asText()));
        return new AiResult(ids, node.path("explanation").asText(null));
    }
}
```

- [ ] **Step 10: `GeminiProvider.java`** — endpoint generativelanguage, tái dùng `parseContent`

```java
package com.nomnom.recommendation.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nomnom.recommendation.config.AiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
public class GeminiProvider implements LlmProvider {

    private final AiProperties props;
    private final ObjectMapper mapper = new ObjectMapper();
    private final WebClient webClient = WebClient.builder().build();

    public GeminiProvider(AiProperties props) {
        this.props = props;
    }

    @Override
    public String name() { return "gemini"; }

    @Override
    public boolean isEnabled() {
        return props.getGemini().getApiKey() != null && !props.getGemini().getApiKey().isBlank();
    }

    @Override
    public Optional<AiResult> rank(String prompt) {
        AiProperties.Provider cfg = props.getGemini();
        String model = cfg.getModel() != null ? cfg.getModel() : "gemini-2.0-flash";
        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model + ":generateContent?key=" + cfg.getApiKey();

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of("responseMimeType", "application/json"));

        String response = webClient.post()
                .uri(url)
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofMillis(props.getTimeoutMs()))
                .block();

        try {
            JsonNode root = mapper.readTree(response);
            String content = root.path("candidates").get(0).path("content")
                    .path("parts").get(0).path("text").asText();
            return Optional.of(GroqProvider.parseContent(content, mapper));
        } catch (Exception ex) {
            log.warn("Parse Gemini response lỗi: {}", ex.getMessage());
            return Optional.empty();
        }
    }
}
```

- [ ] **Step 11: Compile toàn bộ + commit**

Run: `cd services/recommendation-service && mvn -q test -Dtest=AiRankingServiceTest`
Expected: PASS

```bash
git add services/recommendation-service/src/main/java/com/nomnom/recommendation/ai services/recommendation-service/src/main/java/com/nomnom/recommendation/config/AiProperties.java services/recommendation-service/src/test/java/com/nomnom/recommendation/ai
git commit -m "feat(recommendation-service): add LLM providers and AiRankingService with tests"
```

**Lưu ý ordering provider:** `AiRankingService` nhận `List<LlmProvider>` do Spring inject theo thứ tự bean. Task 7 test không phụ thuộc thứ tự này. Thứ tự runtime groq-trước-gemini được đảm bảo bằng cách đặt tên bean/`@Order`; nếu cần chặt chẽ, thêm `@Order(1)` lên `GroqProvider` và `@Order(2)` lên `GeminiProvider` (import `org.springframework.core.annotation.Order`).

- [ ] **Step 12: Thêm `@Order` cho đúng thứ tự fallback**

Thêm `import org.springframework.core.annotation.Order;` và annotation `@Order(1)` (Groq), `@Order(2)` (Gemini) ngay trên dòng `@Component` của mỗi provider. Commit:

```bash
git add services/recommendation-service/src/main/java/com/nomnom/recommendation/ai/GroqProvider.java services/recommendation-service/src/main/java/com/nomnom/recommendation/ai/GeminiProvider.java
git commit -m "feat(recommendation-service): order Groq before Gemini for fallback"
```

---

### Task 7: RecommendationService — điều phối + Redis cache (TDD)

**Files:**
- Create: `SRC/service/RecommendationService.java`
- Create: `SRC/config/RedisConfig.java`
- Test: `TEST/service/RecommendationServiceTest.java`

- [ ] **Step 1: Viết test thất bại** `RecommendationServiceTest.java` (mock Feign, Redis, Ai, Mongo)

```java
package com.nomnom.recommendation.service;

import com.nomnom.recommendation.ai.AiRankingService;
import com.nomnom.recommendation.ai.AiResult;
import com.nomnom.recommendation.ai.PromptBuilder;
import com.nomnom.recommendation.client.MenuClient;
import com.nomnom.recommendation.client.UserHealthClient;
import com.nomnom.recommendation.domain.MealType;
import com.nomnom.recommendation.domain.RuleEngine;
import com.nomnom.recommendation.dto.*;
import com.nomnom.recommendation.repository.RecommendationLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RecommendationServiceTest {

    private UserHealthClient userClient;
    private MenuClient menuClient;
    private RuleEngine ruleEngine;
    private AiRankingService aiRankingService;
    private RecommendationLogRepository logRepo;
    private RedisTemplate<String, Object> redis;
    private ValueOperations<String, Object> valueOps;
    private RecommendationService service;

    private final UUID userId = UUID.randomUUID();
    private final UUID restaurantId = UUID.randomUUID();

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setup() {
        userClient = mock(UserHealthClient.class);
        menuClient = mock(MenuClient.class);
        ruleEngine = new RuleEngine();
        aiRankingService = mock(AiRankingService.class);
        logRepo = mock(RecommendationLogRepository.class);
        redis = mock(RedisTemplate.class);
        valueOps = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(valueOps);
        service = new RecommendationService(userClient, menuClient, ruleEngine,
                aiRankingService, new PromptBuilder(), logRepo, redis);
    }

    private HealthDto health(double tdee) {
        HealthDto h = new HealthDto();
        h.setTdee(tdee);
        return h;
    }

    private MenuItemDto item(String name, int cal, double protein) {
        MenuItemDto i = new MenuItemDto();
        i.setId(UUID.randomUUID());
        i.setName(name);
        i.setCalories(cal);
        i.setProteinG(protein);
        i.setPrice(BigDecimal.TEN);
        i.setIsAvailable(true);
        return i;
    }

    private PageResponse<MenuItemDto> page(List<MenuItemDto> items) {
        PageResponse<MenuItemDto> p = new PageResponse<>();
        p.setContent(items);
        return p;
    }

    private RecommendationRequest request(boolean useAi) {
        RecommendationRequest r = new RecommendationRequest();
        r.setRestaurantId(restaurantId);
        r.setMealType(MealType.LUNCH);
        r.setUseAi(useAi);
        return r;
    }

    @Test
    void returnsCachedResultWithoutCallingDownstream() {
        RecommendationResponse cached = RecommendationResponse.builder()
                .items(List.of()).usedAi(false).build();
        when(valueOps.get(anyString())).thenReturn(cached);

        RecommendationResponse out = service.recommend(userId, request(false));

        assertThat(out).isSameAs(cached);
        verifyNoInteractions(userClient, menuClient);
    }

    @Test
    void ruleBasedWhenUseAiFalseDoesNotCallAi() {
        when(valueOps.get(anyString())).thenReturn(null);
        when(userClient.getMyHealth()).thenReturn(health(2000));
        when(menuClient.getItems(eq(restaurantId), anyInt()))
                .thenReturn(page(List.of(item("Salad", 400, 20))));

        RecommendationResponse out = service.recommend(userId, request(false));

        assertThat(out.isUsedAi()).isFalse();
        assertThat(out.getItems()).extracting(RecommendedItem::getName).containsExactly("Salad");
        verifyNoInteractions(aiRankingService);
        verify(logRepo).save(any());
    }

    @Test
    void usesAiOrderingWhenUseAiTrueAndAiSucceeds() {
        when(valueOps.get(anyString())).thenReturn(null);
        when(userClient.getMyHealth()).thenReturn(health(2000));
        MenuItemDto a = item("A", 400, 20);
        MenuItemDto b = item("B", 500, 30);
        when(menuClient.getItems(eq(restaurantId), anyInt())).thenReturn(page(List.of(a, b)));
        when(aiRankingService.rank(anyString()))
                .thenReturn(new AiResult(List.of(b.getId().toString(), a.getId().toString()), "vì lý do"));

        RecommendationResponse out = service.recommend(userId, request(true));

        assertThat(out.isUsedAi()).isTrue();
        assertThat(out.getAiExplanation()).isEqualTo("vì lý do");
        assertThat(out.getItems()).extracting(RecommendedItem::getName).containsExactly("B", "A");
    }

    @Test
    void fallsBackToRuleOrderWhenAiEmpty() {
        when(valueOps.get(anyString())).thenReturn(null);
        when(userClient.getMyHealth()).thenReturn(health(2000));
        when(menuClient.getItems(eq(restaurantId), anyInt()))
                .thenReturn(page(List.of(item("Salad", 400, 20))));
        when(aiRankingService.rank(anyString())).thenReturn(AiResult.empty());

        RecommendationResponse out = service.recommend(userId, request(true));

        assertThat(out.isUsedAi()).isFalse();
        assertThat(out.getItems()).hasSize(1);
    }
}
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `cd services/recommendation-service && mvn -q test -Dtest=RecommendationServiceTest`
Expected: FAIL (RecommendationService chưa tồn tại)

- [ ] **Step 3: `RedisConfig.java`** — RedisTemplate serialize JSON

```java
package com.nomnom.recommendation.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory cf) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(cf);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer(new ObjectMapper()
                .findAndRegisterModules()));
        return template;
    }
}
```

- [ ] **Step 4: `RecommendationService.java`**

```java
package com.nomnom.recommendation.service;

import com.nomnom.recommendation.ai.AiRankingService;
import com.nomnom.recommendation.ai.AiResult;
import com.nomnom.recommendation.ai.PromptBuilder;
import com.nomnom.recommendation.client.MenuClient;
import com.nomnom.recommendation.client.UserHealthClient;
import com.nomnom.recommendation.document.RecommendationLog;
import com.nomnom.recommendation.dto.*;
import com.nomnom.recommendation.repository.RecommendationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final int TOP_N = 3;
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final UserHealthClient userHealthClient;
    private final MenuClient menuClient;
    private final com.nomnom.recommendation.domain.RuleEngine ruleEngine;
    private final AiRankingService aiRankingService;
    private final PromptBuilder promptBuilder;
    private final RecommendationLogRepository logRepo;
    private final RedisTemplate<String, Object> redisTemplate;

    public RecommendationResponse recommend(UUID userId, RecommendationRequest req) {
        String cacheKey = "recommend:" + userId + ":" + req.getRestaurantId()
                + ":" + req.getMealType() + ":" + req.isUseAi();

        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached instanceof RecommendationResponse r) {
            log.info("Cache HIT {}", cacheKey);
            return r;
        }

        HealthDto health = userHealthClient.getMyHealth();
        PageResponse<MenuItemDto> menu = menuClient.getItems(req.getRestaurantId(), 100);
        List<MenuItemDto> candidates = menu.getContent() == null ? List.of() : menu.getContent();

        List<MenuItemDto> ranked = ruleEngine.filterAndRank(
                candidates, health.getTdee(), req.getMealType(), TOP_N);

        String explanation = null;
        boolean usedAi = false;
        if (req.isUseAi() && !ranked.isEmpty()) {
            AiResult ai = aiRankingService.rank(
                    promptBuilder.build(health.getTdee(), req.getMealType().name(), ranked));
            if (!ai.isEmpty()) {
                ranked = reorderByAi(ranked, ai.orderedItemIds());
                explanation = ai.explanation();
                usedAi = true;
            }
        }

        RecommendationResponse response = RecommendationResponse.builder()
                .items(ranked.stream().map(this::toRecommendedItem).toList())
                .aiExplanation(explanation)
                .usedAi(usedAi)
                .build();

        redisTemplate.opsForValue().set(cacheKey, response, CACHE_TTL);
        saveLog(userId, req, response);
        return response;
    }

    public Page<RecommendationLog> history(UUID userId, Pageable pageable) {
        return logRepo.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    private List<MenuItemDto> reorderByAi(List<MenuItemDto> ranked, List<String> orderedIds) {
        Map<String, MenuItemDto> byId = new LinkedHashMap<>();
        ranked.forEach(i -> byId.put(i.getId().toString(), i));
        List<MenuItemDto> result = new ArrayList<>();
        for (String id : orderedIds) {
            MenuItemDto item = byId.remove(id);
            if (item != null) {
                result.add(item);
            }
        }
        result.addAll(byId.values()); // món AI không nhắc tới giữ cuối
        return result;
    }

    private RecommendedItem toRecommendedItem(MenuItemDto i) {
        return RecommendedItem.builder()
                .itemId(i.getId()).name(i.getName()).calories(i.getCalories())
                .proteinG(i.getProteinG()).carbG(i.getCarbG()).fatG(i.getFatG())
                .price(i.getPrice())
                .reason(i.getCalories() + " kcal — phù hợp hạn mức bữa ăn")
                .build();
    }

    private void saveLog(UUID userId, RecommendationRequest req, RecommendationResponse resp) {
        try {
            logRepo.save(RecommendationLog.builder()
                    .userId(userId)
                    .restaurantId(req.getRestaurantId())
                    .mealType(req.getMealType().name())
                    .recommendedItemIds(resp.getItems().stream()
                            .map(it -> it.getItemId().toString()).toList())
                    .aiExplanation(resp.getAiExplanation())
                    .usedAi(resp.isUsedAi())
                    .createdAt(LocalDateTime.now())
                    .build());
        } catch (Exception ex) {
            log.warn("Không lưu được recommendation log: {}", ex.getMessage());
        }
    }
}
```

- [ ] **Step 5: Chạy test để xác nhận pass**

Run: `cd services/recommendation-service && mvn -q test -Dtest=RecommendationServiceTest`
Expected: PASS (4 test)

- [ ] **Step 6: Commit**

```bash
git add services/recommendation-service/src/main/java/com/nomnom/recommendation/service services/recommendation-service/src/main/java/com/nomnom/recommendation/config/RedisConfig.java services/recommendation-service/src/test/java/com/nomnom/recommendation/service
git commit -m "feat(recommendation-service): add RecommendationService with Redis cache and tests"
```

---

### Task 8: Controller + exception handler

Gateway đã inject `X-User-Id`. Controller đọc header này làm userId.

**Files:**
- Create: `SRC/controller/RecommendationController.java`
- Create: `SRC/exception/ErrorResponse.java`
- Create: `SRC/exception/GlobalExceptionHandler.java`

- [ ] **Step 1: `ErrorResponse.java`** (copy pattern từ menu-service)

```java
package com.nomnom.recommendation.exception;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ErrorResponse {
    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
}
```

- [ ] **Step 2: `GlobalExceptionHandler.java`** — thêm handler cho Feign lỗi → 503

```java
package com.nomnom.recommendation.exception;

import feign.FeignException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(FeignException.class)
    public ResponseEntity<ErrorResponse> handleFeign(FeignException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.SERVICE_UNAVAILABLE;
        return ResponseEntity.status(status).body(build(status, "Dịch vụ phụ thuộc không phản hồi", request));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex,
                                                          HttpServletRequest request) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .findFirst().orElse("Validation failed");
        return ResponseEntity.badRequest().body(build(HttpStatus.BAD_REQUEST, msg, request));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex, HttpServletRequest request) {
        return ResponseEntity.internalServerError()
                .body(build(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), request));
    }

    private ErrorResponse build(HttpStatus status, String message, HttpServletRequest request) {
        return ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(message)
                .path(request.getRequestURI())
                .build();
    }
}
```

- [ ] **Step 3: `RecommendationController.java`**

```java
package com.nomnom.recommendation.controller;

import com.nomnom.recommendation.document.RecommendationLog;
import com.nomnom.recommendation.dto.RecommendationRequest;
import com.nomnom.recommendation.dto.RecommendationResponse;
import com.nomnom.recommendation.service.RecommendationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @PostMapping
    public RecommendationResponse recommend(@RequestHeader("X-User-Id") UUID userId,
                                            @Valid @RequestBody RecommendationRequest request) {
        return recommendationService.recommend(userId, request);
    }

    @GetMapping("/history")
    public Page<RecommendationLog> history(@RequestHeader("X-User-Id") UUID userId,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "10") int size) {
        return recommendationService.history(userId,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }
}
```

- [ ] **Step 4: Compile + chạy toàn bộ test unit**

Run: `cd services/recommendation-service && mvn -q test`
Expected: BUILD SUCCESS — tất cả test (RuleEngine, AiRankingService, RecommendationService) PASS

- [ ] **Step 5: Commit**

```bash
git add services/recommendation-service/src/main/java/com/nomnom/recommendation/controller services/recommendation-service/src/main/java/com/nomnom/recommendation/exception
git commit -m "feat(recommendation-service): add REST controller and exception handling"
```

---

### Task 9: Config-server + verify tích hợp thủ công

**Files:**
- Modify: `infrastructure/config-server/src/main/resources/config/recommendation-service.yml`

- [ ] **Step 1: Cập nhật config** — thêm mongodb/redis/ai (giữ nguyên phần eureka/kafka nếu đã có)

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://mongo:mongo@localhost:27017/recommendation_logs?authSource=admin
    redis:
      host: localhost
      port: 6379
nomnom:
  ai:
    groq:
      api-key: "${GROQ_API_KEY:}"
      model: llama-3.3-70b-versatile
      base-url: https://api.groq.com/openai/v1
    gemini:
      api-key: "${GEMINI_API_KEY:}"
      model: gemini-2.0-flash
    order:
      - groq
      - gemini
    timeout-ms: 5000
```

- [ ] **Step 2: Khởi động hạ tầng + các service phụ thuộc**

Run:
```
docker compose -f docker-compose.infra.yml up -d
# start theo thứ tự: config-server, eureka-server, api-gateway, user-service, menu-service, recommendation-service
```
Expected: recommendation-service đăng ký được lên Eureka (http://localhost:8761 thấy `RECOMMENDATION-SERVICE`).

- [ ] **Step 3: Verify rule-based (không cần LLM key)**

Run (thay TOKEN + restaurantId thật, tạo trước qua flow auth/restaurant/menu):
```bash
curl -X POST http://localhost:8080/api/recommendations \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"restaurantId":"<uuid>","mealType":"LUNCH","useAi":false}'
```
Expected: HTTP 200, JSON có `items` (≤3 món, calo ≤ hạn mức), `usedAi:false`.

- [ ] **Step 4: Verify AI path (đặt env `GROQ_API_KEY` free trước khi start service)**

Run: như Step 3 nhưng `"useAi":true`.
Expected: `usedAi:true`, có `aiExplanation`. Nếu key sai/hết quota → tự fallback `usedAi:false` (không lỗi 500).

- [ ] **Step 5: Verify history + cache**

Run:
```bash
curl http://localhost:8080/api/recommendations/history -H "Authorization: Bearer $TOKEN"
```
Expected: 200, danh sách log phân trang. Gọi lại Step 3 lần 2 → log cho thấy "Cache HIT".

- [ ] **Step 6: Commit**

```bash
git add infrastructure/config-server/src/main/resources/config/recommendation-service.yml
git commit -m "feat(config-server): add recommendation-service mongodb/redis/ai config"
```

---

### Task 10: Bật lại feature flag frontend

**Files:**
- Modify: `fe/src/lib/features.ts`

- [ ] **Step 1: Bật `recommendations`**

Đổi `recommendations: false` → `recommendations: true` trong `fe/src/lib/features.ts`.

- [ ] **Step 2: Kiểm tra UI** — mở HomePage, panel gợi ý gọi `POST /api/recommendations` và hiển thị kết quả (đối chiếu `fe/src/api/recommendations.ts` — response hiện trả `MenuItem[]`; nếu backend trả `RecommendationResponse{items,...}` thì cập nhật type/parse ở `recommendations.ts` cho khớp: đọc `.items`).

- [ ] **Step 3: Commit**

```bash
git add fe/src/lib/features.ts fe/src/api/recommendations.ts
git commit -m "feat(fe): enable recommendation feature and align response type"
```

---

## Self-Review Notes

- **Spec coverage:** flow 8 bước (Task 7), 2 endpoint (Task 8), MongoDB log (Task 5), Redis cache TTL 1h (Task 7), Groq→Gemini→rule fallback (Task 6), config env-var keys (Task 9), test RuleEngine/AiRankingService/RecommendationService (Task 3/6/7), error handling Feign 503 + LLM fallback + Mongo warning (Task 7/8) — đều có task.
- **Type nhất quán:** `MenuItemDto`, `HealthDto`, `PageResponse`, `RecommendationResponse.items`, `AiResult.orderedItemIds()/explanation()`, `RuleEngine.filterAndRank(...)`, `AiRankingService.rank(String)` dùng đồng nhất giữa các task.
- **Giả định cần xác nhận khi execute:** (1) menu-service `/api/restaurants/{id}/items` trả `PageResponse` với field `content` — đã đối chiếu code menu-service. (2) Gateway forward header `Authorization` xuống downstream — nếu không, `UserHealthClient` sẽ nhận 401; khi đó chuyển sang truyền `X-User-Id` và thêm endpoint `/api/users/{id}/health` ở user-service. Kiểm tra ở Task 9 Step 3.
