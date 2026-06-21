package com.financial.service;

import com.financial.exception.RefreshTokenInvalidException;
import com.financial.model.RefreshToken;
import com.financial.model.User;
import com.financial.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
@Transactional
public class RefreshTokenService {

    public static final String COOKIE_NAME = "refresh_token";

    private final RefreshTokenRepository repository;
    private final long refreshTokenDays;

    public RefreshTokenService(RefreshTokenRepository repository,
                               @Value("${refresh-token.days:30}") long refreshTokenDays) {
        this.repository = repository;
        this.refreshTokenDays = refreshTokenDays;
    }

    public record IssueResult(String rawToken, long maxAgeSeconds) {}

    public IssueResult issue(User user) {
        String rawToken = UUID.randomUUID().toString();
        RefreshToken entity = RefreshToken.builder()
                .user(user)
                .tokenHash(sha256(rawToken))
                .expiresAt(OffsetDateTime.now().plusDays(refreshTokenDays))
                .revoked(false)
                .build();
        repository.save(entity);
        return new IssueResult(rawToken, refreshTokenDays * 86400L);
    }

    public record RotationResult(User user, String rawToken, long maxAgeSeconds) {}

    public RotationResult rotate(String rawToken) {
        String hash = sha256(rawToken);
        RefreshToken old = repository.findByTokenHashAndRevokedFalse(hash)
                .orElseThrow(RefreshTokenInvalidException::new);

        if (old.getExpiresAt().isBefore(OffsetDateTime.now())) {
            old.setRevoked(true);
            throw new RefreshTokenInvalidException();
        }

        User user = old.getUser();
        old.setRevoked(true);
        old.setLastUsedAt(OffsetDateTime.now());

        IssueResult issued = issue(user);
        return new RotationResult(user, issued.rawToken(), issued.maxAgeSeconds());
    }

    public void revokeByRawToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        String hash = sha256(rawToken);
        repository.findByTokenHashAndRevokedFalse(hash)
                .ifPresent(t -> {
                    t.setRevoked(true);
                    t.setLastUsedAt(OffsetDateTime.now());
                });
    }

    public void revokeAllForUser(UUID userId) {
        repository.revokeAllByUserId(userId);
    }

    private static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
