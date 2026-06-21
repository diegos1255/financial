package com.financial.security.jwt;

import com.financial.security.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Component
public class JwtProvider {

    private final SecretKey key;
    private final long expirationSeconds;

    public JwtProvider(JwtProperties properties) {
        this.key = Keys.hmacShaKeyFor(properties.getSecret().getBytes());
        this.expirationSeconds = properties.getExpirationMinutes() * 60L;
    }

    public String generate(UserDetails userDetails) {
        Instant now = Instant.now();
        Instant expiration = now.plus(expirationSeconds, ChronoUnit.SECONDS);

        return Jwts.builder()
                .subject(userDetails.getUsername())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiration))
                .signWith(key)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public JwtValidation validate(String token) {
        try {
            Claims claims = parse(token);
            return JwtValidation.valid(claims.getSubject());
        } catch (ExpiredJwtException e) {
            return JwtValidation.expired();
        } catch (JwtException | IllegalArgumentException e) {
            return JwtValidation.invalid();
        }
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }
}
