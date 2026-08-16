package com.financial.gmail.util;

import com.financial.gmail.config.GmailProperties;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Criptografia AES-256-GCM para refresh tokens do Gmail em rest.
 *
 * Formato armazenado: base64( IV || ciphertext || auth_tag )
 * onde IV = 12 bytes aleatórios e auth_tag = 16 bytes (128 bits).
 */
@Component
public class TokenCipher {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_LENGTH_BYTES = 12;
    private static final int TAG_LENGTH_BITS = 128;
    private static final int KEY_LENGTH_BYTES = 32;

    private final GmailProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();
    private SecretKey key;

    public TokenCipher(GmailProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    void init() {
        String base64Key = properties.getTokenEncryptionKey();
        if (base64Key == null || base64Key.isBlank()) {
            // Sistema sobe sem key; só falha quando alguém tentar usar (feature Gmail desligada)
            this.key = null;
            return;
        }
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(base64Key);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("GMAIL_TOKEN_ENCRYPTION_KEY não é base64 válido", e);
        }
        if (keyBytes.length != KEY_LENGTH_BYTES) {
            throw new IllegalStateException(
                    "GMAIL_TOKEN_ENCRYPTION_KEY deve ter " + KEY_LENGTH_BYTES
                            + " bytes após base64 decode (tem " + keyBytes.length + ")");
        }
        this.key = new SecretKeySpec(keyBytes, "AES");
    }

    private void ensureConfigured() {
        if (key == null) {
            throw new IllegalStateException(
                    "GMAIL_TOKEN_ENCRYPTION_KEY não configurada. Gere com: openssl rand -base64 32");
        }
    }

    public String encrypt(String plaintext) {
        ensureConfigured();
        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + ciphertext.length);
            buffer.put(iv);
            buffer.put(ciphertext);
            return Base64.getEncoder().encodeToString(buffer.array());
        } catch (Exception e) {
            throw new RuntimeException("Falha ao criptografar token", e);
        }
    }

    public String decrypt(String base64) {
        ensureConfigured();
        try {
            byte[] all = Base64.getDecoder().decode(base64);
            if (all.length < IV_LENGTH_BYTES + (TAG_LENGTH_BITS / 8)) {
                throw new IllegalArgumentException("payload criptografado muito curto");
            }
            byte[] iv = new byte[IV_LENGTH_BYTES];
            System.arraycopy(all, 0, iv, 0, IV_LENGTH_BYTES);
            byte[] ciphertext = new byte[all.length - IV_LENGTH_BYTES];
            System.arraycopy(all, IV_LENGTH_BYTES, ciphertext, 0, ciphertext.length);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Falha ao descriptografar token", e);
        }
    }
}
