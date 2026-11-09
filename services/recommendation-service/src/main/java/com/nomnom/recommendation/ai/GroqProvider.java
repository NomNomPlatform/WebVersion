package com.nomnom.recommendation.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nomnom.recommendation.config.AiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Order(1)
@Component
public class GroqProvider implements LlmProvider {

    private final AiProperties props;
    private final ObjectMapper mapper = new ObjectMapper();
    private final WebClient webClient = WebClient.builder().build();

    public GroqProvider(AiProperties props) {
        this.props = props;
    }

    @Override
    public String name() { return "groq"; }

    @Override
    public boolean isEnabled() {
        return props.getGroq().getApiKey() != null && !props.getGroq().getApiKey().isBlank();
    }

    @Override
    public Optional<AiResult> rank(String prompt) {
        AiProperties.Provider cfg = props.getGroq();
        String baseUrl = cfg.getBaseUrl() != null ? cfg.getBaseUrl() : "https://api.groq.com/openai/v1";
        Map<String, Object> body = Map.of(
                "model", cfg.getModel() != null ? cfg.getModel() : "llama-3.3-70b-versatile",
                "temperature", 0.2,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(Map.of("role", "user", "content", prompt)));

        String response = webClient.post()
                .uri(baseUrl + "/chat/completions")
                .header("Authorization", "Bearer " + cfg.getApiKey())
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofMillis(props.getTimeoutMs()))
                .block();

        return parseOpenAiStyle(response);
    }

    private Optional<AiResult> parseOpenAiStyle(String response) {
        try {
            JsonNode root = mapper.readTree(response);
            String content = root.path("choices").get(0).path("message").path("content").asText();
            return Optional.of(parseContent(content, mapper));
        } catch (Exception ex) {
            log.warn("Parse Groq response error: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    static AiResult parseContent(String content, ObjectMapper mapper) throws Exception {
        JsonNode node = mapper.readTree(content);
        List<String> ids = new ArrayList<>();
        node.path("orderedItemIds").forEach(n -> ids.add(n.asText()));
        return new AiResult(ids, node.path("explanation").asText(null));
    }
}
