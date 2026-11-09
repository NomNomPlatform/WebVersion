package com.nomnom.menu.repository;

import com.nomnom.menu.entity.MenuItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface MenuItemRepository extends JpaRepository<MenuItem, UUID> {

    Page<MenuItem> findByRestaurantIdAndIsAvailableTrue(UUID restaurantId, Pageable pageable);

    Page<MenuItem> findByRestaurantIdAndCategoryAndIsAvailableTrue(
            UUID restaurantId, MenuItem.Category category, Pageable pageable);

    Page<MenuItem> findByRestaurantId(UUID restaurantId, Pageable pageable);

    Page<MenuItem> findByRestaurantIdAndCategory(
            UUID restaurantId, MenuItem.Category category, Pageable pageable);
}
