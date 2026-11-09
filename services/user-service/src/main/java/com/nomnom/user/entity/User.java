package com.nomnom.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    /**
     * BCrypt hash. Đối với user đăng nhập qua Google, cột này lưu chuỗi sentinel
     * rỗng (GoogleUserService sẽ set) vì schema hiện không cho phép null.
     */
    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    /**
     * URL ảnh đại diện.
     * <p>
     * Có thể là:
     * <ul>
     *   <li>URL tuyệt đối do Google OAuth trả về (https://lh3.googleusercontent.com/…)</li>
     *   <li>URL tương đối do user upload qua {@code POST /api/users/me/avatar}
     *       (vd {@code /api/users/avatars/&lt;uuid&gt;.jpg})</li>
     * </ul>
     * <p>
     * Cột trong PostgreSQL là {@code TEXT}, không dùng {@code @Lob}: Hibernate 6 +
     * PostgreSQL JDBC sẽ map {@code @Lob} sang CLOB/OID và gọi {@code getClob()},
     * không tương thích với cột TEXT thường — gây lỗi
     * {@code Bad value for type long} khi đọc URL Google.
     */
    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    /** Nguồn đăng ký: LOCAL (email/password) hoặc GOOGLE (OAuth). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AuthProvider provider = AuthProvider.LOCAL;

    /** ID từ provider (vd Google sub) — null với user LOCAL. */
    @Column(length = 255)
    private String providerId;

    private Double height;

    private Double weight;

    private Integer age;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    private ActivityLevel activityLevel;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
