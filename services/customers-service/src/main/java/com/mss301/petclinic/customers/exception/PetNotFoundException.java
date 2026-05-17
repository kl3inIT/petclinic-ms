package com.mss301.petclinic.customers.exception;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class PetNotFoundException extends ResourceNotFoundException {

    private static final long serialVersionUID = 1L;

    public PetNotFoundException(String id) {
        super("Pet", id);
    }
}
