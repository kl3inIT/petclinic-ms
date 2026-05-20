package com.mss301.petclinic.vets.exception;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class BadgeNotFoundException extends ResourceNotFoundException {

    private static final long serialVersionUID = 1L;

    public BadgeNotFoundException(String id) {
        super("Badge", id);
    }
}
