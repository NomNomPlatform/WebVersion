package com.nomnom.user.dto;

import com.nomnom.user.entity.ActivityLevel;
import com.nomnom.user.entity.AuthProvider;
import com.nomnom.user.entity.Gender;
import com.nomnom.user.entity.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class UserResponse {
    private UUID id;
    private String email;
    private String fullName;
    private Role role;
    private String avatarUrl;
    private AuthProvider provider;
    private Double height;
    private Double weight;
    private Integer age;
    private Gender gender;
    private ActivityLevel activityLevel;
    private LocalDateTime createdAt;
}
