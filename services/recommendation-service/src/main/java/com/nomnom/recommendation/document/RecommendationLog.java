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
