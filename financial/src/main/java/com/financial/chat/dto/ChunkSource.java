package com.financial.chat.dto;

public record ChunkSource(
        String sourcePath,
        String section,
        double score
) {}
