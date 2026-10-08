package com.financial.gmail.service;

import com.financial.auth.AuthenticatedUser;
import com.financial.gmail.api.GmailApiClient;
import com.financial.gmail.dto.UnreadSummaryResponse;
import com.financial.gmail.repository.GmailCredentialRepository;
import com.financial.gmail.util.MessageParser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GmailNotificationServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();

    @Mock private GmailApiClient api;
    @Mock private GmailCredentialRepository credentialRepository;

    private GmailNotificationService service;

    @BeforeEach
    void setUp() {
        service = new GmailNotificationService(api, new MessageParser(), credentialRepository);
        authenticate(USER_ID);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getUnreadSummary_withoutGmailConnected_returnsNotConnectedWithoutCallingGmail() {
        when(credentialRepository.existsByUserId(USER_ID)).thenReturn(false);

        UnreadSummaryResponse summary = service.getUnreadSummary();

        assertThat(summary.connected()).isFalse();
        assertThat(summary.totalUnread()).isZero();
        assertThat(summary.latestUnreadId()).isNull();
        assertThat(summary.latestUnreadFrom()).isNull();
        assertThat(summary.latestUnreadSubject()).isNull();
        verifyNoInteractions(api);
    }

    @Test
    void getUnreadSummary_withGmailConnected_returnsConnectedWithUnreadCount() {
        when(credentialRepository.existsByUserId(USER_ID)).thenReturn(true);
        stubThreeUnreadFromAna();

        UnreadSummaryResponse summary = service.getUnreadSummary();

        assertThat(summary.connected()).isTrue();
        assertThat(summary.totalUnread()).isEqualTo(3);
        assertThat(summary.latestUnreadId()).isEqualTo("msg-1");
        assertThat(summary.latestUnreadFrom()).isEqualTo("Ana <ana@exemplo.com>");
        assertThat(summary.latestUnreadSubject()).isEqualTo("Fatura");
    }

    @Test
    void getUnreadSummary_rightAfterConnecting_isNotStuckOnNotConnected() {
        when(credentialRepository.existsByUserId(USER_ID)).thenReturn(false, true);
        stubThreeUnreadFromAna();

        UnreadSummaryResponse before = service.getUnreadSummary();
        UnreadSummaryResponse after = service.getUnreadSummary();

        assertThat(before.connected()).isFalse();
        assertThat(after.connected()).isTrue();
        assertThat(after.totalUnread()).isEqualTo(3);
    }

    @Test
    void getUnreadSummary_afterDisconnectAndReconnect_doesNotReuseOldAccountCache() {
        when(credentialRepository.existsByUserId(USER_ID)).thenReturn(true, false, true);
        stubThreeUnreadFromAna();

        service.getUnreadSummary();
        service.getUnreadSummary();
        when(api.getLabel("INBOX")).thenReturn(Map.of("messagesUnread", 0));
        UnreadSummaryResponse afterReconnect = service.getUnreadSummary();

        assertThat(afterReconnect.connected()).isTrue();
        assertThat(afterReconnect.totalUnread()).isZero();
        verify(api, times(2)).getLabel("INBOX");
    }

    @Test
    void getUnreadSummary_withGmailConnectedAndInboxZero_returnsConnectedWithZero() {
        when(credentialRepository.existsByUserId(USER_ID)).thenReturn(true);
        when(api.getLabel("INBOX")).thenReturn(Map.of("messagesUnread", 0));

        UnreadSummaryResponse summary = service.getUnreadSummary();

        assertThat(summary.connected()).isTrue();
        assertThat(summary.totalUnread()).isZero();
        assertThat(summary.latestUnreadId()).isNull();
    }

    @Test
    void getUnreadSummary_whenGmailLabelFails_staysConnectedWithZero() {
        when(credentialRepository.existsByUserId(USER_ID)).thenReturn(true);
        when(api.getLabel("INBOX")).thenThrow(new RuntimeException("Gmail fora"));

        UnreadSummaryResponse summary = service.getUnreadSummary();

        assertThat(summary.connected()).isTrue();
        assertThat(summary.totalUnread()).isZero();
    }

    @Test
    void getUnreadSummary_withUnreadButNoMessageId_staysConnected() {
        when(credentialRepository.existsByUserId(USER_ID)).thenReturn(true);
        when(api.getLabel("INBOX")).thenReturn(Map.of("messagesUnread", 3));
        when(api.listMessages(isNull(), anyList(), anyInt(), isNull())).thenReturn(Map.of());

        UnreadSummaryResponse summary = service.getUnreadSummary();

        assertThat(summary.connected()).isTrue();
        assertThat(summary.totalUnread()).isEqualTo(3);
        assertThat(summary.latestUnreadId()).isNull();
    }

    @Test
    void getUnreadSummary_whenMessageHeadersFail_staysConnectedWithId() {
        when(credentialRepository.existsByUserId(USER_ID)).thenReturn(true);
        when(api.getLabel("INBOX")).thenReturn(Map.of("messagesUnread", 3));
        when(api.listMessages(isNull(), anyList(), anyInt(), isNull()))
                .thenReturn(Map.of("messages", List.of(Map.of("id", "msg-1"))));
        when(api.getMessage(anyString(), any(), anyList())).thenThrow(new RuntimeException("Gmail fora"));

        UnreadSummaryResponse summary = service.getUnreadSummary();

        assertThat(summary.connected()).isTrue();
        assertThat(summary.latestUnreadId()).isEqualTo("msg-1");
        assertThat(summary.latestUnreadFrom()).isNull();
    }

    @Test
    void getUnreadSummary_rightAfterDisconnecting_returnsNotConnectedEvenWithCachedSummary() {
        when(credentialRepository.existsByUserId(USER_ID)).thenReturn(true, false);
        stubThreeUnreadFromAna();

        UnreadSummaryResponse before = service.getUnreadSummary();
        UnreadSummaryResponse after = service.getUnreadSummary();

        assertThat(before.connected()).isTrue();
        assertThat(after.connected()).isFalse();
        assertThat(after.totalUnread()).isZero();
    }

    @Test
    void getUnreadSummary_cacheIsPerUser() {
        UUID otherUser = UUID.randomUUID();
        when(credentialRepository.existsByUserId(USER_ID)).thenReturn(true);
        when(credentialRepository.existsByUserId(otherUser)).thenReturn(false);
        stubThreeUnreadFromAna();

        service.getUnreadSummary();
        authenticate(otherUser);
        UnreadSummaryResponse other = service.getUnreadSummary();

        assertThat(other.connected()).isFalse();
        assertThat(other.totalUnread()).isZero();
        verify(api, times(1)).getLabel("INBOX");
    }

    private void authenticate(UUID userId) {
        AuthenticatedUser principal = new AuthenticatedUser(userId, "diego", "x", true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    private void stubThreeUnreadFromAna() {
        when(api.getLabel("INBOX")).thenReturn(Map.of("messagesUnread", 3));
        when(api.listMessages(isNull(), anyList(), anyInt(), isNull()))
                .thenReturn(Map.of("messages", List.of(Map.of("id", "msg-1"))));
        when(api.getMessage(anyString(), any(), anyList())).thenReturn(Map.of("payload", Map.of("headers", List.of(
                Map.of("name", "From", "value", "Ana <ana@exemplo.com>"),
                Map.of("name", "Subject", "value", "Fatura")))));
    }
}
