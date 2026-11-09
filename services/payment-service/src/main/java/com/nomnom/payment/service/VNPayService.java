package com.nomnom.payment.service;

import com.nomnom.payment.config.VNPayConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * Service xử lý tích hợp cổng thanh toán VNPay.
 *
 * <h3>Luồng tạo URL thanh toán:</h3>
 * <ol>
 *   <li>Build Map các tham số theo tài liệu VNPay API v2.1.0</li>
 *   <li>Sắp xếp theo thứ tự từ điển (a-z)</li>
 *   <li>Tạo chuỗi hash data và tính HMAC-SHA512</li>
 *   <li>Append {@code vnp_SecureHash} vào URL</li>
 * </ol>
 *
 * <h3>Xác thực callback:</h3>
 * <ol>
 *   <li>Tách {@code vnp_SecureHash} ra khỏi params</li>
 *   <li>Sắp xếp các params còn lại và tính lại chữ ký</li>
 *   <li>So sánh với {@code vnp_SecureHash} nhận được</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VNPayService {

    private final VNPayConfig vnPayConfig;

    /**
     * Tạo URL thanh toán VNPay Sandbox.
     *
     * @param paymentId  UUID của Payment record — dùng làm vnp_TxnRef (tham chiếu giao dịch)
     * @param amount     Số tiền VND (BigDecimal, không thập phân), ví dụ 50000
     * @param ipAddress  IP của client — bắt buộc theo quy định VNPay
     * @param orderInfo  Mô tả đơn hàng hiển thị trên trang VNPay
     * @return URL đầy đủ để redirect trình duyệt người dùng
     */
    public String createPaymentUrl(UUID paymentId, BigDecimal amount, String ipAddress, String orderInfo) {
        // Fail-fast với thông báo rõ ràng nếu thiếu credentials (thường do Config Server
        // chưa sẵn sàng). Nếu không, hmacSHA512 sẽ ném lỗi khó hiểu "Empty key".
        if (isBlank(vnPayConfig.getTmnCode()) || isBlank(vnPayConfig.getHashSecret())) {
            throw new IllegalStateException(
                    "VNPay chưa được cấu hình (tmn-code/hash-secret rỗng). " +
                    "Kiểm tra Config Server hoặc biến môi trường VNPAY_TMN_CODE / VNPAY_HASH_SECRET.");
        }

        // VNPay yêu cầu số tiền = số tiền VND * 100 (đơn vị là 1/100 VND)
        long vnpAmount = amount.multiply(BigDecimal.valueOf(vnPayConfig.getAmountMultiplier())).longValue();

        // Dùng timezone VN (GMT+7) vì VNPay sandbox so sánh theo giờ VN
        TimeZone vnTimeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh");
        SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMddHHmmss");
        sdf.setTimeZone(vnTimeZone);

        Date now = new Date();
        String createDate = sdf.format(now);
        String expireDate = sdf.format(new Date(now.getTime() + 15 * 60 * 1000L)); // +15 phút

        Map<String, String> params = new TreeMap<>(); // TreeMap tự sắp xếp a-z
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", vnPayConfig.getTmnCode());
        params.put("vnp_Amount", String.valueOf(vnpAmount));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", paymentId.toString());
        params.put("vnp_OrderInfo", orderInfo.isEmpty() ? "Thanh toan don hang NomNom" : orderInfo);
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", vnPayConfig.getReturnUrl());
        params.put("vnp_IpAddr", ipAddress);
        params.put("vnp_CreateDate", createDate);
        params.put("vnp_ExpireDate", expireDate);

        // Build query string và tính chữ ký
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            String encodedKey = URLEncoder.encode(entry.getKey(), StandardCharsets.US_ASCII);
            String encodedValue = URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII);
            hashData.append(encodedKey).append('=').append(encodedValue).append('&');
            query.append(encodedKey).append('=').append(encodedValue).append('&');
        }
        // Bỏ dấu '&' cuối
        hashData.deleteCharAt(hashData.length() - 1);
        query.deleteCharAt(query.length() - 1);

        String secureHash = hmacSHA512(vnPayConfig.getHashSecret(), hashData.toString());
        query.append("&vnp_SecureHash=").append(secureHash);

        String paymentUrl = vnPayConfig.getUrl() + "?" + query;
        log.info("[VNPayService] Generated payment URL for paymentId={}", paymentId);
        log.info("[VNPayService] FULL URL = {}", paymentUrl);
        return paymentUrl;
    }

    /**
     * Xác thực chữ ký từ callback VNPay.
     *
     * @param params Toàn bộ query params nhận được từ VNPay callback
     * @return true nếu chữ ký hợp lệ, false nếu bị giả mạo
     */
    public boolean verifyCallback(Map<String, String> params) {
        String receivedHash = params.get("vnp_SecureHash");
        if (receivedHash == null) {
            log.warn("[VNPayService] Missing vnp_SecureHash in callback");
            return false;
        }

        // Loại bỏ vnp_SecureHash và vnp_SecureHashType, sắp xếp lại
        TreeMap<String, String> sortedParams = new TreeMap<>(params);
        sortedParams.remove("vnp_SecureHash");
        sortedParams.remove("vnp_SecureHashType");

        // Build lại chuỗi hashData
        StringBuilder hashData = new StringBuilder();
        for (Map.Entry<String, String> entry : sortedParams.entrySet()) {
            String encodedKey = URLEncoder.encode(entry.getKey(), StandardCharsets.US_ASCII);
            String encodedValue = URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII);
            hashData.append(encodedKey).append('=').append(encodedValue).append('&');
        }
        hashData.deleteCharAt(hashData.length() - 1);

        String calculatedHash = hmacSHA512(vnPayConfig.getHashSecret(), hashData.toString());
        boolean valid = calculatedHash.equalsIgnoreCase(receivedHash);

        if (!valid) {
            log.warn("[VNPayService] Signature mismatch. Expected={}, Received={}", calculatedHash, receivedHash);
        }
        return valid;
    }

    /**
     * Tính HMAC-SHA512 theo chuẩn VNPay.
     *
     * @param key  Hash secret từ VNPay Dashboard
     * @param data Chuỗi cần ký
     * @return Chuỗi hex lowercase của chữ ký
     */
    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private String hmacSHA512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            mac.init(secretKey);
            byte[] hashBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                hexString.append(String.format("%02x", b));
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Cannot compute HMAC-SHA512", e);
        }
    }
}
