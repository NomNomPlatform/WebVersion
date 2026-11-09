package com.nomnom.user.service;

import com.nomnom.user.entity.ActivityLevel;
import com.nomnom.user.entity.Gender;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class HealthServiceTest {

    private final HealthService healthService = new HealthService();

    @Test
    void calculateBmi_returnsCorrectValue_forNormalWeight() {
        double bmi = healthService.calculateBmi(70, 175);
        assertThat(bmi).isCloseTo(22.86, within(0.01));
    }

    @Test
    void calculateBmi_returnsCorrectValue_forUnderweight() {
        double bmi = healthService.calculateBmi(45, 170);
        assertThat(bmi).isCloseTo(15.57, within(0.01));
    }

    @Test
    void calculateBmi_returnsCorrectValue_forObese() {
        double bmi = healthService.calculateBmi(110, 175);
        assertThat(bmi).isCloseTo(35.92, within(0.01));
    }

    @Test
    void calculateTdee_returnsCorrectValue_forMale() {
        double tdee = healthService.calculateTdee(70, 175, 30, Gender.MALE, ActivityLevel.SEDENTARY);
        // BMR = 88.362 + 13.397*70 + 4.799*175 - 5.677*30 = 1695.667
        assertThat(tdee).isCloseTo(1695.667 * 1.2, within(0.5));
    }

    @Test
    void calculateTdee_returnsCorrectValue_forFemale() {
        double tdee = healthService.calculateTdee(60, 165, 25, Gender.FEMALE, ActivityLevel.MODERATE);
        // BMR = 447.593 + 9.247*60 + 3.098*165 - 4.330*25 = 1405.333
        assertThat(tdee).isCloseTo(1405.333 * 1.55, within(0.5));
    }
}
