package com.financial.mapper;

import com.financial.dto.InvestmentRequest;
import com.financial.dto.InvestmentResponse;
import com.financial.model.Investment;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring")
public interface InvestmentMapper {

    InvestmentResponse toResponse(Investment entity);

    @BeanMapping(
            nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
            unmappedTargetPolicy = ReportingPolicy.IGNORE
    )
    void updateEntityFromRequest(InvestmentRequest request, @MappingTarget Investment entity);
}
