package com.financial.service;

import com.financial.auth.CurrentUser;
import com.financial.dto.ActiveRequest;
import com.financial.dto.ExpenseCategoryRequest;
import com.financial.dto.ExpenseCategoryResponse;
import com.financial.dto.PageResponse;
import com.financial.exception.ResourceConflictException;
import com.financial.exception.ResourceNotFoundException;
import com.financial.mapper.ExpenseCategoryMapper;
import com.financial.model.ExpenseCategory;
import com.financial.model.User;
import com.financial.repository.ExpenseCategoryRepository;
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
public class ExpenseCategoryService {

    private final ExpenseCategoryRepository repository;
    private final ExpenseCategoryMapper mapper;
    private final EntityManager entityManager;

    public ExpenseCategoryService(ExpenseCategoryRepository repository,
                                  ExpenseCategoryMapper mapper,
                                  EntityManager entityManager) {
        this.repository = repository;
        this.mapper = mapper;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public PageResponse<ExpenseCategoryResponse> list(String q, boolean includeInactive, int page, int size) {
        UUID userId = CurrentUser.id();
        Specification<ExpenseCategory> spec = (root, query, cb) -> cb.equal(root.get("user").get("id"), userId);
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
    public List<ExpenseCategoryResponse> listAll() {
        UUID userId = CurrentUser.id();
        return repository.findAllByUserIdAndActiveTrueOrderByNameAsc(userId)
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ExpenseCategoryResponse get(UUID id) {
        return mapper.toResponse(loadOwned(id));
    }

    public ExpenseCategoryResponse create(ExpenseCategoryRequest request) {
        UUID userId = CurrentUser.id();
        if (repository.existsByUserIdAndNameIgnoreCase(userId, request.name())) {
            throw new ResourceConflictException("Já existe uma categoria com este nome");
        }
        ExpenseCategory entity = ExpenseCategory.builder()
                .user(entityManager.getReference(User.class, userId))
                .name(request.name())
                .description(request.description())
                .color(request.color())
                .active(true)
                .build();
        return mapper.toResponse(repository.save(entity));
    }

    public ExpenseCategoryResponse update(UUID id, ExpenseCategoryRequest request) {
        ExpenseCategory entity = loadOwned(id);
        if (repository.existsByUserIdAndNameIgnoreCaseAndIdNot(CurrentUser.id(), request.name(), id)) {
            throw new ResourceConflictException("Já existe uma categoria com este nome");
        }
        mapper.updateEntityFromRequest(request, entity);
        return mapper.toResponse(repository.save(entity));
    }

    public ExpenseCategoryResponse setActive(UUID id, ActiveRequest request) {
        ExpenseCategory entity = loadOwned(id);
        entity.setActive(request.active());
        return mapper.toResponse(repository.save(entity));
    }

    public void softDelete(UUID id) {
        ExpenseCategory entity = loadOwned(id);
        if (Boolean.FALSE.equals(entity.getActive())) {
            return;
        }
        entity.setActive(false);
        repository.save(entity);
    }

    private ExpenseCategory loadOwned(UUID id) {
        return repository.findByIdAndUserId(id, CurrentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));
    }
}
