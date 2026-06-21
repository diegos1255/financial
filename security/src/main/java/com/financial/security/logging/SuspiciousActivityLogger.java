package com.financial.security.logging;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class SuspiciousActivityLogger {

    public void logRateLimitHit(String ip, String path) {
        log.warn("[RATE_LIMIT] ip={} path={}", ip, path);
    }

    public void logFailedLogin(String ip, String login) {
        log.warn("[FAILED_LOGIN] ip={} login={}", ip, login);
    }

    public void logInvalidJwt(String ip, String reason) {
        log.warn("[INVALID_JWT] ip={} reason={}", ip, reason);
    }

    public void logDuplicateSignup(String ip, String login) {
        log.warn("[DUPLICATE_SIGNUP] ip={} login={}", ip, login);
    }
}
