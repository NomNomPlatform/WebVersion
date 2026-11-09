package com.nomnom.notification.dto;

import com.nomnom.notification.entity.Notification;
import com.nomnom.notification.entity.NotificationType;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO cho Notification — dùng Java Record để immutable.
 * Expose qua REST endpoint: GET /api/notifications
 */
public record NotificationResponse(
        UUID id,
        UUID userId,
        String title,
        String body,
        NotificationType type,
        Boolean isRead,
        LocalDateTime createdAt
) {
    /**
     * Factory method chuyển đổi từ entity sang DTO.
     */
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getUserId(),
                notification.getTitle(),
                notification.getBody(),
                notification.getType(),
                notification.getIsRead(),
                notification.getCreatedAt()
        );
    }
}
