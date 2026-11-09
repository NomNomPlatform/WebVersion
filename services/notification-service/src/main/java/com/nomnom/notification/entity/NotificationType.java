package com.nomnom.notification.entity;

/**
 * Loại thông báo tương ứng với từng Kafka order event.
 */
public enum NotificationType {
    ORDER_PLACED,
    ORDER_CONFIRMED,
    ORDER_READY,
    ORDER_SHIPPING,
    ORDER_DELIVERED,
    ORDER_CANCELLED
}
