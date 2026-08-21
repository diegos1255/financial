package com.financial.gmail.dto.inbox;

public record AttachmentSummary(
        String id,
        String filename,
        String mimeType,
        Integer size,
        boolean inline
) {}
