package com.nomnom.payment.kafka;

import com.nomnom.payment.kafka.event.PaymentCompletedEvent;
import com.nomnom.payment.kafka.event.PaymentFailedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * Responsible for publishing payment-related Kafka events that close
 * the Saga loop with the Order Service.
 *
 * <p>Topics:
 * <ul>
 *   <li>{@code payment.completed} — consumed by Order Service →
 *       transitions order to CONFIRMED</li>
 *   <li>{@code payment.failed}    — consumed by Order Service →
 *       transitions order to CANCELLED</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventPublisher {

    private static final String TOPIC_COMPLETED = "payment.completed";
    private static final String TOPIC_FAILED    = "payment.failed";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Publishes a {@link PaymentCompletedEvent} using the orderId as the
     * Kafka message key so that events for the same order land on the same
     * partition (preserving order).
     */
    public void publishPaymentCompleted(PaymentCompletedEvent event) {
        String key = event.getOrderId().toString();
        kafkaTemplate.send(TOPIC_COMPLETED, key, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("[PaymentEventPublisher] Failed to publish {} for orderId={}: {}",
                                TOPIC_COMPLETED, key, ex.getMessage(), ex);
                    } else {
                        log.info("[PaymentEventPublisher] Published {} → orderId={}, offset={}",
                                TOPIC_COMPLETED, key,
                                result.getRecordMetadata().offset());
                    }
                });
    }

    /**
     * Publishes a {@link PaymentFailedEvent} using the orderId as the Kafka
     * message key.
     */
    public void publishPaymentFailed(PaymentFailedEvent event) {
        String key = event.getOrderId().toString();
        kafkaTemplate.send(TOPIC_FAILED, key, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("[PaymentEventPublisher] Failed to publish {} for orderId={}: {}",
                                TOPIC_FAILED, key, ex.getMessage(), ex);
                    } else {
                        log.info("[PaymentEventPublisher] Published {} → orderId={}, offset={}",
                                TOPIC_FAILED, key,
                                result.getRecordMetadata().offset());
                    }
                });
    }
}
