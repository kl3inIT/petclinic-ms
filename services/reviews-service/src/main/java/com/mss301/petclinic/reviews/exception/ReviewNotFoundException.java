package com.mss301.petclinic.reviews.exception;

import java.io.Serial;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class ReviewNotFoundException extends ResourceNotFoundException {

    @Serial
    private static final long serialVersionUID = 1L;

    public ReviewNotFoundException(String id) {
        super("Review", id);
    }
}
