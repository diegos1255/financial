package com.financial.gmail.controller;

import com.financial.gmail.dto.UnreadSummaryResponse;
import com.financial.gmail.service.GmailNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class GmailNotificationControllerTest {

    @Mock private GmailNotificationService service;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new GmailNotificationController(service)).build();
    }

    @Test
    void unreadSummary_withoutGmailConnected_returns200WithConnectedFalse() throws Exception {
        when(service.getUnreadSummary()).thenReturn(UnreadSummaryResponse.notConnected());

        mvc.perform(get("/api/gmail/unread-summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.connected").value(false))
                .andExpect(jsonPath("$.totalUnread").value(0))
                .andExpect(jsonPath("$.latestUnreadId").value(nullValue()))
                .andExpect(jsonPath("$.latestUnreadFrom").value(nullValue()))
                .andExpect(jsonPath("$.latestUnreadSubject").value(nullValue()));
    }

    @Test
    void unreadSummary_withGmailConnected_returnsSummary() throws Exception {
        when(service.getUnreadSummary())
                .thenReturn(new UnreadSummaryResponse(true, 3, "msg-1", "Ana <ana@exemplo.com>", "Fatura"));

        mvc.perform(get("/api/gmail/unread-summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.connected").value(true))
                .andExpect(jsonPath("$.totalUnread").value(3))
                .andExpect(jsonPath("$.latestUnreadFrom").value("Ana <ana@exemplo.com>"));
    }
}
