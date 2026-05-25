package com.mss301.petclinic.customers.dto.req;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.mss301.petclinic.customers.model.PetType;

/**
 * Tạo / cập nhật PetType catalog. {@code code} là business key bất biến —
 * sau khi tạo, KHÔNG nên đổi vì các Pet đã link FK; nếu cần đổi label dùng
 * field {@code name}.
 *
 * <p>code regex {@code [a-z][a-z0-9_-]{1,49}} ổn định cho URL slug + i18n key.
 */
public record PetTypeRequest(
        @NotBlank
        @Size(max = 50)
        @Pattern(regexp = "^[a-z][a-z0-9_-]*$",
                message = "Phải bắt đầu bằng chữ thường, chỉ chứa a-z, 0-9, _ và -")
        String code,

        @NotBlank
        @Size(max = 100)
        String name,

        @Min(value = 0, message = "Phải ≥ 0")
        Integer displayOrder
) {
    public PetType toEntity() {
        return new PetType(code, name, displayOrder);
    }
}
