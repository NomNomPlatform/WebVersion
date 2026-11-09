package com.nomnom.recommendation.ai;

import com.nomnom.recommendation.domain.MealType;
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
        double quota = MealType.valueOf(mealType).getQuota();
        long mealTarget = Math.round(tdee * quota);
        return """
                Ban la chuyen gia dinh duong. Khach co TDEE ~ %.0f kcal/ngay.
                Khau phan khuyen nghi cho bua %s: %d kcal (= %.0f%% tong TDEE).
                Danh sach mon ung vien (da loc theo han muc calo):
                %s

                Hay xep hang toi da 3 mon phu hop nhat.
                Quy tac:
                - Uu tien mon co protein cao nhung khong vuot qua khau phan %d kcal.
                - Mot mon CHI dem ra xep hang doc lap, KHONG cong don nhieu mon.
                - Giai thich cua ban chi duoc nhan manh dinh duong/calo, KHONG dua
                  ra con so tong calo cua tat ca mon gop lai (tranh gay hieu nham).
                Tra ve DUY NHAT JSON hop le dang:
                {"orderedItemIds":["<id>","<id>","<id>"],"explanation":"<giai thich ngan tieng Viet>"}
                Chi dung id co trong danh sach tren.
                """.formatted(tdee, mealType, mealTarget, quota * 100, menuLines, mealTarget);
    }
}
