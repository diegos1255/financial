package com.financial.gmail.service;

import com.financial.gmail.api.GmailApiClient;
import com.financial.gmail.dto.actions.BulkActionRequest;
import com.financial.gmail.dto.actions.BulkActionResponse;
import com.financial.gmail.dto.actions.GmailBulkAction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.concurrent.DelegatingSecurityContextExecutorService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class GmailActionsService {

    private static final Logger log = LoggerFactory.getLogger(GmailActionsService.class);
    private static final String LABEL_INBOX = "INBOX";
    private static final String LABEL_UNREAD = "UNREAD";
    private static final int BULK_PARALLELISM = 10;

    private final GmailApiClient api;
    private final GmailNotificationService notificationService;

    public GmailActionsService(GmailApiClient api, GmailNotificationService notificationService) {
        this.api = api;
        this.notificationService = notificationService;
    }

    public void archive(String threadId) {
        api.modifyThread(threadId, List.of(), List.of(LABEL_INBOX));
        notificationService.invalidate();
    }

    public void trash(String threadId) {
        api.trashThread(threadId);
        notificationService.invalidate();
    }

    public void markAsRead(String threadId) {
        api.modifyThread(threadId, List.of(), List.of(LABEL_UNREAD));
        notificationService.invalidate();
    }

    public void markAsUnread(String threadId) {
        api.modifyThread(threadId, List.of(LABEL_UNREAD), List.of());
        notificationService.invalidate();
    }

    public BulkActionResponse bulkExecute(BulkActionRequest request) {
        List<String> ids = request.threadIds();
        GmailBulkAction action = request.action();

        ExecutorService executor = new DelegatingSecurityContextExecutorService(
                Executors.newFixedThreadPool(Math.min(BULK_PARALLELISM, ids.size())));
        try {
            AtomicInteger success = new AtomicInteger(0);
            java.util.List<String> failed = java.util.Collections.synchronizedList(new java.util.ArrayList<>());

            List<CompletableFuture<Void>> futures = ids.stream()
                    .map(id -> CompletableFuture.runAsync(() -> {
                        try {
                            applyAction(action, id);
                            success.incrementAndGet();
                        } catch (RuntimeException e) {
                            log.error("Bulk action {} failed for thread {}: {}", action, id, e.toString(), e);
                            failed.add(id);
                        }
                    }, executor))
                    .toList();

            try {
                CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).get();
            } catch (InterruptedException | ExecutionException e) {
                Thread.currentThread().interrupt();
            }

            notificationService.invalidate();
            return new BulkActionResponse(success.get(), List.copyOf(failed));
        } finally {
            executor.shutdown();
        }
    }

    private void applyAction(GmailBulkAction action, String threadId) {
        switch (action) {
            case ARCHIVE -> api.modifyThread(threadId, List.of(), List.of(LABEL_INBOX));
            case TRASH -> api.trashThread(threadId);
            case READ -> api.modifyThread(threadId, List.of(), List.of(LABEL_UNREAD));
            case UNREAD -> api.modifyThread(threadId, List.of(LABEL_UNREAD), List.of());
        }
    }
}
