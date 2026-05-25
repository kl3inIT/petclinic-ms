package com.mss301.petclinic.visits.client;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

@HttpExchange(accept = "application/json")
public interface VetsClient {

    @GetExchange("/api/v1/vets/{id}")
    VetSummary getVet(@PathVariable Long id);

    @GetExchange("/api/v1/vets/{id}/work-schedule/check")
    VetAvailabilityResponse checkAvailability(@PathVariable Long id,
                                              @RequestParam("workday") String workday,
                                              @RequestParam("workHour") String workHour);
}
