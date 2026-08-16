package com.financial.gmail.service;

import com.financial.auth.CurrentUser;
import com.financial.gmail.dto.GmailStatusResponse;
import com.financial.gmail.exception.GmailReauthRequiredException;
import com.financial.gmail.exception.GmailTokenExchangeException;
import com.financial.gmail.model.GmailCredential;
import com.financial.gmail.oauth.GmailOAuthClient;
import com.financial.gmail.repository.GmailCredentialRepository;
import com.financial.gmail.util.TokenCipher;
import com.financial.model.User;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@Transactional
public class GmailAuthService {

    private static final long ACCESS_TOKEN_REFRESH_MARGIN_SECONDS = 60;

    private final GmailCredentialRepository repository;
    private final GmailOAuthClient oauthClient;
    private final TokenCipher tokenCipher;
    private final EntityManager entityManager;

    public GmailAuthService(GmailCredentialRepository repository,
                            GmailOAuthClient oauthClient,
                            TokenCipher tokenCipher,
                            EntityManager entityManager) {
        this.repository = repository;
        this.oauthClient = oauthClient;
        this.tokenCipher = tokenCipher;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public GmailStatusResponse getStatus() {
        UUID userId = CurrentUser.id();
        return repository.findByUserId(userId)
                .map(c -> GmailStatusResponse.connected(c.getEmailAddress()))
                .orElseGet(GmailStatusResponse::notConnected);
    }

    public String buildAuthorizationUrl(String state) {
        return oauthClient.buildAuthorizationUrl(state);
    }

    public void handleCallback(String code) {
        UUID userId = CurrentUser.id();
        GmailOAuthClient.TokenExchangeResult tokens;
        try {
            tokens = oauthClient.exchangeCodeForTokens(code);
        } catch (Exception e) {
            throw new GmailTokenExchangeException("Falha ao trocar code por tokens", e);
        }

        if (tokens == null || tokens.access_token() == null || tokens.refresh_token() == null) {
            throw new GmailTokenExchangeException(
                    "Google não devolveu refresh_token (verifique prompt=consent e access_type=offline)", null);
        }

        GmailOAuthClient.UserInfo userInfo = oauthClient.fetchUserInfo(tokens.access_token());
        if (userInfo == null || userInfo.email() == null) {
            throw new GmailTokenExchangeException("Não foi possível descobrir o email autorizado", null);
        }

        String encryptedRefresh = tokenCipher.encrypt(tokens.refresh_token());
        OffsetDateTime expiresAt = tokens.expires_in() != null
                ? OffsetDateTime.now().plusSeconds(tokens.expires_in())
                : null;

        GmailCredential credential = repository.findByUserId(userId).orElseGet(() -> GmailCredential.builder()
                .user(entityManager.getReference(User.class, userId))
                .build());
        credential.setEmailAddress(userInfo.email());
        credential.setRefreshTokenEncrypted(encryptedRefresh);
        credential.setAccessToken(tokens.access_token());
        credential.setExpiresAt(expiresAt);
        credential.setScope(tokens.scope() != null ? tokens.scope() : "");
        repository.save(credential);
    }

    public void disconnect() {
        UUID userId = CurrentUser.id();
        repository.findByUserId(userId).ifPresent(c -> {
            try {
                String refreshToken = tokenCipher.decrypt(c.getRefreshTokenEncrypted());
                oauthClient.revokeToken(refreshToken);
            } catch (Exception ignored) {
                // best-effort — mesmo se revoke falhar, apaga do DB
            }
            repository.delete(c);
        });
    }

    /**
     * Retorna um access token válido, refreshando se necessário.
     * Se o refresh falhar (invalid_grant, revogado, expirado), joga {@link GmailReauthRequiredException}
     * e apaga a credencial pra forçar reconexão.
     */
    public String getValidAccessToken() {
        UUID userId = CurrentUser.id();
        GmailCredential credential = repository.findByUserId(userId)
                .orElseThrow(() -> new GmailReauthRequiredException("Gmail não conectado"));

        if (credential.getAccessToken() != null
                && credential.getExpiresAt() != null
                && credential.getExpiresAt().isAfter(
                        OffsetDateTime.now().plusSeconds(ACCESS_TOKEN_REFRESH_MARGIN_SECONDS))) {
            return credential.getAccessToken();
        }

        String refreshToken = tokenCipher.decrypt(credential.getRefreshTokenEncrypted());
        GmailOAuthClient.TokenExchangeResult refreshed;
        try {
            refreshed = oauthClient.refreshAccessToken(refreshToken);
        } catch (Exception e) {
            repository.delete(credential);
            throw new GmailReauthRequiredException("Refresh token inválido, reconecte o Gmail");
        }

        credential.setAccessToken(refreshed.access_token());
        credential.setExpiresAt(refreshed.expires_in() != null
                ? OffsetDateTime.now().plusSeconds(refreshed.expires_in())
                : null);
        if (refreshed.refresh_token() != null) {
            credential.setRefreshTokenEncrypted(tokenCipher.encrypt(refreshed.refresh_token()));
        }
        repository.save(credential);
        return refreshed.access_token();
    }
}
