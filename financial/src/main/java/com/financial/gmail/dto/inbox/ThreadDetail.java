package com.financial.gmail.dto.inbox;

import java.util.List;

public record ThreadDetail(
        String id,
        String subject,
        List<MessageDetail> messages
) {}
