package com.financial.controller;

import com.financial.dto.LoginRequest;
import com.financial.dto.LoginResponse;
import com.financial.dto.SignupRequest;
import com.financial.dto.UserResponse;
import com.financial.exception.InvalidPhotoException;
import com.financial.exception.LoginAlreadyExistsException;
import com.financial.model.User;
import com.financial.repository.UserRepository;
import com.financial.security.config.JwtProperties;
import com.financial.security.jwt.JwtAuthenticationFilter;
import com.financial.security.jwt.JwtProvider;
import com.financial.security.logging.SuspiciousActivityLogger;
import com.financial.service.PhotoStorageService;
import com.financial.service.RefreshTokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtProvider jwtProvider;
    private final JwtProperties jwtProperties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SuspiciousActivityLogger suspiciousLogger;
    private final RefreshTokenService refreshTokenService;
    private final PhotoStorageService photoStorageService;
    private final Validator validator;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtProvider jwtProvider,
                          JwtProperties jwtProperties,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          SuspiciousActivityLogger suspiciousLogger,
                          RefreshTokenService refreshTokenService,
                          PhotoStorageService photoStorageService,
                          Validator validator) {
        this.authenticationManager = authenticationManager;
        this.jwtProvider = jwtProvider;
        this.jwtProperties = jwtProperties;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.suspiciousLogger = suspiciousLogger;
        this.refreshTokenService = refreshTokenService;
        this.photoStorageService = photoStorageService;
        this.validator = validator;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest request,
                                               HttpServletRequest httpRequest) {
        Authentication auth;
        try {
            auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.login(), request.password())
            );
        } catch (BadCredentialsException | UsernameNotFoundException e) {
            suspiciousLogger.logFailedLogin(getClientIp(httpRequest), request.login());
            throw e;
        }

        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        if (!userDetails.isEnabled()) throw new DisabledException("User is inactive");

        User user = userRepository.findByLogin(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        String jwt = jwtProvider.generate(userDetails);
        RefreshTokenService.IssueResult rt = refreshTokenService.issue(user);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildAuthCookie(jwt, jwtProvider.getExpirationSeconds()).toString())
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(rt.rawToken(), rt.maxAgeSeconds()).toString())
                .body(new LoginResponse(UserResponse.from(user)));
    }

    @PostMapping(value = "/signup", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<LoginResponse> signup(@RequestParam("name") String name,
                                                @RequestParam("login") String login,
                                                @RequestParam("password") String password,
                                                @RequestPart(value = "file", required = false) MultipartFile file,
                                                HttpServletRequest httpRequest) {
        SignupRequest request = new SignupRequest(name, login, password);
        Set<ConstraintViolation<SignupRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }

        if (file != null && !file.isEmpty()) {
            validatePhoto(file);
        }

        if (userRepository.findByLogin(request.login()).isPresent()) {
            suspiciousLogger.logDuplicateSignup(getClientIp(httpRequest), request.login());
            throw new LoginAlreadyExistsException(request.login());
        }

        User user = User.builder()
                .name(request.name())
                .login(request.login())
                .password(passwordEncoder.encode(request.password()))
                .active(true)
                .build();
        userRepository.save(user);

        if (file != null && !file.isEmpty()) {
            String url = photoStorageService.upload(user.getId(), file);
            user.setPhotoUrl(url);
            userRepository.save(user);
        }

        UserDetails principal = new org.springframework.security.core.userdetails.User(
                user.getLogin(), user.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        String jwt = jwtProvider.generate(principal);
        RefreshTokenService.IssueResult rt = refreshTokenService.issue(user);

        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, buildAuthCookie(jwt, jwtProvider.getExpirationSeconds()).toString())
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(rt.rawToken(), rt.maxAgeSeconds()).toString())
                .body(new LoginResponse(UserResponse.from(user)));
    }

    private void validatePhoto(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png"))) {
            throw new InvalidPhotoException("Somente JPG e PNG são aceitos");
        }
        if (file.getSize() > 2L * 1024 * 1024) {
            throw new InvalidPhotoException("Foto deve ter no máximo 2MB");
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(HttpServletRequest httpRequest) {
        String rawRefreshToken = extractCookie(httpRequest, RefreshTokenService.COOKIE_NAME);
        if (rawRefreshToken == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        RefreshTokenService.RotationResult rotation = refreshTokenService.rotate(rawRefreshToken);
        User user = rotation.user();

        UserDetails principal = new org.springframework.security.core.userdetails.User(
                user.getLogin(), user.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        String jwt = jwtProvider.generate(principal);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildAuthCookie(jwt, jwtProvider.getExpirationSeconds()).toString())
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(rotation.rawToken(), rotation.maxAgeSeconds()).toString())
                .body(new LoginResponse(UserResponse.from(user)));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest) {
        String rawRefreshToken = extractCookie(httpRequest, RefreshTokenService.COOKIE_NAME);
        refreshTokenService.revokeByRawToken(rawRefreshToken);

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, buildAuthCookie("", 0).toString())
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie("", 0).toString())
                .build();
    }

    private ResponseCookie buildAuthCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from(JwtAuthenticationFilter.COOKIE_NAME, value)
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure())
                .sameSite(jwtProperties.getCookieSameSite())
                .path("/")
                .maxAge(Duration.ofSeconds(maxAgeSeconds))
                .build();
    }

    private ResponseCookie buildRefreshCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from(RefreshTokenService.COOKIE_NAME, value)
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure())
                .sameSite(jwtProperties.getCookieSameSite())
                .path("/api/auth")
                .maxAge(Duration.ofSeconds(maxAgeSeconds))
                .build();
    }

    private String extractCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                String v = cookie.getValue();
                return (v == null || v.isBlank()) ? null : v;
            }
        }
        return null;
    }

    private String getClientIp(HttpServletRequest request) {
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) return xRealIp;
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}
