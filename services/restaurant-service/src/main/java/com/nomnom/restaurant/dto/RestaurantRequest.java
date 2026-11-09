package com.nomnom.restaurant.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class RestaurantRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    @NotBlank(message = "Address is required")
    private String address;

    private String phone;

    private String cuisineType;

    private String imageUrl;

    private List<OperatingHoursDto> operatingHours;

    @Data
    public static class OperatingHoursDto {
        private String dayOfWeek;
        private String openTime;
        private String closeTime;
    }
}
