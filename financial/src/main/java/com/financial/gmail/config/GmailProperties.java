package com.financial.gmail.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "gmail")
public class GmailProperties {

    private String clientId;
    private String clientSecret;
    private String redirectUri;
    private String tokenEncryptionKey;
    private String authEndpoint;
    private String tokenEndpoint;
    private String revokeEndpoint;
    private String userinfoEndpoint;

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getClientSecret() { return clientSecret; }
    public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }

    public String getRedirectUri() { return redirectUri; }
    public void setRedirectUri(String redirectUri) { this.redirectUri = redirectUri; }

    public String getTokenEncryptionKey() { return tokenEncryptionKey; }
    public void setTokenEncryptionKey(String tokenEncryptionKey) { this.tokenEncryptionKey = tokenEncryptionKey; }

    public String getAuthEndpoint() { return authEndpoint; }
    public void setAuthEndpoint(String authEndpoint) { this.authEndpoint = authEndpoint; }

    public String getTokenEndpoint() { return tokenEndpoint; }
    public void setTokenEndpoint(String tokenEndpoint) { this.tokenEndpoint = tokenEndpoint; }

    public String getRevokeEndpoint() { return revokeEndpoint; }
    public void setRevokeEndpoint(String revokeEndpoint) { this.revokeEndpoint = revokeEndpoint; }

    public String getUserinfoEndpoint() { return userinfoEndpoint; }
    public void setUserinfoEndpoint(String userinfoEndpoint) { this.userinfoEndpoint = userinfoEndpoint; }
}
