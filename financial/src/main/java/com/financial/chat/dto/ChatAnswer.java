package com.financial.chat.dto;

import java.util.List;

public record ChatAnswer(
        String answer,
        List<ChunkSource> sources,
        long tookMs
) {}
