package com.nomnom.notification.kafka;

import com.nomnom.notification.entity.NotificationType;
import com.nomnom.notification.kafka.event.OrderCancelledEvent;
import com.nomnom.notification.kafka.event.OrderConfirmedEvent;
import com.nomnom.notification.kafka.event.OrderPlacedEvent;
import com.nomnom.notification.kafka.event.OrderReadyEvent;
import com.nomnom.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests cho OrderEventConsumer.
 * Kiểm tra logic dispatch đúng người nhận và xử lý edge cases.
 */
@ExtendWith(MockitoExtension.class)
class OrderEventConsumerTest {

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private OrderEventConsumer consumer;

    private UUID orderId;
    private UUID customerId;
    private UUID restaurantId;
    private UUID restaurantOwnerId;

    @BeforeEach
    void setUp() {
        orderId = UUID.randomUUID();
        customerId = UUID.randomUUID();
        restaurantId = UUID.randomUUID();
        restaurantOwnerId = UUID.randomUUID();
    }

    // ─── order.placed ────────────────────────────────────────────────────────

    @Test
    @DisplayName("order.placed → tạo notification cho restaurantOwner")
    void handleOrderPlaced_shouldNotifyOwner() {
        OrderPlacedEvent event = OrderPlacedEvent.builder()
                .orderId(orderId)
                .customerId(customerId)
                .restaurantId(restaurantId)
                .restaurantOwnerId(restaurantOwnerId)
                .totalAmount(new BigDecimal("150000"))
                .build();

        consumer.handleOrderPlaced(event);

        verify(notificationService, times(1)).createNotification(
                eq(restaurantOwnerId),
                eq("Đơn hàng mới"),
                contains(orderId.toString()),
                eq(NotificationType.ORDER_PLACED)
        );
        // Không gửi cho customer
        verify(notificationService, never()).createNotification(eq(customerId), any(), any(), any());
    }

    @Test
    @DisplayName("order.placed thiếu restaurantOwnerId → không gọi createNotification, không crash")
    void handleOrderPlaced_missingOwnerId_shouldNotCrash() {
        OrderPlacedEvent event = OrderPlacedEvent.builder()
                .orderId(orderId)
                .customerId(customerId)
                .restaurantId(restaurantId)
                .restaurantOwnerId(null) // edge case
                .totalAmount(new BigDecimal("150000"))
                .build();

        // Không nên throw exception
        consumer.handleOrderPlaced(event);

        // Không gọi bất kỳ notification nào
        verify(notificationService, never()).createNotification(any(), any(), any(), any());
    }

    // ─── order.confirmed ─────────────────────────────────────────────────────

    @Test
    @DisplayName("order.confirmed → tạo notification cho customer")
    void handleOrderConfirmed_shouldNotifyCustomer() {
        OrderConfirmedEvent event = OrderConfirmedEvent.builder()
                .orderId(orderId)
                .customerId(customerId)
                .build();

        consumer.handleOrderConfirmed(event);

        verify(notificationService, times(1)).createNotification(
                eq(customerId),
                eq("Đơn hàng đã được xác nhận"),
                contains(orderId.toString()),
                eq(NotificationType.ORDER_CONFIRMED)
        );
    }

    // ─── order.ready ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("order.ready → tạo notification cho customer")
    void handleOrderReady_shouldNotifyCustomer() {
        OrderReadyEvent event = OrderReadyEvent.builder()
                .orderId(orderId)
                .customerId(customerId)
                .build();

        consumer.handleOrderReady(event);

        verify(notificationService, times(1)).createNotification(
                eq(customerId),
                eq("Đơn hàng đã sẵn sàng!"),
                contains(orderId.toString()),
                eq(NotificationType.ORDER_READY)
        );
    }

    // ─── order.cancelled ─────────────────────────────────────────────────────

    @Test
    @DisplayName("order.cancelled → tạo 2 notifications (customer + owner)")
    void handleOrderCancelled_shouldNotifyBoth() {
        OrderCancelledEvent event = OrderCancelledEvent.builder()
                .orderId(orderId)
                .customerId(customerId)
                .restaurantOwnerId(restaurantOwnerId)
                .reason("Hết nguyên liệu")
                .build();

        consumer.handleOrderCancelled(event);

        verify(notificationService, times(1)).createNotification(
                eq(customerId),
                eq("Đơn hàng đã bị huỷ"),
                contains(orderId.toString()),
                eq(NotificationType.ORDER_CANCELLED)
        );
        verify(notificationService, times(1)).createNotification(
                eq(restaurantOwnerId),
                eq("Đơn hàng bị huỷ"),
                contains(orderId.toString()),
                eq(NotificationType.ORDER_CANCELLED)
        );
        // Tổng: 2 lần gọi
        verify(notificationService, times(2)).createNotification(any(), any(), any(), any());
    }

    @Test
    @DisplayName("order.cancelled thiếu restaurantOwnerId (payment failed) → chỉ notify customer, không crash")
    void handleOrderCancelled_missingOwnerId_shouldOnlyNotifyCustomer() {
        OrderCancelledEvent event = OrderCancelledEvent.builder()
                .orderId(orderId)
                .customerId(customerId)
                .restaurantOwnerId(null) // payment failure scenario
                .reason("Thanh toán thất bại")
                .build();

        consumer.handleOrderCancelled(event);

        // Chỉ gửi cho customer
        verify(notificationService, times(1)).createNotification(
                eq(customerId),
                eq("Đơn hàng đã bị huỷ"),
                any(),
                eq(NotificationType.ORDER_CANCELLED)
        );
        // Không gửi thêm cho bất kỳ ai khác
        verify(notificationService, times(1)).createNotification(any(), any(), any(), any());
    }
}
