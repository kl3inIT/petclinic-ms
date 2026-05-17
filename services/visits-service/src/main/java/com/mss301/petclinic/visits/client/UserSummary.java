package com.mss301.petclinic.visits.client;

import java.util.UUID;

/**
 * Tolerant Reader record — chỉ lấy field visits-service cần để enrich event.
 * Auth-service trả về thêm roles + enabled — Jackson ignore.
 */
public record UserSummary(UUID id, String username, String email) {}
