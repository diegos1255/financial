package com.financial.model;

import com.financial.model.enums.PjEntryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Check;

import java.math.BigDecimal;

@Entity
@Table(
        name = "pj_entries",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_pj_entries_user_year_month_type",
                columnNames = {"user_id", "year", "month", "type"}
        ),
        indexes = {
                @Index(name = "idx_pj_entries_user_year_month", columnList = "user_id, year, month")
        }
)
@Check(constraints =
        "amount > 0 " +
        "AND year BETWEEN 2000 AND 2100 " +
        "AND month BETWEEN 1 AND 12"
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PjEntry extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private PjEntryType type;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "month", nullable = false)
    private Integer month;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 80)
    private String contentType;
}
