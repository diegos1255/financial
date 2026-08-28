package com.financial.chat.service;

import java.util.UUID;

public record RetrievedChunk(
        UUID id,
        String sourcePath,
        String section,
        String content,
        double score
) {}
