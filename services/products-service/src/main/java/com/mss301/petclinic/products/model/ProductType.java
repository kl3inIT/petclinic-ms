package com.mss301.petclinic.products.model;

import com.mss301.petclinic.common.jpa.enums.IdentifiedEnum;

/**
 * Phân loại mục trong catalog.
 *
 * <ul>
 *   <li>{@code MEDICATION}  — thuốc, có quản lý tồn kho (trừ kho khi kê đơn).</li>
 *   <li>{@code SERVICE}     — dịch vụ (phí khám tổng quát/chuyên khoa…), KHÔNG tồn kho.</li>
 *   <li>{@code SUPPLY}      — vật tư tiêu hao (băng gạc, ống tiêm…), có tồn kho.</li>
 *   <li>{@code MERCHANDISE} — hàng bán lẻ tại quầy (đồ chơi, thức ăn, phụ kiện…), có tồn kho.</li>
 * </ul>
 *
 * <p>{@link #stockTracked} quyết định mục có giảm/kiểm tồn kho hay không.
 */
public enum ProductType implements IdentifiedEnum {

    MEDICATION(true),
    SERVICE(false),
    SUPPLY(true),
    MERCHANDISE(true);

    private final boolean stockTracked;

    ProductType(boolean stockTracked) {
        this.stockTracked = stockTracked;
    }

    public boolean isStockTracked() {
        return stockTracked;
    }

    @Override
    public String id() {
        return name();
    }
}
