package com.financial.service;

import com.financial.auth.CurrentUser;
import com.financial.dto.SalaryRequest;
import com.financial.dto.SalaryResponse;
import com.financial.exception.DuplicateSalaryException;
import com.financial.exception.ResourceNotFoundException;
import com.financial.mapper.SalaryMapper;
import com.financial.model.BankAccount;
import com.financial.model.Salary;
import com.financial.model.User;
import com.financial.repository.BankAccountRepository;
import com.financial.repository.SalaryRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class SalaryService {

    private final SalaryRepository repository;
    private final BankAccountRepository bankAccountRepository;
    private final SalaryMapper mapper;
    private final EntityManager entityManager;

    public SalaryService(SalaryRepository repository,
                         BankAccountRepository bankAccountRepository,
                         SalaryMapper mapper,
                         EntityManager entityManager) {
        this.repository = repository;
        this.bankAccountRepository = bankAccountRepository;
        this.mapper = mapper;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public List<SalaryResponse> list(Integer year, Integer month, UUID bankAccountId) {
        return repository.findFiltered(CurrentUser.id(), year, month, bankAccountId).stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SalaryResponse get(UUID id) {
        return mapper.toResponse(loadOwned(id));
    }

    public SalaryResponse create(SalaryRequest request) {
        UUID userId = CurrentUser.id();
        ensureBankAccountBelongsToUser(request.bankAccountId(), userId);
        if (repository.existsByUserIdAndReferenceYearAndReferenceMonth(
                userId, request.referenceYear(), request.referenceMonth())) {
            throw new DuplicateSalaryException(
                    "Já existe salário para %d/%d".formatted(request.referenceMonth(), request.referenceYear()));
        }
        Salary entity = Salary.builder()
                .user(entityManager.getReference(User.class, userId))
                .bankAccount(entityManager.getReference(BankAccount.class, request.bankAccountId()))
                .referenceYear(request.referenceYear())
                .referenceMonth(request.referenceMonth())
                .amount(request.amount())
                .description(request.description())
                .build();
        return mapper.toResponse(repository.save(entity));
    }

    public SalaryResponse update(UUID id, SalaryRequest request) {
        UUID userId = CurrentUser.id();
        Salary entity = loadOwned(id);
        ensureBankAccountBelongsToUser(request.bankAccountId(), userId);
        if (repository.existsByUserIdAndReferenceYearAndReferenceMonthAndIdNot(
                userId, request.referenceYear(), request.referenceMonth(), id)) {
            throw new DuplicateSalaryException(
                    "Já existe salário para %d/%d".formatted(request.referenceMonth(), request.referenceYear()));
        }
        entity.setBankAccount(entityManager.getReference(BankAccount.class, request.bankAccountId()));
        entity.setReferenceYear(request.referenceYear());
        entity.setReferenceMonth(request.referenceMonth());
        entity.setAmount(request.amount());
        entity.setDescription(request.description());
        return mapper.toResponse(repository.save(entity));
    }

    public void delete(UUID id) {
        Salary entity = loadOwned(id);
        repository.delete(entity);
    }

    private Salary loadOwned(UUID id) {
        return repository.findByIdAndUserId(id, CurrentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Salário não encontrado"));
    }

    private void ensureBankAccountBelongsToUser(UUID bankAccountId, UUID userId) {
        bankAccountRepository.findByIdAndUserId(bankAccountId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conta bancária não encontrada"));
    }
}
