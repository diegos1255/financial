package com.financial.service;

import com.financial.model.Investment;
import com.financial.model.InvestmentTransaction;
import com.financial.model.enums.InvestmentDataSource;
import com.financial.model.enums.InvestmentTransactionType;
import com.financial.repository.InvestmentRepository;
import com.financial.repository.InvestmentTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Migracao da WORK-36: investimentos criados antes das movimentacoes ganham um saldo inicial
 * com a quantidade atual, datado na criacao. Idempotente (so atua em quem nao tem movimentacao).
 */
@Component
public class InvestmentInitialBalanceMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(InvestmentInitialBalanceMigration.class);

    private final InvestmentRepository investmentRepository;
    private final InvestmentTransactionRepository transactionRepository;

    public InvestmentInitialBalanceMigration(InvestmentRepository investmentRepository,
                                             InvestmentTransactionRepository transactionRepository) {
        this.investmentRepository = investmentRepository;
        this.transactionRepository = transactionRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int created = 0;
        for (Investment inv : investmentRepository.findAll()) {
            if (inv.getQuantity() == null || inv.getQuantity() <= 0 || transactionRepository.existsByInvestmentId(inv.getId())) {
                continue;
            }
            transactionRepository.save(InvestmentTransaction.builder()
                    .investment(inv)
                    .user(inv.getUser())
                    .type(InvestmentTransactionType.INITIAL)
                    .tradeDate(inv.getCreatedDate().toLocalDate())
                    .quantity(inv.getQuantity())
                    .source(InvestmentDataSource.MANUAL)
                    .build());
            created++;
        }
        if (created > 0) {
            log.info("WORK-36: saldo inicial criado para {} investimento(s)", created);
        }
    }
}
