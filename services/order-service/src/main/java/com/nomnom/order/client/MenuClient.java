package com.nomnom.order.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.math.BigDecimal;
import java.util.UUID;

@FeignClient(name = "menu-service")
public interface MenuClient {

    @GetMapping("/api/items/{id}")
    MenuItemResponse getItemById(@PathVariable("id") UUID id);

    record MenuItemResponse(UUID id, UUID restaurantId, String name, BigDecimal price,
            Integer calories, Boolean isAvailable) {
    }
}
