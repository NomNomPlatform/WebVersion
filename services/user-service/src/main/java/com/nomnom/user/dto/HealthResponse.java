package com.nomnom.user.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HealthResponse {
    private double bmi;
    private String bmiCategory;
    private double tdee;
    private double calorieGoal;
}
