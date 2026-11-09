package com.nomnom.restaurant.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class RestaurantResponse {

    private UUID id;
    private UUID ownerId;
    private String name;
    private String description;
    private String address;
    private String phone;
    private String cuisineType;
    private String imageUrl;
    private String status;
    private String rejectionReason;
    private String suspendReason;
    private LocalDateTime createdAt;
    private List<OperatingHoursDto> operatingHours;

    @Data
    @Builder
    public static class OperatingHoursDto {
        private String dayOfWeek;
        private LocalTime openTime;
        private LocalTime closeTime;
    }
}
