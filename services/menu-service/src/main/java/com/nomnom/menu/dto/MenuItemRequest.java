package com.nomnom.menu.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class MenuItemRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
    private BigDecimal price;

    @NotNull(message = "Calories is required")
    private Integer calories;

    @NotNull(message = "Protein (proteinG) is required")
    private Double proteinG;

    @NotNull(message = "Carbohydrate (carbG) is required")
    private Double carbG;

    @NotNull(message = "Fat (fatG) is required")
    private Double fatG;

    @NotNull(message = "Category is required")
    private String category;

    private String imageUrl;

    private Boolean isAvailable;
}
