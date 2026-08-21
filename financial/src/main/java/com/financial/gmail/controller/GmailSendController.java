package com.financial.gmail.controller;

import com.financial.gmail.dto.send.SendMessageRequest;
import com.financial.gmail.dto.send.SendMessageResponse;
import com.financial.gmail.service.GmailSendService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/gmail")
public class GmailSendController {

    private final GmailSendService service;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Validator validator;

    public GmailSendController(GmailSendService service, Validator validator) {
        this.service = service;
        this.validator = validator;
    }

    /**
     * Endpoint JSON — mantido pra compatibilidade e casos sem anexo. Front usa
     * o multipart abaixo por default (envia payload+files juntos).
     */
    @PostMapping(value = "/messages/send", consumes = MediaType.APPLICATION_JSON_VALUE)
    public SendMessageResponse sendJson(@Valid @RequestBody SendMessageRequest request) {
        return service.send(request);
    }

    /**
     * Endpoint multipart — recebe payload (JSON como campo texto) + files (multi).
     * Motivo: o browser nao envia Content-Type em cada @RequestPart quando o campo
     * eh gerado por FormData (part JSON vira text/plain), entao aceitamos como
     * string e desserializamos aqui — mesmo padrao usado no signup.
     */
    @PostMapping(value = "/messages/send", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public SendMessageResponse sendMultipart(
            @RequestParam("payload") String payloadJson,
            @RequestParam(value = "files", required = false) List<MultipartFile> files) {
        SendMessageRequest request = parsePayload(payloadJson);
        validate(request);
        return service.send(request, files);
    }

    private SendMessageRequest parsePayload(String json) {
        if (json == null || json.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "payload obrigatorio");
        }
        try {
            return objectMapper.readValue(json, SendMessageRequest.class);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "payload invalido: " + e.getMessage());
        }
    }

    private void validate(SendMessageRequest request) {
        var violations = validator.validate(request);
        if (!violations.isEmpty()) {
            String msg = violations.stream()
                    .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                    .collect(Collectors.joining("; "));
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
        }
    }
}
