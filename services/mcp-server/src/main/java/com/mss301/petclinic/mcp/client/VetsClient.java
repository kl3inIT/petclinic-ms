package com.mss301.petclinic.mcp.client;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

import com.mss301.petclinic.mcp.client.dto.PageResult;
import com.mss301.petclinic.mcp.client.dto.VetSummary;

@HttpExchange(accept = "application/json")
public interface VetsClient {

    @GetExchange("/internal/ai/vets")
    PageResult<VetSummary> listVets(
            @RequestParam int page,
            @RequestParam int size
    );

    @GetExchange("/internal/ai/vets/{id}")
    VetSummary getVet(@PathVariable Long id);
}
