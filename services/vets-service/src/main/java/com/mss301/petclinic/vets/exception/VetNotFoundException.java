package com.mss301.petclinic.vets.exception;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class VetNotFoundException extends ResourceNotFoundException {

    private static final long serialVersionUID = 1L;

    public VetNotFoundException(String id) {
        super("Vet", id);
    }
}
