package com.mss301.petclinic.customers.exception;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class OwnerNotFoundException extends ResourceNotFoundException {

    public OwnerNotFoundException(String id) {
        super("Owner", id);
    }
}
