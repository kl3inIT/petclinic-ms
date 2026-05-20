package com.mss301.petclinic.mcp.tools;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import com.mss301.petclinic.mcp.client.VisitsClient;
import com.mss301.petclinic.mcp.client.dto.PageResult;
import com.mss301.petclinic.mcp.client.dto.VisitSummary;

@Component
public class VisitTools {

    private static final Logger log = LoggerFactory.getLogger(VisitTools.class);

    private final VisitsClient visitsClient;

    public VisitTools(VisitsClient visitsClient) {
        this.visitsClient = visitsClient;
    }

    @Tool(description = """
            Search visits with optional filters: pet ID, vet ID, status. Use when the user
            asks 'show me visits for pet X' or 'what visits has Dr. Y scheduled'.
            Status values: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED.
            """)
    public PageResult<VisitSummary> searchVisits(
            @ToolParam(description = "Filter by pet ID. Null = any pet.", required = false)
            Long petId,
            @ToolParam(description = "Filter by vet ID. Null = any vet.", required = false)
            Long vetId,
            @ToolParam(description = "Filter by status: SCHEDULED|IN_PROGRESS|COMPLETED|CANCELLED.", required = false)
            String status,
            @ToolParam(description = "Page number, 0-based. Default 0.", required = false)
            Integer page,
            @ToolParam(description = "Page size. Default 20, max 50.", required = false)
            Integer size
    ) {
        int pageNum = page == null ? 0 : page;
        int pageSize = size == null ? 20 : Math.min(size, 50);
        log.info("Tool searchVisits(petId={}, vetId={}, status={}, page={}, size={})",
                petId, vetId, status, pageNum, pageSize);
        return visitsClient.searchVisits(petId, vetId, status, pageNum, pageSize);
    }

    @Tool(description = """
            Get full details of a specific visit by ID, including diagnosis, treatment,
            and fee (for COMPLETED visits) or scheduled time (for SCHEDULED visits).
            """)
    public VisitSummary getVisit(
            @ToolParam(description = "The numeric visit ID.")
            Long visitId
    ) {
        log.info("Tool getVisit(visitId={})", visitId);
        return visitsClient.getVisit(visitId);
    }
}
