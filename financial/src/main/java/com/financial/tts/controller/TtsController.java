package com.financial.tts.controller;

import com.financial.tts.service.TtsService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tts")
public class TtsController {

    private final TtsService service;

    public TtsController(TtsService service) {
        this.service = service;
    }

    @GetMapping("/status")
    public StatusResponse status() {
        return new StatusResponse(service.isEnabled());
    }

    @PostMapping("/speak")
    public ResponseEntity<byte[]> speak(@RequestBody SpeakRequest request) {
        if (!service.isEnabled()) {
            return ResponseEntity.notFound().build();
        }
        byte[] audio = service.synthesize(request.text());
        if (audio == null || audio.length == 0) {
            return ResponseEntity.status(502).build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.valueOf("audio/mpeg"))
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(audio);
    }

    public record SpeakRequest(
            @NotBlank @Size(max = 500) String text
    ) {}

    public record StatusResponse(boolean enabled) {}
}
