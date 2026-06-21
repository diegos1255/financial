package com.financial.service;

import com.financial.auth.CurrentUser;
import com.financial.dto.ExpenseRequest;
import com.financial.dto.ExpenseResponse;
import com.financial.dto.ExpenseUpdateRequest;
import com.financial.exception.ExpenseCancellationException;
import com.financial.exception.InvalidExpenseTypeException;
import com.financial.exception.ResourceNotFoundException;
import com.financial.mapper.ExpenseMapper;
import com.financial.model.BankAccount;
import com.financial.model.Expense;
import com.financial.model.ExpenseCategory;
import com.financial.model.User;
import com.financial.model.enums.ExpenseStatus;
import com.financial.model.enums.ExpenseType;
import com.financial.repository.BankAccountRepository;
import com.financial.repository.ExpenseCategoryRepository;
import com.financial.repository.ExpenseRepository;
import com.financial.repository.ExpenseSpecifications;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ExpenseService {

    private final ExpenseRepository repository;
    private final ExpenseCategoryRepository categoryRepository;
    private final BankAccountRepository bankAccountRepository;
    private final InstallmentService installmentService;
    private final ExpenseMapper mapper;
    private final EntityManager entityManager;

    public ExpenseService(ExpenseRepository repository,
                          ExpenseCategoryRepository categoryRepository,
                          BankAccountRepository bankAccountRepository,
                          InstallmentService installmentService,
                          ExpenseMapper mapper,
                          EntityManager entityManager) {
        this.repository = repository;
        this.categoryRepository = categoryRepository;
        this.bankAccountRepository = bankAccountRepository;
        this.installmentService = installmentService;
        this.mapper = mapper;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> list(Integer year, Integer month, ExpenseStatus status,
                                      UUID categoryId, UUID bankAccountId) {
        LocalDate startOfMonth = null;
        LocalDate endOfMonth = null;
        if (year != null && month != null) {
            YearMonth ym = YearMonth.of(year, month);
            startOfMonth = ym.atDay(1);
            endOfMonth = ym.atEndOfMonth();
        }
        Specification<Expense> spec = ExpenseSpecifications.byUserId(CurrentUser.id())
                .and(ExpenseSpecifications.byStatus(status))
                .and(ExpenseSpecifications.byCategoryId(categoryId))
                .and(ExpenseSpecifications.byBankAccountId(bankAccountId))
                .and(ExpenseSpecifications.inReferenceMonth(startOfMonth, endOfMonth));
        Sort sort = Sort.by(Sort.Order.desc("purchaseDate"), Sort.Order.desc("createdDate"));
        return repository.findAll(spec, sort).stream()
                .map(mapper::toResponseWithoutInstallments)
                .toList();
    }

    @Transactional(readOnly = true)
    public ExpenseResponse get(UUID id) {
        Expense expense = repository.findByIdAndUserIdWithInstallments(id, CurrentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Despesa não encontrada"));
        return mapper.toResponseWithInstallments(expense);
    }

    public ExpenseResponse create(ExpenseRequest request) {
        UUID userId = CurrentUser.id();

        if (request.expenseType() == ExpenseType.INSTALLMENT) {
            if (request.installmentsCount() == null || request.installmentsCount() < 1) {
                throw new InvalidExpenseTypeException("installmentsCount é obrigatório (>=1) para expenseType=INSTALLMENT");
            }
            if (request.firstDueDate() == null) {
                throw new InvalidExpenseTypeException("firstDueDate é obrigatório para expenseType=INSTALLMENT");
            }
            if (request.firstDueDate().isBefore(request.purchaseDate())) {
                throw new InvalidExpenseTypeException("firstDueDate não pode ser anterior à purchaseDate");
            }
        } else {
            if (request.installmentsCount() != null) {
                throw new InvalidExpenseTypeException("installmentsCount não deve ser informado para expenseType=" + request.expenseType());
            }
            if (request.firstDueDate() != null) {
                throw new InvalidExpenseTypeException("firstDueDate só é permitido para expenseType=INSTALLMENT");
            }
        }
        ensureCategoryBelongsToUser(request.categoryId(), userId);
        ensureBankAccountBelongsToUser(request.bankAccountId(), userId);

        Expense expense = Expense.builder()
                .user(entityManager.getReference(User.class, userId))
                .category(entityManager.getReference(ExpenseCategory.class, request.categoryId()))
                .bankAccount(entityManager.getReference(BankAccount.class, request.bankAccountId()))
                .description(request.description())
                .totalAmount(request.totalAmount())
                .expenseType(request.expenseType())
                .status(ExpenseStatus.ACTIVE)
                .purchaseDate(request.purchaseDate())
                .firstDueDate(request.expenseType() == ExpenseType.INSTALLMENT
                        ? request.firstDueDate() : null)
                .installmentsCount(request.expenseType() == ExpenseType.INSTALLMENT
                        ? request.installmentsCount() : null)
                .build();
        Expense saved = repository.save(expense);

        if (saved.getExpenseType() == ExpenseType.INSTALLMENT) {
            saved.setInstallments(installmentService.generateForExpense(saved));
        }
        return mapper.toResponseWithInstallments(saved);
    }

    public ExpenseResponse update(UUID id, ExpenseUpdateRequest request) {
        UUID userId = CurrentUser.id();
        Expense expense = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Despesa não encontrada"));
        ensureCategoryBelongsToUser(request.categoryId(), userId);
        ensureBankAccountBelongsToUser(request.bankAccountId(), userId);

        expense.setDescription(request.description());
        expense.setCategory(entityManager.getReference(ExpenseCategory.class, request.categoryId()));
        expense.setBankAccount(entityManager.getReference(BankAccount.class, request.bankAccountId()));
        repository.save(expense);
        return get(id);
    }

    public void cancel(UUID id) {
        Expense expense = repository.findByIdAndUserId(id, CurrentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Despesa não encontrada"));
        if (expense.getStatus() == ExpenseStatus.CANCELLED) {
            throw new ExpenseCancellationException("Despesa já está cancelada");
        }
        expense.setStatus(ExpenseStatus.CANCELLED);
        expense.setCancelledAt(OffsetDateTime.now());
        repository.save(expense);
        installmentService.cancelPendingFor(expense);
    }

    private void ensureCategoryBelongsToUser(UUID categoryId, UUID userId) {
        categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));
    }

    private void ensureBankAccountBelongsToUser(UUID bankAccountId, UUID userId) {
        bankAccountRepository.findByIdAndUserId(bankAccountId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conta bancária não encontrada"));
    }
}
