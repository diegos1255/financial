package com.financial.dto;

import java.util.List;
import java.util.UUID;

public record MenuResponse(
        UUID id,
        String label,
        String route,
        String icon,
        Integer sortOrder,
        List<MenuResponse> children
) {}
