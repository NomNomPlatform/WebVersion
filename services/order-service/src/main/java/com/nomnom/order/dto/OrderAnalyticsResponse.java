package com.nomnom.order.dto;

import com.nomnom.order.entity.OrderStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Thống kê tổng hợp đơn hàng và doanh thu trong khoảng thời gian cho Owner hoặc Admin.
 */
public record OrderAnalyticsResponse(
        int days,
        long totalOrders,
        long completedOrders,
        long cancelledOrders,
        long activeOrders,
        BigDecimal totalRevenue,
        BigDecimal deliveredRevenue,
        BigDecimal averageOrderValue,
        Map<OrderStatus, Long> statusBreakdown,
        List<DailyOrderStat> dailyStats,
        List<TopMenuItemStat> topItems,
        List<TopRestaurantStat> topRestaurants
) {
    public record DailyOrderStat(
            String date,
            long orderCount,
            BigDecimal revenue
    ) {}

    public record TopMenuItemStat(
            UUID menuItemId,
            String name,
            long totalQuantity,
            BigDecimal totalRevenue
    ) {}

    public record TopRestaurantStat(
            UUID restaurantId,
            long orderCount,
            BigDecimal revenue
    ) {}
}

