package com.nomnom.recommendation.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class MenuItemDto {
    private UUID id;
    private UUID restaurantId;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer calories;
    private Double proteinG;
    private Double carbG;
    private Double fatG;
    private String category;
    private String imageUrl;
    private Boolean isAvailable;
}
