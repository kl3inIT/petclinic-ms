package com.mss301.petclinic.visits.exception;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;

import java.io.Serial;

public class SlotTakenException extends BadRequestAlertException {

    @Serial
    private static final long serialVersionUID = 1L;

    public SlotTakenException() {
        super("Khung giờ này đã có người đặt với bác sĩ", "Visit", "slot-taken");
    }
}
