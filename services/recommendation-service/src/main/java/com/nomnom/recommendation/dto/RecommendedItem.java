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
    /**
     * Lý do gợi ý bằng tiếng Việt có dấu, đã cá nhân hoá theo TDEE/macro của user.
     * Generated bởi {@link com.nomnom.recommendation.service.RecommenderExplanationService}.
     */
    private String reason;
}
