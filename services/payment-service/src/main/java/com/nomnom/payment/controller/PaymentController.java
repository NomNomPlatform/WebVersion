package com.nomnom.payment.controller;

import com.nomnom.payment.dto.PaymentAnalyticsResponse;
import com.nomnom.payment.dto.PaymentRequest;
import com.nomnom.payment.dto.PaymentResponse;
import com.nomnom.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * REST API for payment operations.
 *
 * <pre>
 * POST  /api/payments                     — initiate payment (CASH/CARD/VNPAY)
 * GET   /api/payments/{orderId}           — retrieve payment by orderId
 * POST  /api/payments/{id}/refund         — refund a COMPLETED payment
 * GET   /api/payments/vnpay/callback      — VNPay redirect callback (no JWT)
 * GET   /api/payments/vnpay/ipn           — VNPay IPN server-to-server (no JWT)
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Payment processing — CASH / CARD / VNPay Sandbox")
public class PaymentController {

    private final PaymentService paymentService;

    // ------------------------------------------------------------------
    // POST /api/payments
    // ------------------------------------------------------------------

    @Operation(
            summary = "Initiate a payment",
            description = "Routes payment by method: CASH (auto-complete), CARD (mock success), " +
                          "VNPAY (returns paymentUrl to redirect user).")
    @PostMapping
    public ResponseEntity<PaymentResponse> processPayment(
            @Valid @RequestBody PaymentRequest request,
            HttpServletRequest httpRequest) {

        log.info("[PaymentController] POST /api/payments — orderId={}, method={}",
                request.getOrderId(), request.getPaymentMethod());
        String clientIp = getClientIp(httpRequest);
        PaymentResponse response = paymentService.processPayment(request, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ------------------------------------------------------------------
    // GET /api/payments/admin/analytics (ADMIN only)
    // ------------------------------------------------------------------

    @Operation(
            summary = "Get platform-wide payment analytics (Admin only)",
            description = "Aggregates payment counts, completed/refunded amounts, and method breakdown over N days.")
    @GetMapping("/admin/analytics")
    public ResponseEntity<PaymentAnalyticsResponse> getAdminAnalytics(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestParam(defaultValue = "30") int days) {

        if (!"ADMIN".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: role ADMIN required");
        }
        return ResponseEntity.ok(paymentService.getAdminAnalytics(days));
    }

    // ------------------------------------------------------------------
    // GET /api/payments/{orderId}
    // ------------------------------------------------------------------

    @Operation(
            summary = "Get payment by orderId",
            description = "Returns the payment record for a given order. 404 if not found.")
    @GetMapping("/{orderId}")
    public ResponseEntity<PaymentResponse> getByOrderId(
            @Parameter(description = "UUID of the order")
            @PathVariable UUID orderId) {

        log.info("[PaymentController] GET /api/payments/{}", orderId);
        PaymentResponse response = paymentService.getByOrderId(orderId);
        return ResponseEntity.ok(response);
    }

    // ------------------------------------------------------------------
    // POST /api/payments/{id}/refund
    // ------------------------------------------------------------------

    @Operation(
            summary = "Refund a payment",
            description = "Transitions a COMPLETED payment to REFUNDED status. " +
                          "Returns 409 if the payment is not yet COMPLETED.")
    @PostMapping("/{id}/refund")
    public ResponseEntity<PaymentResponse> refundPayment(
            @Parameter(description = "UUID of the payment record (not orderId)")
            @PathVariable UUID id) {

        log.info("[PaymentController] POST /api/payments/{}/refund", id);
        PaymentResponse response = paymentService.refundPayment(id);
        return ResponseEntity.ok(response);
    }

    // ------------------------------------------------------------------
    // GET /api/payments/vnpay/callback  (PUBLIC — no JWT)
    // ------------------------------------------------------------------

    @Operation(
            summary = "VNPay redirect callback",
            description = "Nhận kết quả redirect từ VNPay sau khi user hoàn tất thanh toán. " +
                          "Xác thực chữ ký, cập nhật trạng thái Payment, publish Kafka event, " +
                          "rồi redirect trình duyệt user về trang kết quả trên Frontend.")
    @GetMapping("/vnpay/callback")
    public ResponseEntity<Void> vnpayCallback(HttpServletRequest request) {
        Map<String, String> params = extractParams(request);
        log.info("[PaymentController] VNPay callback received — txnRef={}", params.get("vnp_TxnRef"));

        String redirectUrl = paymentService.processVNPayCallback(params);

        // 302 Redirect trình duyệt người dùng về Frontend
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(redirectUrl))
                .build();
    }

    // ------------------------------------------------------------------
    // GET /api/payments/vnpay/ipn  (PUBLIC — no JWT, server-to-server)
    // ------------------------------------------------------------------

    @Operation(
            summary = "VNPay IPN (Instant Payment Notification)",
            description = "Nhận thông báo kết quả giao dịch từ VNPay server (bất đồng bộ). " +
                          "Phản hồi theo format JSON quy định bởi VNPay.")
    @GetMapping("/vnpay/ipn")
    public ResponseEntity<Map<String, String>> vnpayIPN(HttpServletRequest request) {
        Map<String, String> params = extractParams(request);
        log.info("[PaymentController] VNPay IPN received — txnRef={}", params.get("vnp_TxnRef"));

        Map<String, String> response = paymentService.processVNPayIPN(params);
        return ResponseEntity.ok(response);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /** Chuyển tất cả query parameters thành Map<String, String>. */
    private Map<String, String> extractParams(HttpServletRequest request) {
        Map<String, String> params = new HashMap<>();
        request.getParameterMap().forEach((key, values) -> {
            if (values != null && values.length > 0) {
                params.put(key, values[0]);
            }
        });
        return params;
    }

    /** Lấy IP thực của client (xử lý trường hợp đứng sau proxy/load balancer). */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // Lấy IP đầu tiên nếu có nhiều IP (chain proxy)
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip != null ? ip : "127.0.0.1";
    }
}
