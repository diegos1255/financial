package com.financial.security.config;

import com.financial.security.jwt.JwtAuthenticationFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.function.Supplier;

@Configuration
@EnableConfigurationProperties({JwtProperties.class, RateLimitProperties.class})
public class SecurityConfig {

    private static final String[] PUBLIC_PATHS = {
            "/api/auth/login",
            "/api/auth/logout",
            "/api/auth/signup",
            "/api/auth/refresh",
            "/api/health"
    };

    // Auth endpoints don't need CSRF — no existing session/token at that point
    private static final String[] CSRF_EXCLUDED = {
            "/api/auth/login",
            "/api/auth/logout",
            "/api/auth/signup",
            "/api/auth/refresh"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtAuthenticationFilter jwtFilter,
                                                   JwtAuthenticationEntryPoint entryPoint) throws Exception {

        CookieCsrfTokenRepository csrfRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfRepository.setCookieCustomizer(cookie -> cookie.path("/").sameSite("Lax"));

        return http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfRepository)
                        .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler())
                        .ignoringRequestMatchers(CSRF_EXCLUDED)
                )
                .cors(cors -> {})
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_PATHS).permitAll()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(e -> e.authenticationEntryPoint(entryPoint))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                // Forces the deferred CsrfToken to materialize on every request so the
                // XSRF-TOKEN cookie is written even for GETs. Without this, the first
                // mutation after login finds no cookie and the request is rejected.
                .addFilterAfter(new CsrfCookieFilter(), UsernamePasswordAuthenticationFilter.class)
                .headers(headers -> headers
                        .addHeaderWriter(new StaticHeadersWriter(
                                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"))
                        .addHeaderWriter(new StaticHeadersWriter(
                                "Referrer-Policy", "strict-origin-when-cross-origin"))
                        .addHeaderWriter(new StaticHeadersWriter(
                                "Permissions-Policy", "geolocation=(), microphone=(), camera=()"))
                        .addHeaderWriter(new StaticHeadersWriter(
                                "Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'"))
                )
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Accept", "X-XSRF-TOKEN"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    static final class CsrfCookieFilter extends OncePerRequestFilter {

        @Override
        protected void doFilterInternal(HttpServletRequest request,
                                        HttpServletResponse response,
                                        FilterChain filterChain) throws ServletException, IOException {
            CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            if (csrfToken != null) {
                // Triggers the DeferredCsrfToken; this is what causes the repository to
                // write the XSRF-TOKEN cookie. Without calling getToken(), the cookie is
                // only written when CsrfFilter validates a mutation (POST/PUT/...), which
                // means the very first mutation after login has no cookie to send.
                csrfToken.getToken();
            }
            filterChain.doFilter(request, response);
        }
    }

    // Official Spring Security 6 pattern for SPAs that read the cookie via JS:
    // the cookie carries the plain token, while the header carries the XOR-encoded
    // value when sent as a parameter. The handle uses XOR so the request attribute
    // exposes the encoded form; resolve uses Plain when the value came in via header.
    static final class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {

        private final CsrfTokenRequestHandler plain = new CsrfTokenRequestAttributeHandler();
        private final CsrfTokenRequestHandler xor = new XorCsrfTokenRequestAttributeHandler();

        @Override
        public void handle(HttpServletRequest request,
                           HttpServletResponse response,
                           Supplier<CsrfToken> csrfToken) {
            this.xor.handle(request, response, csrfToken);
            csrfToken.get();
        }

        @Override
        public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken csrfToken) {
            String headerValue = request.getHeader(csrfToken.getHeaderName());
            return StringUtils.hasText(headerValue)
                    ? this.plain.resolveCsrfTokenValue(request, csrfToken)
                    : this.xor.resolveCsrfTokenValue(request, csrfToken);
        }
    }
}
