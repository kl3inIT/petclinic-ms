package com.mss301.petclinic.reviews.dto.req;

import jakarta.validation.constraints.NotNull;

import com.mss301.petclinic.reviews.model.VoteType;

public record VoteRequest(@NotNull VoteType voteType) {
}
