package com.nomnom.order.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "order_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Order order;

    @Column(nullable = false)
    private UUID menuItemId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private Integer calories;

}
