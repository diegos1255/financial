package com.financial.controller;

import com.financial.dto.HealthResponse;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HealthControllerTest {

    private final HealthController controller = new HealthController();

    @Test
    void health_returnsUpStatusWithMetadata() {
        HealthResponse response = controller.health();

        assertThat(response.status()).isEqualTo("UP");
        assertThat(response.service()).isEqualTo("financial");
        assertThat(response.version()).isEqualTo("0.0.1-SNAPSHOT");
        assertThat(response.timestamp()).isNotBlank();
    }
}
