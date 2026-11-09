package com.nomnom.notification.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Event payload khi customer đặt hàng thành công.
 * Producer: order-service (topic: order.placed)
 * Consumer: notification-service → gửi thông báo cho restaurantOwner
 *
 * IMPORTANT: restaurantOwnerId có thể null trong một số edge case.
 * Consumer phải kiểm tra null trước khi gửi notification cho owner.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderPlacedEvent {
    private UUID orderId;
    private UUID customerId;
    private UUID restaurantId;
    private UUID restaurantOwnerId;
    private BigDecimal totalAmount;
}
