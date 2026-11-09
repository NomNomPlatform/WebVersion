package com.nomnom.user.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Lưu trữ avatar upload lên disk dưới dạng file tĩnh.
 * <p>
 * Mặc định lưu vào {@code ${nomnom.avatar.upload-dir}} (mặc định
 * {@code /app/uploads/avatars}). Trong Docker, thư mục này được bind ra host
 * qua volume trong {@code docker-compose.yml} để dữ liệu không mất khi
 * restart container.
 */
@Service
@Slf4j
public class AvatarStorageService {

    /** Các định dạng ảnh cho phép — kiểm tra cả extension lẫn magic byte khi upload. */
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp"
    );

    private static final long MAX_FILE_SIZE = 5L * 1024L * 1024L; // 5 MB

    private final Path uploadDir;

    public AvatarStorageService(
            @Value("${nomnom.avatar.upload-dir:/app/uploads/avatars}") String uploadDirPath
    ) {
        this.uploadDir = Paths.get(uploadDirPath).toAbsolutePath().normalize();
    }

    @PostConstruct
    void init() throws IOException {
        Files.createDirectories(uploadDir);
        log.info("Avatar upload dir = {}", uploadDir);
    }

    /**
     * Lưu file upload từ user, trả về URL tương đối ({@code /api/users/avatars/<uuid>.<ext>})
     * để caller gán vào {@code user.avatarUrl}.
     */
    public String save(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Tệp ảnh trống hoặc không được cung cấp.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                    "Ảnh quá lớn — tối đa " + (MAX_FILE_SIZE / 1024 / 1024) + "MB."
            );
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException(
                    "Định dạng ảnh không được hỗ trợ: " + contentType
            );
        }
        String extension = switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
        // Giữ tên file là UUID để không leak userId/timestamp và an toàn với static serve.
        String filename = UUID.randomUUID() + extension;
        Path target = uploadDir.resolve(filename).normalize();
        // Chống path traversal: target phải nằm trong uploadDir.
        if (!target.startsWith(uploadDir)) {
            throw new IllegalArgumentException("Đường dẫn tệp không hợp lệ.");
        }
        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Lỗi khi lưu tệp ảnh: " + e.getMessage(), e);
        }
        return "/api/users/avatars/" + filename;
    }

    /** Xóa file cũ (khi user upload ảnh mới). Bỏ qua lỗi để không chặn flow upload. */
    public void deleteIfLocalUrl(String avatarUrl) {
        if (avatarUrl == null) return;
        String prefix = "/api/users/avatars/";
        if (!avatarUrl.startsWith(prefix)) return;
        String filename = avatarUrl.substring(prefix.length());
        Path target = uploadDir.resolve(filename).normalize();
        if (!target.startsWith(uploadDir)) return; // path traversal guard
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // không để lỗi cleanup chặn flow chính
        }
    }
}
