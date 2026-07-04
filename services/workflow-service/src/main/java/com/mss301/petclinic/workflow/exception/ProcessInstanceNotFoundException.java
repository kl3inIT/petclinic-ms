package com.mss301.petclinic.workflow.exception;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class ProcessInstanceNotFoundException extends ResourceNotFoundException {

    private static final long serialVersionUID = 1L;

    public ProcessInstanceNotFoundException(String processInstanceId) {
        super("ProcessInstance", processInstanceId);
    }
}
