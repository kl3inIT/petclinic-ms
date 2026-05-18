package com.mss301.petclinic.mcp.client;

import com.mss301.petclinic.mcp.client.dto.PageResult;
import com.mss301.petclinic.mcp.client.dto.VetSummary;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

@HttpExchange(accept = "application/json")
public interface VetsClient {

    @GetExchange("/api/v1/vets")
    PageResult<VetSummary> listVets(
            @RequestParam int page,
            @RequestParam int size
    );

    @GetExchange("/api/v1/vets/{id}")
    VetSummary getVet(@PathVariable Long id);
}
