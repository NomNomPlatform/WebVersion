package com.nomnom.recommendation.dto;

import lombok.Data;

@Data
public class HealthDto {
    private double bmi;
    private String bmiCategory;
    private double tdee;
    private double calorieGoal;
}
