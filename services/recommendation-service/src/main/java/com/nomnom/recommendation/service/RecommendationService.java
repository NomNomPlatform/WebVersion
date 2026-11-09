package com.nomnom.recommendation.service;

import com.nomnom.recommendation.ai.AiRankingService;
import com.nomnom.recommendation.ai.AiResult;
import com.nomnom.recommendation.ai.PromptBuilder;
import com.nomnom.recommendation.client.MenuClient;
import com.nomnom.recommendation.client.UserHealthClient;
import com.nomnom.recommendation.document.RecommendationLog;
import com.nomnom.recommendation.domain.MealType;
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
    private final RecommenderExplanationService explanationService;
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
        int candidatesCount = (int) menu.getTotalElements();

        MealType mealType = req.getMealType();
        double mealQuota = mealType.getQuota();
        double mealCalorieTarget = health.getCalorieGoal() * mealQuota;

        List<MenuItemDto> ranked = ruleEngine.filterAndRank(
                candidates, health.getTdee(), mealType, TOP_N);
        int matchedCount = ranked.size();

        // Tính median protein để cá nhân hoá reason per-item.
        double medianProtein = medianProtein(ranked);

        String explanation = null;
        boolean usedAi = false;
        if (req.isUseAi() && !ranked.isEmpty()) {
            AiResult ai = aiRankingService.rank(
                    promptBuilder.build(health.getTdee(), mealType.name(), ranked));
            if (!ai.isEmpty()) {
                ranked = reorderByAi(ranked, ai.orderedItemIds());
                explanation = ai.explanation();
                usedAi = true;
            }
        }

        // Fallback explanation khi AI không chạy/bị lỗi — để FE vẫn có câu trả lời.
        if (explanation == null) {
            explanation = explanationService.explainForResponse(
                    health.getTdee(), mealType, mealCalorieTarget,
                    req.isUseAi());
        }

        RecommendationContext context = RecommendationContext.builder()
                .tdee(health.getTdee())
                .calorieGoal(health.getCalorieGoal())
                .mealType(mealType.name())
                .mealQuota(mealQuota)
                .mealCalorieTarget(mealCalorieTarget)
                .matchedItemsCount(matchedCount)
                .candidatesCount(candidatesCount)
                .build();

        RecommendationResponse response = RecommendationResponse.builder()
                .items(ranked.stream()
                        .map(i -> toRecommendedItem(i, mealCalorieTarget, mealType, medianProtein))
                        .toList())
                .aiExplanation(explanation)
                .usedAi(usedAi)
                .context(context)
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
        result.addAll(byId.values());
        return result;
    }

    private RecommendedItem toRecommendedItem(MenuItemDto i,
                                              double mealCalorieTarget,
                                              MealType mealType,
                                              double medianProtein) {
        return RecommendedItem.builder()
                .itemId(i.getId())
                .name(i.getName())
                .calories(i.getCalories())
                .proteinG(i.getProteinG())
                .carbG(i.getCarbG())
                .fatG(i.getFatG())
                .price(i.getPrice())
                .reason(i.getCalories() == null
                        ? "Chưa rõ calo của món này."
                        : explanationService.explainForItem(
                                i, mealCalorieTarget, mealType, medianProtein))
                .build();
    }

    /** Median protein trong tập candidate đã lọc — dùng cho reason "giàu đạm hơn món cùng loại". */
    private static double medianProtein(List<MenuItemDto> ranked) {
        List<Double> values = ranked.stream()
                .map(MenuItemDto::getProteinG)
                .filter(v -> v != null)
                .sorted()
                .toList();
        if (values.isEmpty()) return 0.0;
        int n = values.size();
        return n % 2 == 1 ? values.get(n / 2)
                           : (values.get(n / 2 - 1) + values.get(n / 2)) / 2.0;
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
            log.warn("Cannot save recommendation log: {}", ex.getMessage());
        }
    }
}
