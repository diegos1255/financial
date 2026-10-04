package com.financial.mapper;

import com.financial.dto.SalaryPaymentResponse;
import com.financial.model.SalaryPayment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SalaryMapper {

    @Mapping(target = "bankAccountId", source = "bankAccount.id")
    @Mapping(target = "bankAccountName", source = "bankAccount.name")
    SalaryPaymentResponse toPaymentResponse(SalaryPayment entity);
}
