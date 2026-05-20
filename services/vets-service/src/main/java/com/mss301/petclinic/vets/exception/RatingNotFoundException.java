package com.mss301.petclinic.vets.exception;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class RatingNotFoundException extends ResourceNotFoundException {

    private static final long serialVersionUID = 1L;

    public RatingNotFoundException(String id) {
        super("Rating", id);
    }
}
