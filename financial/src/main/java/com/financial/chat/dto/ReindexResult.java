package com.financial.chat.dto;

public record ReindexResult(
        int filesProcessed,
        int chunksCreated,
        long tookMs
) {}
