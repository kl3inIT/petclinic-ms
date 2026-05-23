package com.mss301.petclinic.mcp.resources;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.mcp.annotation.McpResource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import com.mss301.petclinic.mcp.client.VetsClient;
import com.mss301.petclinic.mcp.client.dto.VetSummary;

/**
 * MCP Resources — application-controlled data exposed cho LLM client.
 *
 * <h4>Tại sao "application-controlled"?</h4>
 * Khác Tools (model-controlled — LLM tự quyết khi nào gọi), Resources do app/user chọn
 * inject vào context. Slide MSS301 #5: Resources = "Data exposed to the application"
 * (Files, Database Records, API Responses).
 *
 * <h4>URI scheme</h4>
 * Convention {@code petclinic://<category>/<resource-id>}:
 * <ul>
 *   <li>{@code petclinic://faq/pet-care} — static markdown FAQ</li>
 *   <li>{@code petclinic://catalog/specialties} — dynamic data từ vets-service</li>
 * </ul>
 * Custom scheme — phân biệt với HTTP resources khác. MCP client UI hiển thị URI cho user
 * chọn resource muốn include vào context window.
 *
 * <h4>mimeType</h4>
 * Quan trọng cho LLM client biết cách render — text/markdown được render đẹp trong
 * Claude Desktop / Cursor; text/plain plain block.
 */
@Component
public class PetclinicResources {

    private static final Logger log = LoggerFactory.getLogger(PetclinicResources.class);

    private final Resource petCareFaqFile;
    private final VetsClient vetsClient;

    public PetclinicResources(
            @Value("classpath:mcp-data/pet-care-faq.md") Resource petCareFaqFile,
            VetsClient vetsClient) {
        this.petCareFaqFile = petCareFaqFile;
        this.vetsClient = vetsClient;
    }

    /**
     * Static pet-care FAQ — symptom recognition, vaccine schedule, emergency protocols.
     * LLM client (Claude/Cursor) load lúc start session để có context base về domain.
     *
     * <p>Source file: {@code mcp-server/src/main/resources/mcp-data/pet-care-faq.md}.
     */
    @McpResource(
            uri = "petclinic://faq/pet-care",
            name = "pet-care-faq",
            title = "Pet Care FAQ",
            description = "Comprehensive pet care knowledge base: common symptoms, vaccination "
                    + "schedules, emergency protocols, nutrition guidelines, behavioral tips.",
            mimeType = "text/markdown")
    public String petCareFaq() {
        log.info("Resource read: petclinic://faq/pet-care");
        try {
            return petCareFaqFile.getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("Failed to read pet-care-faq.md", e);
            throw new IllegalStateException("Pet care FAQ resource unavailable", e);
        }
    }

    /**
     * Dynamic resource — danh sách specialty hiện có. Khác FAQ static, build từ live
     * data của vets-service. LLM dùng để confidently mention chỉ specialty thực sự có.
     */
    @McpResource(
            uri = "petclinic://catalog/specialties",
            name = "vet-specialties",
            title = "Veterinary Specialties Catalog",
            description = "Live list of veterinary specialties available at the clinic, "
                    + "extracted from vets-service catalog. Use to validate references "
                    + "to specialties in conversations.",
            mimeType = "text/markdown")
    public String specialtiesCatalog() {
        log.info("Resource read: petclinic://catalog/specialties");
        List<VetSummary> vets = vetsClient.listVets(0, 100).content();
        List<String> uniqueSpecialties = vets.stream()
                .flatMap(v -> v.specialties() == null ? java.util.stream.Stream.<String>empty()
                        : v.specialties().stream().map(s -> s.name()))
                .filter(name -> name != null && !name.isBlank())
                .distinct()
                .sorted()
                .toList();
        return uniqueSpecialties.stream()
                .collect(Collectors.joining(
                        "\n- ",
                        "# Veterinary Specialties\n\nAvailable at the clinic:\n\n- ",
                        "\n"));
    }
}
