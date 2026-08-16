package com.financial.gmail.api;

import com.financial.gmail.exception.GmailReauthRequiredException;
import com.financial.gmail.service.GmailAuthService;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collection;
import java.util.Map;

/**
 * Cliente HTTP para a Gmail API v1.
 *
 * Todas as chamadas obtêm access_token via {@link GmailAuthService#getValidAccessToken()} que
 * refresha automaticamente se expirado. Se ainda assim receber 401 do Google (token revogado),
 * relança como {@link GmailReauthRequiredException}.
 */
@Component
public class GmailApiClient {

    private static final String BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me";

    private final GmailAuthService authService;
    private final RestClient http = RestClient.create();

    public GmailApiClient(GmailAuthService authService) {
        this.authService = authService;
    }

    /**
     * GET /messages?q=&labelIds=&maxResults=&pageToken=
     * Retorna { messages: [{id, threadId}], nextPageToken, resultSizeEstimate }.
     */
    public Map<String, Object> listMessages(String query,
                                            Collection<String> labelIds,
                                            int maxResults,
                                            String pageToken) {
        UriComponentsBuilder uri = UriComponentsBuilder.fromUriString(BASE_URL + "/messages")
                .queryParam("maxResults", maxResults);
        if (query != null && !query.isBlank()) uri.queryParam("q", query);
        if (labelIds != null) for (String id : labelIds) uri.queryParam("labelIds", id);
        if (pageToken != null && !pageToken.isBlank()) uri.queryParam("pageToken", pageToken);

        return getJson(uri.encode().toUriString());
    }

    /**
     * GET /messages/{id}?format=metadata|full&metadataHeaders=...
     */
    public Map<String, Object> getMessage(String messageId, String format, Collection<String> metadataHeaders) {
        UriComponentsBuilder uri = UriComponentsBuilder.fromUriString(BASE_URL + "/messages/" + messageId)
                .queryParam("format", format);
        if (metadataHeaders != null && format.equals("metadata")) {
            for (String h : metadataHeaders) uri.queryParam("metadataHeaders", h);
        }
        return getJson(uri.encode().toUriString());
    }

    /**
     * GET /threads/{id}?format=full
     */
    public Map<String, Object> getThread(String threadId, String format) {
        UriComponentsBuilder uri = UriComponentsBuilder.fromUriString(BASE_URL + "/threads/" + threadId)
                .queryParam("format", format);
        return getJson(uri.encode().toUriString());
    }

    /**
     * POST /threads/{id}/modify — body: { addLabelIds: [...], removeLabelIds: [...] }
     */
    public Map<String, Object> modifyThread(String threadId,
                                            Collection<String> addLabels,
                                            Collection<String> removeLabels) {
        Map<String, Object> body = Map.of(
                "addLabelIds", addLabels != null ? addLabels : java.util.List.of(),
                "removeLabelIds", removeLabels != null ? removeLabels : java.util.List.of()
        );
        return postJson(BASE_URL + "/threads/" + threadId + "/modify", body);
    }

    // ---- HTTP helpers ----

    private Map<String, Object> getJson(String uri) {
        return execute(() -> http.get()
                .uri(uri)
                .header("Authorization", "Bearer " + authService.getValidAccessToken())
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {})
        );
    }

    private Map<String, Object> postJson(String uri, Object body) {
        return execute(() -> http.post()
                .uri(uri)
                .header("Authorization", "Bearer " + authService.getValidAccessToken())
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {})
        );
    }

    private <T> T execute(java.util.function.Supplier<T> call) {
        try {
            return call.get();
        } catch (HttpClientErrorException e) {
            HttpStatusCode status = e.getStatusCode();
            if (status.value() == 401) {
                throw new GmailReauthRequiredException("Access token rejeitado pelo Google");
            }
            throw e;
        }
    }
}
