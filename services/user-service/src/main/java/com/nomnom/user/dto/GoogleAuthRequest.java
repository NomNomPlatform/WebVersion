package com.nomnom.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Payload FE gửi lên sau khi Google Identity Services trả về credential (id_token).
 * Backend verify chữ ký bằng Google public keys, trích email/name/picture/sub rồi
 * tạo/cập nhật user, phát hành JWT nội bộ.
 */
@Data
public class GoogleAuthRequest {
    @NotBlank
    private String idToken;
}
