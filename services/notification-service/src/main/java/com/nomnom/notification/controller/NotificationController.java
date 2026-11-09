package com.nomnom.notification.controller;

import com.nomnom.notification.dto.NotificationResponse;
import com.nomnom.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.UUID;

/**
 * REST controller cho Notification Service.
 *
 * Endpoints:
 *   GET  /api/notifications           → lấy thông báo của user (phân trang)
 *   PUT  /api/notifications/{id}/read → đánh dấu đã đọc
 *
 * Authentication: Gateway inject X-User-Id header sau khi validate JWT.
 * Service không tự validate JWT.
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Notifications", description = "APIs quản lý thông báo người dùng")
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Lấy danh sách thông báo của user hiện tại (phân trang, mới nhất trước).
     *
     * @param userId lấy từ header X-User-Id (inject bởi API Gateway)
     * @param page   trang hiện tại (default: 0)
     * @param size   số phần tử mỗi trang (default: 20)
     * @return Page<NotificationResponse>
     */
    @GetMapping
    @Operation(summary = "Lấy danh sách thông báo của user hiện tại")
    public ResponseEntity<Page<NotificationResponse>> getNotifications(
            @Parameter(description = "User ID inject bởi API Gateway", required = true)
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        UUID userId = parseUserId(userIdHeader);
        Pageable pageable = PageRequest.of(page, size);
        Page<NotificationResponse> result = notificationService.getNotificationsForUser(userId, pageable);
        log.info("GET /api/notifications for user {} — page={}, size={}, total={}",
                userId, page, size, result.getTotalElements());
        return ResponseEntity.ok(result);
    }

    /**
     * Đánh dấu một notification là đã đọc.
     * Chỉ chủ sở hữu notification mới có quyền thực hiện (service sẽ kiểm tra).
     *
     * @param id           UUID của notification
     * @param userIdHeader user ID từ X-User-Id header
     */
    @PutMapping("/{id}/read")
    @Operation(summary = "Đánh dấu thông báo là đã đọc")
    public ResponseEntity<Void> markAsRead(
            @PathVariable UUID id,
            @Parameter(description = "User ID inject bởi API Gateway", required = true)
            @RequestHeader("X-User-Id") String userIdHeader) {

        UUID userId = parseUserId(userIdHeader);
        notificationService.markAsRead(id, userId);
        log.info("PUT /api/notifications/{}/read — marked by user {}", id, userId);
        return ResponseEntity.noContent().build();
    }

    // ──────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────

    /**
     * Parse UUID từ header string. Ném 400 nếu header thiếu hoặc không hợp lệ.
     */
    private UUID parseUserId(String userIdHeader) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "X-User-Id header is required");
        }
        try {
            return UUID.fromString(userIdHeader);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid X-User-Id format: " + userIdHeader);
        }
    }
}
