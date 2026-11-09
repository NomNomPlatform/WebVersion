package com.nomnom.restaurant.controller;

import com.nomnom.restaurant.dto.PageResponse;
import com.nomnom.restaurant.dto.RestaurantRequest;
import com.nomnom.restaurant.dto.RestaurantResponse;
import com.nomnom.restaurant.service.RestaurantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/restaurants")
@RequiredArgsConstructor
public class RestaurantController {

    private final RestaurantService restaurantService;

    /** Public — danh sách nhà hàng đang hoạt động */
    @GetMapping
    public ResponseEntity<PageResponse<RestaurantResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(restaurantService.getAll(pageable));
    }

    /** Public — chi tiết một nhà hàng */
    @GetMapping("/{id}")
    public ResponseEntity<RestaurantResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(restaurantService.getById(id));
    }

    /** RESTAURANT_OWNER only — lấy nhà hàng của chính mình (bất kể status) */
    @GetMapping("/my")
    public ResponseEntity<RestaurantResponse> getMyRestaurant(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        
        requireRole(userRole, "RESTAURANT_OWNER");
        UUID ownerId = parseUserId(userId);
        RestaurantResponse res = restaurantService.getByOwnerId(ownerId);
        if (res == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(res);
    }

    /** RESTAURANT_OWNER only — tạo nhà hàng */
    @PostMapping
    public ResponseEntity<RestaurantResponse> create(
            @Valid @RequestBody RestaurantRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {

        requireRole(userRole, "RESTAURANT_OWNER");
        UUID ownerId = parseUserId(userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(restaurantService.create(request, ownerId));
    }

    /** RESTAURANT_OWNER — cập nhật (phải là chủ sở hữu) */
    @PutMapping("/{id}")
    public ResponseEntity<RestaurantResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody RestaurantRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {

        requireRole(userRole, "RESTAURANT_OWNER");
        UUID requesterId = parseUserId(userId);
        return ResponseEntity.ok(restaurantService.update(id, request, requesterId));
    }

    /** RESTAURANT_OWNER — xóa mềm (phải là chủ sở hữu) */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {

        requireRole(userRole, "RESTAURANT_OWNER");
        UUID requesterId = parseUserId(userId);
        restaurantService.delete(id, requesterId);
        return ResponseEntity.noContent().build();
    }

    /** ADMIN only — danh sách nhà hàng đang chờ duyệt */
    @GetMapping("/admin/pending")
    public ResponseEntity<PageResponse<RestaurantResponse>> getPending(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {

        requireRole(userRole, "ADMIN");
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").ascending());
        return ResponseEntity.ok(restaurantService.getAllPending(pageable));
    }

    /** ADMIN only — danh sách tất cả nhà hàng (bất kể status) */
    @GetMapping("/admin/all")
    public ResponseEntity<PageResponse<RestaurantResponse>> getAllForAdmin(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {

        requireRole(userRole, "ADMIN");
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(restaurantService.getAllForAdmin(pageable));
    }

    /** ADMIN only — duyệt nhà hàng */
    @PostMapping("/admin/{id}/approve")
    public ResponseEntity<RestaurantResponse> approve(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {

        requireRole(userRole, "ADMIN");
        UUID adminId = parseUserId(userId);
        return ResponseEntity.ok(restaurantService.approveRestaurant(id, adminId));
    }

    /** ADMIN only — từ chối nhà hàng */
    @PostMapping("/admin/{id}/reject")
    public ResponseEntity<RestaurantResponse> reject(
            @PathVariable UUID id,
            @RequestBody(required = false) String reason,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {

        requireRole(userRole, "ADMIN");
        UUID adminId = parseUserId(userId);
        return ResponseEntity.ok(restaurantService.rejectRestaurant(id, adminId, reason));
    }

    /** ADMIN only — tạm ngừng nhà hàng */
    @PostMapping("/admin/{id}/suspend")
    public ResponseEntity<RestaurantResponse> suspend(
            @PathVariable UUID id,
            @RequestBody(required = false) String reason,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {

        requireRole(userRole, "ADMIN");
        UUID adminId = parseUserId(userId);
        return ResponseEntity.ok(restaurantService.suspendRestaurant(id, adminId, reason));
    }

    /** ADMIN only — kích hoạt lại nhà hàng */
    @PostMapping("/admin/{id}/activate")
    public ResponseEntity<RestaurantResponse> activate(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {

        requireRole(userRole, "ADMIN");
        UUID adminId = parseUserId(userId);
        return ResponseEntity.ok(restaurantService.activateRestaurant(id, adminId));
    }

    /** RESTAURANT_OWNER only — gửi lại yêu cầu sau khi bị từ chối */
    @PostMapping("/{id}/resubmit")
    public ResponseEntity<RestaurantResponse> resubmit(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {

        requireRole(userRole, "RESTAURANT_OWNER");
        UUID ownerId = parseUserId(userId);
        return ResponseEntity.ok(restaurantService.resubmitRestaurant(id, ownerId));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void requireRole(String userRole, String required) {
        if (userRole == null || !userRole.equals(required)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied: role " + required + " required");
        }
    }

    private UUID parseUserId(String userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-User-Id header");
        }
        try {
            return UUID.fromString(userId);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid X-User-Id format");
        }
    }
}
