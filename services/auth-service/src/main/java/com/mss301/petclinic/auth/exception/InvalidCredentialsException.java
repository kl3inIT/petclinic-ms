package com.mss301.petclinic.auth.exception;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;

/**
 * Trả về cùng error cho "user không tồn tại" và "wrong password" — chống username enumeration.
 */
public class InvalidCredentialsException extends BadRequestAlertException {

    public InvalidCredentialsException() {
        super("Invalid username or password", "User", "invalid-credentials");
    }
}
