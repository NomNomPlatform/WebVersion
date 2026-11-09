package com.nomnom.recommendation.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class RecommendationResponse {
    private List<RecommendedItem> items;
    /** Giải thích tổng từ AI — null khi usedAi=false hoặc AI skip. */
    private String aiExplanation;
    /** True nếu top-3 đã được AI sắp xếp lại + có explanation. */
    private boolean usedAi;
    /** Thông tin cá nhân hoá: TDEE, target cho bữa đã chọn, tổng calo trả về... */
    private RecommendationContext context;
}
