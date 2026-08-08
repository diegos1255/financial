package com.financial.repository;

import com.financial.model.PjEntry;
import com.financial.model.enums.PjEntryType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PjEntryRepository extends JpaRepository<PjEntry, UUID> {

    List<PjEntry> findByUserIdOrderByYearDescMonthDescTypeAsc(UUID userId);

    List<PjEntry> findByUserIdAndYearAndMonthOrderByTypeAsc(UUID userId, Integer year, Integer month);

    List<PjEntry> findByUserIdAndYearAndMonthAndTypeIn(UUID userId, Integer year, Integer month, Collection<PjEntryType> types);

    boolean existsByUserIdAndYearAndMonthAndType(UUID userId, Integer year, Integer month, PjEntryType type);

    Optional<PjEntry> findByIdAndUserId(UUID id, UUID userId);
}
