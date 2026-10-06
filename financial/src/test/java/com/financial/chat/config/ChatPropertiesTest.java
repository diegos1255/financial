package com.financial.chat.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ChatPropertiesTest {

    @Test
    void enabled_onlyWhenFlagOnAndApiKeyPresent() {
        ChatProperties props = new ChatProperties();
        assertThat(props.isEnabled()).isFalse();

        props.getGemini().setApiKey("key");
        assertThat(props.isEnabled()).isTrue();

        props.setEnabled(false);
        assertThat(props.isEnabled()).isFalse();
    }
}
