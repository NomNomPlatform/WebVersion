package com.nomnom.user.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.util.Utils;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.nomnom.user.dto.GoogleAuthRequest;
import com.nomnom.user.dto.LoginResponse;
import com.nomnom.user.entity.AuthProvider;
import com.nomnom.user.entity.Role;
import com.nomnom.user.entity.User;
import com.nomnom.user.repository.UserRepository;
import com.nomnom.user.security.JwtService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.UUID;

/**
 * Xử lý đăng nhập bằng Google.
 *
 * <p>Flow:
 * <ol>
 *   <li>FE (Google Identity Services) gọi Google, nhận về {@code id_token} (JWT do Google ký).</li>
 *   <li>FE POST {@code /api/auth/google} với {@code { idToken }}.</li>
 *   <li>Service verify chữ ký id_token qua Google public keys (không cần gọi Google lại).</li>
 *   <li>Nếu email đã tồn tại -> cập nhật avatar/providerId (nếu trước đó LOCAL).</li>
 *   <li>Nếu chưa có -> tạo user mới với role CUSTOMER, passwordHash = sentinel.</li>
 *   <li>Phát hành JWT nội bộ giống luồng email/password.</li>
 * </ol>
 *
 * <p>Không dùng thư viện Google OAuth client cũ nặng nề — chỉ {@code google-api-client}
 * nhẹ để gọi {@link GoogleIdTokenVerifier}. Khi client id chưa cấu hình, endpoint
 * vẫn được expose nhưng trả 503 để dễ debug môi trường thiếu env.
 */
@Service
@Slf4j
public class GoogleAuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final GoogleIdTokenVerifier verifier;
    private final boolean configured;

    public GoogleAuthService(
            UserRepository userRepository,
            JwtService jwtService,
            @Value("${google.client-id:}") String googleClientId
    ) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.configured = googleClientId != null && !googleClientId.isBlank();
        if (this.configured) {
            HttpTransport transport = Utils.getDefaultTransport();
            JsonFactory jsonFactory = GsonFactory.getDefaultInstance();
            this.verifier = new GoogleIdTokenVerifier.Builder(transport, jsonFactory)
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();
            log.info("Google OAuth configured for client-id ending with '{}'",
                    googleClientId.length() >= 6 ? googleClientId.substring(googleClientId.length() - 6) : "***");
        } else {
            this.verifier = null;
            log.warn("Google OAuth NOT configured (google.client-id is empty). "
                    + "Set GOOGLE_CLIENT_ID env var to enable /api/auth/google.");
        }
    }

    public LoginResponse authenticate(GoogleAuthRequest request) {
        if (!configured) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Google login chưa được cấu hình trên server (thiếu GOOGLE_CLIENT_ID).");
        }

        GoogleIdToken.Payload payload;
        try {
            GoogleIdToken idToken = verifier.verify(request.getIdToken());
            if (idToken == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Google id_token không hợp lệ hoặc đã hết hạn.");
            }
            payload = idToken.getPayload();
        } catch (GeneralSecurityException | IOException e) {
            log.warn("Google token verification failed", e);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Không xác thực được Google id_token: " + e.getMessage());
        }

        String email = payload.getEmail();
        boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
        if (email == null || email.isBlank() || !emailVerified) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Google account chưa xác thực email — không thể đăng nhập.");
        }

        final String googleSub = payload.getSubject();
        String nameFromPayload = (String) payload.get("name");
        final String fullName = (nameFromPayload == null || nameFromPayload.isBlank())
                ? email.split("@")[0]
                : nameFromPayload;
        final String picture = (String) payload.get("picture");

        User user = userRepository.findByProviderAndProviderId(AuthProvider.GOOGLE, googleSub)
                .or(() -> userRepository.findByEmail(email))
                .orElseGet(() -> User.builder()
                        .email(email)
                        .passwordHash(UserService.OAUTH_NO_PASSWORD)
                        .fullName(fullName)
                        .role(Role.CUSTOMER)
                        .provider(AuthProvider.GOOGLE)
                        .providerId(googleSub)
                        .avatarUrl(picture)
                        .build());

        // Gắn provider/providerId nếu user trước đó là LOCAL mà giờ link Google.
        if (user.getProvider() == null || user.getProvider() == AuthProvider.LOCAL) {
            user.setProvider(AuthProvider.GOOGLE);
        }
        if (user.getProviderId() == null || user.getProviderId().isBlank()) {
            user.setProviderId(googleSub);
        }
        if (picture != null && (user.getAvatarUrl() == null || user.getAvatarUrl().isBlank())) {
            user.setAvatarUrl(picture);
        }
        if (user.getCreatedAt() == null) {
            // id mới cho lần tạo đầu tiên
            user.setId(UUID.randomUUID());
        }
        // Nếu trước đó LOCAL chưa có passwordHash chuẩn (không xảy ra) — set sentinel
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            user.setPasswordHash(UserService.OAUTH_NO_PASSWORD);
        }

        user = userRepository.save(user);

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());
        return LoginResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}
