package com.nomnom.recommendation.domain;

public enum MealType {
    BREAKFAST(0.25), LUNCH(0.35), DINNER(0.30), SNACK(0.10);

    private final double quota;

    MealType(double quota) { this.quota = quota; }

    public double getQuota() { return quota; }
}
