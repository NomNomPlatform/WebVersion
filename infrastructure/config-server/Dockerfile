# ─── Stage 1: build với Maven ─────────────────────────────────
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /workspace

# Copy parent pom trước để cache dependencies
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

# Download dependencies (tận dụng Docker cache)
RUN mvn dependency:go-offline -pl infrastructure/config-server -am -B -q || true

# Copy source code
COPY infrastructure/config-server ./infrastructure/config-server

# Build jar (skip tests để nhanh)
RUN mvn package -pl infrastructure/config-server -am -DskipTests -B -q

# ─── Stage 2: runtime nhẹ ─────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=build /workspace/infrastructure/config-server/target/*.jar app.jar

EXPOSE 8888

ENTRYPOINT ["java", "-jar", "app.jar"]
