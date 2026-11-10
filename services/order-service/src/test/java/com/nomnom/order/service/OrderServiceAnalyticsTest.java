package com.nomnom.order.service;

import com.nomnom.order.client.MenuClient;
import com.nomnom.order.client.PaymentClient;
import com.nomnom.order.client.RestaurantClient;
import com.nomnom.order.client.RestaurantClient.RestaurantResponse;
import com.nomnom.order.dto.OrderAnalyticsResponse;
import com.nomnom.order.entity.Order;
import com.nomnom.order.entity.OrderItem;
import com.nomnom.order.entity.OrderStatus;
import com.nomnom.order.kafka.OrderEventPublisher;
import com.nomnom.order.repository.OrderRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceAnalyticsTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private OrderEventPublisher eventPublisher;
    @Mock
    private PaymentClient paymentClient;
    @Mock
    private RestaurantClient restaurantClient;
    @Mock
    private MenuClient menuClient;
    @Mock
    private TransactionTemplate transactionTemplate;

    @InjectMocks
    private OrderService orderService;

    @Test
    @DisplayName("getRestaurantAnalytics: calculates revenue including SHIPPING/DELIVERED, daily stats, and top items")
    void getRestaurantAnalytics_calculatesCorrectly() {
        UUID restaurantId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID itemA = UUID.randomUUID();
        UUID itemB = UUID.randomUUID();

        when(restaurantClient.getRestaurantById(restaurantId))
                .thenReturn(new RestaurantResponse(restaurantId, ownerId, "APPROVED"));

        Order delivered = Order.builder()
                .id(UUID.randomUUID())
                .restaurantId(restaurantId)
                .status(OrderStatus.DELIVERED)
                .totalAmount(new BigDecimal("100000"))
                .createdAt(LocalDateTime.now())
                .items(List.of(
                        OrderItem.builder().menuItemId(itemA).name("Pho Bo").quantity(2).unitPrice(new BigDecimal("50000")).calories(400).build()
                ))
                .build();

        Order shipping = Order.builder()
                .id(UUID.randomUUID())
                .restaurantId(restaurantId)
                .status(OrderStatus.SHIPPING)
                .totalAmount(new BigDecimal("50000"))
                .createdAt(LocalDateTime.now())
                .items(List.of(
                        OrderItem.builder().menuItemId(itemB).name("Tra Da").quantity(5).unitPrice(new BigDecimal("10000")).calories(0).build()
                ))
                .build();

        Order cancelled = Order.builder()
                .id(UUID.randomUUID())
                .restaurantId(restaurantId)
                .status(OrderStatus.CANCELLED)
                .totalAmount(new BigDecimal("200000"))
                .createdAt(LocalDateTime.now())
                .items(List.of())
                .build();

        when(orderRepository.findByRestaurantIdAndCreatedAtGreaterThanEqual(eq(restaurantId), any(LocalDateTime.class)))
                .thenReturn(List.of(delivered, shipping, cancelled));

        OrderAnalyticsResponse res = orderService.getRestaurantAnalytics(restaurantId, ownerId, 7);

        assertThat(res.days()).isEqualTo(7);
        assertThat(res.totalOrders()).isEqualTo(3);
        assertThat(res.completedOrders()).isEqualTo(1);
        assertThat(res.cancelledOrders()).isEqualTo(1);
        assertThat(res.activeOrders()).isEqualTo(1);
        assertThat(res.totalRevenue()).isEqualByComparingTo("150000");
        assertThat(res.deliveredRevenue()).isEqualByComparingTo("100000");
        assertThat(res.averageOrderValue()).isEqualByComparingTo("75000");
        assertThat(res.dailyStats()).hasSize(7);
        assertThat(res.topItems()).hasSize(2);
        assertThat(res.topItems().get(0).name()).isEqualTo("Tra Da");
        assertThat(res.topRestaurants()).isEmpty();
    }

    @Test
    @DisplayName("getRestaurantAnalytics: throws 403 when non-owner requests analytics")
    void getRestaurantAnalytics_nonOwnerThrowsForbidden() {
        UUID restaurantId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID intruderId = UUID.randomUUID();

        when(restaurantClient.getRestaurantById(restaurantId))
                .thenReturn(new RestaurantResponse(restaurantId, ownerId, "APPROVED"));

        assertThatThrownBy(() -> orderService.getRestaurantAnalytics(restaurantId, intruderId, 30))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    @DisplayName("getAdminAnalytics: aggregates platform orders and top restaurants")
    void getAdminAnalytics_aggregatesTopRestaurants() {
        UUID r1 = UUID.randomUUID();
        UUID r2 = UUID.randomUUID();

        Order o1 = Order.builder()
                .id(UUID.randomUUID())
                .restaurantId(r1)
                .status(OrderStatus.DELIVERED)
                .totalAmount(new BigDecimal("300000"))
                .createdAt(LocalDateTime.now())
                .items(List.of())
                .build();
        Order o2 = Order.builder()
                .id(UUID.randomUUID())
                .restaurantId(r2)
                .status(OrderStatus.CONFIRMED)
                .totalAmount(new BigDecimal("100000"))
                .createdAt(LocalDateTime.now())
                .items(List.of())
                .build();

        when(orderRepository.findByCreatedAtGreaterThanEqual(any(LocalDateTime.class)))
                .thenReturn(List.of(o1, o2));

        OrderAnalyticsResponse res = orderService.getAdminAnalytics(30);

        assertThat(res.totalOrders()).isEqualTo(2);
        assertThat(res.totalRevenue()).isEqualByComparingTo("400000");
        assertThat(res.topRestaurants()).hasSize(2);
        assertThat(res.topRestaurants().get(0).restaurantId()).isEqualTo(r1);
        assertThat(res.topRestaurants().get(0).revenue()).isEqualByComparingTo("300000");
    }
}

