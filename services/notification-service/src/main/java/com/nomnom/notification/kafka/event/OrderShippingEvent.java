package com.nomnom.notification.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Event payload khi shipper bắt đầu giao hàng.
 * Producer: order-service (topic: order.shipping)
 * Consumer: notification-service → gửi thông báo cho customer
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderShippingEvent {
    private UUID orderId;
    private UUID customerId;
}
