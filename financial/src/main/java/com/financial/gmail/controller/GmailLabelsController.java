package com.financial.gmail.controller;

import com.financial.gmail.dto.labels.CreateLabelRequest;
import com.financial.gmail.dto.labels.LabelSummary;
import com.financial.gmail.dto.labels.ModifyLabelsRequest;
import com.financial.gmail.dto.labels.RenameLabelRequest;
import com.financial.gmail.service.GmailLabelsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/gmail")
public class GmailLabelsController {

    private final GmailLabelsService service;

    public GmailLabelsController(GmailLabelsService service) {
        this.service = service;
    }

    @GetMapping("/labels")
    public List<LabelSummary> list(@RequestParam(defaultValue = "false") boolean includeStats) {
        return service.list(includeStats);
    }

    @PostMapping("/labels")
    public LabelSummary create(@Valid @RequestBody CreateLabelRequest request) {
        return service.create(request.name());
    }

    @PatchMapping("/labels/{id}")
    public LabelSummary rename(@PathVariable("id") String id,
                                @Valid @RequestBody RenameLabelRequest request) {
        return service.rename(id, request.newName());
    }

    @DeleteMapping("/labels/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/threads/{id}/labels")
    public ResponseEntity<Void> modifyThreadLabels(@PathVariable("id") String threadId,
                                                    @Valid @RequestBody ModifyLabelsRequest request) {
        service.modifyThreadLabels(threadId, request.add(), request.remove());
        return ResponseEntity.noContent().build();
    }
}
