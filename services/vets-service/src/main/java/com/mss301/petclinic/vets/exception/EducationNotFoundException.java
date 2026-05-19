package com.mss301.petclinic.vets.exception;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class EducationNotFoundException extends ResourceNotFoundException {

    private static final long serialVersionUID = 1L;

    public EducationNotFoundException(String id) {
        super("Education", id);
    }
}
