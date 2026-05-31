package com.mss301.petclinic.workflow.dto.res;

import java.time.Instant;

public record WorkflowDeploymentSummaryResponse(
        String id,
        String name,
        Instant deployedAt,
        String source
) {}
