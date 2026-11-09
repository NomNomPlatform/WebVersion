package com.nomnom.payment.dto;

import com.nomnom.payment.entity.PaymentMethod;
import com.nomnom.payment.entity.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO returned from all payment endpoints.
 */
@Data
@Builder
public class PaymentResponse {

    private UUID id;
    private UUID orderId;
    private BigDecimal amount;
    private PaymentStatus status;
    private PaymentMethod paymentMethod;

    /**
     * Transaction reference from the payment gateway.
     * - CASH/CARD: UUID string generated internally.
     * - VNPAY: vnp_TransactionNo returned by VNPay.
     */
    private String transactionId;

    /**
     * VNPay redirect URL — only populated when paymentMethod == VNPAY.
     * Frontend should redirect the browser to this URL to complete payment.
     */
    private String paymentUrl;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
