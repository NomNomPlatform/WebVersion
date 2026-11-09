package com.nomnom.notification.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Event payload khi đơn hàng bị huỷ.
 * Producer: order-service (topic: order.cancelled)
 * Consumer: notification-service → gửi thông báo cho BOTH customer VÀ restaurantOwner
 *
 * IMPORTANT: restaurantOwnerId có thể null khi payment fail (order-service truyền null vào).
 * Consumer phải null-check trước khi gửi notification cho owner.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderCancelledEvent {
    private UUID orderId;
    private UUID customerId;
    private UUID restaurantOwnerId; // nullable — có thể null khi payment failed
    private String reason;
}
