package com.nomnom.order.service;

import com.nomnom.order.client.MenuClient.MenuItemResponse;
import com.nomnom.order.client.PaymentClient;
import com.nomnom.order.client.RestaurantClient.RestaurantResponse;
import com.nomnom.order.dto.CreateOrderResponse;
import com.nomnom.order.dto.OrderAnalyticsResponse;
import com.nomnom.order.dto.OrderAnalyticsResponse.DailyOrderStat;
import com.nomnom.order.dto.OrderAnalyticsResponse.TopMenuItemStat;
import com.nomnom.order.dto.OrderAnalyticsResponse.TopRestaurantStat;
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
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

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
        verifyRestaurantOwner(restaurantId, ownerId);
        return orderRepository.findByRestaurantId(restaurantId, pageable);
    }

    public Page<Order> getAllOrders(Pageable pageable) {
        return orderRepository.findAll(pageable);
    }

    /**
     * Thống kê đơn hàng và doanh thu của một nhà hàng trong N ngày gần nhất.
     */
    @Transactional(readOnly = true)
    public OrderAnalyticsResponse getRestaurantAnalytics(UUID restaurantId, UUID ownerId, int days) {
        verifyRestaurantOwner(restaurantId, ownerId);
        int normalizedDays = normalizeDays(days);
        LocalDate startDay = LocalDate.now().minusDays(normalizedDays - 1L);
        List<Order> orders = orderRepository.findByRestaurantIdAndCreatedAtGreaterThanEqual(
                restaurantId, startDay.atStartOfDay());
        return buildAnalytics(orders, normalizedDays, startDay, false);
    }

    /**
     * Thống kê tổng hợp toàn sàn cho Admin trong N ngày gần nhất.
     */
    @Transactional(readOnly = true)
    public OrderAnalyticsResponse getAdminAnalytics(int days) {
        int normalizedDays = normalizeDays(days);
        LocalDate startDay = LocalDate.now().minusDays(normalizedDays - 1L);
        List<Order> orders = orderRepository.findByCreatedAtGreaterThanEqual(startDay.atStartOfDay());
        return buildAnalytics(orders, normalizedDays, startDay, true);
    }

    private void verifyRestaurantOwner(UUID restaurantId, UUID ownerId) {
        RestaurantResponse restaurant = restaurantClient.getRestaurantById(restaurantId);
        if (restaurant == null || restaurant.ownerId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid restaurant");
        }
        if (!restaurant.ownerId().equals(ownerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your restaurant");
        }
    }

    private static int normalizeDays(int days) {
        if (days <= 0) return 30;
        return Math.min(days, 365);
    }

    private static final Set<OrderStatus> REVENUE_STATUSES = EnumSet.of(
            OrderStatus.CONFIRMED, OrderStatus.READY, OrderStatus.SHIPPING, OrderStatus.DELIVERED);

    private static final Set<OrderStatus> ACTIVE_STATUSES = EnumSet.of(
            OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.READY, OrderStatus.SHIPPING);

    private OrderAnalyticsResponse buildAnalytics(
            List<Order> orders, int days, LocalDate startDay, boolean includeRestaurants) {

        Map<OrderStatus, Long> statusBreakdown = new EnumMap<>(OrderStatus.class);
        for (OrderStatus status : OrderStatus.values()) {
            statusBreakdown.put(status, 0L);
        }

        // Khởi tạo map theo từng ngày để biểu đồ không bị đứt quãng vào ngày 0 đơn
        Map<LocalDate, long[]> dailyOrderCounts = new LinkedHashMap<>();
        Map<LocalDate, BigDecimal> dailyRevenues = new LinkedHashMap<>();
        for (int i = 0; i < days; i++) {
            LocalDate day = startDay.plusDays(i);
            dailyOrderCounts.put(day, new long[]{0L});
            dailyRevenues.put(day, BigDecimal.ZERO);
        }

        Map<UUID, String> itemNames = new HashMap<>();
        Map<UUID, Long> itemQuantities = new HashMap<>();
        Map<UUID, BigDecimal> itemRevenues = new HashMap<>();

        Map<UUID, Long> restaurantOrderCounts = new HashMap<>();
        Map<UUID, BigDecimal> restaurantRevenues = new HashMap<>();

        long totalOrders = orders.size();
        long completedOrders = 0;
        long cancelledOrders = 0;
        long activeOrders = 0;
        long revenueOrderCount = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal deliveredRevenue = BigDecimal.ZERO;

        for (Order order : orders) {
            OrderStatus status = order.getStatus();
            statusBreakdown.merge(status, 1L, Long::sum);

            if (status == OrderStatus.DELIVERED) completedOrders++;
            if (status == OrderStatus.CANCELLED) cancelledOrders++;
            if (ACTIVE_STATUSES.contains(status)) activeOrders++;

            BigDecimal amount = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
            boolean isRevenueOrder = REVENUE_STATUSES.contains(status);

            if (isRevenueOrder) {
                revenueOrderCount++;
                totalRevenue = totalRevenue.add(amount);
                if (status == OrderStatus.DELIVERED) {
                    deliveredRevenue = deliveredRevenue.add(amount);
                }

                if (order.getItems() != null) {
                    for (OrderItem item : order.getItems()) {
                        UUID itemId = item.getMenuItemId();
                        long qty = item.getQuantity() != null ? item.getQuantity() : 0L;
                        BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
                        BigDecimal lineRevenue = unitPrice.multiply(BigDecimal.valueOf(qty));

                        itemNames.putIfAbsent(itemId, item.getName());
                        itemQuantities.merge(itemId, qty, Long::sum);
                        itemRevenues.merge(itemId, lineRevenue, BigDecimal::add);
                    }
                }

                if (includeRestaurants && order.getRestaurantId() != null) {
                    restaurantOrderCounts.merge(order.getRestaurantId(), 1L, Long::sum);
                    restaurantRevenues.merge(order.getRestaurantId(), amount, BigDecimal::add);
                }
            }

            if (order.getCreatedAt() != null) {
                LocalDate orderDate = order.getCreatedAt().toLocalDate();
                long[] countHolder = dailyOrderCounts.get(orderDate);
                if (countHolder != null) {
                    countHolder[0]++;
                }
                if (isRevenueOrder && dailyRevenues.containsKey(orderDate)) {
                    dailyRevenues.put(orderDate, dailyRevenues.get(orderDate).add(amount));
                }
            }
        }

        BigDecimal averageOrderValue = revenueOrderCount > 0
                ? totalRevenue.divide(BigDecimal.valueOf(revenueOrderCount), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        List<DailyOrderStat> dailyStats = new ArrayList<>(days);
        for (LocalDate day : dailyOrderCounts.keySet()) {
            dailyStats.add(new DailyOrderStat(
                    day.toString(),
                    dailyOrderCounts.get(day)[0],
                    dailyRevenues.get(day)));
        }

        List<TopMenuItemStat> topItems = itemQuantities.entrySet().stream()
                .map(e -> new TopMenuItemStat(
                        e.getKey(),
                        itemNames.getOrDefault(e.getKey(), "Unknown"),
                        e.getValue(),
                        itemRevenues.getOrDefault(e.getKey(), BigDecimal.ZERO)))
                .sorted(Comparator.comparingLong(TopMenuItemStat::totalQuantity).reversed()
                        .thenComparing(TopMenuItemStat::totalRevenue, Comparator.reverseOrder()))
                .limit(10)
                .toList();

        List<TopRestaurantStat> topRestaurants = includeRestaurants
                ? restaurantRevenues.entrySet().stream()
                        .map(e -> new TopRestaurantStat(
                                e.getKey(),
                                restaurantOrderCounts.getOrDefault(e.getKey(), 0L),
                                e.getValue()))
                        .sorted(Comparator.comparing(TopRestaurantStat::revenue, Comparator.reverseOrder())
                                .thenComparing(Comparator.comparingLong(TopRestaurantStat::orderCount).reversed()))
                        .limit(10)
                        .toList()
                : List.of();

        return new OrderAnalyticsResponse(
                days,
                totalOrders,
                completedOrders,
                cancelledOrders,
                activeOrders,
                totalRevenue,
                deliveredRevenue,
                averageOrderValue,
                statusBreakdown,
                dailyStats,
                topItems,
                topRestaurants
        );
    }
}
