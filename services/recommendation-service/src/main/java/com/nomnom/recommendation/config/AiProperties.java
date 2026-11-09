package com.nomnom.recommendation.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Data
@Component
@ConfigurationProperties(prefix = "nomnom.ai")
public class AiProperties {
    private Provider groq = new Provider();
    private Provider gemini = new Provider();
    private List<String> order = List.of("groq", "gemini");
    private long timeoutMs = 5000;

    @Data
    public static class Provider {
        private String apiKey = "";
        private String model;
        private String baseUrl;
    }
}
