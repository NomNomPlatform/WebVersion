package com.nomnom.order.kafka;

import com.nomnom.order.event.PaymentCompletedEvent;
import com.nomnom.order.event.PaymentFailedEvent;
import com.nomnom.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentEventConsumer {

    private final OrderService orderService;

    @KafkaListener(topics = "payment.completed", groupId = "order-service")
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        log.info("Received PaymentCompletedEvent for order: {}", event.getOrderId());
        orderService.confirmOrder(event.getOrderId());
    }

    @KafkaListener(topics = "payment.failed", groupId = "order-service")
    public void handlePaymentFailed(PaymentFailedEvent event) {
        log.info("Received PaymentFailedEvent for order: {}", event.getOrderId());
        // We pass a dummy restaurantOwnerId or fetch it if needed. 
        // For simplicity, passing null as we don't store it in Order entity directly.
        orderService.cancelOrderInternal(event.getOrderId(), event.getReason(), null);
    }
}
