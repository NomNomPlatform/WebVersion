package com.nomnom.recommendation.domain;

import com.nomnom.recommendation.dto.MenuItemDto;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

@Component
public class RuleEngine {

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
}
