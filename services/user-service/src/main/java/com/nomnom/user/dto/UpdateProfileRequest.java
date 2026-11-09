package com.nomnom.user.dto;

import com.nomnom.user.entity.ActivityLevel;
import com.nomnom.user.entity.Gender;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String fullName;
    private String avatarUrl;
    private Double height;
    private Double weight;
    private Integer age;
    private Gender gender;
    private ActivityLevel activityLevel;
}
