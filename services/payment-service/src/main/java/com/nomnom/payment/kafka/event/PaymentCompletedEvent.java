package com.nomnom.payment.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Published to topic {@code payment.completed} when a payment succeeds.
 * Consumed by Order Service to transition the order to CONFIRMED.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCompletedEvent {

    private UUID orderId;
    private UUID paymentId;
    private BigDecimal amount;
}
