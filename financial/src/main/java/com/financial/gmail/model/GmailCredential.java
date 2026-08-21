package com.financial.gmail.model;

import com.financial.model.BaseEntity;
import com.financial.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "gmail_credentials",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_gmail_credentials_user",
                columnNames = "user_id"
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GmailCredential extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "email_address", nullable = false, length = 254)
    private String emailAddress;

    @Column(name = "refresh_token_encrypted", nullable = false, columnDefinition = "text")
    private String refreshTokenEncrypted;

    @Column(name = "access_token", length = 2048)
    private String accessToken;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "scope", nullable = false, length = 500)
    private String scope;
}
