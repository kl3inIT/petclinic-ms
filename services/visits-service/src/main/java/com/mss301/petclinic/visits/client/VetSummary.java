package com.mss301.petclinic.visits.client;

/**
 * Local view của Vet — Tolerant Reader. Chỉ field visits cần để display + validate.
 */
public record VetSummary(Long id, String firstName, String lastName) {
}
