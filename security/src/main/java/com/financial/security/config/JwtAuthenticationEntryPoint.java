package com.financial.security.config;

import com.financial.security.jwt.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.OffsetDateTime;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        boolean expired = Boolean.TRUE.equals(request.getAttribute(JwtAuthenticationFilter.EXPIRED_TOKEN_ATTRIBUTE));
        String code = expired ? "TOKEN_EXPIRED" : "UNAUTHORIZED";
        String message = expired ? "Token expirado" : "Autenticação obrigatória";

        String body = """
                {"timestamp":"%s","status":401,"code":"%s","message":"%s","fieldErrors":[]}"""
                .formatted(OffsetDateTime.now(), code, message);

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(body);
    }
}
