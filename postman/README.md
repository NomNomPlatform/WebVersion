# Postman Collection - NomNom

## Import
1. Mo Postman -> Import -> chon 2 file:
   - `NomNom.postman_collection.json`
   - `NomNom.postman_environment.json`
2. Chon environment "NomNom - Local" o goc tren phai.

## Luong test day du (goi truc tiep tung service, khong qua gateway)
1. **User Service > Auth > Register Customer** va **Register Restaurant Owner** — tao 2 tai khoan.
2. **User Service > Auth > Login Customer** — luu token vao `accessToken`, `userId` vao `userId`.
3. **User Service > Auth > Login Restaurant Owner** — luu token vao `ownerAccessToken`, `userId` vao `ownerId`.
4. **Restaurant Service > Create Restaurant** (dung header `X-User-Id: {{ownerId}}`) — luu `restaurantId`.
5. **Menu Service > Create Menu Item** — luu `menuItemId`.
6. **Order Service > Create Order** (dung `X-User-Id: {{userId}}`, item lay theo `menuItemId`) — luu `orderId`. Order-service se tu tra gia that tu menu-service va goi payment-service dong bo.
7. **Payment Service > Process Payment** — co the goi thu cong de test rieng (mock gateway 90% success), hoac xem ket qua qua **Get Payment By Order Id**.
8. **Order Service > Update Order Status (Owner)** — chu nha hang chuyen trang thai don sang `READY`.
9. **Notification Service > Get My Notifications** — xem thong bao duoc Kafka consumer tao ra tu cac event order.*/payment.*.

## Vi sao goi truc tiep service thay vi qua Gateway?
API Gateway (`infrastructure/api-gateway`) validate JWT va inject header `X-User-Id` / `X-User-Role` cho request phia sau. Khi test truc tiep tung service (bo qua gateway) de debug nhanh, cac request trong collection tu dien 2 header nay bang tay (lay tu `userId`/`ownerId` da luu o buoc Login). Neu muon test qua gateway that, doi `*ServiceUrl` thanh `{{gatewayUrl}}` va chi dung `Authorization: Bearer {{accessToken}}`.

## Bien environment
| Bien | Mac dinh | Y nghia |
|---|---|---|
| `gatewayUrl` | http://localhost:8080 | API Gateway |
| `userServiceUrl` | http://localhost:8081 | user-service |
| `restaurantServiceUrl` | http://localhost:8082 | restaurant-service |
| `orderServiceUrl` | http://localhost:8083 | order-service |
| `menuServiceUrl` | http://localhost:8084 | menu-service |
| `paymentServiceUrl` | http://localhost:8085 | payment-service |
| `recommendationServiceUrl` | http://localhost:8086 | recommendation-service (chua co endpoint, con skeleton) |
| `notificationServiceUrl` | http://localhost:8087 | notification-service |
| `accessToken` / `userId` | (rong) | JWT + userId cua Customer, tu dong dien sau khi Login Customer |
| `ownerAccessToken` / `ownerId` | (rong) | JWT + userId cua Restaurant Owner, tu dong dien sau khi Login Restaurant Owner |
| `restaurantId` | (rong) | Tu dong dien sau khi Create Restaurant |
| `menuItemId` | (rong) | Tu dong dien sau khi Create Menu Item |
| `orderId` | (rong) | Tu dong dien sau khi Create Order |
| `paymentId` | (rong) | Tu dong dien sau khi Process Payment |

> `recommendation-service` van chi la skeleton, chua co endpoint nen chua co request trong collection.
