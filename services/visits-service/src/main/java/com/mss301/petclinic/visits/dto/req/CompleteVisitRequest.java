package com.mss301.petclinic.visits.dto.req;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Hoàn tất khám — ghi chẩn đoán/điều trị + phí khám.
 *
 * <p>Phí khám lấy theo thứ tự ưu tiên:
 * <ol>
 *   <li>{@code serviceProductId} (mục SERVICE trong catalog products-service) → fee = đơn giá catalog.</li>
 *   <li>{@code fee} nhập tay (fallback khi không chọn dịch vụ trong catalog).</li>
 * </ol>
 */
public record CompleteVisitRequest(
        @NotBlank @Size(max = 4000) String diagnosis,
        @Size(max = 4000) String treatment,
        @DecimalMin("0.0") BigDecimal fee,
        Long serviceProductId
) {
}
