package com.nomnom.restaurant.repository;

import com.nomnom.restaurant.entity.Restaurant;
import com.nomnom.restaurant.entity.RestaurantStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RestaurantRepository extends JpaRepository<Restaurant, UUID> {

    List<Restaurant> findByOwnerId(UUID ownerId);

    Page<Restaurant> findByStatus(RestaurantStatus status, Pageable pageable);
}
