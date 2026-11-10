package com.nomnom.menu.controller;

import com.nomnom.menu.dto.MenuItemRequest;
import com.nomnom.menu.dto.MenuItemResponse;
import com.nomnom.menu.dto.PageResponse;
import com.nomnom.menu.service.MenuItemImageStorageService;
import com.nomnom.menu.service.MenuItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class MenuItemController {

    private final MenuItemService menuItemService;
    private final MenuItemImageStorageService menuItemImageStorageService;

    /** RESTAURANT_OWNER only — upload ảnh món ăn */
    @PostMapping(value = "/api/items/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {

        requireRole(userRole, "RESTAURANT_OWNER");
        String imageUrl = menuItemImageStorageService.save(file);
        return ResponseEntity.ok(Map.of("imageUrl", imageUrl));
    }

    /** Public — serve ảnh tĩnh của món ăn kèm cache */
    @GetMapping("/api/items/images/{filename:.+}")
    public ResponseEntity<Resource> getImage(@PathVariable String filename) {
        Resource resource = menuItemImageStorageService.loadAsResource(filename);
        MediaType contentType = mediaTypeFor(filename);
        return ResponseEntity.ok()
                .contentType(contentType)
                .header("Cache-Control", "public, max-age=86400")
                .body(resource);
    }

    /** Public — danh sách món ăn của nhà hàng, filter theo category */
    @GetMapping("/api/restaurants/{restaurantId}/items")
    public ResponseEntity<PageResponse<MenuItemResponse>> getByRestaurant(
            @PathVariable UUID restaurantId,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(menuItemService.getByRestaurant(restaurantId, category, userRole, pageable));
    }

    /** RESTAURANT_OWNER — thêm món vào nhà hàng */
    @PostMapping("/api/restaurants/{restaurantId}/items")
    public ResponseEntity<MenuItemResponse> create(
            @PathVariable UUID restaurantId,
            @Valid @RequestBody MenuItemRequest request,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireRole(userRole, "RESTAURANT_OWNER");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(menuItemService.create(restaurantId, request));
    }

    /** Public/internal — lấy 1 món ăn theo id (dùng để order-service xác thực giá) */
    @GetMapping("/api/items/{itemId}")
    public ResponseEntity<MenuItemResponse> getById(@PathVariable UUID itemId) {
        return ResponseEntity.ok(menuItemService.getById(itemId));
    }

    /** RESTAURANT_OWNER — cập nhật món (ownership: item phải thuộc restaurantId của requester) */
    @PutMapping("/api/items/{itemId}")
    public ResponseEntity<MenuItemResponse> update(
            @PathVariable UUID itemId,
            @Valid @RequestBody MenuItemRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireRole(userRole, "RESTAURANT_OWNER");
        UUID requesterId = parseUserId(userId);
        return ResponseEntity.ok(menuItemService.update(itemId, request, requesterId));
    }

    /** RESTAURANT_OWNER — xóa mềm (isAvailable=false) */
    @DeleteMapping("/api/items/{itemId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID itemId,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireRole(userRole, "RESTAURANT_OWNER");
        UUID requesterId = parseUserId(userId);
        menuItemService.delete(itemId, requesterId);
        return ResponseEntity.noContent().build();
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

    private static MediaType mediaTypeFor(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lower.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        return MediaType.IMAGE_JPEG;
    }
}
