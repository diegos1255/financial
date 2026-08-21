package com.financial.gmail.dto.actions;

import java.util.List;

public record BulkActionResponse(
        int successCount,
        List<String> failedIds
) {}
