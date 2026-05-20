package com.mss301.petclinic.mcp.client.dto;

import java.util.List;

/**
 * Spring Data Page<T> serialized form — chỉ field cần thiết.
 * Tránh ngừoi user (LLM) phải hiểu cấu trúc page nội bộ Spring.
 */
public record PageResult<T>(
        List<T> content,
        int number,
        int size,
        long totalElements,
        int totalPages
) {}
