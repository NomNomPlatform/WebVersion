package com.nomnom.user.service;

import com.nomnom.user.dto.LoginRequest;
import com.nomnom.user.dto.LoginResponse;
import com.nomnom.user.dto.RegisterRequest;
import com.nomnom.user.entity.AuthProvider;
import com.nomnom.user.entity.Role;
import com.nomnom.user.entity.User;
import com.nomnom.user.repository.UserRepository;
import com.nomnom.user.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public LoginResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(request.getRole() != null ? request.getRole() : Role.CUSTOMER)
                .provider(AuthProvider.LOCAL)
                .build();
        userRepository.save(user);

        return buildLoginResponse(user);
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (user.getProvider() == AuthProvider.GOOGLE
                && !UserService.OAUTH_NO_PASSWORD.equals(user.getPasswordHash())) {
            // user Google nhưng có passwordHash hợp lệ (không xảy ra) — vẫn check
        }
        if (UserService.OAUTH_NO_PASSWORD.equals(user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Tài khoản này được tạo bằng Google. Vui lòng đăng nhập bằng Google.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        return buildLoginResponse(user);
    }

    private LoginResponse buildLoginResponse(User user) {
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());
        return LoginResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}
