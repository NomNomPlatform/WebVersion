package com.nomnom.payment.dto;

import com.nomnom.payment.entity.PaymentMethod;
import com.nomnom.payment.entity.PaymentStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Thống kê giao dịch thanh toán toàn hệ thống cho Admin.
 */
public record PaymentAnalyticsResponse(
        int days,
        long totalTransactions,
        long completedCount,
        long refundedCount,
        long failedCount,
        long pendingCount,
        BigDecimal totalCompletedAmount,
        BigDecimal totalRefundedAmount,
        List<PaymentMethodStat> methodBreakdown,
        Map<PaymentStatus, Long> statusBreakdown
) {
    public record PaymentMethodStat(
            PaymentMethod method,
            long count,
            BigDecimal amount
    ) {}
}

