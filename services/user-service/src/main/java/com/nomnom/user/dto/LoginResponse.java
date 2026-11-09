package com.nomnom.user.dto;

import com.nomnom.user.entity.Role;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class LoginResponse {
    private String token;
    private UUID userId;
    private String email;
    private Role role;
}
