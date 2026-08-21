package com.financial.gmail.dto.inbox;

import java.util.List;

public record PagedThreadsResponse(
        List<ThreadSummary> items,
        String nextPageToken
) {}
