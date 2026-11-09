package com.nomnom.recommendation.ai;

import java.util.Optional;

public interface LlmProvider {
    String name();
    boolean isEnabled();
    Optional<AiResult> rank(String prompt);
}
