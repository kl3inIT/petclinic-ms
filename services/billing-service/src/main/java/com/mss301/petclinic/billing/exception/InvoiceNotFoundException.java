package com.mss301.petclinic.billing.exception;

import java.io.Serial;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class InvoiceNotFoundException extends ResourceNotFoundException {

    @Serial
    private static final long serialVersionUID = 1L;

    public InvoiceNotFoundException(String id) {
        super("Invoice", id);
    }
}
