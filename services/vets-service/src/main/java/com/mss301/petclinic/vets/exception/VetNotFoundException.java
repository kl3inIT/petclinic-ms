package com.mss301.petclinic.vets.exception;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class VetNotFoundException extends ResourceNotFoundException {

    public VetNotFoundException(String id) {
        super("Vet", id);
    }
}
