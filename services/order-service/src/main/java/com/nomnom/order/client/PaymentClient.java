package com.nomnom.order.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Feign client để gọi Payment Service.
 * Trả về PaymentResponse chứa paymentUrl nếu phương thức là VNPAY.
 */
@FeignClient(name = "payment-service")
public interface PaymentClient {

    @PostMapping("/api/payments")
    PaymentResponse processPayment(@RequestBody PaymentRequest request);

    /**
     * Request body gửi sang Payment Service.
     *
     * @param orderId       UUID của đơn hàng
     * @param amount        Số tiền VND
     * @param paymentMethod CASH | VNPAY | CARD
     */
    record PaymentRequest(UUID orderId, BigDecimal amount, String paymentMethod) {}

    /**
     * Response từ Payment Service.
     * paymentUrl chỉ có giá trị khi paymentMethod == VNPAY.
     */
    record PaymentResponse(
            UUID id,
            UUID orderId,
            BigDecimal amount,
            String status,
            String paymentUrl
    ) {}
}
