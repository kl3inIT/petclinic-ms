package com.mss301.petclinic.products.exception;

import java.io.Serial;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class ProductNotFoundException extends ResourceNotFoundException {

    @Serial
    private static final long serialVersionUID = 1L;

    public ProductNotFoundException(String id) {
        super("Product", id);
    }
}
