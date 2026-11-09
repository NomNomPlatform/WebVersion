package com.nomnom.order.event;

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
public class OrderPlacedEvent {
    private UUID orderId;
    private UUID customerId;
    private UUID restaurantId;
    private UUID restaurantOwnerId;
    private BigDecimal totalAmount;
}
