package com.nomnom.payment.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Published to topic {@code payment.failed} when a payment is rejected.
 * Consumed by Order Service to transition the order to CANCELLED.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentFailedEvent {

    private UUID orderId;

    /**
     * Human-readable explanation of the failure (e.g. "Mock payment failure").
     */
    private String reason;
}
