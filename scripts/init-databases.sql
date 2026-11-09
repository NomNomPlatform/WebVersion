-- scripts/init-databases.sql
-- Tự động chạy khi PostgreSQL container khởi động lần đầu

CREATE DATABASE user_db;
CREATE DATABASE restaurant_db;
CREATE DATABASE menu_db;
CREATE DATABASE order_db;
CREATE DATABASE payment_db;
CREATE DATABASE notification_db;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE user_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE restaurant_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE menu_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE order_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE payment_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO postgres;
