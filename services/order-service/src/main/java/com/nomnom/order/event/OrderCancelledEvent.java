package com.nomnom.order.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderCancelledEvent {
    private UUID orderId;
    private UUID customerId;
    private UUID restaurantOwnerId;
    private String reason;
}
