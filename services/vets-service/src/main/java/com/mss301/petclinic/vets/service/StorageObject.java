package com.mss301.petclinic.vets.service;

import java.time.Instant;

/**
 * Minimal metadata cho 1 object trên storage backend. Phase I orphan-cleanup job
 * cần {@code lastModified} để bỏ qua object vừa upload (DB save lag-behind 1-2s).
 */
public record StorageObject(String key, Instant lastModified, long sizeBytes) {}
