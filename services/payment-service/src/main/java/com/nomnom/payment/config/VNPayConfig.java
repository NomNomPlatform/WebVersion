package com.nomnom.payment.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Đọc cấu hình VNPay Sandbox từ application properties / Config Server.
 *
 * <pre>
 * payment:
 *   vnpay:
 *     tmn-code: ...
 *     hash-secret: ...
 *     url: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
 *     return-url: http://localhost:8080/api/payments/vnpay/callback
 *     frontend-url: http://localhost:5173/payment/return
 *     amount-multiplier: 100
 * </pre>
 */
@Configuration
@ConfigurationProperties(prefix = "payment.vnpay")
@Data
public class VNPayConfig {

    /** Mã website trên hệ thống VNPay. */
    private String tmnCode;

    /** Chuỗi bí mật để tạo chữ ký HMAC-SHA512. */
    private String hashSecret;

    /** URL cổng thanh toán VNPay (sandbox hoặc production). */
    private String url;

    /** URL nhận kết quả redirect sau khi user thanh toán xong. */
    private String returnUrl;

    /** URL trang kết quả trên React Frontend. */
    private String frontendUrl;

    /**
     * Hệ số nhân cho số tiền.
     * VNPay yêu cầu số tiền đơn vị VND nhân thêm 100.
     * Ví dụ: 50000₫ → gửi 5000000.
     */
    private long amountMultiplier = 100L;
}
