package com.nomnom.recommendation.service;

import com.nomnom.recommendation.domain.MealType;
import com.nomnom.recommendation.dto.MenuItemDto;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Sinh câu giải thích tiếng Việt có dấu cho mỗi món được gợi ý,
 * cá nhân hoá theo TDEE/calorieGoal/profile của user — thay vì câu cứng
 * "X kcal - phu hop han muc bua an" trước đây.
 *
 * <p>Rule chung:
 * <ol>
 *   <li>So sánh calo món với {@code mealCalorieTarget} → mức độ vừa/khít.</li>
 *   <li>Đánh dấu giàu đạm khi protein &gt; 25g với món MAIN, hoặc &gt; 10g với món còn lại.</li>
 *   <li>So với median protein trong tập candidate → "giàu đạm hơn món cùng loại".</li>
 *   <li>Thêm tag phù hợp bữa (vd "ăn nhanh gọn cho bữa sáng").</li>
 * </ol>
 */
@Component
public class RecommenderExplanationService {

    /**
     * Trả về 1 câu giải thích ngắn, kết thúc bằng dấu chấm (nếu không rỗng).
     */
    public String explainForItem(MenuItemDto item,
                                 double mealCalorieTarget,
                                 MealType mealType,
                                 double medianProteinG) {
        List<String> parts = new ArrayList<>();
        Integer cal = item.getCalories();
        if (cal != null) {
            parts.add(formatCaloriePart(cal, mealCalorieTarget));
        }
        Double protein = item.getProteinG();
        if (protein != null) {
            String proteinNote = proteinNote(protein, medianProteinG);
            if (!proteinNote.isEmpty()) {
                parts.add(proteinNote);
            }
        }
        parts.add(mealTypeHint(mealType));
        // Lọc các phần rỗng, viết hoa chữ cái đầu, kết thúc bằng dấu chấm.
        String merged = String.join(", ", parts.stream().filter(s -> !s.isBlank()).toList());
        if (merged.isEmpty()) return "Phù hợp khẩu phần bữa ăn của bạn.";
        return Character.toUpperCase(merged.charAt(0)) + merged.substring(1) + ".";
    }

    /**
     * Sinh câu tổng cho cả response khi không có AI explanation
     * (AI fail / useAi=false). Nhỏ gọn, dựa trên data thật.
     */
    public String explainForResponse(double tdee,
                                    MealType mealType,
                                    double mealCalorieTarget,
                                    boolean aiTried) {
        StringBuilder sb = new StringBuilder();
        if (aiTried) {
            sb.append("AI tạm không khả dụng. ");
        }
        sb.append("Với TDEE ~ ")
          .append(Math.round(tdee))
          .append(" kcal/ngày, khẩu phần khuyến nghị cho bữa ")
          .append(mealTypeLabel(mealType))
          .append(" khoảng ")
          .append(Math.round(mealCalorieTarget))
          .append(" kcal.");
        return sb.toString();
    }

    // --- Helpers ---

    private String formatCaloriePart(int calories, double target) {
        double ratio = target <= 0 ? 0 : (calories / target) * 100.0;
        if (ratio < 30) {
            return String.format(Locale.ROOT, "%d kcal (nhẹ, ~%d%% khẩu phần bữa)",
                    Math.round(calories), Math.round(ratio));
        }
        if (ratio < 65) {
            return String.format(Locale.ROOT, "%d kcal (vừa ăn, ~%d%% khẩu phần bữa)",
                    Math.round(calories), Math.round(ratio));
        }
        if (ratio <= 100) {
            return String.format(Locale.ROOT, "%d kcal (vừa khít bữa, ~%d%%)",
                    Math.round(calories), Math.round(ratio));
        }
        return String.format(Locale.ROOT, "%d kcal (đầy đặn, ~%d%% — nhiều hơn khẩu phần)",
                Math.round(calories), Math.round(ratio));
    }

    private String proteinNote(double protein, double median) {
        if (protein >= 25) {
            return "giàu đạm (" + Math.round(protein) + "g protein)";
        }
        if (median > 0 && protein >= median * 1.2) {
            return "giàu đạm hơn món cùng nhà hàng";
        }
        if (protein < 8 && median > 0) {
            return "ít đạm — bạn có thể thêm món phụ";
        }
        return "";
    }

    private String mealTypeHint(MealType mealType) {
        return switch (mealType) {
            case BREAKFAST -> "phù hợp bữa sáng";
            case LUNCH     -> "phù hợp bữa trưa";
            case DINNER    -> "phù hợp bữa tối";
            case SNACK     -> "ăn nhẹ giữa buổi";
        };
    }

    private String mealTypeLabel(MealType mealType) {
        return switch (mealType) {
            case BREAKFAST -> "sáng";
            case LUNCH     -> "trưa";
            case DINNER    -> "tối";
            case SNACK     -> "phụ";
        };
    }

    /** Trả về tỉ lệ phân bổ calo cho bữa đó (vd 0.35 cho LUNCH). */
    public double mealQuota(MealType mealType) {
        return mealType.getQuota();
    }
}
