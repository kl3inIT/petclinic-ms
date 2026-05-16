package com.mss301.petclinic.customers.exception;

public class OwnerNotFoundException extends RuntimeException {

    public OwnerNotFoundException(String id) {
        super("Owner not found with id: " + id);
    }
}
