package com.financial.service;

import com.financial.auth.AuthenticatedUser;
import com.financial.dto.InvestmentIncomeRequest;
import com.financial.dto.InvestmentIncomeResponse;
import com.financial.exception.InvalidInvestmentOperationException;
import com.financial.model.Investment;
import com.financial.model.InvestmentIncome;
import com.financial.model.enums.InvestmentIncomeType;
import com.financial.repository.InvestmentIncomeRepository;
import com.financial.repository.InvestmentRepository;
import com.financial.repository.InvestmentTransactionRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InvestmentLedgerServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID INVESTMENT_ID = UUID.randomUUID();
    private static final LocalDate PAY_DATE = LocalDate.parse("2026-10-08");

    private InvestmentRepository investmentRepository;
    private InvestmentIncomeRepository incomeRepository;
    private InvestmentLedgerService service;
    private Investment gare11;

    @BeforeEach
    void setUp() {
        investmentRepository = mock(InvestmentRepository.class);
        incomeRepository = mock(InvestmentIncomeRepository.class);
        service = new InvestmentLedgerService(investmentRepository, mock(InvestmentTransactionRepository.class),
                incomeRepository, mock(EntityManager.class));
        gare11 = Investment.builder().ticker("GARE11").quantity(455).build();
        gare11.setId(INVESTMENT_ID);
        when(investmentRepository.findByIdAndUserId(INVESTMENT_ID, USER_ID)).thenReturn(Optional.of(gare11));
        when(incomeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        AuthenticatedUser principal = new AuthenticatedUser(USER_ID, "diego", "x", true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void addIncome_perShare_multipliesByCurrentQuantity() {
        InvestmentIncomeResponse response = service.addIncome(INVESTMENT_ID,
                new InvestmentIncomeRequest(InvestmentIncomeType.RENDIMENTO, PAY_DATE, null, new BigDecimal("0.07")));

        ArgumentCaptor<InvestmentIncome> saved = ArgumentCaptor.forClass(InvestmentIncome.class);
        verify(incomeRepository).save(saved.capture());
        assertThat(saved.getValue().getAmount()).isEqualByComparingTo("31.85");
        assertThat(saved.getValue().getQuantity()).isEqualTo(455);
        assertThat(saved.getValue().getUnitValue()).isEqualByComparingTo("0.07");
        assertThat(response.amount()).isEqualByComparingTo("31.85");
    }

    @Test
    void addIncome_total_keepsAmountWithoutQuantity() {
        service.addIncome(INVESTMENT_ID,
                new InvestmentIncomeRequest(InvestmentIncomeType.RENDIMENTO, PAY_DATE, new BigDecimal("31.95"), null));

        ArgumentCaptor<InvestmentIncome> saved = ArgumentCaptor.forClass(InvestmentIncome.class);
        verify(incomeRepository).save(saved.capture());
        assertThat(saved.getValue().getAmount()).isEqualByComparingTo("31.95");
        assertThat(saved.getValue().getQuantity()).isNull();
    }

    @Test
    void addIncome_withoutAmountOrUnitValue_isRejected() {
        assertThatThrownBy(() -> service.addIncome(INVESTMENT_ID,
                new InvestmentIncomeRequest(InvestmentIncomeType.RENDIMENTO, PAY_DATE, null, null)))
                .isInstanceOf(InvalidInvestmentOperationException.class);
    }

    @Test
    void addIncome_perShareOnZeroPosition_isRejected() {
        gare11.setQuantity(0);
        assertThatThrownBy(() -> service.addIncome(INVESTMENT_ID,
                new InvestmentIncomeRequest(InvestmentIncomeType.RENDIMENTO, PAY_DATE, null, new BigDecimal("0.07"))))
                .isInstanceOf(InvalidInvestmentOperationException.class);
    }
}
