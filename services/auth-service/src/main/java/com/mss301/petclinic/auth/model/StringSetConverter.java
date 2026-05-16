package com.mss301.petclinic.auth.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Persist {@code Set<String>} as CSV trong VARCHAR. Phù hợp cho roles tĩnh (USER/VET/ADMIN).
 * Khi cần dynamic roles có permissions riêng → refactor sang Role entity + M-N.
 */
@Converter
public class StringSetConverter implements AttributeConverter<Set<String>, String> {

    @Override
    public String convertToDatabaseColumn(Set<String> attribute) {
        if (attribute == null || attribute.isEmpty()) return "";
        return attribute.stream().sorted().collect(Collectors.joining(","));
    }

    @Override
    public Set<String> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return new HashSet<>();
        return new HashSet<>(Arrays.asList(dbData.split(",")));
    }
}
