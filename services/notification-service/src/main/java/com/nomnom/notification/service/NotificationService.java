package com.nomnom.notification.service;

import com.nomnom.notification.dto.NotificationResponse;
import com.nomnom.notification.entity.Notification;
import com.nomnom.notification.entity.NotificationType;
import com.nomnom.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Business logic cho Notification:
 * - Tạo notification mới (gọi bởi OrderEventConsumer)
 * - Lấy danh sách notification của user (phân trang, mới nhất trước)
 * - Đánh dấu đã đọc (chỉ chủ sở hữu mới được thực hiện)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /**
     * Tạo và lưu một notification mới vào DB.
     *
     * @param userId người nhận
     * @param title  tiêu đề ngắn
     * @param body   nội dung chi tiết
     * @param type   loại thông báo
     * @return entity đã được persist
     */
    @Transactional
    public Notification createNotification(UUID userId, String title, String body, NotificationType type) {
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .body(body)
                .type(type)
                .isRead(false)
                .build();
        Notification saved = notificationRepository.save(notification);
        log.info("Created notification [{}] for user {} — type={}", saved.getId(), userId, type);
        return saved;
    }

    /**
     * Lấy danh sách notification của user, sắp xếp mới nhất trước.
     *
     * @param userId   ID user lấy từ X-User-Id header
     * @param pageable tham số phân trang
     * @return trang kết quả dưới dạng DTO
     */
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotificationsForUser(UUID userId, Pageable pageable) {
        return notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(NotificationResponse::from);
    }

    /**
     * Đánh dấu notification là đã đọc.
     * Chỉ người nhận notification mới có quyền thực hiện.
     *
     * @param notificationId  ID của notification
     * @param requestingUserId ID user từ X-User-Id header (để kiểm tra ownership)
     * @throws ResponseStatusException 404 nếu không tìm thấy, 403 nếu không phải chủ sở hữu
     */
    @Transactional
    public void markAsRead(UUID notificationId, UUID requestingUserId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Notification not found: " + notificationId));

        if (!notification.getUserId().equals(requestingUserId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You do not have permission to mark this notification as read");
        }

        notification.setIsRead(true);
        notificationRepository.save(notification);
        log.info("Notification [{}] marked as read by user {}", notificationId, requestingUserId);
    }
}
