package com.nomnom.recommendation.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Bối cảnh cá nhân hoá kèm theo mỗi response, để FE hiển thị
 * "TDEE của bạn → calorieTarget cho bữa đã chọn → món này chiếm bao nhiêu %"
 * mà không phải tự tính quota (tránh FE/BE lệch khi đổi tỉ lệ bữa ăn).
 */
@Data
@Builder
public class RecommendationContext {
    /** TDEE lấy từ /users/me/health (kcal/ngày). */
    private double tdee;
    /** Mục tiêu calo mục tiêu sau khi trừ/ha thêm theo goal (kcal/ngày). */
    private double calorieGoal;
    /** Tên bữa đã chọn: BREAKFAST/LUNCH/DINNER/SNACK. */
    private String mealType;
    /** Tỉ lệ phân bổ calo cho bữa đó (vd LUNCH=0.35). */
    private double mealQuota;
    /** Hạn mức calo cho bữa đó = calorieGoal * mealQuota. */
    private double mealCalorieTarget;
    /** Số món ứng viên đã được rule engine lọc xong (sau filter & rank). */
    private int matchedItemsCount;
    /** Tổng số món trong menu của nhà hàng (trước khi lọc). */
    private int candidatesCount;
}
