package com.nomnom.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Request body for POST /api/payments — initiates a payment for an order.
 */
@Data
public class PaymentRequest {

    @NotNull(message = "orderId is required")
    private UUID orderId;

    @NotNull(message = "amount is required")
    @DecimalMin(value = "0.01", message = "amount must be greater than 0")
    private BigDecimal amount;

    /**
     * Payment method: CASH | VNPAY | CARD.
     * Defaults to CASH if not provided.
     */
    private String paymentMethod = "CASH";
}
