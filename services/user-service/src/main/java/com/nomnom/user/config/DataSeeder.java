package com.nomnom.user.config;

import com.nomnom.user.entity.Role;
import com.nomnom.user.entity.User;
import com.nomnom.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.findByEmail("admin@nomnom.com").isPresent()) {
            User admin = User.builder()
                    .id(UUID.fromString("00000000-0000-0000-0000-000000000001"))
                    .email("admin@nomnom.com")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .fullName("System Administrator")
                    .role(Role.ADMIN)
                    .build();
            userRepository.save(admin);
            log.info("✅ Admin account created: admin@nomnom.com / admin123");
        } else {
            log.info("ℹ️ Admin account already exists");
        }
    }
}
