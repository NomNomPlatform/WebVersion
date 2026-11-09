package com.nomnom.notification.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Event payload khi đơn hàng sẵn sàng để giao.
 * Producer: order-service (topic: order.ready) — khi owner cập nhật status → READY
 * Consumer: notification-service → gửi thông báo cho customer
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderReadyEvent {
    private UUID orderId;
    private UUID customerId;
}
