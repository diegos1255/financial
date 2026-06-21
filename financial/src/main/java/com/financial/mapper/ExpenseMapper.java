package com.financial.mapper;

import com.financial.dto.ExpenseResponse;
import com.financial.model.Expense;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring", uses = InstallmentMapper.class)
public interface ExpenseMapper {

    @Mapping(target = "category.id", source = "category.id")
    @Mapping(target = "category.name", source = "category.name")
    @Mapping(target = "bankAccount.id", source = "bankAccount.id")
    @Mapping(target = "bankAccount.name", source = "bankAccount.name")
    @Mapping(target = "installments", source = "installments")
    @Named("withInstallments")
    ExpenseResponse toResponseWithInstallments(Expense entity);

    @Mapping(target = "category.id", source = "category.id")
    @Mapping(target = "category.name", source = "category.name")
    @Mapping(target = "bankAccount.id", source = "bankAccount.id")
    @Mapping(target = "bankAccount.name", source = "bankAccount.name")
    @Mapping(target = "installments", ignore = true)
    @Named("withoutInstallments")
    ExpenseResponse toResponseWithoutInstallments(Expense entity);
}
