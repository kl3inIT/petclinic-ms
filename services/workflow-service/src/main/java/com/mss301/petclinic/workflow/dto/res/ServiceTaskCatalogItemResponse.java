package com.mss301.petclinic.workflow.dto.res;

import java.util.List;

public record ServiceTaskCatalogItemResponse(
        String id,
        String name,
        String taskType,
        String description,
        List<String> inputParameters
) {}
