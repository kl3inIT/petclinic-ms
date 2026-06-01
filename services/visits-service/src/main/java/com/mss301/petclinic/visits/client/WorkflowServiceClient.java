package com.mss301.petclinic.visits.client;

import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

@HttpExchange("/api/v1/workflows/instances")
public interface WorkflowServiceClient {

    @PostExchange(contentType = "application/json")
    WorkflowStartResponse startProcess(@RequestBody WorkflowStartRequest request);
}
