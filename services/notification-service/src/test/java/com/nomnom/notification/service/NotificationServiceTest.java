package com.nomnom.notification.service;

import com.nomnom.notification.dto.NotificationResponse;
import com.nomnom.notification.entity.Notification;
import com.nomnom.notification.entity.NotificationType;
import com.nomnom.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests cho NotificationService.
 * Kiểm tra ownership, pagination và error handling.
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationService notificationService;

    private UUID userId;
    private UUID anotherUserId;
    private UUID notificationId;
    private Notification sampleNotification;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        anotherUserId = UUID.randomUUID();
        notificationId = UUID.randomUUID();

        sampleNotification = Notification.builder()
                .id(notificationId)
                .userId(userId)
                .title("Test title")
                .body("Test body")
                .type(NotificationType.ORDER_CONFIRMED)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ─── createNotification ───────────────────────────────────────────────────

    @Test
    @DisplayName("createNotification → lưu và trả về notification đã persist")
    void createNotification_shouldSaveAndReturn() {
        when(notificationRepository.save(any(Notification.class))).thenReturn(sampleNotification);

        Notification result = notificationService.createNotification(
                userId, "Test title", "Test body", NotificationType.ORDER_CONFIRMED);

        assertThat(result).isNotNull();
        assertThat(result.getUserId()).isEqualTo(userId);
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    // ─── getNotificationsForUser ──────────────────────────────────────────────

    @Test
    @DisplayName("getNotificationsForUser → trả đúng page kết quả")
    void getNotificationsForUser_shouldReturnPagedResult() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Notification> mockPage = new PageImpl<>(List.of(sampleNotification), pageable, 1);
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable))
                .thenReturn(mockPage);

        Page<NotificationResponse> result = notificationService.getNotificationsForUser(userId, pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).userId()).isEqualTo(userId);
        assertThat(result.getContent().get(0).isRead()).isFalse();
        verify(notificationRepository).findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Test
    @DisplayName("getNotificationsForUser không có kết quả → trả empty page")
    void getNotificationsForUser_emptyResult_shouldReturnEmptyPage() {
        Pageable pageable = PageRequest.of(0, 10);
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable))
                .thenReturn(Page.empty(pageable));

        Page<NotificationResponse> result = notificationService.getNotificationsForUser(userId, pageable);

        assertThat(result.getTotalElements()).isEqualTo(0);
        assertThat(result.getContent()).isEmpty();
    }

    // ─── markAsRead ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("markAsRead → cập nhật isRead = true khi user hợp lệ")
    void markAsRead_withValidOwner_shouldSucceed() {
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(sampleNotification));
        when(notificationRepository.save(any(Notification.class))).thenReturn(sampleNotification);

        notificationService.markAsRead(notificationId, userId);

        assertThat(sampleNotification.getIsRead()).isTrue();
        verify(notificationRepository).save(sampleNotification);
    }

    @Test
    @DisplayName("markAsRead với notification không tồn tại → ném 404")
    void markAsRead_notFound_shouldThrow404() {
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markAsRead(notificationId, userId))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));

        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("markAsRead với user không phải chủ sở hữu → ném 403")
    void markAsRead_withWrongUser_shouldThrow403() {
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(sampleNotification));

        assertThatThrownBy(() -> notificationService.markAsRead(notificationId, anotherUserId))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        // Không được lưu khi không có quyền
        verify(notificationRepository, never()).save(any());
    }
}
