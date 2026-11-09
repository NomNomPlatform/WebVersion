package com.nomnom.recommendation.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

/** Trả về cho FE biết AI có bật không và có các provider nào. */
@Data
@Builder
public class RecommendationConfigResponse {
    private boolean aiEnabled;
    private List<String> enabledProviders;
    private int maxResults;
}
