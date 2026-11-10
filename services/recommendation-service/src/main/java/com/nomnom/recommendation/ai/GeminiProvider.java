package com.nomnom.recommendation.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nomnom.recommendation.config.AiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Order(2)
@Component
public class GeminiProvider implements LlmProvider {

    private final AiProperties props;
    private final ObjectMapper mapper = new ObjectMapper();
    private final WebClient webClient = WebClient.builder().build();

    public GeminiProvider(AiProperties props) {
        this.props = props;
    }

    @Override
    public String name() { return "gemini"; }

    @Override
    public boolean isEnabled() {
        return props.getGemini().getApiKey() != null && !props.getGemini().getApiKey().isBlank();
    }

    @Override
    public Optional<AiResult> rank(String prompt) {
        AiProperties.Provider cfg = props.getGemini();
        String model = cfg.getModel() != null ? cfg.getModel() : "gemini-flash-lite-latest";
        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model + ":generateContent?key=" + cfg.getApiKey();

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of("responseMimeType", "application/json"));

        String response = webClient.post()
                .uri(url)
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofMillis(props.getTimeoutMs()))
                .block();

        try {
            JsonNode root = mapper.readTree(response);
            String content = root.path("candidates").get(0).path("content")
                    .path("parts").get(0).path("text").asText();
            return Optional.of(GroqProvider.parseContent(content, mapper));
        } catch (Exception ex) {
            log.warn("Parse Gemini response error: {}", ex.getMessage());
            return Optional.empty();
        }
    }
}
