package com.nomnom.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderRequest {
    private UUID restaurantId;
    private List<OrderItemRequest> items;
    private String deliveryAddress;
    private String note;
    /** Payment method: CASH | VNPAY | CARD. Defaults to CASH. */
    private String paymentMethod = "CASH";
}
