package com.nomnom.recommendation.ai;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class AiRankingServiceTest {

    private LlmProvider provider(String name, boolean enabled, Optional<AiResult> result) {
        return new LlmProvider() {
            public String name() { return name; }
            public boolean isEnabled() { return enabled; }
            public Optional<AiResult> rank(String prompt) { return result; }
        };
    }

    @Test
    void usesFirstEnabledProviderThatSucceeds() {
        AiResult r = new AiResult(List.of("a", "b"), "because");
        AiRankingService svc = new AiRankingService(List.of(
                provider("groq", true, Optional.of(r)),
                provider("gemini", true, Optional.of(new AiResult(List.of("x"), "no")))));

        AiResult out = svc.rank("prompt");

        assertThat(out.orderedItemIds()).containsExactly("a", "b");
        assertThat(out.explanation()).isEqualTo("because");
    }

    @Test
    void fallsBackToNextProviderWhenFirstDisabledOrFails() {
        AiResult r = new AiResult(List.of("g"), "gemini result");
        AiRankingService svc = new AiRankingService(List.of(
                provider("groq", false, Optional.empty()),
                provider("broken", true, Optional.empty()),
                provider("gemini", true, Optional.of(r))));

        AiResult out = svc.rank("prompt");

        assertThat(out.orderedItemIds()).containsExactly("g");
    }

    @Test
    void returnsEmptyWhenAllProvidersUnavailable() {
        AiRankingService svc = new AiRankingService(List.of(
                provider("groq", false, Optional.empty()),
                provider("gemini", true, Optional.empty())));

        assertThat(svc.rank("prompt").isEmpty()).isTrue();
    }

    @Test
    void swallowsProviderExceptionAndContinues() {
        LlmProvider throwing = new LlmProvider() {
            public String name() { return "throwing"; }
            public boolean isEnabled() { return true; }
            public Optional<AiResult> rank(String prompt) { throw new RuntimeException("boom"); }
        };
        AiResult r = new AiResult(List.of("ok"), "e");
        AiRankingService svc = new AiRankingService(List.of(throwing,
                provider("gemini", true, Optional.of(r))));

        assertThat(svc.rank("prompt").orderedItemIds()).containsExactly("ok");
    }
}
