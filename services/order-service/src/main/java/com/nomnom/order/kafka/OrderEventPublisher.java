package com.nomnom.order.kafka;

import com.nomnom.order.event.OrderCancelledEvent;
import com.nomnom.order.event.OrderConfirmedEvent;
import com.nomnom.order.event.OrderDeliveredEvent;
import com.nomnom.order.event.OrderPlacedEvent;
import com.nomnom.order.event.OrderReadyEvent;
import com.nomnom.order.event.OrderShippingEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OrderEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishOrderPlaced(OrderPlacedEvent event) {
        kafkaTemplate.send("order.placed", event.getOrderId().toString(), event);
    }

    public void publishOrderConfirmed(OrderConfirmedEvent event) {
        kafkaTemplate.send("order.confirmed", event.getOrderId().toString(), event);
    }

    public void publishOrderCancelled(OrderCancelledEvent event) {
        kafkaTemplate.send("order.cancelled", event.getOrderId().toString(), event);
    }

    public void publishOrderReady(OrderReadyEvent event) {
        kafkaTemplate.send("order.ready", event.getOrderId().toString(), event);
    }

    public void publishOrderShipping(OrderShippingEvent event) {
        kafkaTemplate.send("order.shipping", event.getOrderId().toString(), event);
    }

    public void publishOrderDelivered(OrderDeliveredEvent event) {
        kafkaTemplate.send("order.delivered", event.getOrderId().toString(), event);
    }
}
