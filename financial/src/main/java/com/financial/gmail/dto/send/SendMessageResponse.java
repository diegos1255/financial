package com.financial.gmail.dto.send;

public record SendMessageResponse(
        String messageId,
        String threadId
) {}
