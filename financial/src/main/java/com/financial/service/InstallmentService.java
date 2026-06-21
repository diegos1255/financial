package com.financial.service;

import com.financial.auth.CurrentUser;
import com.financial.dto.InstallmentResponse;
import com.financial.exception.InstallmentAlreadyProcessedException;
import com.financial.exception.InstallmentNotPaidException;
import com.financial.exception.InvalidPaymentDateException;
import com.financial.exception.ResourceNotFoundException;
import com.financial.mapper.InstallmentMapper;
import com.financial.model.Expense;
import com.financial.model.Installment;
import com.financial.model.enums.InstallmentStatus;
import com.financial.repository.InstallmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class InstallmentService {

    private final InstallmentRepository repository;
    private final InstallmentMapper mapper;

    public InstallmentService(InstallmentRepository repository, InstallmentMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    public List<Installment> generateForExpense(Expense expense) {
        int count = expense.getInstallmentsCount();
        BigDecimal total = expense.getTotalAmount();
        LocalDate base = expense.getFirstDueDate();

        BigDecimal perInstallment = total.divide(BigDecimal.valueOf(count), 2, RoundingMode.DOWN);
        BigDecimal sumExceptLast = perInstallment.multiply(BigDecimal.valueOf(count - 1L));
        BigDecimal lastAmount = total.subtract(sumExceptLast);

        List<Installment> installments = new ArrayList<>(count);
        for (int n = 1; n <= count; n++) {
            BigDecimal amount = (n == count) ? lastAmount : perInstallment;
            LocalDate dueDate = base.plusMonths(n - 1L);
            Installment i = Installment.builder()
                    .expense(expense)
                    .installmentNumber(n)
                    .dueDate(dueDate)
                    .amount(amount)
                    .status(InstallmentStatus.PENDING)
                    .build();
            installments.add(i);
        }
        return repository.saveAll(installments);
    }

    public int cancelPendingFor(Expense expense) {
        return repository.cancelPendingByExpenseId(
                expense.getId(),
                InstallmentStatus.PENDING,
                InstallmentStatus.CANCELLED);
    }

    public InstallmentResponse markAsPaid(UUID id, UUID userId, LocalDate paidAt) {
        if (paidAt.isAfter(LocalDate.now())) {
            throw new InvalidPaymentDateException("paidAt não pode ser uma data futura");
        }
        Installment installment = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcela não encontrada"));
        if (installment.getStatus() != InstallmentStatus.PENDING) {
            throw new InstallmentAlreadyProcessedException("Parcela já foi processada (status: " + installment.getStatus() + ")");
        }
        YearMonth paidMonth = YearMonth.from(paidAt);
        YearMonth dueMonth = YearMonth.from(installment.getDueDate());
        InstallmentStatus newStatus = paidMonth.equals(dueMonth) || paidAt.isAfter(installment.getDueDate())
                ? InstallmentStatus.PAID
                : InstallmentStatus.ANTICIPATED;
        installment.setStatus(newStatus);
        installment.setPaidAt(paidAt.atStartOfDay(ZoneOffset.UTC).toOffsetDateTime());
        return mapper.toResponse(repository.save(installment));
    }

    public InstallmentResponse markAsPending(UUID id, UUID userId) {
        Installment installment = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcela não encontrada"));
        if (installment.getStatus() != InstallmentStatus.PAID
                && installment.getStatus() != InstallmentStatus.ANTICIPATED) {
            throw new InstallmentNotPaidException("Parcela não está paga (status: " + installment.getStatus() + ")");
        }
        installment.setStatus(InstallmentStatus.PENDING);
        installment.setPaidAt(null);
        return mapper.toResponse(repository.save(installment));
    }
}
