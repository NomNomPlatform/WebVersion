package com.nomnom.restaurant.service;

import com.nomnom.restaurant.dto.PageResponse;
import com.nomnom.restaurant.dto.RestaurantRequest;
import com.nomnom.restaurant.dto.RestaurantResponse;
import com.nomnom.restaurant.entity.OperatingHours;
import com.nomnom.restaurant.entity.Restaurant;
import com.nomnom.restaurant.entity.RestaurantStatus;
import com.nomnom.restaurant.repository.RestaurantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RestaurantService {

    private final RestaurantRepository restaurantRepository;

    public PageResponse<RestaurantResponse> getAll(Pageable pageable) {
        return PageResponse.from(restaurantRepository.findByStatus(RestaurantStatus.APPROVED, pageable)
                .map(this::toResponse));
    }

    public PageResponse<RestaurantResponse> getAllForAdmin(Pageable pageable) {
        return PageResponse.from(restaurantRepository.findAll(pageable)
                .map(this::toResponse));
    }

    public RestaurantResponse getById(UUID id) {
        Restaurant restaurant = findByIdOrThrow(id);
        return toResponse(restaurant);
    }

    public RestaurantResponse getByOwnerId(UUID ownerId) {
        List<Restaurant> restaurants = restaurantRepository.findByOwnerId(ownerId);
        if (restaurants.isEmpty()) return null;
        return toResponse(restaurants.get(0));
    }

    @Transactional
    public RestaurantResponse create(RestaurantRequest request, UUID ownerId) {
        Restaurant restaurant = Restaurant.builder()
                .ownerId(ownerId)
                .name(request.getName())
                .description(request.getDescription())
                .address(request.getAddress())
                .phone(request.getPhone())
                .cuisineType(request.getCuisineType())
                .imageUrl(request.getImageUrl())
                .status(RestaurantStatus.PENDING)
                .build();

        mapOperatingHours(request, restaurant);
        return toResponse(restaurantRepository.save(restaurant));
    }

    @Transactional
    public RestaurantResponse update(UUID id, RestaurantRequest request, UUID requesterId) {
        Restaurant restaurant = findByIdOrThrow(id);
        assertOwner(restaurant, requesterId);

        restaurant.setName(request.getName());
        restaurant.setDescription(request.getDescription());
        restaurant.setAddress(request.getAddress());
        restaurant.setPhone(request.getPhone());
        restaurant.setCuisineType(request.getCuisineType());
        restaurant.setImageUrl(request.getImageUrl());

        restaurant.getOperatingHours().clear();
        mapOperatingHours(request, restaurant);

        return toResponse(restaurantRepository.save(restaurant));
    }

    @Transactional
    public void delete(UUID id, UUID requesterId) {
        Restaurant restaurant = findByIdOrThrow(id);
        assertOwner(restaurant, requesterId);
        restaurant.setStatus(RestaurantStatus.SUSPENDED);
        restaurantRepository.save(restaurant);
    }

    @Transactional
    public RestaurantResponse approveRestaurant(UUID id, UUID adminId) {
        Restaurant restaurant = findByIdOrThrow(id);
        restaurant.setStatus(RestaurantStatus.APPROVED);
        return toResponse(restaurantRepository.save(restaurant));
    }

    @Transactional
    public RestaurantResponse rejectRestaurant(UUID id, UUID adminId, String reason) {
        Restaurant restaurant = findByIdOrThrow(id);
        restaurant.setStatus(RestaurantStatus.REJECTED);
        restaurant.setRejectionReason(reason);
        return toResponse(restaurantRepository.save(restaurant));
    }

    @Transactional
    public RestaurantResponse suspendRestaurant(UUID id, UUID adminId, String reason) {
        Restaurant restaurant = findByIdOrThrow(id);
        restaurant.setStatus(RestaurantStatus.SUSPENDED);
        restaurant.setSuspendReason(reason);
        return toResponse(restaurantRepository.save(restaurant));
    }

    @Transactional
    public RestaurantResponse activateRestaurant(UUID id, UUID adminId) {
        Restaurant restaurant = findByIdOrThrow(id);
        restaurant.setStatus(RestaurantStatus.APPROVED);
        return toResponse(restaurantRepository.save(restaurant));
    }

    @Transactional
    public RestaurantResponse resubmitRestaurant(UUID id, UUID ownerId) {
        Restaurant restaurant = findByIdOrThrow(id);
        assertOwner(restaurant, ownerId);
        if (restaurant.getStatus() != RestaurantStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only rejected restaurants can be resubmitted");
        }
        restaurant.setStatus(RestaurantStatus.PENDING);
        restaurant.setRejectionReason(null);
        return toResponse(restaurantRepository.save(restaurant));
    }

    public PageResponse<RestaurantResponse> getAllPending(Pageable pageable) {
        return PageResponse.from(restaurantRepository.findByStatus(RestaurantStatus.PENDING, pageable)
                .map(this::toResponse));
    }

    private Restaurant findApprovedOrThrow(UUID id) {
        Restaurant restaurant = findByIdOrThrow(id);
        if (restaurant.getStatus() != RestaurantStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Restaurant not found: " + id);
        }
        return restaurant;
    }

    private Restaurant findByIdOrThrow(UUID id) {
        return restaurantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Restaurant not found: " + id));
    }

    private void assertOwner(Restaurant restaurant, UUID requesterId) {
        if (!restaurant.getOwnerId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your restaurant");
        }
    }

    private void mapOperatingHours(RestaurantRequest request, Restaurant restaurant) {
        if (request.getOperatingHours() == null) return;
        request.getOperatingHours().forEach(dto -> {
            OperatingHours oh = OperatingHours.builder()
                    .restaurant(restaurant)
                    .dayOfWeek(OperatingHours.DayOfWeek.valueOf(dto.getDayOfWeek()))
                    .openTime(LocalTime.parse(dto.getOpenTime()))
                    .closeTime(LocalTime.parse(dto.getCloseTime()))
                    .build();
            restaurant.getOperatingHours().add(oh);
        });
    }

    private RestaurantResponse toResponse(Restaurant r) {
        List<RestaurantResponse.OperatingHoursDto> ohDtos = r.getOperatingHours() == null
                ? Collections.emptyList()
                : r.getOperatingHours().stream()
                .map(oh -> RestaurantResponse.OperatingHoursDto.builder()
                        .dayOfWeek(oh.getDayOfWeek().name())
                        .openTime(oh.getOpenTime())
                        .closeTime(oh.getCloseTime())
                        .build())
                .toList();

        return RestaurantResponse.builder()
                .id(r.getId())
                .ownerId(r.getOwnerId())
                .name(r.getName())
                .description(r.getDescription())
                .address(r.getAddress())
                .phone(r.getPhone())
                .cuisineType(r.getCuisineType())
                .imageUrl(r.getImageUrl())
                .status(r.getStatus().name())
                .rejectionReason(r.getRejectionReason())
                .suspendReason(r.getSuspendReason())
                .createdAt(r.getCreatedAt())
                .operatingHours(ohDtos)
                .build();
    }
}
