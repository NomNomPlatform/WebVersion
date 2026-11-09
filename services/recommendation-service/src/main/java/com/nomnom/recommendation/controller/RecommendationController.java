package com.nomnom.recommendation.controller;

import com.nomnom.recommendation.ai.LlmProvider;
import com.nomnom.recommendation.document.RecommendationLog;
import com.nomnom.recommendation.dto.RecommendationConfigResponse;
import com.nomnom.recommendation.dto.RecommendationRequest;
import com.nomnom.recommendation.dto.RecommendationResponse;
import com.nomnom.recommendation.service.RecommendationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final List<LlmProvider> llmProviders;

    @PostMapping
    public RecommendationResponse recommend(@RequestHeader("X-User-Id") UUID userId,
                                            @Valid @RequestBody RecommendationRequest request) {
        return recommendationService.recommend(userId, request);
    }

    @GetMapping("/history")
    public Page<RecommendationLog> history(@RequestHeader("X-User-Id") UUID userId,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "10") int size) {
        return recommendationService.history(userId,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }

    /**
     * FE dùng để ẩn/hiện checkbox "Xếp hạng bằng AI" và hiển thị badge provider.
     */
    @GetMapping("/config")
    public RecommendationConfigResponse config() {
        List<String> enabled = llmProviders.stream()
                .filter(LlmProvider::isEnabled)
                .map(LlmProvider::name)
                .toList();
        return RecommendationConfigResponse.builder()
                .aiEnabled(!enabled.isEmpty())
                .enabledProviders(enabled)
                .maxResults(3)
                .build();
    }
}
