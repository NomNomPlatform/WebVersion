package com.nomnom.user.controller;

import com.nomnom.user.dto.UserResponse;
import com.nomnom.user.entity.Role;
import com.nomnom.user.security.JwtService;
import com.nomnom.user.security.SecurityConfig;
import com.nomnom.user.service.AvatarStorageService;
import com.nomnom.user.service.HealthService;
import com.nomnom.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@Import({SecurityConfig.class, JwtService.class})
@TestPropertySource(properties = {
        "jwt.secret=test_secret_key_for_unit_tests_min_32_chars_long",
        "jwt.expiration=86400000"
})
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private UserService userService;

    @MockBean
    private HealthService healthService;

    @MockBean
    private AvatarStorageService avatarStorageService;

    @Test
    void getMe_returns401_whenNoToken() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getMe_returns200_whenValidToken() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId, "user@example.com", Role.CUSTOMER);

        when(userService.findById(userId)).thenReturn(null);
        when(userService.toResponse(any())).thenReturn(UserResponse.builder()
                .id(userId).email("user@example.com").fullName("User").role(Role.CUSTOMER).build());

        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }
}
