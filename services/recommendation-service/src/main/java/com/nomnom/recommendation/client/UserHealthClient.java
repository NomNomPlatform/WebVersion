package com.nomnom.recommendation.client;

import com.nomnom.recommendation.config.FeignAuthForwardConfig;
import com.nomnom.recommendation.dto.HealthDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

@FeignClient(name = "user-service", configuration = FeignAuthForwardConfig.class)
public interface UserHealthClient {

    @GetMapping("/api/users/me/health")
    HealthDto getMyHealth();
}
