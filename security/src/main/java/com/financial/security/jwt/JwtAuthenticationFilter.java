package com.financial.security.jwt;

import com.financial.security.logging.SuspiciousActivityLogger;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String EXPIRED_TOKEN_ATTRIBUTE = "jwt.expired";
    public static final String INVALID_TOKEN_ATTRIBUTE = "jwt.invalid";

    public static final String COOKIE_NAME = "auth_token";

    private final JwtProvider jwtProvider;
    private final UserDetailsService userDetailsService;
    private final SuspiciousActivityLogger suspiciousLogger;

    public JwtAuthenticationFilter(JwtProvider jwtProvider,
                                   UserDetailsService userDetailsService,
                                   SuspiciousActivityLogger suspiciousLogger) {
        this.jwtProvider = jwtProvider;
        this.userDetailsService = userDetailsService;
        this.suspiciousLogger = suspiciousLogger;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String token = extractToken(request);
        if (token == null) {
            chain.doFilter(request, response);
            return;
        }

        JwtValidation validation = jwtProvider.validate(token);

        if (validation.isExpired()) {
            request.setAttribute(EXPIRED_TOKEN_ATTRIBUTE, Boolean.TRUE);
            chain.doFilter(request, response);
            return;
        }

        if (!validation.isValid()) {
            suspiciousLogger.logInvalidJwt(getClientIp(request), "token inválido ou adulterado");
            request.setAttribute(INVALID_TOKEN_ATTRIBUTE, Boolean.TRUE);
            chain.doFilter(request, response);
            return;
        }

        try {
            UserDetails userDetails = userDetailsService.loadUserByUsername(validation.subject());
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities()
            );
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
        } catch (UsernameNotFoundException e) {
            suspiciousLogger.logInvalidJwt(getClientIp(request), "usuário não encontrado para o token");
            request.setAttribute(INVALID_TOKEN_ATTRIBUTE, Boolean.TRUE);
        }

        chain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                String value = cookie.getValue();
                return value == null || value.isBlank() ? null : value;
            }
        }
        return null;
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
