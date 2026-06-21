package com.financial.security.config;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "jwt")
@Validated
public class JwtProperties {

    private static final int MIN_SECRET_BYTES = 32;

    private String secret;
    private int expirationMinutes = 480; // 8h default; set to 15 in prod
    private boolean cookieSecure = false;
    private String cookieSameSite = "Lax";

    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }

    public int getExpirationMinutes() { return expirationMinutes; }
    public void setExpirationMinutes(int expirationMinutes) { this.expirationMinutes = expirationMinutes; }

    public boolean isCookieSecure() { return cookieSecure; }
    public void setCookieSecure(boolean cookieSecure) { this.cookieSecure = cookieSecure; }

    public String getCookieSameSite() { return cookieSameSite; }
    public void setCookieSameSite(String cookieSameSite) { this.cookieSameSite = cookieSameSite; }

    @PostConstruct
    void validate() {
        if (secret == null || secret.getBytes().length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "jwt.secret must be at least " + MIN_SECRET_BYTES + " bytes long for HS256");
        }
        if (expirationMinutes <= 0) {
            throw new IllegalStateException("jwt.expiration-minutes must be > 0");
        }
    }
}
