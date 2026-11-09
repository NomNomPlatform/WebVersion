package com.nomnom.recommendation.domain;

import com.nomnom.recommendation.dto.MenuItemDto;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RuleEngineTest {

    private final RuleEngine engine = new RuleEngine();

    private MenuItemDto item(String name, Integer calories, Double protein, boolean available) {
        MenuItemDto i = new MenuItemDto();
        i.setId(UUID.randomUUID());
        i.setName(name);
        i.setCalories(calories);
        i.setProteinG(protein);
        i.setIsAvailable(available);
        return i;
    }

    @Test
    void filtersOutItemsAboveQuota() {
        List<MenuItemDto> menu = List.of(
                item("Salad", 400, 20.0, true),
                item("Big Burger", 900, 30.0, true));

        List<MenuItemDto> result = engine.filterAndRank(menu, 2000, MealType.LUNCH, 3);

        assertThat(result).extracting(MenuItemDto::getName).containsExactly("Salad");
    }

    @Test
    void skipsUnavailableAndNullCalories() {
        List<MenuItemDto> menu = List.of(
                item("Available", 300, 20.0, true),
                item("Unavailable", 300, 20.0, false),
                item("NoCalories", null, 20.0, true));

        List<MenuItemDto> result = engine.filterAndRank(menu, 2000, MealType.LUNCH, 3);

        assertThat(result).extracting(MenuItemDto::getName).containsExactly("Available");
    }

    @Test
    void ranksClosestToQuotaThenHigherProteinFirstAndLimitsTopN() {
        List<MenuItemDto> menu = List.of(
                item("Low", 300, 10.0, true),
                item("NearHigherProtein", 680, 40.0, true),
                item("NearLowerProtein", 680, 15.0, true),
                item("Mid", 500, 25.0, true));

        List<MenuItemDto> result = engine.filterAndRank(menu, 2000, MealType.LUNCH, 2);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("NearHigherProtein");
        assertThat(result.get(1).getName()).isEqualTo("NearLowerProtein");
    }
}
