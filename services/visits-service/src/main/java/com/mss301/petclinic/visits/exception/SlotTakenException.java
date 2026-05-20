package com.mss301.petclinic.visits.exception;

import java.io.Serial;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;

public class SlotTakenException extends BadRequestAlertException {

    @Serial
    private static final long serialVersionUID = 1L;

    public SlotTakenException() {
        super("Khung giờ này đã có người đặt với bác sĩ", "Visit", "slot-taken");
    }
}
