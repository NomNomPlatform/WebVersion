package com.nomnom.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemRequest {
    private UUID menuItemId;
    private String name;
    private Integer quantity;
    private BigDecimal unitPrice;
    private Integer calories;
}
