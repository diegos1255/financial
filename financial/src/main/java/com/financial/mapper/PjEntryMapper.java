package com.financial.mapper;

import com.financial.dto.PjEntryResponse;
import com.financial.model.PjEntry;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PjEntryMapper {

    PjEntryResponse toResponse(PjEntry entity);
}
