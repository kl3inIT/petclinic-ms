package com.mss301.petclinic.visits.service;

import com.mss301.petclinic.visits.dto.req.CreatePrescriptionRequest;
import com.mss301.petclinic.visits.dto.res.PrescriptionResponse;

public interface PrescriptionService {

    /**
     * Bác sĩ kê đơn cho visit. {@code vetIdFromJwt} là vetId trong token (có thể null nếu
     * caller là ADMIN không link vet). Service tự kiểm tra: visit ở trạng thái lâm sàng,
     * người kê là vet phụ trách (trừ ADMIN), mỗi visit chỉ 1 đơn. Sinh PDF + lưu MinIO.
     */
    PrescriptionResponse create(Long visitId, CreatePrescriptionRequest request,
                                Long vetIdFromJwt, boolean isAdmin);

    PrescriptionResponse getByVisitId(Long visitId);

    /** Tải nội dung PDF đơn thuốc (đã kiểm quyền ở controller). */
    PrescriptionPdf downloadPdf(Long visitId);

    /** Nội dung PDF + tên file gợi ý cho client. */
    record PrescriptionPdf(byte[] content, String filename) {}
}
