package com.mss301.petclinic.visits.exception;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

/**
 * Visit chưa có đơn thuốc. ExceptionTranslator (common-web) map → HTTP 404 ProblemDetail.
 */
public class PrescriptionNotFoundException extends ResourceNotFoundException {

    private static final long serialVersionUID = 1L;

    public PrescriptionNotFoundException(Long visitId) {
        super("Prescription", "visit=" + visitId);
    }
}
