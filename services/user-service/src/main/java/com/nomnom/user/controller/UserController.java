package com.nomnom.user.controller;

import com.nomnom.user.dto.HealthResponse;
import com.nomnom.user.dto.PageResponse;
import com.nomnom.user.dto.UpdateProfileRequest;
import com.nomnom.user.dto.UserResponse;
import com.nomnom.user.entity.Role;
import com.nomnom.user.entity.User;
import com.nomnom.user.service.AvatarStorageService;
import com.nomnom.user.service.HealthService;
import com.nomnom.user.service.UserService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final HealthService healthService;
    private final AvatarStorageService avatarStorageService;

    /**
     * Thư mục chứa file avatar upload — khớp với
     * {@code AvatarStorageService#uploadDir}.
     */
    @Value("${nomnom.avatar.upload-dir:/app/uploads/avatars}")
    private String avatarUploadDirPath;

    private Path avatarUploadDir;

    @PostConstruct
    void initAvatarDir() {
        this.avatarUploadDir = Paths.get(avatarUploadDirPath).toAbsolutePath().normalize();
    }

    @GetMapping("/me")
    public UserResponse getMe(Authentication authentication) {
        User user = userService.findById(currentUserId(authentication));
        return userService.toResponse(user);
    }

    @PutMapping("/me")
    public UserResponse updateMe(Authentication authentication, @RequestBody UpdateProfileRequest request) {
        User user = userService.updateProfile(currentUserId(authentication), request);
        return userService.toResponse(user);
    }

    /**
     * Upload ảnh đại diện — multipart/form-data, field name = {@code file}.
     * Trả về {@code UserResponse} mới (trong đó {@code avatarUrl} là URL tương đối
     * trỏ tới endpoint static ở dưới).
     */
    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponse uploadMyAvatar(
            Authentication authentication,
            @RequestParam("file") MultipartFile file
    ) {
        UUID userId = currentUserId(authentication);
        User existing = userService.findById(userId);

        // Lưu file mới; nếu user cũ đang dùng ảnh local thì xóa để dọn disk.
        String oldLocalAvatar = existing.getAvatarUrl();
        String newAvatarUrl;
        try {
            newAvatarUrl = avatarStorageService.save(file);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }

        existing.setAvatarUrl(newAvatarUrl);
        User saved = userService.save(existing);

        // Cleanup file cũ nếu là file nội bộ (không phải URL từ Google).
        avatarStorageService.deleteIfLocalUrl(oldLocalAvatar);

        return userService.toResponse(saved);
    }

    /**
     * Serve file avatar tĩnh. Cố tình đặt dưới {@code /api/users/...} thay vì
     * {@code /static/...} để đi qua {@code SecurityConfig} nhưng là GET nên an toàn.
     * Áp dụng Content-Type theo extension, attach Cache-Control để browser cache 1 ngày.
     */
    @GetMapping("/avatars/{filename:.+}")
    public ResponseEntity<Resource> getAvatar(@PathVariable String filename) {
        // Path traversal guard — chỉ chấp nhận tên file không có phân cấp thư mục.
        if (filename.contains("/") || filename.contains("\\") || filename.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên tệp không hợp lệ.");
        }
        Path base = avatarUploadDir;
        Path path = base.resolve(filename).normalize();
        if (!path.startsWith(base) || !Files.exists(path) || !Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ảnh.");
        }
        Resource resource = new FileSystemResource(path);
        MediaType contentType = mediaTypeFor(filename);
        return ResponseEntity.ok()
                .contentType(contentType)
                .header("Cache-Control", "public, max-age=86400")
                .body(resource);
    }

    @GetMapping("/me/health")
    public HealthResponse getMyHealth(Authentication authentication) {
        User user = userService.findById(currentUserId(authentication));
        return healthService.calculateHealth(user);
    }

    @GetMapping("/admin/all")
    public PageResponse<UserResponse> getAllUsers(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        User currentUser = userService.findById(currentUserId(authentication));
        if (currentUser.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: role ADMIN required");
        }

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<User> usersPage = userService.findAll(pageable);
        Page<UserResponse> responsePage = usersPage.map(userService::toResponse);

        return PageResponse.from(responsePage);
    }

    private UUID currentUserId(Authentication authentication) {
        return (UUID) authentication.getPrincipal();
    }

    private static MediaType mediaTypeFor(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lower.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        return MediaType.IMAGE_JPEG;
    }
}
