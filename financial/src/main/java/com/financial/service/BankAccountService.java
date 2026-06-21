package com.financial.service;

import com.financial.auth.CurrentUser;
import com.financial.dto.ActiveRequest;
import com.financial.dto.BankAccountRequest;
import com.financial.dto.BankAccountResponse;
import com.financial.dto.PageResponse;
import com.financial.exception.ResourceNotFoundException;
import com.financial.mapper.BankAccountMapper;
import com.financial.model.BankAccount;
import com.financial.model.User;
import com.financial.repository.BankAccountRepository;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class BankAccountService {

    private final BankAccountRepository repository;
    private final BankAccountMapper mapper;
    private final EntityManager entityManager;

    public BankAccountService(BankAccountRepository repository,
                              BankAccountMapper mapper,
                              EntityManager entityManager) {
        this.repository = repository;
        this.mapper = mapper;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public PageResponse<BankAccountResponse> list(String q, boolean includeInactive, int page, int size) {
        UUID userId = CurrentUser.id();
        Specification<BankAccount> spec = (root, query, cb) -> cb.equal(root.get("user").get("id"), userId);
        if (!includeInactive) {
            spec = spec.and((root, query, cb) -> cb.isTrue(root.get("active")));
        }
        if (q != null && !q.isBlank()) {
            String pattern = "%" + q.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("name")), pattern));
        }
        var pageable = PageRequest.of(page, size, Sort.by("name").ascending());
        return PageResponse.from(repository.findAll(spec, pageable).map(mapper::toResponse));
    }

    @Transactional(readOnly = true)
    public List<BankAccountResponse> listAll() {
        UUID userId = CurrentUser.id();
        return repository.findAllByUserIdAndActiveTrueOrderByNameAsc(userId)
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public BankAccountResponse get(UUID id) {
        return mapper.toResponse(loadOwned(id));
    }

    public BankAccountResponse create(BankAccountRequest request) {
        UUID userId = CurrentUser.id();
        BankAccount entity = BankAccount.builder()
                .user(entityManager.getReference(User.class, userId))
                .name(request.name())
                .description(request.description())
                .active(true)
                .build();
        return mapper.toResponse(repository.save(entity));
    }

    public BankAccountResponse update(UUID id, BankAccountRequest request) {
        BankAccount entity = loadOwned(id);
        mapper.updateEntityFromRequest(request, entity);
        return mapper.toResponse(repository.save(entity));
    }

    public BankAccountResponse setActive(UUID id, ActiveRequest request) {
        BankAccount entity = loadOwned(id);
        entity.setActive(request.active());
        return mapper.toResponse(repository.save(entity));
    }

    public void softDelete(UUID id) {
        BankAccount entity = loadOwned(id);
        if (Boolean.FALSE.equals(entity.getActive())) {
            return;
        }
        entity.setActive(false);
        repository.save(entity);
    }

    private BankAccount loadOwned(UUID id) {
        return repository.findByIdAndUserId(id, CurrentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Conta bancária não encontrada"));
    }
}
