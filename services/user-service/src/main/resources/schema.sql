-- Migration tự động chạy bởi Spring Boot sau Hibernate ddl-auto.
-- Nếu lệnh ALTER thất bại (vd đã chạy rồi), kết nối vẫn OK vì bản ALTER dùng IF EXISTS.

-- 1. Mở rộng cột avatar_url từ VARCHAR(1024) sang TEXT.
--    Lệnh chạy idempotent nhờ EXCEPTION khi không phải VARCHAR, ta bỏ qua.
DO $$
BEGIN
    BEGIN
        ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;
    EXCEPTION
        WHEN others THEN
            -- Đã là TEXT hoặc không tương thích, bỏ qua.
            RAISE NOTICE 'avatar_url đã ở kiểu khác, bỏ qua: %', SQLERRM;
    END;
END$$;
