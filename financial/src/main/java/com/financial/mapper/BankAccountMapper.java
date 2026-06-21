package com.financial.mapper;

import com.financial.dto.BankAccountRequest;
import com.financial.dto.BankAccountResponse;
import com.financial.model.BankAccount;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring")
public interface BankAccountMapper {

    BankAccountResponse toResponse(BankAccount entity);

    @BeanMapping(
            nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
            unmappedTargetPolicy = ReportingPolicy.IGNORE
    )
    void updateEntityFromRequest(BankAccountRequest request, @MappingTarget BankAccount entity);
}
