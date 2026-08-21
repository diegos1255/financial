package com.financial.gmail.util;

import com.financial.gmail.dto.send.SendMessageRequest;
import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Properties;

/**
 * Monta o MIME (RFC 5322) a partir do request e devolve em base64url,
 * pronto pro campo `raw` do endpoint messages.send do Gmail.
 *
 * Usa jakarta.mail pra encoding (subject via RFC 2047, body UTF-8 auto).
 * Bcc entra no header MimeMessage — o Gmail lê e envia sem expor
 * (o receptor final nao ve o header Bcc).
 */
@Component
public class MimeMessageBuilder {

    private static final Session SESSION = Session.getInstance(new Properties());

    public String buildRawMessage(String from, SendMessageRequest req) {
        try {
            MimeMessage message = new MimeMessage(SESSION);
            message.setFrom(new InternetAddress(from));
            for (String to : req.to()) {
                message.addRecipient(Message.RecipientType.TO, new InternetAddress(to));
            }
            if (req.cc() != null) {
                for (String cc : req.cc()) {
                    message.addRecipient(Message.RecipientType.CC, new InternetAddress(cc));
                }
            }
            if (req.bcc() != null) {
                for (String bcc : req.bcc()) {
                    message.addRecipient(Message.RecipientType.BCC, new InternetAddress(bcc));
                }
            }
            message.setSubject(req.subject(), StandardCharsets.UTF_8.name());
            message.setText(req.body(), StandardCharsets.UTF_8.name());

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            message.writeTo(out);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(out.toByteArray());
        } catch (Exception e) {
            throw new IllegalArgumentException("Falha ao montar MIME do email: " + e.getMessage(), e);
        }
    }
}
