package com.mss301.petclinic.vets.exception;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class VetPhotoNotFoundException extends ResourceNotFoundException {

    private static final long serialVersionUID = 1L;

    public VetPhotoNotFoundException(String id) {
        super("VetPhoto", id);
    }
}
