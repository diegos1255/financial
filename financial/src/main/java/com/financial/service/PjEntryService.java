package com.financial.service;

import com.financial.auth.CurrentUser;
import com.financial.dto.PjEntryRequest;
import com.financial.dto.PjEntryResponse;
import com.financial.exception.ResourceConflictException;
import com.financial.exception.ResourceNotFoundException;
import com.financial.mapper.PjEntryMapper;
import com.financial.model.PjEntry;
import com.financial.model.User;
import com.financial.repository.PjEntryRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PjEntryService {

    private final PjEntryRepository repository;
    private final PjFileStorageService fileStorage;
    private final PjEntryMapper mapper;
    private final EntityManager entityManager;

    public PjEntryService(PjEntryRepository repository,
                          PjFileStorageService fileStorage,
                          PjEntryMapper mapper,
                          EntityManager entityManager) {
        this.repository = repository;
        this.fileStorage = fileStorage;
        this.mapper = mapper;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public List<PjEntryResponse> list(Integer year, Integer month) {
        UUID userId = CurrentUser.id();
        List<PjEntry> entries = (year != null && month != null)
                ? repository.findByUserIdAndYearAndMonthOrderByTypeAsc(userId, year, month)
                : repository.findByUserIdOrderByYearDescMonthDescTypeAsc(userId);
        return entries.stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public PjEntryResponse get(UUID id) {
        return mapper.toResponse(findOwn(id));
    }

    @Transactional(readOnly = true)
    public PjEntry findOwn(UUID id) {
        UUID userId = CurrentUser.id();
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Lançamento PJ não encontrado"));
    }

    public PjEntryResponse create(PjEntryRequest request, MultipartFile file) {
        UUID userId = CurrentUser.id();
        if (repository.existsByUserIdAndYearAndMonthAndType(userId, request.year(), request.month(), request.type())) {
            throw new ResourceConflictException("Já existe um lançamento " + request.type()
                    + " para " + request.month() + "/" + request.year());
        }

        String key = fileStorage.upload(userId, file);

        try {
            PjEntry entry = PjEntry.builder()
                    .user(entityManager.getReference(User.class, userId))
                    .type(request.type())
                    .year(request.year())
                    .month(request.month())
                    .amount(request.amount())
                    .fileUrl(key)
                    .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "arquivo")
                    .contentType(file.getContentType())
                    .build();
            repository.save(entry);
            return mapper.toResponse(entry);
        } catch (RuntimeException e) {
            try { fileStorage.delete(key); } catch (RuntimeException ignored) {}
            throw e;
        }
    }

    public PjEntryResponse update(UUID id, PjEntryRequest request, MultipartFile file) {
        UUID userId = CurrentUser.id();
        PjEntry entry = findOwn(id);

        boolean identityChanged = !entry.getType().equals(request.type())
                || !entry.getYear().equals(request.year())
                || !entry.getMonth().equals(request.month());

        if (identityChanged
                && repository.existsByUserIdAndYearAndMonthAndType(userId, request.year(), request.month(), request.type())) {
            throw new ResourceConflictException("Já existe um lançamento " + request.type()
                    + " para " + request.month() + "/" + request.year());
        }

        String oldKey = null;
        if (file != null && !file.isEmpty()) {
            oldKey = entry.getFileUrl();
            String newKey = fileStorage.upload(userId, file);
            entry.setFileUrl(newKey);
            entry.setFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "arquivo");
            entry.setContentType(file.getContentType());
        }

        entry.setType(request.type());
        entry.setYear(request.year());
        entry.setMonth(request.month());
        entry.setAmount(request.amount());
        repository.save(entry);

        if (oldKey != null) {
            try { fileStorage.delete(oldKey); } catch (RuntimeException ignored) {}
        }

        return mapper.toResponse(entry);
    }

    public void delete(UUID id) {
        PjEntry entry = findOwn(id);
        String key = entry.getFileUrl();
        repository.delete(entry);
        try { fileStorage.delete(key); } catch (RuntimeException ignored) {}
    }
}
