package com.nomnom.menu.service;

import com.nomnom.menu.client.RestaurantClient;
import com.nomnom.menu.dto.MenuItemRequest;
import com.nomnom.menu.dto.MenuItemResponse;
import com.nomnom.menu.dto.PageResponse;
import com.nomnom.menu.entity.MenuItem;
import com.nomnom.menu.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MenuItemService {

    private final MenuItemRepository menuItemRepository;
    private final RestaurantClient restaurantClient;

    public PageResponse<MenuItemResponse> getByRestaurant(UUID restaurantId,
                                                          String category,
                                                          String userRole,
                                                          Pageable pageable) {
        boolean isOwner = "RESTAURANT_OWNER".equals(userRole);

        if (category != null && !category.isBlank()) {
            MenuItem.Category cat = parseCategory(category);
            Page<MenuItem> page = isOwner
                ? menuItemRepository.findByRestaurantIdAndCategory(restaurantId, cat, pageable)
                : menuItemRepository.findByRestaurantIdAndCategoryAndIsAvailableTrue(restaurantId, cat, pageable);
            return PageResponse.from(page.map(this::toResponse));
        }

        Page<MenuItem> page = isOwner
            ? menuItemRepository.findByRestaurantId(restaurantId, pageable)
            : menuItemRepository.findByRestaurantIdAndIsAvailableTrue(restaurantId, pageable);
        return PageResponse.from(page.map(this::toResponse));
    }

    @Transactional
    public MenuItemResponse create(UUID restaurantId, MenuItemRequest request) {
        MenuItem item = MenuItem.builder()
                .restaurantId(restaurantId)
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .calories(request.getCalories())
                .proteinG(request.getProteinG())
                .carbG(request.getCarbG())
                .fatG(request.getFatG())
                .category(parseCategory(request.getCategory()))
                .imageUrl(request.getImageUrl())
                .isAvailable(true)
                .build();
        return toResponse(menuItemRepository.save(item));
    }

    @Transactional
    public MenuItemResponse update(UUID itemId, MenuItemRequest request, UUID requesterId) {
        MenuItem item = menuItemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Menu item not found"));
        assertOwner(item, requesterId);

        item.setName(request.getName());
        item.setDescription(request.getDescription());
        item.setPrice(request.getPrice());
        item.setCalories(request.getCalories());
        item.setProteinG(request.getProteinG());
        item.setCarbG(request.getCarbG());
        item.setFatG(request.getFatG());
        item.setCategory(parseCategory(request.getCategory()));
        item.setImageUrl(request.getImageUrl());
        if (request.getIsAvailable() != null) {
            item.setIsAvailable(request.getIsAvailable());
        }

        return toResponse(menuItemRepository.save(item));
    }

    @Transactional
    public void delete(UUID itemId, UUID requesterId) {
        MenuItem item = findAvailableOrThrow(itemId);
        assertOwner(item, requesterId);
        item.setIsAvailable(false);
        menuItemRepository.save(item);
    }

    public MenuItemResponse getById(UUID itemId) {
        return toResponse(findAvailableOrThrow(itemId));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private MenuItem findAvailableOrThrow(UUID itemId) {
        MenuItem item = menuItemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Menu item not found: " + itemId));
        if (!item.getIsAvailable()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Menu item not found: " + itemId);
        }
        return item;
    }

    private void assertOwner(MenuItem item, UUID requesterId) {
        RestaurantClient.RestaurantResponse restaurant =
                restaurantClient.getRestaurantById(item.getRestaurantId());
        if (restaurant == null || restaurant.ownerId() == null
                || !restaurant.ownerId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Not your menu item");
        }
    }

    private MenuItem.Category parseCategory(String category) {
        try {
            return MenuItem.Category.valueOf(category.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid category: " + category + ". Must be one of: MAIN, SIDE, DRINK, DESSERT");
        }
    }

    private MenuItemResponse toResponse(MenuItem item) {
        return MenuItemResponse.builder()
                .id(item.getId())
                .restaurantId(item.getRestaurantId())
                .name(item.getName())
                .description(item.getDescription())
                .price(item.getPrice())
                .calories(item.getCalories())
                .proteinG(item.getProteinG())
                .carbG(item.getCarbG())
                .fatG(item.getFatG())
                .category(item.getCategory().name())
                .imageUrl(item.getImageUrl())
                .isAvailable(item.getIsAvailable())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
