package com.financial.model;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.proxy.HibernateProxy;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@MappedSuperclass
@Getter
@Setter
public abstract class BaseEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "created_date", nullable = false, updatable = false)
    private OffsetDateTime createdDate;

    @Column(name = "updated_date", nullable = false)
    private OffsetDateTime updatedDate;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        OffsetDateTime now = OffsetDateTime.now();
        createdDate = now;
        updatedDate = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedDate = OffsetDateTime.now();
    }

    @Override
    public final boolean equals(Object o) {
        if (this == o) return true;
        if (o == null) return false;
        Class<?> thisClass = unproxy(this);
        Class<?> otherClass = unproxy(o);
        if (thisClass != otherClass) return false;
        BaseEntity that = (BaseEntity) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public final int hashCode() {
        return unproxy(this).hashCode();
    }

    private static Class<?> unproxy(Object obj) {
        return obj instanceof HibernateProxy proxy
                ? proxy.getHibernateLazyInitializer().getPersistentClass()
                : obj.getClass();
    }
}
