package com.nomnom.menu.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(name = "restaurant-service")
public interface RestaurantClient {

    @GetMapping("/api/restaurants/{id}")
    RestaurantResponse getRestaurantById(@PathVariable("id") UUID id);

    record RestaurantResponse(UUID id, UUID ownerId, String status) {}
}
