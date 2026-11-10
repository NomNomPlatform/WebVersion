package com.nomnom.menu.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Lưu trữ ảnh món ăn upload lên đĩa cứng dưới dạng file tĩnh.
 * Mặc định lưu vào ${nomnom.menu.upload-dir} (/app/uploads/menus).
 */
@Service
@Slf4j
public class MenuItemImageStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp"
    );

    private static final long MAX_FILE_SIZE = 5L * 1024L * 1024L; // 5 MB

    private final Path uploadDir;

    public MenuItemImageStorageService(
            @Value("${nomnom.menu.upload-dir:/app/uploads/menus}") String uploadDirPath
    ) {
        this.uploadDir = Paths.get(uploadDirPath).toAbsolutePath().normalize();
    }

    @PostConstruct
    void init() throws IOException {
        Files.createDirectories(uploadDir);
        log.info("Menu item upload dir = {}", uploadDir);
    }

    /**
     * Lưu file upload từ chủ nhà hàng, trả về URL tương đối (/api/items/images/<uuid>.<ext>).
     */
    public String save(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tệp ảnh trống hoặc không được cung cấp.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ảnh quá lớn — tối đa " + (MAX_FILE_SIZE / 1024 / 1024) + "MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Định dạng ảnh không được hỗ trợ: " + contentType);
        }
        String extension = switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };

        String filename = UUID.randomUUID() + extension;
        Path target = uploadDir.resolve(filename).normalize();
        if (!target.startsWith(uploadDir)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đường dẫn tệp không hợp lệ.");
        }

        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("Lỗi khi lưu ảnh món ăn: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khi lưu tệp ảnh: " + e.getMessage());
        }

        return "/api/items/images/" + filename;
    }

    /**
     * Load ảnh dưới dạng Resource để phục vụ HTTP GET.
     */
    public Resource loadAsResource(String filename) {
        if (filename.contains("/") || filename.contains("\\") || filename.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên tệp không hợp lệ.");
        }
        Path path = uploadDir.resolve(filename).normalize();
        if (!path.startsWith(uploadDir) || !Files.exists(path) || !Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ảnh.");
        }
        return new FileSystemResource(path);
    }

    /**
     * Xóa ảnh cũ khi món ăn cập nhật ảnh mới.
     */
    public void deleteIfLocalUrl(String imageUrl) {
        if (imageUrl == null) return;
        String prefix = "/api/items/images/";
        if (!imageUrl.startsWith(prefix)) return;
        String filename = imageUrl.substring(prefix.length());
        Path target = uploadDir.resolve(filename).normalize();
        if (!target.startsWith(uploadDir)) return;
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {}
    }
}

