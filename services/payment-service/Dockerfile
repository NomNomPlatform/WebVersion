# ─── Stage 1: build với Maven ─────────────────────────────────
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /workspace

COPY pom.xml ./pom.xml

# Copy ALL module pom.xml files so Maven can resolve the reactor
COPY infrastructure/config-server/pom.xml ./infrastructure/config-server/pom.xml
COPY infrastructure/eureka-server/pom.xml ./infrastructure/eureka-server/pom.xml
COPY infrastructure/api-gateway/pom.xml ./infrastructure/api-gateway/pom.xml
COPY services/user-service/pom.xml ./services/user-service/pom.xml
COPY services/restaurant-service/pom.xml ./services/restaurant-service/pom.xml
COPY services/menu-service/pom.xml ./services/menu-service/pom.xml
COPY services/order-service/pom.xml ./services/order-service/pom.xml
COPY services/payment-service/pom.xml ./services/payment-service/pom.xml
COPY services/recommendation-service/pom.xml ./services/recommendation-service/pom.xml
COPY services/notification-service/pom.xml ./services/notification-service/pom.xml

RUN mvn dependency:go-offline -pl services/payment-service -am -B -q || true

COPY services/payment-service ./services/payment-service

RUN mvn package -pl services/payment-service -am -DskipTests -B -q

# ─── Stage 2: runtime nhẹ ─────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=build /workspace/services/payment-service/target/*.jar app.jar

EXPOSE 8085

ENTRYPOINT ["java", "-jar", "app.jar"]
