package com.mss301.petclinic.visits.service;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import org.openpdf.text.Document;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.BaseFont;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.mss301.petclinic.visits.model.Prescription;
import com.mss301.petclinic.visits.model.PrescriptionItem;

/**
 * Sinh PDF đơn thuốc bằng OpenPDF.
 *
 * <h4>Font &amp; tiếng Việt</h4>
 * Nếu classpath có {@code fonts/DejaVuSans.ttf} (hoặc font Unicode khác cùng tên) thì
 * nhúng với encoding {@code IDENTITY_H} → render đầy đủ dấu tiếng Việt. Nếu chưa có font,
 * fallback Helvetica (base-14, KHÔNG đủ dấu tiếng Việt). Vì vậy nhãn tĩnh để ASCII để
 * PDF luôn đọc được; nội dung động (tên thuốc/ghi chú) render đúng khi đã bổ sung font.
 *
 * <p>TODO: drop {@code DejaVuSans.ttf} vào {@code src/main/resources/fonts/} để hỗ trợ
 * tiếng Việt đầy đủ — không cần đổi code.
 */
@Component
public class PrescriptionPdfGenerator {

    private static final Logger log = LoggerFactory.getLogger(PrescriptionPdfGenerator.class);
    private static final String UNICODE_FONT = "fonts/DejaVuSans.ttf";
    private static final ZoneId CLINIC_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(CLINIC_ZONE);

    /** Thông tin enrich để in lên đầu đơn (best-effort — có thể null nếu downstream lỗi). */
    public record VisitContext(String vetName, String petName, String ownerName, Instant scheduledAt) {}

    public byte[] render(Prescription rx, VisitContext ctx) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document();
        try {
            PdfWriter.getInstance(doc, out);
            doc.open();

            doc.add(title("PRESCRIPTION / DON THUOC"));
            doc.add(new Paragraph(" "));

            doc.add(line("Prescription #", String.valueOf(rx.getId())));
            doc.add(line("Visit #", String.valueOf(rx.getVisitId())));
            doc.add(line("Issued at", DATE_FMT.format(rx.getIssuedAt())));
            doc.add(line("Veterinarian", orId(ctx.vetName(), "vetId=" + rx.getIssuedByVetId())));
            doc.add(line("Pet", orId(ctx.petName(), "-")));
            doc.add(line("Owner", orId(ctx.ownerName(), "-")));
            if (ctx.scheduledAt() != null) {
                doc.add(line("Visit date", DATE_FMT.format(ctx.scheduledAt())));
            }
            doc.add(new Paragraph(" "));

            doc.add(medicationsTable(rx));

            if (rx.getNotes() != null && !rx.getNotes().isBlank()) {
                doc.add(new Paragraph(" "));
                doc.add(line("Notes", rx.getNotes()));
            }

            doc.close();
            return out.toByteArray();
        } catch (RuntimeException e) {
            if (doc.isOpen()) {
                doc.close();
            }
            throw e;
        }
    }

    private PdfPTable medicationsTable(Prescription rx) {
        PdfPTable table = new PdfPTable(new float[]{3f, 2f, 2f, 1.5f, 3f});
        table.setWidthPercentage(100);
        header(table, "Medication", "Dosage", "Frequency", "Days", "Instructions");
        for (PrescriptionItem item : rx.getItems()) {
            cell(table, item.getMedicationName());
            cell(table, nullToDash(item.getDosage()));
            cell(table, nullToDash(item.getFrequency()));
            cell(table, item.getDurationDays() == null ? "-" : String.valueOf(item.getDurationDays()));
            cell(table, nullToDash(item.getInstructions()));
        }
        return table;
    }

    private void header(PdfPTable table, String... titles) {
        Font f = font(10, true);
        for (String t : titles) {
            PdfPCell c = new PdfPCell(new Phrase(t, f));
            c.setGrayFill(0.85f);
            table.addCell(c);
        }
    }

    private void cell(PdfPTable table, String text) {
        table.addCell(new PdfPCell(new Phrase(text, font(10, false))));
    }

    private Paragraph title(String text) {
        Paragraph p = new Paragraph(text, font(18, true));
        p.setAlignment(Element.ALIGN_CENTER);
        return p;
    }

    private Paragraph line(String label, String value) {
        Paragraph p = new Paragraph();
        p.add(new Phrase(label + ": ", font(11, true)));
        p.add(new Phrase(value, font(11, false)));
        return p;
    }

    private static String orId(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String nullToDash(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private Font font(float size, boolean bold) {
        int style = bold ? Font.BOLD : Font.NORMAL;
        try {
            if (PrescriptionPdfGenerator.class.getClassLoader().getResource(UNICODE_FONT) != null) {
                BaseFont bf = BaseFont.createFont(UNICODE_FONT, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
                return new Font(bf, size, style);
            }
        } catch (Exception e) {
            log.debug("Unicode font {} không load được, fallback Helvetica: {}", UNICODE_FONT, e.toString());
        }
        return FontFactory.getFont(FontFactory.HELVETICA, size, style);
    }
}
