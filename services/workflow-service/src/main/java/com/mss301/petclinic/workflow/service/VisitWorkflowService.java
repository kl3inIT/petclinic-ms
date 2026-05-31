package com.mss301.petclinic.workflow.service;

import java.math.BigDecimal;

public interface VisitWorkflowService {
    void approveVisit(Long visitId);
    void rejectVisit(Long visitId);
    void startExam(Long visitId);
    void completeExam(Long visitId, String diagnosis, String treatment, BigDecimal fee);
}
