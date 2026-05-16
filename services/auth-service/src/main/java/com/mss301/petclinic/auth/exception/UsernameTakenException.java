package com.mss301.petclinic.auth.exception;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;

public class UsernameTakenException extends BadRequestAlertException {

    private static final long serialVersionUID = 1L;

    public UsernameTakenException(String username) {
        super("Username '" + username + "' is already taken", "User", "username-taken");
    }
}
