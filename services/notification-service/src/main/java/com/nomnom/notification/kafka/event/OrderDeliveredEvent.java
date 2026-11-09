package com.nomnom.notification.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Event payload khi customer xác nhận đã nhận hàng.
 * Producer: order-service (topic: order.delivered)
 * Consumer: notification-service → gửi thông báo cho customer
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderDeliveredEvent {
    private UUID orderId;
    private UUID customerId;
}
