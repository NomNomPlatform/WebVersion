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
