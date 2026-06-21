package com.financial.mapper;

import com.financial.dto.SalaryResponse;
import com.financial.model.Salary;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SalaryMapper {

    @Mapping(target = "bankAccountId", source = "bankAccount.id")
    @Mapping(target = "bankAccountName", source = "bankAccount.name")
    SalaryResponse toResponse(Salary entity);
}
