package com.mss301.petclinic.visits.dto.res;

import java.time.Instant;
import java.util.List;

import com.mss301.petclinic.visits.model.Prescription;
import com.mss301.petclinic.visits.model.PrescriptionItem;

/**
 * Đơn thuốc trả về cho client (metadata + danh sách thuốc). PDF tải qua endpoint
 * {@code GET /api/v1/visits/{visitId}/prescription/pdf} (có kiểm quyền), không nhúng vào đây.
 */
public record PrescriptionResponse(
        Long id,
        Long visitId,
        Long issuedByVetId,
        Instant issuedAt,
        String notes,
        boolean pdfAvailable,
        List<Item> items
) {

    public record Item(
            String medicationName,
            String dosage,
            String frequency,
            Integer durationDays,
            String instructions
    ) {
        static Item from(PrescriptionItem i) {
            return new Item(i.getMedicationName(), i.getDosage(), i.getFrequency(),
                    i.getDurationDays(), i.getInstructions());
        }
    }

    public static PrescriptionResponse from(Prescription p) {
        List<Item> items = p.getItems().stream().map(Item::from).toList();
        return new PrescriptionResponse(
                p.getId(),
                p.getVisitId(),
                p.getIssuedByVetId(),
                p.getIssuedAt(),
                p.getNotes(),
                p.getObjectKey() != null,
                items);
    }
}
