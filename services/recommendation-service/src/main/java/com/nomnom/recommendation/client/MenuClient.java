package com.nomnom.recommendation.client;

import com.nomnom.recommendation.dto.MenuItemDto;
import com.nomnom.recommendation.dto.PageResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

@FeignClient(name = "menu-service")
public interface MenuClient {

    @GetMapping("/api/restaurants/{restaurantId}/items")
    PageResponse<MenuItemDto> getItems(@PathVariable("restaurantId") UUID restaurantId,
                                       @RequestParam(value = "size", defaultValue = "100") int size);
}
