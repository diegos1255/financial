package com.financial.gmail.controller;

import com.financial.gmail.dto.GmailAuthUrlResponse;
import com.financial.gmail.dto.GmailStatusResponse;
import com.financial.gmail.exception.GmailInvalidStateException;
import com.financial.gmail.service.GmailAuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.security.SecureRandom;
import java.util.Base64;

@RestController
@RequestMapping("/api/gmail")
public class GmailAuthController {

    private static final String STATE_COOKIE = "gmail_oauth_state";
    private static final int STATE_COOKIE_MAX_AGE_SECONDS = 300; // 5min
    private static final String FRONTEND_SUCCESS_URL = "/email?connected=1";
    private static final String FRONTEND_ERROR_URL = "/email?error=1";

    private final GmailAuthService service;
    private final SecureRandom secureRandom = new SecureRandom();

    public GmailAuthController(GmailAuthService service) {
        this.service = service;
    }

    @GetMapping("/status")
    public GmailStatusResponse status() {
        return service.getStatus();
    }

    @GetMapping("/auth-url")
    public ResponseEntity<GmailAuthUrlResponse> authUrl() {
        String state = generateState();
        String url = service.buildAuthorizationUrl(state);
        ResponseCookie cookie = ResponseCookie.from(STATE_COOKIE, state)
                .httpOnly(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(STATE_COOKIE_MAX_AGE_SECONDS)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new GmailAuthUrlResponse(url));
    }

    @GetMapping("/callback")
    public ResponseEntity<Void> callback(@RequestParam("code") String code,
                                         @RequestParam("state") String state,
                                         HttpServletRequest request,
                                         HttpServletResponse response) {
        String cookieState = readStateCookie(request);
        if (cookieState == null || !cookieState.equals(state)) {
            throw new GmailInvalidStateException("state cookie ausente ou não bate com o retornado pelo Google");
        }

        service.handleCallback(code);

        // limpa o cookie do state
        ResponseCookie clear = ResponseCookie.from(STATE_COOKIE, "")
                .httpOnly(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, clear.toString());

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(FRONTEND_SUCCESS_URL))
                .build();
    }

    @DeleteMapping("/disconnect")
    public ResponseEntity<Void> disconnect() {
        service.disconnect();
        return ResponseEntity.noContent().build();
    }

    private String generateState() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String readStateCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (STATE_COOKIE.equals(c.getName())) return c.getValue();
        }
        return null;
    }
}
