# Khoi dong toan bo NomNom platform: infra (docker) + cac Spring Boot service theo dung thu tu.
# Chay: powershell -ExecutionPolicy Bypass -File scripts/start-all.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "==> 1. Khoi dong infrastructure (Postgres, MongoDB, Redis, Kafka)..." -ForegroundColor Cyan
docker compose -f "$root/docker-compose.infra.yml" up -d postgres mongodb redis zookeeper kafka kafka-ui

Write-Host "==> Cho infra san sang (10s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Thu tu khoi dong: config-server -> eureka-server -> api-gateway -> cac business service
$modules = @(
    "infrastructure/config-server",
    "infrastructure/eureka-server",
    "infrastructure/api-gateway",
    "services/user-service",
    "services/restaurant-service",
    "services/menu-service",
    "services/order-service",
    "services/payment-service",
    "services/recommendation-service",
    "services/notification-service"
)

foreach ($m in $modules) {
    $path = Join-Path $root $m
    $name = Split-Path $m -Leaf
    Write-Host "==> Khoi dong $name ..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$path'; mvn spring-boot:run" -WindowStyle Normal
    Start-Sleep -Seconds 3
}

Write-Host "==> Tat ca service da duoc mo trong cua so rieng." -ForegroundColor Cyan
Write-Host "    Eureka dashboard: http://localhost:8761"
Write-Host "    API Gateway:      http://localhost:8080"
Write-Host "    Config Server:    http://localhost:8888"
