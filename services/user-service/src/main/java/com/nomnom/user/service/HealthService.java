package com.nomnom.user.service;

import com.nomnom.user.dto.HealthResponse;
import com.nomnom.user.entity.ActivityLevel;
import com.nomnom.user.entity.Gender;
import com.nomnom.user.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class HealthService {

    public double calculateBmi(double weightKg, double heightCm) {
        double heightM = heightCm / 100.0;
        return weightKg / (heightM * heightM);
    }

    public String bmiCategory(double bmi) {
        if (bmi < 18.5) return "UNDERWEIGHT";
        if (bmi < 25) return "NORMAL";
        if (bmi < 30) return "OVERWEIGHT";
        return "OBESE";
    }

    public double calculateBmr(double weightKg, double heightCm, int age, Gender gender) {
        if (gender == Gender.MALE) {
            return 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age);
        }
        return 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age);
    }

    public double calculateTdee(double weightKg, double heightCm, int age, Gender gender, ActivityLevel activityLevel) {
        return calculateBmr(weightKg, heightCm, age, gender) * activityLevel.getMultiplier();
    }

    public HealthResponse calculateHealth(User user) {
        if (user.getHeight() == null || user.getWeight() == null || user.getAge() == null
                || user.getGender() == null || user.getActivityLevel() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Profile incomplete — height, weight, age, gender and activityLevel are required");
        }
        double bmi = calculateBmi(user.getWeight(), user.getHeight());
        double tdee = calculateTdee(user.getWeight(), user.getHeight(), user.getAge(), user.getGender(), user.getActivityLevel());
        return HealthResponse.builder()
                .bmi(bmi)
                .bmiCategory(bmiCategory(bmi))
                .tdee(tdee)
                .calorieGoal(tdee)
                .build();
    }
}
