package com.nomnom.notification.kafka;

import com.nomnom.notification.entity.NotificationType;
import com.nomnom.notification.kafka.event.OrderCancelledEvent;
import com.nomnom.notification.kafka.event.OrderConfirmedEvent;
import com.nomnom.notification.kafka.event.OrderDeliveredEvent;
import com.nomnom.notification.kafka.event.OrderPlacedEvent;
import com.nomnom.notification.kafka.event.OrderReadyEvent;
import com.nomnom.notification.kafka.event.OrderShippingEvent;
import com.nomnom.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Kafka consumer lắng nghe các order events từ order-service.
 *
 * Mapping:
 * - order.placed     → notify restaurantOwner: "Bạn có đơn hàng mới"
 * - order.confirmed  → notify customer: "Đơn hàng đã được xác nhận"
 * - order.ready      → notify customer: "Đơn hàng sẵn sàng giao"
 * - order.shipping   → notify customer: "Đơn hàng đang được giao"
 * - order.delivered  → notify customer: "Đơn hàng đã giao thành công"
 * - order.cancelled  → notify BOTH customer và restaurantOwner (nếu có)
 *
 * Edge cases được xử lý:
 * - OrderPlacedEvent.restaurantOwnerId == null → log warning, không crash
 * - OrderCancelledEvent.restaurantOwnerId == null → chỉ notify customer
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventConsumer {

    private final NotificationService notificationService;

    /**
     * Xử lý event khi customer đặt hàng.
     * Gửi thông báo cho chủ nhà hàng để biết có đơn hàng mới.
     */
    @KafkaListener(topics = "order.placed", groupId = "notification-service")
    public void handleOrderPlaced(OrderPlacedEvent event) {
        log.info("Received order.placed event: orderId={}, restaurantOwnerId={}",
                event.getOrderId(), event.getRestaurantOwnerId());

        if (event.getRestaurantOwnerId() == null) {
            log.warn("OrderPlacedEvent missing restaurantOwnerId for order {}. " +
                     "Skipping owner notification.", event.getOrderId());
            return;
        }

        notificationService.createNotification(
                event.getRestaurantOwnerId(),
                "Đơn hàng mới",
                String.format("Bạn có đơn hàng mới #%s. Vui lòng xác nhận.", event.getOrderId()),
                NotificationType.ORDER_PLACED
        );
    }

    /**
     * Xử lý event khi đơn hàng được xác nhận (thanh toán thành công).
     * Gửi thông báo cho customer.
     */
    @KafkaListener(topics = "order.confirmed", groupId = "notification-service")
    public void handleOrderConfirmed(OrderConfirmedEvent event) {
        log.info("Received order.confirmed event: orderId={}, customerId={}",
                event.getOrderId(), event.getCustomerId());

        notificationService.createNotification(
                event.getCustomerId(),
                "Đơn hàng đã được xác nhận",
                String.format("Đơn hàng #%s của bạn đã được nhà hàng xác nhận và đang được chuẩn bị.",
                        event.getOrderId()),
                NotificationType.ORDER_CONFIRMED
        );
    }

    /**
     * Xử lý event khi đơn hàng sẵn sàng giao.
     * Gửi thông báo cho customer.
     */
    @KafkaListener(topics = "order.ready", groupId = "notification-service")
    public void handleOrderReady(OrderReadyEvent event) {
        log.info("Received order.ready event: orderId={}, customerId={}",
                event.getOrderId(), event.getCustomerId());

        notificationService.createNotification(
                event.getCustomerId(),
                "Đơn hàng đã sẵn sàng!",
                String.format("Đơn hàng #%s của bạn đã sẵn sàng và đang trên đường giao đến bạn!",
                        event.getOrderId()),
                NotificationType.ORDER_READY
        );
    }

    /**
     * Xử lý event khi shipper bắt đầu giao hàng.
     * Gửi thông báo cho customer.
     */
    @KafkaListener(topics = "order.shipping", groupId = "notification-service")
    public void handleOrderShipping(OrderShippingEvent event) {
        log.info("Received order.shipping event: orderId={}, customerId={}",
                event.getOrderId(), event.getCustomerId());
        notificationService.createNotification(
                event.getCustomerId(),
                "Đơn hàng đang được giao",
                String.format("Đơn hàng #%s đang trên đường giao đến bạn!",
                        event.getOrderId().toString().substring(0, 8)),
                NotificationType.ORDER_SHIPPING
        );
    }

    /**
     * Xử lý event khi customer xác nhận đã nhận hàng.
     * Gửi thông báo cho customer.
     */
    @KafkaListener(topics = "order.delivered", groupId = "notification-service")
    public void handleOrderDelivered(OrderDeliveredEvent event) {
        log.info("Received order.delivered event: orderId={}, customerId={}",
                event.getOrderId(), event.getCustomerId());
        notificationService.createNotification(
                event.getCustomerId(),
                "Đơn hàng đã giao thành công",
                String.format("Đơn hàng #%s đã giao thành công. Cảm ơn bạn đã đặt món!",
                        event.getOrderId().toString().substring(0, 8)),
                NotificationType.ORDER_DELIVERED
        );
    }

    /**
     * Xử lý event khi đơn hàng bị huỷ.
     * Gửi thông báo cho BOTH customer VÀ restaurantOwner (nếu restaurantOwnerId không null).
     *
     * Edge case: restaurantOwnerId có thể null khi payment fail
     * (order-service truyền null vào cancelOrderInternal).
     * Trong trường hợp đó, chỉ gửi cho customer.
     */
    @KafkaListener(topics = "order.cancelled", groupId = "notification-service")
    public void handleOrderCancelled(OrderCancelledEvent event) {
        log.info("Received order.cancelled event: orderId={}, customerId={}, restaurantOwnerId={}, reason={}",
                event.getOrderId(), event.getCustomerId(), event.getRestaurantOwnerId(), event.getReason());

        String reason = event.getReason() != null ? event.getReason() : "Không rõ lý do";

        // Luôn gửi cho customer
        notificationService.createNotification(
                event.getCustomerId(),
                "Đơn hàng đã bị huỷ",
                String.format("Đơn hàng #%s của bạn đã bị huỷ. Lý do: %s", event.getOrderId(), reason),
                NotificationType.ORDER_CANCELLED
        );

        // Gửi cho owner nếu có (có thể null khi payment fail)
        if (event.getRestaurantOwnerId() != null) {
            notificationService.createNotification(
                    event.getRestaurantOwnerId(),
                    "Đơn hàng bị huỷ",
                    String.format("Đơn hàng #%s đã bị huỷ. Lý do: %s", event.getOrderId(), reason),
                    NotificationType.ORDER_CANCELLED
            );
        } else {
            log.warn("OrderCancelledEvent missing restaurantOwnerId for order {}. " +
                     "Owner notification skipped (likely payment failure scenario).", event.getOrderId());
        }
    }
}
