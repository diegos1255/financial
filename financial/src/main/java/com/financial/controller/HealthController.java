package com.financial.controller;

import com.financial.dto.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private static final String SERVICE_NAME = "financial";
    private static final String VERSION = "0.0.1-SNAPSHOT";

    @GetMapping
    public HealthResponse health() {
        return new HealthResponse(
                "UP",
                SERVICE_NAME,
                VERSION,
                OffsetDateTime.now().toString()
        );
    }
}
