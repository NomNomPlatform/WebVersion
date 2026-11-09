package com.nomnom.user.entity;

/**
 * Nguồn đăng ký/đăng nhập của user.
 * - LOCAL: đăng ký bằng email + password truyền thống.
 * - GOOGLE: đăng nhập qua Google OAuth (không có password).
 * User Google có passwordHash = null (NOT NULL ở DB nên dùng chuỗi rỗng sentinel).
 */
public enum AuthProvider {
    LOCAL,
    GOOGLE
}
