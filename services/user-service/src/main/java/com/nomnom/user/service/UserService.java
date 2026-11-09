package com.nomnom.user.service;

import com.nomnom.user.dto.UpdateProfileRequest;
import com.nomnom.user.dto.UserResponse;
import com.nomnom.user.entity.User;
import com.nomnom.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    /** Sentinel cho passwordHash của user đăng nhập qua OAuth (cột NOT NULL). */
    public static final String OAUTH_NO_PASSWORD = "{OAUTH_NO_PASSWORD}";

    private final UserRepository userRepository;

    public Page<User> findAll(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    public User findById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    /**
     * Lưu thẳng entity User. Dùng bởi các flow có nhiều thao tác (upload avatar...).
     */
    public User save(User user) {
        return userRepository.save(user);
    }

    public User updateProfile(UUID id, UpdateProfileRequest request) {
        User user = findById(id);
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        user.setHeight(request.getHeight());
        user.setWeight(request.getWeight());
        user.setAge(request.getAge());
        user.setGender(request.getGender());
        user.setActivityLevel(request.getActivityLevel());
        return userRepository.save(user);
    }

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .avatarUrl(user.getAvatarUrl())
                .provider(user.getProvider())
                .height(user.getHeight())
                .weight(user.getWeight())
                .age(user.getAge())
                .gender(user.getGender())
                .activityLevel(user.getActivityLevel())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
