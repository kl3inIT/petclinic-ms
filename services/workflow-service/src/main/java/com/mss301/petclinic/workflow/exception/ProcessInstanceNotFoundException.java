package com.mss301.petclinic.workflow.exception;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class ProcessInstanceNotFoundException extends ResourceNotFoundException {

    public ProcessInstanceNotFoundException(String processInstanceId) {
        super("ProcessInstance", processInstanceId);
    }
}
