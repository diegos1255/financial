package com.financial.security.ratelimit;

import com.financial.security.config.RateLimitProperties;
import com.financial.security.logging.SuspiciousActivityLogger;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Set<String> AUTH_PATHS = Set.of("/api/auth/login", "/api/auth/signup", "/api/auth/refresh");

    private final RateLimitProperties properties;
    private final SuspiciousActivityLogger suspiciousLogger;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitFilter(RateLimitProperties properties, SuspiciousActivityLogger suspiciousLogger) {
        this.properties = properties;
        this.suspiciousLogger = suspiciousLogger;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String ip = getClientIp(request);
        String path = request.getRequestURI();
        boolean isAuthPath = AUTH_PATHS.contains(path);
        String bucketKey = ip + ":" + (isAuthPath ? "auth" : "general");

        Bucket bucket = buckets.computeIfAbsent(bucketKey, key -> createBucket(isAuthPath));
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            chain.doFilter(request, response);
        } else {
            suspiciousLogger.logRateLimitHit(ip, path);
            long retryAfterSeconds = Math.max(1L, probe.getNanosToWaitForRefill() / 1_000_000_000L);
            write429(response, retryAfterSeconds);
        }
    }

    private Bucket createBucket(boolean isAuthPath) {
        int requests;
        int durationSeconds;
        if (isAuthPath) {
            requests = properties.getAuth().getRequests();
            durationSeconds = properties.getAuth().getDurationSeconds();
        } else {
            requests = properties.getGeneral().getRequests();
            durationSeconds = properties.getGeneral().getDurationSeconds();
        }
        Bandwidth limit = Bandwidth.builder()
                .capacity(requests)
                .refillIntervally(requests, Duration.ofSeconds(durationSeconds))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private void write429(HttpServletResponse response, long retryAfterSeconds) throws IOException {
        String body = """
                {"timestamp":"%s","status":429,"code":"TOO_MANY_REQUESTS","message":"Limite de requisições excedido. Tente novamente em %d segundos.","fieldErrors":[]}"""
                .formatted(OffsetDateTime.now(), retryAfterSeconds);

        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(body);
    }

    private String getClientIp(HttpServletRequest request) {
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp;
        }
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
