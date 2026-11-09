package com.nomnom.order.service;

import com.nomnom.order.client.MenuClient.MenuItemResponse;
import com.nomnom.order.client.PaymentClient;
import com.nomnom.order.client.RestaurantClient.RestaurantResponse;
import com.nomnom.order.dto.CreateOrderResponse;
import com.nomnom.order.dto.OrderItemRequest;
import com.nomnom.order.dto.OrderRequest;
import com.nomnom.order.entity.Order;
import com.nomnom.order.entity.OrderItem;
import com.nomnom.order.entity.OrderStatus;
import com.nomnom.order.event.OrderCancelledEvent;
import com.nomnom.order.event.OrderConfirmedEvent;
import com.nomnom.order.event.OrderDeliveredEvent;
import com.nomnom.order.event.OrderPlacedEvent;
import com.nomnom.order.event.OrderReadyEvent;
import com.nomnom.order.event.OrderShippingEvent;
import com.nomnom.order.kafka.OrderEventPublisher;
import com.nomnom.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderEventPublisher eventPublisher;
    private final PaymentClient paymentClient;
    private final com.nomnom.order.client.RestaurantClient restaurantClient;
    private final com.nomnom.order.client.MenuClient menuClient;
    private final TransactionTemplate transactionTemplate;

    public CreateOrderResponse createOrder(UUID customerId, OrderRequest request) {
        // Fetch ownerId and check status
        RestaurantResponse restaurant = restaurantClient
                .getRestaurantById(request.getRestaurantId());
        if (restaurant == null || !"APPROVED".equals(restaurant.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or unapproved restaurant");
        }
        UUID restaurantOwnerId = restaurant.ownerId();

        java.util.List<OrderItem> orderItems = new java.util.ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderItemRequest itemReq : request.getItems()) {
            MenuItemResponse menuItem = menuClient
                    .getItemById(itemReq.getMenuItemId());
            if (menuItem == null || Boolean.FALSE.equals(menuItem.isAvailable())
                    || !menuItem.restaurantId().equals(request.getRestaurantId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid menu item: " + itemReq.getMenuItemId());
            }
            OrderItem item = OrderItem.builder()
                    .menuItemId(menuItem.id())
                    .name(menuItem.name())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(menuItem.price())
                    .calories(menuItem.calories())
                    .build();
            orderItems.add(item);
            totalAmount = totalAmount.add(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
        }

        final BigDecimal finalTotalAmount = totalAmount;

        // Save order and commit transaction
        Order savedOrder = transactionTemplate.execute(status -> {
            Order order = Order.builder()
                    .customerId(customerId)
                    .restaurantId(request.getRestaurantId())
                    .status(OrderStatus.PENDING)
                    .deliveryAddress(request.getDeliveryAddress())
                    .note(request.getNote())
                    .totalAmount(finalTotalAmount)
                    .build();
            for (OrderItem item : orderItems) {
                order.addItem(item);
            }
            return orderRepository.save(order);
        });

        // 1. Publish order.placed (after transaction commit)
        OrderPlacedEvent placedEvent = OrderPlacedEvent.builder()
                .orderId(savedOrder.getId())
                .customerId(customerId)
                .restaurantId(savedOrder.getRestaurantId())
                .restaurantOwnerId(restaurantOwnerId)
                .totalAmount(finalTotalAmount)
                .build();
        eventPublisher.publishOrderPlaced(placedEvent);

        // 2. Call Payment Service (outside initial transaction)
        String paymentUrl = null;
        try {
            PaymentClient.PaymentResponse paymentResponse = paymentClient.processPayment(
                    new PaymentClient.PaymentRequest(
                            savedOrder.getId(),
                            finalTotalAmount,
                            request.getPaymentMethod()
                    ));
            paymentUrl = paymentResponse != null ? paymentResponse.paymentUrl() : null;
        } catch (Exception e) {
            log.error("Payment call failed for order {}", savedOrder.getId(), e);
            cancelOrderInternal(savedOrder.getId(), "Payment request failed", restaurantOwnerId);
        }

        return new CreateOrderResponse(savedOrder, paymentUrl);
    }

    @Transactional
    public void confirmOrder(UUID orderId) {
        Order order = getOrderById(orderId);
        order.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order);

        eventPublisher.publishOrderConfirmed(new OrderConfirmedEvent(order.getId(), order.getCustomerId()));
    }

    @Transactional
    public void cancelOrderInternal(UUID orderId, String reason, UUID restaurantOwnerId) {
        Order order = getOrderById(orderId);
        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);

        eventPublisher.publishOrderCancelled(
                new OrderCancelledEvent(order.getId(), order.getCustomerId(), restaurantOwnerId, reason));
    }

    @Transactional
    public void updateOrderStatus(UUID orderId, UUID ownerId, OrderStatus newStatus) {
        Order order = getOrderById(orderId);

        RestaurantResponse restaurant = restaurantClient
                .getRestaurantById(order.getRestaurantId());

        if (restaurant == null || restaurant.ownerId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid restaurant");
        }
        if (!restaurant.ownerId().equals(ownerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your restaurant");
        }

        OrderStatus current = order.getStatus();
        validateTransition(current, newStatus);

        if (newStatus == OrderStatus.READY) {
            order.setStatus(OrderStatus.READY);
            eventPublisher.publishOrderReady(new OrderReadyEvent(order.getId(), order.getCustomerId()));
        } else if (newStatus == OrderStatus.SHIPPING) {
            order.setStatus(OrderStatus.SHIPPING);
            eventPublisher.publishOrderShipping(new OrderShippingEvent(order.getId(), order.getCustomerId()));
        } else {
            order.setStatus(newStatus);
        }
        orderRepository.save(order);
    }

    /**
     * Customer xác nhận đã nhận hàng → SHIPPING → DELIVERED.
     * Chỉ chính chủ order mới được gọi, và order phải đang ở SHIPPING.
     */
    @Transactional
    public void confirmDelivery(UUID orderId, UUID customerId) {
        Order order = getOrderById(orderId);
        if (!order.getCustomerId().equals(customerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your order");
        }
        if (order.getStatus() != OrderStatus.SHIPPING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Order must be SHIPPING to mark as delivered");
        }
        order.setStatus(OrderStatus.DELIVERED);
        orderRepository.save(order);
        eventPublisher.publishOrderDelivered(new OrderDeliveredEvent(orderId, customerId));
    }

    /**
     * Validate chuyển trạng thái — chỉ cho phép transition theo lifecycle.
     * Owner cancel được phép tới READY (sau SHIPPING thì do customer xác nhận).
     */
    private void validateTransition(OrderStatus current, OrderStatus target) {
        boolean allowed = switch (current) {
            case PENDING   -> target == OrderStatus.CONFIRMED || target == OrderStatus.CANCELLED;
            case CONFIRMED -> target == OrderStatus.READY     || target == OrderStatus.CANCELLED;
            case READY     -> target == OrderStatus.SHIPPING  || target == OrderStatus.CANCELLED;
            case SHIPPING  -> false; // customer chỉ confirm qua endpoint riêng
            case DELIVERED -> false;
            case CANCELLED -> false;
        };
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Invalid status transition: " + current + " → " + target);
        }
    }

    @Transactional
    public void deleteOrder(UUID orderId, UUID customerId) {
        Order order = getOrderById(orderId);
        if (!order.getCustomerId().equals(customerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your order");
        }
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Can only delete PENDING orders");
        }
        orderRepository.delete(order);
    }

    public Order getOrderById(UUID id) {
        return getOrderById(id, null);
    }

    /**
     * Nếu {@code requestingUserId} != null → chỉ trả về order nếu khách đó
     * là chủ order (customerId) hoặc chủ nhà hàng của order. Tránh IDOR.
     * Truyền {@code null} cho service nội bộ (Kafka consumer, payment).
     */
    public Order getOrderById(UUID id, UUID requestingUserId) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (requestingUserId == null) {
            return order;
        }
        boolean isCustomer = requestingUserId.equals(order.getCustomerId());
        boolean isOwner = false;
        if (!isCustomer) {
            RestaurantResponse restaurant = restaurantClient.getRestaurantById(order.getRestaurantId());
            isOwner = restaurant != null && requestingUserId.equals(restaurant.ownerId());
        }
        if (!isCustomer && !isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your order");
        }
        return order;
    }

    public Page<Order> getMyOrders(UUID customerId, Pageable pageable) {
        return orderRepository.findByCustomerId(customerId, pageable);
    }

    public Page<Order> getRestaurantOrders(UUID restaurantId, UUID ownerId, Pageable pageable) {
        RestaurantResponse restaurant = restaurantClient.getRestaurantById(restaurantId);

        if (restaurant == null || restaurant.ownerId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid restaurant");
        }
        if (!restaurant.ownerId().equals(ownerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your restaurant");
        }

        return orderRepository.findByRestaurantId(restaurantId, pageable);
    }

    public Page<Order> getAllOrders(Pageable pageable) {
        return orderRepository.findAll(pageable);
    }
}
