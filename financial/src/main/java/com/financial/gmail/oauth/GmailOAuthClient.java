package com.financial.gmail.oauth;

import com.financial.gmail.config.GmailProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

/**
 * Cliente HTTP puro para os endpoints OAuth 2.0 do Google e o userinfo do OpenID Connect.
 * Não conhece a Gmail API em si (isso vem na WORK-19).
 */
@Component
public class GmailOAuthClient {

    private final GmailProperties properties;
    private final RestClient http = RestClient.create();

    public GmailOAuthClient(GmailProperties properties) {
        this.properties = properties;
    }

    public TokenExchangeResult exchangeCodeForTokens(String code) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("client_id", properties.getClientId());
        form.add("client_secret", properties.getClientSecret());
        form.add("redirect_uri", properties.getRedirectUri());
        form.add("grant_type", "authorization_code");

        return http.post()
                .uri(properties.getTokenEndpoint())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(TokenExchangeResult.class);
    }

    public TokenExchangeResult refreshAccessToken(String refreshToken) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", properties.getClientId());
        form.add("client_secret", properties.getClientSecret());
        form.add("refresh_token", refreshToken);
        form.add("grant_type", "refresh_token");

        return http.post()
                .uri(properties.getTokenEndpoint())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(TokenExchangeResult.class);
    }

    public UserInfo fetchUserInfo(String accessToken) {
        return http.get()
                .uri(properties.getUserinfoEndpoint())
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .body(UserInfo.class);
    }

    public void revokeToken(String token) {
        String uri = UriComponentsBuilder.fromUriString(properties.getRevokeEndpoint())
                .queryParam("token", token)
                .toUriString();
        try {
            http.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ignored) {
            // revoke best-effort — se falhar (token já inválido, etc.) segue o fluxo
        }
    }

    public String buildAuthorizationUrl(String state) {
        return UriComponentsBuilder.fromUriString(properties.getAuthEndpoint())
                .queryParam("client_id", properties.getClientId())
                .queryParam("redirect_uri", properties.getRedirectUri())
                .queryParam("response_type", "code")
                .queryParam("scope", GmailScopes.asSpaceSeparated())
                .queryParam("access_type", "offline")
                .queryParam("prompt", "consent")
                .queryParam("state", state)
                .encode()
                .build()
                .toUriString();
    }

    public record TokenExchangeResult(
            String access_token,
            Long expires_in,
            String refresh_token,
            String scope,
            String token_type,
            String id_token
    ) {}

    public record UserInfo(
            String sub,
            String email,
            Boolean email_verified,
            String name
    ) {}
}
