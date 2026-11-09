package com.nomnom.order.dto;

import com.nomnom.order.entity.Order;

/**
 * Response DTO khi tạo đơn hàng thành công.
 * Chứa thông tin Order và paymentUrl (chỉ có giá trị khi thanh toán bằng VNPAY).
 *
 * @param order      Đơn hàng vừa tạo
 * @param paymentUrl URL redirect đến cổng VNPay — null nếu phương thức là CASH hoặc CARD
 */
public record CreateOrderResponse(Order order, String paymentUrl) {
}
