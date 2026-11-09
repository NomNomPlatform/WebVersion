package com.nomnom.recommendation.ai;

import java.util.List;

public record AiResult(List<String> orderedItemIds, String explanation) {
    public static AiResult empty() {
        return new AiResult(List.of(), null);
    }

    public boolean isEmpty() {
        return orderedItemIds == null || orderedItemIds.isEmpty();
    }
}
