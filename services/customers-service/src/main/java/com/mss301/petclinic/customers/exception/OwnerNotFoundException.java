package com.mss301.petclinic.customers.exception;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class OwnerNotFoundException extends ResourceNotFoundException {

    private static final long serialVersionUID = 1L;

    public OwnerNotFoundException(String id) {
        super("Owner", id);
    }
}
