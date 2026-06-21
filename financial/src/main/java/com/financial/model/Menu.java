package com.financial.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "menus")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Menu extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Menu parent;

    @Column(name = "label", nullable = false, length = 80)
    private String label;

    @Column(name = "route", length = 120)
    private String route;

    @Column(name = "icon", length = 60)
    private String icon;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(name = "active", nullable = false)
    private Boolean active;
}
