package com.mss301.petclinic.common.jpa.enums;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Utility cho {@link IdentifiedEnum} + {@link OrderedEnum}.
 */
public final class IdentifiedEnums {

    private IdentifiedEnums() {}

    /**
     * Lookup enum constant theo stable id. Throw nếu không tìm thấy — phù hợp cho JPA AttributeConverter.
     */
    public static <E extends Enum<E> & IdentifiedEnum> E byId(Class<E> type, String id) {
        return findById(type, id).orElseThrow(() -> new IllegalArgumentException(
                "Unknown id '" + id + "' for " + type.getSimpleName()));
    }

    /**
     * Lookup không throw — trả về Optional.
     */
    public static <E extends Enum<E> & IdentifiedEnum> Optional<E> findById(Class<E> type, String id) {
        for (E v : type.getEnumConstants()) {
            if (v.id().equals(id)) return Optional.of(v);
        }
        return Optional.empty();
    }

    /**
     * Mọi giá trị sort theo {@link OrderedEnum#weight()} tăng dần.
     */
    public static <E extends Enum<E> & OrderedEnum> List<E> sortedByWeight(Class<E> type) {
        return Arrays.stream(type.getEnumConstants())
                .sorted(Comparator.comparingInt(OrderedEnum::weight))
                .toList();
    }
}
