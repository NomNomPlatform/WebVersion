package com.nomnom.payment.service;

import com.nomnom.payment.config.VNPayConfig;
import com.nomnom.payment.dto.PaymentRequest;
import com.nomnom.payment.dto.PaymentResponse;
import com.nomnom.payment.entity.Payment;
import com.nomnom.payment.entity.PaymentMethod;
import com.nomnom.payment.entity.PaymentStatus;
import com.nomnom.payment.exception.PaymentNotFoundException;
import com.nomnom.payment.exception.PaymentRefundException;
import com.nomnom.payment.kafka.PaymentEventPublisher;
import com.nomnom.payment.kafka.event.PaymentCompletedEvent;
import com.nomnom.payment.kafka.event.PaymentFailedEvent;
import com.nomnom.payment.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link PaymentService}.
 */
@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PaymentEventPublisher eventPublisher;

    @Mock
    private VNPayService vnPayService;

    @Mock
    private VNPayConfig vnPayConfig;

    @Captor
    private ArgumentCaptor<Payment> paymentCaptor;

    @Captor
    private ArgumentCaptor<PaymentCompletedEvent> completedCaptor;

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(paymentRepository, eventPublisher, vnPayService, vnPayConfig);
    }

    // -----------------------------------------------------------------------
    // Helper factories
    // -----------------------------------------------------------------------

    private Payment buildPending(UUID orderId, BigDecimal amount, PaymentMethod method) {
        return Payment.builder()
                .id(UUID.randomUUID())
                .orderId(orderId)
                .amount(amount)
                .status(PaymentStatus.PENDING)
                .paymentMethod(method)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private PaymentRequest buildRequest(UUID orderId, BigDecimal amount, String method) {
        PaymentRequest req = new PaymentRequest();
        req.setOrderId(orderId);
        req.setAmount(amount);
        req.setPaymentMethod(method);
        return req;
    }

    // -----------------------------------------------------------------------
    // processPayment — success path for CASH / CARD
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("processPayment: CASH payment auto-completes and publishes event")
    void processPayment_cash_success() {
        UUID orderId = UUID.randomUUID();
        BigDecimal amount = new BigDecimal("150000");

        Payment pending = buildPending(orderId, amount, PaymentMethod.CASH);
        Payment completed = Payment.builder()
                .id(pending.getId())
                .orderId(orderId)
                .amount(amount)
                .status(PaymentStatus.COMPLETED)
                .paymentMethod(PaymentMethod.CASH)
                .transactionId(UUID.randomUUID().toString())
                .createdAt(pending.getCreatedAt())
                .updatedAt(LocalDateTime.now())
                .build();

        when(paymentRepository.save(any(Payment.class)))
                .thenReturn(pending)
                .thenReturn(completed);

        PaymentResponse response = paymentService.processPayment(
                buildRequest(orderId, amount, "CASH"), "127.0.0.1");

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        verify(eventPublisher, times(1)).publishPaymentCompleted(any(PaymentCompletedEvent.class));
    }

    @Test
    @DisplayName("processPayment: VNPAY payment returns redirect URL and stays PENDING")
    void processPayment_vnpay_returnsUrl() {
        UUID orderId = UUID.randomUUID();
        BigDecimal amount = new BigDecimal("200000");

        Payment pending = buildPending(orderId, amount, PaymentMethod.VNPAY);
        when(paymentRepository.save(any(Payment.class))).thenReturn(pending);

        String mockUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?foo=bar";
        when(vnPayService.createPaymentUrl(any(UUID.class), any(BigDecimal.class), anyString(), anyString()))
                .thenReturn(mockUrl);

        PaymentResponse response = paymentService.processPayment(
                buildRequest(orderId, amount, "VNPAY"), "127.0.0.1");

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(response.getPaymentUrl()).isEqualTo(mockUrl);
        // Event should NOT be published yet for VNPay (it waits for callback/IPN)
        verify(eventPublisher, never()).publishPaymentCompleted(any());
        verify(eventPublisher, never()).publishPaymentFailed(any());
    }

    // -----------------------------------------------------------------------
    // getByOrderId
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("getByOrderId: returns payment when found")
    void getByOrderId_found() {
        UUID orderId = UUID.randomUUID();
        Payment payment = buildPending(orderId, new BigDecimal("50000"), PaymentMethod.CASH);
        payment.setStatus(PaymentStatus.COMPLETED);

        when(paymentRepository.findFirstByOrderIdOrderByCreatedAtDesc(orderId)).thenReturn(Optional.of(payment));

        PaymentResponse response = paymentService.getByOrderId(orderId);

        assertThat(response.getOrderId()).isEqualTo(orderId);
        assertThat(response.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
    }

    @Test
    @DisplayName("getByOrderId: throws 404 when not found")
    void getByOrderId_notFound_throws404() {
        UUID orderId = UUID.randomUUID();
        when(paymentRepository.findFirstByOrderIdOrderByCreatedAtDesc(orderId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.getByOrderId(orderId))
                .isInstanceOf(PaymentNotFoundException.class)
                .hasMessageContaining(orderId.toString());
    }

    // -----------------------------------------------------------------------
    // refundPayment
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("refundPayment: COMPLETED → REFUNDED")
    void refundPayment_completedToRefunded() {
        UUID paymentId = UUID.randomUUID();
        Payment completed = Payment.builder()
                .id(paymentId)
                .orderId(UUID.randomUUID())
                .amount(new BigDecimal("100000"))
                .status(PaymentStatus.COMPLETED)
                .paymentMethod(PaymentMethod.CARD)
                .transactionId(UUID.randomUUID().toString())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Payment refunded = Payment.builder()
                .id(paymentId)
                .orderId(completed.getOrderId())
                .amount(completed.getAmount())
                .status(PaymentStatus.REFUNDED)
                .paymentMethod(PaymentMethod.CARD)
                .transactionId(completed.getTransactionId())
                .createdAt(completed.getCreatedAt())
                .updatedAt(LocalDateTime.now())
                .build();

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(completed));
        when(paymentRepository.save(any(Payment.class))).thenReturn(refunded);

        PaymentResponse response = paymentService.refundPayment(paymentId);

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.REFUNDED);
    }

    @Test
    @DisplayName("refundPayment: PENDING payment → 409 Conflict")
    void refundPayment_pendingPayment_throws409() {
        UUID paymentId = UUID.randomUUID();
        Payment pending = buildPending(UUID.randomUUID(), new BigDecimal("60000"), PaymentMethod.CASH);
        pending.setId(paymentId);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> paymentService.refundPayment(paymentId))
                .isInstanceOf(PaymentRefundException.class)
                .hasMessageContaining("PENDING");
    }

    @Test
    @DisplayName("getAdminAnalytics: aggregates counts, amounts, and method breakdown")
    void getAdminAnalytics_aggregatesCorrectly() {
        Payment p1 = Payment.builder()
                .id(UUID.randomUUID())
                .orderId(UUID.randomUUID())
                .amount(new BigDecimal("120000"))
                .status(PaymentStatus.COMPLETED)
                .paymentMethod(PaymentMethod.VNPAY)
                .createdAt(LocalDateTime.now())
                .build();
        Payment p2 = Payment.builder()
                .id(UUID.randomUUID())
                .orderId(UUID.randomUUID())
                .amount(new BigDecimal("80000"))
                .status(PaymentStatus.COMPLETED)
                .paymentMethod(PaymentMethod.CASH)
                .createdAt(LocalDateTime.now())
                .build();
        Payment p3 = Payment.builder()
                .id(UUID.randomUUID())
                .orderId(UUID.randomUUID())
                .amount(new BigDecimal("50000"))
                .status(PaymentStatus.REFUNDED)
                .paymentMethod(PaymentMethod.CARD)
                .createdAt(LocalDateTime.now())
                .build();

        when(paymentRepository.findByCreatedAtGreaterThanEqual(any(LocalDateTime.class)))
                .thenReturn(java.util.List.of(p1, p2, p3));

        var res = paymentService.getAdminAnalytics(30);

        assertThat(res.days()).isEqualTo(30);
        assertThat(res.totalTransactions()).isEqualTo(3);
        assertThat(res.completedCount()).isEqualTo(2);
        assertThat(res.refundedCount()).isEqualTo(1);
        assertThat(res.totalCompletedAmount()).isEqualByComparingTo("200000");
        assertThat(res.totalRefundedAmount()).isEqualByComparingTo("50000");
        assertThat(res.methodBreakdown()).hasSize(3);
    }
}
