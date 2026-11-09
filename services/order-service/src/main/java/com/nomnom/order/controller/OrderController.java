package com.nomnom.order.controller;

import com.nomnom.order.dto.OrderRequest;
import com.nomnom.order.dto.PageResponse;
import com.nomnom.order.dto.CreateOrderResponse;
import com.nomnom.order.entity.Order;
import com.nomnom.order.entity.OrderStatus;
import com.nomnom.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreateOrderResponse createOrder(
            @RequestHeader("X-User-Id") UUID customerId,
            @RequestBody OrderRequest request) {
        return orderService.createOrder(customerId, request);
    }

    @GetMapping("/{id}")
    public Order getOrderById(
            @PathVariable("id") UUID id,
            @RequestHeader("X-User-Id") UUID userId) {
        return orderService.getOrderById(id, userId);
    }

    @GetMapping("/me")
    public Page<Order> getMyOrders(
            @RequestHeader("X-User-Id") UUID customerId,
            Pageable pageable) {
        return orderService.getMyOrders(customerId, pageable);
    }

    @GetMapping("/restaurant/{restaurantId}")
    public Page<Order> getRestaurantOrders(
            @PathVariable("restaurantId") UUID restaurantId,
            @RequestHeader("X-User-Id") UUID ownerId,
            @RequestHeader("X-User-Role") String role,
            Pageable pageable) {
        
        if (!"RESTAURANT_OWNER".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only owners can view restaurant orders");
        }
        
        return orderService.getRestaurantOrders(restaurantId, ownerId, pageable);
    }

    @PutMapping("/{id}/status")
    public void updateOrderStatus(
            @PathVariable("id") UUID id,
            @RequestHeader("X-User-Id") UUID ownerId,
            @RequestHeader("X-User-Role") String role,
            @RequestBody OrderStatusUpdateRequest request) {
        
        if (!"RESTAURANT_OWNER".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only owners can update status");
        }
        
        orderService.updateOrderStatus(id, ownerId, request.status());
    }

    @GetMapping("/admin/all")
    public PageResponse<Order> getAllOrdersForAdmin(
            @RequestHeader("X-User-Role") String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        if (!"ADMIN".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: role ADMIN required");
        }
        
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return PageResponse.from(orderService.getAllOrders(pageable));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOrder(
            @PathVariable("id") UUID id,
            @RequestHeader("X-User-Id") UUID customerId) {
        orderService.deleteOrder(id, customerId);
    }

    /**
     * Customer xác nhận đã nhận hàng (SHIPPING → DELIVERED).
     * Tách riêng khỏi {@link #updateOrderStatus} vì:
     * 1. Endpoint cũ yêu cầu role RESTAURANT_OWNER.
     * 2. Customer chỉ được phép chuyển SHIPPING → DELIVERED, không phải trạng thái khác.
     */
    @PutMapping("/{id}/delivered")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirmDelivery(
            @PathVariable("id") UUID id,
            @RequestHeader("X-User-Id") UUID customerId) {
        orderService.confirmDelivery(id, customerId);
    }

    public record OrderStatusUpdateRequest(OrderStatus status) {}
}
