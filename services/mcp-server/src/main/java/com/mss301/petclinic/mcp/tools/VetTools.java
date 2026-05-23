package com.mss301.petclinic.mcp.tools;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.ai.mcp.annotation.McpToolParam;
import org.springframework.stereotype.Component;

import com.mss301.petclinic.mcp.client.VetsClient;
import com.mss301.petclinic.mcp.client.dto.PageResult;
import com.mss301.petclinic.mcp.client.dto.VetSummary;

@Component
public class VetTools {

    private static final Logger log = LoggerFactory.getLogger(VetTools.class);

    private final VetsClient vetsClient;

    public VetTools(VetsClient vetsClient) {
        this.vetsClient = vetsClient;
    }

    @McpTool(description = """
            List all veterinarians with their specialties. Use when the user asks
            'what vets are available?' or wants to browse the team.
            """)
    public PageResult<VetSummary> listVets(
            @McpToolParam(description = "Page number, 0-based. Default 0.", required = false)
            Integer page,
            @McpToolParam(description = "Page size. Default 20, max 50.", required = false)
            Integer size
    ) {
        int pageNum = page == null ? 0 : page;
        int pageSize = size == null ? 20 : Math.min(size, 50);
        log.info("Tool listVets(page={}, size={})", pageNum, pageSize);
        return vetsClient.listVets(pageNum, pageSize);
    }

    @McpTool(description = """
            Get full details of a specific veterinarian by ID, including specialties.
            """)
    public VetSummary getVet(
            @McpToolParam(description = "The numeric vet ID.")
            Long vetId
    ) {
        log.info("Tool getVet(vetId={})", vetId);
        return vetsClient.getVet(vetId);
    }

    @McpTool(description = """
            Find vets that have a given specialty (case-insensitive partial match).
            Example specialties: 'radiology', 'surgery', 'dentistry'. Returns full
            list (not paginated) — specialty pool is small.
            """)
    public List<VetSummary> findVetsBySpecialty(
            @McpToolParam(description = "Specialty keyword, e.g. 'surgery'.")
            String specialty
    ) {
        log.info("Tool findVetsBySpecialty(specialty={})", specialty);
        // Pull large page + filter client-side. Vets domain small (typically <50 entries).
        String needle = specialty == null ? "" : specialty.toLowerCase();
        return vetsClient.listVets(0, 100).content().stream()
                .filter(v -> v.specialties() != null && v.specialties().stream()
                        .anyMatch(s -> s.name() != null && s.name().toLowerCase().contains(needle)))
                .toList();
    }
}
