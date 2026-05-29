package com.mss301.petclinic.visits.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.mss301.petclinic.visits.model.Prescription;
import com.mss301.petclinic.visits.model.PrescriptionItem;

class PrescriptionPdfGeneratorTest {

    private final PrescriptionPdfGenerator generator = new PrescriptionPdfGenerator();

    @Test
    void rendersNonEmptyPdf() {
        Prescription rx = Prescription.issue(10L, 30L, "uống đủ liều");
        rx.addItem(new PrescriptionItem("Amoxicillin", "250mg", "2 lần/ngày", 7, "sau bữa ăn"));
        rx.addItem(new PrescriptionItem("Vitamin C", "500mg", "1 lần/ngày", 14, null));

        byte[] pdf = generator.render(rx,
                new PrescriptionPdfGenerator.VisitContext("Dr. Thanh", "Milo", "owner1", Instant.now()));

        assertThat(pdf).isNotEmpty();
        // Magic number của file PDF.
        assertThat(new String(pdf, 0, 4, java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("%PDF");
    }

    @Test
    void rendersEvenWhenContextNamesNull() {
        Prescription rx = Prescription.issue(11L, 31L, null);
        rx.addItem(new PrescriptionItem("Paracetamol", null, null, null, null));

        byte[] pdf = generator.render(rx,
                new PrescriptionPdfGenerator.VisitContext(null, null, null, null));

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 4, java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("%PDF");
    }
}
