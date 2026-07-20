package com.mss301.petclinic.mcp.client;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

import com.mss301.petclinic.mcp.client.dto.OwnerSummary;
import com.mss301.petclinic.mcp.client.dto.PageResult;
import com.mss301.petclinic.mcp.client.dto.PetSummary;

/**
 * HTTP Interface đối tới customers-service (Eureka LB qua "http://customers-service").
 * Read-only — tool catalog phase 12a chỉ expose 4 read tools, không có mutation.
 */
@HttpExchange(accept = "application/json")
public interface CustomersClient {

    @GetExchange("/internal/ai/customers/owners")
    PageResult<OwnerSummary> listOwners(
            @RequestParam(required = false) String lastName,
            @RequestParam int page,
            @RequestParam int size
    );

    @GetExchange("/internal/ai/customers/owners/{id}")
    OwnerSummary getOwner(@PathVariable Long id);

    @GetExchange("/internal/ai/customers/pets/{id}")
    PetSummary getPet(@PathVariable Long id);
}
