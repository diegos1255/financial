package com.financial.mapper;

import com.financial.dto.SeverancePaymentResponse;
import com.financial.model.SeverancePayment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SeveranceMapper {

    @Mapping(target = "bankAccountId", source = "bankAccount.id")
    @Mapping(target = "bankAccountName", source = "bankAccount.name")
    SeverancePaymentResponse toPaymentResponse(SeverancePayment entity);
}
