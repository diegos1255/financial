package com.financial.integration;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

@Component
public class BrapiClient {

    private static final Logger log = LoggerFactory.getLogger(BrapiClient.class);

    private final RestClient restClient;
    private final String token;

    public BrapiClient(
            @Value("${brapi.base-url:https://brapi.dev}") String baseUrl,
            @Value("${brapi.token:}") String token,
            @Value("${brapi.timeout-seconds:3}") int timeoutSeconds) {
        this.token = token;
        var httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
        var requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    public Optional<BrapiQuote> fetch(String ticker) {
        try {
            String uri = "/api/quote/" + ticker + (token.isBlank() ? "" : "?token=" + token);
            BrapiResponse response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(BrapiResponse.class);
            if (response == null || response.results() == null || response.results().isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(response.results().get(0));
        } catch (Exception e) {
            log.warn("Brapi fetch falhou para {}: {}", ticker, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Fechamentos diarios dos ultimos 3 meses (limite do plano gratuito) — WORK-36.
     * Vazio em caso de erro: o historico cai para o preco estimado.
     */
    public List<BrapiDailyPrice> fetchHistory(String ticker) {
        try {
            String uri = "/api/quote/" + ticker + "?range=3mo&interval=1d" + (token.isBlank() ? "" : "&token=" + token);
            BrapiHistoryResponse response = restClient.get().uri(uri).retrieve().body(BrapiHistoryResponse.class);
            if (response == null || response.results() == null || response.results().isEmpty()
                    || response.results().get(0).historicalDataPrice() == null) {
                return List.of();
            }
            return response.results().get(0).historicalDataPrice();
        } catch (Exception e) {
            log.warn("Brapi historico falhou para {}: {}", ticker, e.getMessage());
            return List.of();
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BrapiResponse(List<BrapiQuote> results) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BrapiHistoryResponse(List<BrapiHistoryResult> results) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BrapiHistoryResult(List<BrapiDailyPrice> historicalDataPrice) {}

    /** {@code date} em segundos (epoch). */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BrapiDailyPrice(long date, BigDecimal close) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BrapiQuote(
            BigDecimal regularMarketPrice,
            BigDecimal regularMarketChangePercent
    ) {}
}
