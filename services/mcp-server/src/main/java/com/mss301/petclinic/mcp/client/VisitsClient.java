package com.mss301.petclinic.mcp.client;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

import com.mss301.petclinic.mcp.client.dto.PageResult;
import com.mss301.petclinic.mcp.client.dto.VisitSummary;

@HttpExchange(accept = "application/json")
public interface VisitsClient {

    @GetExchange("/api/v1/visits")
    PageResult<VisitSummary> searchVisits(
            @RequestParam(required = false) Long petId,
            @RequestParam(required = false) Long vetId,
            @RequestParam(required = false) String status,
            @RequestParam int page,
            @RequestParam int size
    );

    @GetExchange("/api/v1/visits/{id}")
    VisitSummary getVisit(@PathVariable Long id);
}
