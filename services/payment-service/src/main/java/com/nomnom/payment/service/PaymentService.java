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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * Core business logic for the Payment Service.
 *
 * <h3>Payment method routing:</h3>
 * <ul>
 *   <li><b>CASH</b> — Tự động COMPLETED ngay, publish event, trả về status COMPLETED.</li>
 *   <li><b>CARD</b> — Mock 100% success (cho mục đích demo), publish event ngay.</li>
 *   <li><b>VNPAY</b> — Lưu PENDING, tạo URL redirect VNPay. Chưa publish event.
 *       Event chỉ được publish SAU KHI VNPay callback về {@code processVNPayCallback}.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentEventPublisher eventPublisher;
    private final VNPayService vnPayService;
    private final VNPayConfig vnPayConfig;

    // -----------------------------------------------------------------------
    // Process payment — POST /api/payments
    // -----------------------------------------------------------------------

    /**
     * Tạo Payment record và xử lý theo phương thức thanh toán.
     *
     * @param request  orderId + amount + paymentMethod
     * @param clientIp IP của client (cần cho VNPay)
     * @return PaymentResponse — có trường {@code paymentUrl} nếu là VNPAY
     */
    @Transactional
    public PaymentResponse processPayment(PaymentRequest request, String clientIp) {
        log.info("[PaymentService] Processing payment orderId={}, amount={}, method={}",
                request.getOrderId(), request.getAmount(), request.getPaymentMethod());

        PaymentMethod method = parseMethod(request.getPaymentMethod());

        // Lưu Payment PENDING
        Payment payment = Payment.builder()
                .orderId(request.getOrderId())
                .amount(request.getAmount())
                .status(PaymentStatus.PENDING)
                .paymentMethod(method)
                .build();
        payment = paymentRepository.save(payment);

        return switch (method) {
            case CASH -> processCash(payment);
            case CARD -> processCard(payment);
            case VNPAY -> processVNPay(payment, clientIp);
        };
    }

    // ── CASH: tự động COMPLETED ──────────────────────────────────────────
    private PaymentResponse processCash(Payment payment) {
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setTransactionId(UUID.randomUUID().toString());
        payment = paymentRepository.save(payment);

        log.info("[PaymentService] CASH payment auto-completed — paymentId={}", payment.getId());
        eventPublisher.publishPaymentCompleted(
                PaymentCompletedEvent.builder()
                        .orderId(payment.getOrderId())
                        .paymentId(payment.getId())
                        .amount(payment.getAmount())
                        .build());
        return toResponse(payment, null);
    }

    // ── CARD: mock 100% success (demo) ──────────────────────────────────
    private PaymentResponse processCard(Payment payment) {
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setTransactionId(UUID.randomUUID().toString());
        payment = paymentRepository.save(payment);

        log.info("[PaymentService] CARD payment mock-completed — paymentId={}", payment.getId());
        eventPublisher.publishPaymentCompleted(
                PaymentCompletedEvent.builder()
                        .orderId(payment.getOrderId())
                        .paymentId(payment.getId())
                        .amount(payment.getAmount())
                        .build());
        return toResponse(payment, null);
    }

    // ── VNPAY: tạo URL redirect, chưa publish event ─────────────────────
    private PaymentResponse processVNPay(Payment payment, String clientIp) {
        String orderInfo = "Thanh toan don hang " + payment.getOrderId();
        String paymentUrl = vnPayService.createPaymentUrl(
                payment.getId(), payment.getAmount(), clientIp, orderInfo);

        log.info("[PaymentService] VNPAY URL created — paymentId={}", payment.getId());
        // Trả về PENDING + paymentUrl để frontend redirect
        return toResponse(payment, paymentUrl);
    }

    // -----------------------------------------------------------------------
    // VNPay Callback — nhận kết quả từ VNPay sau khi user thanh toán
    // -----------------------------------------------------------------------

    /**
     * Xử lý callback redirect từ VNPay (người dùng được redirect về sau khi thanh toán).
     * <p>
     * Xác thực chữ ký → cập nhật Payment status → publish Kafka event.
     *
     * @param params Query params từ VNPay callback URL
     * @return URL trang kết quả trên Frontend để redirect người dùng
     */
    @Transactional
    public String processVNPayCallback(Map<String, String> params) {
        String txnRef = params.get("vnp_TxnRef"); // chính là paymentId
        String responseCode = params.get("vnp_ResponseCode");
        String vnpTransactionNo = params.get("vnp_TransactionNo");

        log.info("[PaymentService] VNPay callback received — txnRef={}, responseCode={}", txnRef, responseCode);

        // Xác thực chữ ký
        if (!vnPayService.verifyCallback(params)) {
            log.error("[PaymentService] Invalid VNPay signature for txnRef={}", txnRef);
            return buildFrontendUrl("failed", null, "Invalid signature");
        }

        // Tìm Payment record
        Payment payment;
        try {
            payment = paymentRepository.findById(UUID.fromString(txnRef))
                    .orElseThrow(() -> new PaymentNotFoundException("paymentId=" + txnRef));
        } catch (Exception e) {
            log.error("[PaymentService] Payment not found for txnRef={}", txnRef);
            return buildFrontendUrl("failed", null, "Payment not found");
        }

        // Chống xử lý trùng lặp — nếu đã không còn PENDING thì bỏ qua
        if (payment.getStatus() != PaymentStatus.PENDING) {
            log.warn("[PaymentService] Payment {} already processed (status={})", payment.getId(), payment.getStatus());
            String status = payment.getStatus() == PaymentStatus.COMPLETED ? "success" : "failed";
            return buildFrontendUrl(status, payment.getOrderId().toString(), null);
        }

        if ("00".equals(responseCode)) {
            // Thanh toán thành công
            payment.setStatus(PaymentStatus.COMPLETED);
            payment.setTransactionId(vnpTransactionNo);
            paymentRepository.save(payment);

            log.info("[PaymentService] VNPay payment COMPLETED — paymentId={}, vnpTxnNo={}", payment.getId(), vnpTransactionNo);
            eventPublisher.publishPaymentCompleted(
                    PaymentCompletedEvent.builder()
                            .orderId(payment.getOrderId())
                            .paymentId(payment.getId())
                            .amount(payment.getAmount())
                            .build());

            return buildFrontendUrl("success", payment.getOrderId().toString(), null);
        } else {
            // Thanh toán thất bại hoặc bị hủy
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);

            String reason = mapVNPayErrorCode(responseCode);
            log.warn("[PaymentService] VNPay payment FAILED — paymentId={}, responseCode={}, reason={}",
                    payment.getId(), responseCode, reason);
            eventPublisher.publishPaymentFailed(
                    PaymentFailedEvent.builder()
                            .orderId(payment.getOrderId())
                            .reason(reason)
                            .build());

            return buildFrontendUrl("failed", payment.getOrderId().toString(), reason);
        }
    }

    /**
     * Xử lý IPN (Instant Payment Notification) từ VNPay server-to-server.
     * VNPay gọi IPN bất đồng bộ để thông báo kết quả giao dịch, bất kể user có quay lại hay không.
     * Trả về JSON format theo tài liệu VNPay.
     *
     * @param params Query params từ VNPay IPN call
     * @return Map JSON response cho VNPay: {"RspCode":"00","Message":"Confirm Success"}
     */
    @Transactional
    public Map<String, String> processVNPayIPN(Map<String, String> params) {
        String txnRef = params.get("vnp_TxnRef");
        String responseCode = params.get("vnp_ResponseCode");
        String vnpTransactionNo = params.get("vnp_TransactionNo");

        log.info("[PaymentService] VNPay IPN received — txnRef={}, responseCode={}", txnRef, responseCode);

        if (!vnPayService.verifyCallback(params)) {
            log.error("[PaymentService] Invalid VNPay IPN signature for txnRef={}", txnRef);
            return Map.of("RspCode", "97", "Message", "Invalid Checksum");
        }

        Payment payment;
        try {
            payment = paymentRepository.findById(UUID.fromString(txnRef))
                    .orElseThrow(() -> new PaymentNotFoundException("paymentId=" + txnRef));
        } catch (Exception e) {
            return Map.of("RspCode", "01", "Message", "Order Not Found");
        }

        // Chống trùng lặp
        if (payment.getStatus() != PaymentStatus.PENDING) {
            log.warn("[PaymentService] IPN duplicate for paymentId={}", payment.getId());
            return Map.of("RspCode", "02", "Message", "Order Already Confirmed");
        }

        if ("00".equals(responseCode)) {
            payment.setStatus(PaymentStatus.COMPLETED);
            payment.setTransactionId(vnpTransactionNo);
            paymentRepository.save(payment);

            eventPublisher.publishPaymentCompleted(
                    PaymentCompletedEvent.builder()
                            .orderId(payment.getOrderId())
                            .paymentId(payment.getId())
                            .amount(payment.getAmount())
                            .build());

            return Map.of("RspCode", "00", "Message", "Confirm Success");
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);

            eventPublisher.publishPaymentFailed(
                    PaymentFailedEvent.builder()
                            .orderId(payment.getOrderId())
                            .reason(mapVNPayErrorCode(responseCode))
                            .build());

            return Map.of("RspCode", "00", "Message", "Confirm Success");
        }
    }

    // -----------------------------------------------------------------------
    // Get payment by orderId — GET /api/payments/{orderId}
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public PaymentResponse getByOrderId(UUID orderId) {
        Payment payment = paymentRepository.findFirstByOrderIdOrderByCreatedAtDesc(orderId)
                .orElseThrow(() -> new PaymentNotFoundException("orderId=" + orderId));
        return toResponse(payment, null);
    }

    // -----------------------------------------------------------------------
    // Refund — POST /api/payments/{id}/refund
    // -----------------------------------------------------------------------

    @Transactional
    public PaymentResponse refundPayment(UUID paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentNotFoundException("paymentId=" + paymentId));

        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            throw new PaymentRefundException(
                    "Cannot refund payment with status " + payment.getStatus() +
                    ". Only COMPLETED payments can be refunded.");
        }

        payment.setStatus(PaymentStatus.REFUNDED);
        payment = paymentRepository.save(payment);

        log.info("[PaymentService] Payment REFUNDED — paymentId={}, orderId={}", payment.getId(), payment.getOrderId());
        return toResponse(payment, null);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private PaymentMethod parseMethod(String methodStr) {
        if (methodStr == null) return PaymentMethod.CASH;
        try {
            return PaymentMethod.valueOf(methodStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("[PaymentService] Unknown paymentMethod '{}', defaulting to CASH", methodStr);
            return PaymentMethod.CASH;
        }
    }

    /**
     * Build URL redirect về trang kết quả thanh toán trên Frontend.
     * Ví dụ: http://localhost:5173/payment/return?status=success&orderId=...
     */
    private String buildFrontendUrl(String status, String orderId, String reason) {
        StringBuilder url = new StringBuilder(vnPayConfig.getFrontendUrl());
        url.append("?status=").append(status);
        if (orderId != null) {
            url.append("&orderId=").append(orderId);
        }
        if (reason != null && !reason.isEmpty()) {
            url.append("&reason=").append(reason.replace(" ", "%20"));
        }
        return url.toString();
    }

    /** Map VNPay response code sang mô tả tiếng Việt thân thiện. */
    private String mapVNPayErrorCode(String code) {
        return switch (code) {
            case "07" -> "Trừ tiền thành công nhưng giao dịch bị nghi ngờ gian lận";
            case "09" -> "Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking";
            case "10" -> "Xác thực thông tin thẻ/tài khoản sai quá 3 lần";
            case "11" -> "Đã hết hạn chờ thanh toán";
            case "12" -> "Thẻ/Tài khoản bị khóa";
            case "13" -> "Mã OTP nhập sai";
            case "24" -> "Khách hàng hủy giao dịch";
            case "51" -> "Tài khoản không đủ số dư";
            case "65" -> "Tài khoản vượt hạn mức giao dịch trong ngày";
            case "75" -> "Ngân hàng thanh toán đang bảo trì";
            case "79" -> "Nhập sai mật khẩu thanh toán quá số lần cho phép";
            default   -> "Giao dịch thất bại (mã lỗi: " + code + ")";
        };
    }

    private PaymentResponse toResponse(Payment payment, String paymentUrl) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .orderId(payment.getOrderId())
                .amount(payment.getAmount())
                .status(payment.getStatus())
                .paymentMethod(payment.getPaymentMethod())
                .transactionId(payment.getTransactionId())
                .paymentUrl(paymentUrl)
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }
}
