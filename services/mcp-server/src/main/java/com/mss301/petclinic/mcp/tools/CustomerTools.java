package com.mss301.petclinic.mcp.tools;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.ai.mcp.annotation.McpToolParam;
import org.springframework.stereotype.Component;

import com.mss301.petclinic.mcp.client.CustomersClient;
import com.mss301.petclinic.mcp.client.dto.OwnerSummary;
import com.mss301.petclinic.mcp.client.dto.PageResult;
import com.mss301.petclinic.mcp.client.dto.PetSummary;

/**
 * Tool catalog cho domain Customers + Pets. LLM gọi bằng tên hàm Java.
 *
 * <p>Description CẦN nói rõ purpose + ràng buộc — LLM dùng description để chọn tool đúng.
 * Tham số {@code @McpToolParam(description=...)} giúp LLM hiểu nghĩa từng arg.
 */
@Component
public class CustomerTools {

    private static final Logger log = LoggerFactory.getLogger(CustomerTools.class);

    private final CustomersClient customersClient;

    public CustomerTools(CustomersClient customersClient) {
        this.customersClient = customersClient;
    }

    @McpTool(description = """
            List pet owners with optional last-name filter (case-insensitive contains match).
            Returns paginated owner list including their pets. Use this to find a specific
            owner by family name, or browse all owners.
            """)
    public PageResult<OwnerSummary> listOwners(
            @McpToolParam(description = "Optional last-name substring. Null/empty = list all.", required = false)
            String lastName,
            @McpToolParam(description = "Page number, 0-based. Default 0.", required = false)
            Integer page,
            @McpToolParam(description = "Page size. Default 20, max 50.", required = false)
            Integer size
    ) {
        int pageNum = page == null ? 0 : page;
        int pageSize = size == null ? 20 : Math.min(size, 50);
        log.info("Tool listOwners(lastName={}, page={}, size={})", lastName, pageNum, pageSize);
        return customersClient.listOwners(lastName, pageNum, pageSize);
    }

    @McpTool(description = """
            Get full details of a single owner including their pets, address, and phone.
            Use after listOwners returns a match, or when the user gives a specific owner ID.
            """)
    public OwnerSummary getOwner(
            @McpToolParam(description = "The numeric owner ID.")
            Long ownerId
    ) {
        log.info("Tool getOwner(ownerId={})", ownerId);
        return customersClient.getOwner(ownerId);
    }

    @McpTool(description = """
            Get details of a specific pet by ID, including its owner reference.
            Use when the user mentions a pet by name + you have its ID from a prior owner lookup.
            """)
    public PetSummary getPet(
            @McpToolParam(description = "The numeric pet ID.")
            Long petId
    ) {
        log.info("Tool getPet(petId={})", petId);
        return customersClient.getPet(petId);
    }
}
