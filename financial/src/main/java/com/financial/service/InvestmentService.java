package com.financial.service;

import com.financial.auth.CurrentUser;
import com.financial.dto.ActiveRequest;
import com.financial.dto.InvestmentPortfolioItem;
import com.financial.dto.InvestmentPortfolioResponse;
import com.financial.dto.InvestmentRequest;
import com.financial.dto.InvestmentResponse;
import com.financial.dto.MarketPriceCache;
import com.financial.dto.PageResponse;
import com.financial.exception.ResourceConflictException;
import com.financial.exception.ResourceNotFoundException;
import com.financial.mapper.InvestmentMapper;
import com.financial.model.Investment;
import com.financial.model.User;
import com.financial.repository.InvestmentRepository;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class InvestmentService {

    private final InvestmentRepository repository;
    private final InvestmentMapper mapper;
    private final EntityManager entityManager;
    private final MarketPriceService marketPriceService;

    public InvestmentService(InvestmentRepository repository,
                             InvestmentMapper mapper,
                             EntityManager entityManager,
                             MarketPriceService marketPriceService) {
        this.repository = repository;
        this.mapper = mapper;
        this.entityManager = entityManager;
        this.marketPriceService = marketPriceService;
    }

    @Transactional(readOnly = true)
    public PageResponse<InvestmentResponse> list(String q, boolean includeInactive, int page, int size) {
        UUID userId = CurrentUser.id();
        Specification<Investment> spec = (root, query, cb) -> cb.equal(root.get("user").get("id"), userId);
        if (!includeInactive) {
            spec = spec.and((root, query, cb) -> cb.isTrue(root.get("active")));
        }
        if (q != null && !q.isBlank()) {
            String pattern = "%" + q.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("ticker")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("description"), "")), pattern)
            ));
        }
        var pageable = PageRequest.of(page, size, Sort.by("ticker").ascending());
        return PageResponse.from(repository.findAll(spec, pageable).map(mapper::toResponse));
    }

    @Transactional(readOnly = true)
    public List<InvestmentResponse> listAll() {
        UUID userId = CurrentUser.id();
        return repository.findAllByUserIdAndActiveTrueOrderByTickerAsc(userId)
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public InvestmentResponse get(UUID id) {
        return mapper.toResponse(loadOwned(id));
    }

    @Transactional(readOnly = true)
    public InvestmentPortfolioResponse getPortfolio() {
        UUID userId = CurrentUser.id();
        List<Investment> active = repository.findAllByUserIdAndActiveTrueOrderByTickerAsc(userId);

        List<InvestmentPortfolioItem> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        OffsetDateTime oldestFetchedAt = null;

        for (Investment inv : active) {
            Optional<MarketPriceCache> priceOpt = marketPriceService.getPrice(inv.getTicker());
            if (priceOpt.isPresent()) {
                MarketPriceCache p = priceOpt.get();
                BigDecimal marketValue = p.price().multiply(BigDecimal.valueOf(inv.getQuantity()));
                total = total.add(marketValue);
                if (oldestFetchedAt == null || p.fetchedAt().isBefore(oldestFetchedAt)) {
                    oldestFetchedAt = p.fetchedAt();
                }
                items.add(new InvestmentPortfolioItem(
                        inv.getId(), inv.getTicker(), inv.getQuantity(),
                        p.price(), p.changePercent(), marketValue, false));
            } else {
                items.add(new InvestmentPortfolioItem(
                        inv.getId(), inv.getTicker(), inv.getQuantity(),
                        null, null, null, true));
            }
        }

        return new InvestmentPortfolioResponse(
                items, total,
                oldestFetchedAt != null ? oldestFetchedAt : OffsetDateTime.now());
    }

    public InvestmentResponse create(InvestmentRequest request) {
        UUID userId = CurrentUser.id();
        String ticker = normalizeTicker(request.ticker());
        if (repository.existsByUserIdAndTicker(userId, ticker)) {
            throw new ResourceConflictException("Já existe um investimento com este ticker");
        }
        Investment entity = Investment.builder()
                .user(entityManager.getReference(User.class, userId))
                .ticker(ticker)
                .quantity(request.quantity())
                .description(request.description())
                .active(true)
                .build();
        return mapper.toResponse(repository.save(entity));
    }

    public InvestmentResponse update(UUID id, InvestmentRequest request) {
        Investment entity = loadOwned(id);
        String ticker = normalizeTicker(request.ticker());
        if (repository.existsByUserIdAndTickerAndIdNot(CurrentUser.id(), ticker, id)) {
            throw new ResourceConflictException("Já existe um investimento com este ticker");
        }
        entity.setTicker(ticker);
        entity.setQuantity(request.quantity());
        entity.setDescription(request.description());
        return mapper.toResponse(repository.save(entity));
    }

    public InvestmentResponse setActive(UUID id, ActiveRequest request) {
        Investment entity = loadOwned(id);
        entity.setActive(request.active());
        return mapper.toResponse(repository.save(entity));
    }

    public void softDelete(UUID id) {
        Investment entity = loadOwned(id);
        if (Boolean.FALSE.equals(entity.getActive())) {
            return;
        }
        entity.setActive(false);
        repository.save(entity);
    }

    private Investment loadOwned(UUID id) {
        return repository.findByIdAndUserId(id, CurrentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Investimento não encontrado"));
    }

    private static String normalizeTicker(String raw) {
        return raw == null ? null : raw.trim().toUpperCase();
    }
}
