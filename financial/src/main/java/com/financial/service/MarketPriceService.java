package com.financial.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.financial.dto.MarketPriceCache;
import com.financial.integration.BrapiClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;

@Service
public class MarketPriceService {

    private static final Logger log = LoggerFactory.getLogger(MarketPriceService.class);
    private static final String KEY_PREFIX = "market_price:";

    private final RedisTemplate<String, String> redisTemplate;
    private final BrapiClient brapiClient;
    private final ObjectMapper objectMapper;
    private final long ttlHours;

    public MarketPriceService(
            RedisTemplate<String, String> redisTemplate,
            BrapiClient brapiClient,
            @Value("${market-price.ttl-hours:24}") long ttlHours) {
        this.redisTemplate = redisTemplate;
        this.brapiClient = brapiClient;
        this.ttlHours = ttlHours;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    public Optional<MarketPriceCache> getPrice(String ticker) {
        String key = KEY_PREFIX + ticker.toUpperCase();

        try {
            String cached = redisTemplate.opsForValue().get(key);
            if (cached != null) {
                return Optional.of(objectMapper.readValue(cached, MarketPriceCache.class));
            }
        } catch (Exception e) {
            log.warn("Redis read falhou para {}: {}", key, e.getMessage());
        }

        Optional<BrapiClient.BrapiQuote> quote = brapiClient.fetch(ticker);
        if (quote.isEmpty()) {
            return Optional.empty();
        }

        MarketPriceCache price = new MarketPriceCache(
                quote.get().regularMarketPrice(),
                quote.get().regularMarketChangePercent(),
                OffsetDateTime.now()
        );

        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(price), Duration.ofHours(ttlHours));
        } catch (Exception e) {
            log.warn("Redis write falhou para {}: {}", key, e.getMessage());
        }

        return Optional.of(price);
    }
}
