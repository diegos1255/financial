package com.financial.mapper;

import com.financial.dto.ExpenseCategoryRequest;
import com.financial.dto.ExpenseCategoryResponse;
import com.financial.model.ExpenseCategory;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring")
public interface ExpenseCategoryMapper {

    ExpenseCategoryResponse toResponse(ExpenseCategory entity);

    @BeanMapping(
            nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
            unmappedTargetPolicy = ReportingPolicy.IGNORE
    )
    void updateEntityFromRequest(ExpenseCategoryRequest request, @MappingTarget ExpenseCategory entity);
}
