package com.nomnom.notification.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Event payload khi đơn hàng được xác nhận (sau khi thanh toán thành công).
 * Producer: order-service (topic: order.confirmed)
 * Consumer: notification-service → gửi thông báo cho customer
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderConfirmedEvent {
    private UUID orderId;
    private UUID customerId;
}
