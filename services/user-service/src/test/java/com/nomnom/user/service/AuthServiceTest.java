package com.nomnom.user.service;

import com.nomnom.user.dto.LoginRequest;
import com.nomnom.user.dto.LoginResponse;
import com.nomnom.user.dto.RegisterRequest;
import com.nomnom.user.entity.AuthProvider;
import com.nomnom.user.entity.Role;
import com.nomnom.user.entity.User;
import com.nomnom.user.repository.UserRepository;
import com.nomnom.user.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private User existingUser;

    @BeforeEach
    void setUp() {
        existingUser = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .passwordHash("hashed")
                .fullName("Nguyen Van A")
                .role(Role.CUSTOMER)
                .build();
    }

    @Test
    void register_returnsToken_whenEmailNotTaken() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@example.com");
        request.setPassword("password123");
        request.setFullName("New User");
        request.setRole(Role.CUSTOMER);

        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("hashed-pw");
        when(jwtService.generateToken(any(), any(), any())).thenReturn("token");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LoginResponse response = authService.register(request);

        assertThat(response.getToken()).isEqualTo("token");
        assertThat(response.getEmail()).isEqualTo("new@example.com");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_setsProviderToLocal() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("local@example.com");
        request.setPassword("password123");
        request.setFullName("Local User");
        request.setRole(Role.CUSTOMER);

        when(userRepository.findByEmail("local@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed");
        when(jwtService.generateToken(any(), any(), any())).thenReturn("token");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            assertThat(u.getProvider()).isEqualTo(AuthProvider.LOCAL);
            assertThat(u.getProviderId()).isNull();
            return u;
        });

        authService.register(request);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_throws409_whenEmailAlreadyRegistered() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail(existingUser.getEmail());
        request.setPassword("password123");
        request.setFullName("Someone");
        request.setRole(Role.CUSTOMER);

        when(userRepository.findByEmail(existingUser.getEmail())).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.CONFLICT);

        verify(userRepository, never()).save(any());
    }

    @Test
    void login_returnsToken_whenCredentialsValid() {
        LoginRequest request = new LoginRequest();
        request.setEmail(existingUser.getEmail());
        request.setPassword("password123");

        when(userRepository.findByEmail(existingUser.getEmail())).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("password123", existingUser.getPasswordHash())).thenReturn(true);
        when(jwtService.generateToken(any(), any(), any())).thenReturn("token");

        LoginResponse response = authService.login(request);

        assertThat(response.getToken()).isEqualTo("token");
        assertThat(response.getUserId()).isEqualTo(existingUser.getId());
    }

    @Test
    void login_throws401_whenPasswordWrong() {
        LoginRequest request = new LoginRequest();
        request.setEmail(existingUser.getEmail());
        request.setPassword("wrong-password");

        when(userRepository.findByEmail(existingUser.getEmail())).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("wrong-password", existingUser.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.UNAUTHORIZED);
    }

    @Test
    void login_throws401_whenEmailNotFound() {
        LoginRequest request = new LoginRequest();
        request.setEmail("missing@example.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.UNAUTHORIZED);
    }

    @Test
    void login_throws401_whenUserComesFromGoogle_oauthNoPassword() {
        LoginRequest request = new LoginRequest();
        request.setEmail("google@example.com");
        request.setPassword("whatever");

        User googleUser = User.builder()
                .id(UUID.randomUUID())
                .email("google@example.com")
                .passwordHash(UserService.OAUTH_NO_PASSWORD)
                .fullName("Google User")
                .role(Role.CUSTOMER)
                .provider(AuthProvider.GOOGLE)
                .providerId("google-sub-id")
                .build();
        when(userRepository.findByEmail("google@example.com")).thenReturn(Optional.of(googleUser));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.UNAUTHORIZED)
                .hasMessageContaining("Google");
    }
}
