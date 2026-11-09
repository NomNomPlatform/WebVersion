package com.nomnom.recommendation.repository;

import com.nomnom.recommendation.document.RecommendationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.UUID;

public interface RecommendationLogRepository extends MongoRepository<RecommendationLog, String> {
    Page<RecommendationLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
}
