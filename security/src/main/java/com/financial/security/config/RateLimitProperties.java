package com.financial.security.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties("security.rate-limit")
public class RateLimitProperties {

    private Auth auth = new Auth();
    private General general = new General();

    @Getter
    @Setter
    public static class Auth {
        private int requests = 5;
        private int durationSeconds = 60;
    }

    @Getter
    @Setter
    public static class General {
        private int requests = 100;
        private int durationSeconds = 60;
    }
}
