package com.nomnom.apigateway.filter;

import com.nomnom.apigateway.util.JwtUtil;
import io.jsonwebtoken.Claims;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Global JWT filter: verify token và inject identity headers (X-User-Id, X-User-Role)
 * cho downstream services. Business service KHÔNG verify lại JWT — chỉ tin các header này.
 */
@Component
public class AuthenticationFilter implements GlobalFilter, Ordered {

    private final JwtUtil jwtUtil;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public AuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    // Các endpoint không cần token (any method)
    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/google",
            "/api/payments/vnpay/callback",  // VNPay redirect sau khi user thanh toán
            "/api/payments/vnpay/ipn"        // VNPay IPN — server-to-server, không có JWT
    );

    // Các endpoint public CHỈ với method GET (xem nhà hàng / menu khi chưa đăng nhập)
    private static final List<String> PUBLIC_GET_PATHS = List.of(
            "/api/restaurants/**",
            "/api/items/**"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();
        HttpMethod method = request.getMethod();

        if (isPublic(path, method)) {
            String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtUtil.isValid(token)) {
                    return injectHeadersAndProceed(exchange, chain, token);
                }
            }
            return chain.filter(exchange);
        }

        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return reject(exchange, HttpStatus.UNAUTHORIZED);
        }

        String token = authHeader.substring(7);
        if (!jwtUtil.isValid(token)) {
            return reject(exchange, HttpStatus.UNAUTHORIZED);
        }

        return injectHeadersAndProceed(exchange, chain, token);
    }

    private Mono<Void> injectHeadersAndProceed(ServerWebExchange exchange, GatewayFilterChain chain, String token) {
        Claims claims = jwtUtil.extractClaims(token);
        String userId = claims.getSubject();
        String email = claims.get("email", String.class);
        String role = claims.get("role", String.class);

        ServerHttpRequest mutated = exchange.getRequest().mutate()
                .header("X-User-Id", userId != null ? userId : "")
                .header("X-User-Email", email != null ? email : "")
                .header("X-User-Role", role != null ? role : "")
                .build();

        return chain.filter(exchange.mutate().request(mutated).build());
    }

    private boolean isPublic(String path, HttpMethod method) {
        if (PUBLIC_PATHS.stream().anyMatch(p -> pathMatcher.match(p, path))) {
            return true;
        }
        return HttpMethod.GET.equals(method)
                && PUBLIC_GET_PATHS.stream().anyMatch(p -> pathMatcher.match(p, path));
    }

    private Mono<Void> reject(ServerWebExchange exchange, HttpStatus status) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        return response.setComplete();
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
