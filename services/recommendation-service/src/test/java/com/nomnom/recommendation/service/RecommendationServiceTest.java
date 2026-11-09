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
                aiRankingService, new PromptBuilder(),
                new RecommenderExplanationService(),
                logRepo, redis);
    }

    private HealthDto health(double tdee) {
        HealthDto h = new HealthDto();
        h.setTdee(tdee);
        h.setCalorieGoal(tdee);
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
        p.setTotalElements(items.size());
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
                .thenReturn(new AiResult(List.of(b.getId().toString(), a.getId().toString()), "vi ly do"));

        RecommendationResponse out = service.recommend(userId, request(true));

        assertThat(out.isUsedAi()).isTrue();
        assertThat(out.getAiExplanation()).isEqualTo("vi ly do");
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
