package com.nomnom.recommendation.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class AiRankingService {

    private final List<LlmProvider> providers;

    public AiRankingService(List<LlmProvider> providers) {
        this.providers = providers;
    }

    public AiResult rank(String prompt) {
        for (LlmProvider p : providers) {
            if (!p.isEnabled()) {
                continue;
            }
            try {
                Optional<AiResult> result = p.rank(prompt);
                if (result.isPresent() && !result.get().isEmpty()) {
                    log.info("AI ranking by provider {}", p.name());
                    return result.get();
                }
            } catch (Exception ex) {
                log.warn("Provider {} failed, trying next: {}", p.name(), ex.getMessage());
            }
        }
        log.info("No AI provider available, falling back to rule-based");
        return AiResult.empty();
    }
}
