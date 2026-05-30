package com.mss301.petclinic.customers.exception;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class PetTypeNotFoundException extends ResourceNotFoundException {

    private static final long serialVersionUID = 1L;

    public PetTypeNotFoundException(String id) {
        super("PetType", id);
    }
}
