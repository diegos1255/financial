package com.financial.mapper;

import com.financial.dto.InstallmentResponse;
import com.financial.model.Installment;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface InstallmentMapper {

    InstallmentResponse toResponse(Installment entity);

    List<InstallmentResponse> toResponseList(List<Installment> entities);
}
