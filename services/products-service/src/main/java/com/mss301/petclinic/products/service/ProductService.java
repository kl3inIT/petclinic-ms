package com.mss301.petclinic.products.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.mss301.petclinic.products.dto.req.CreateProductRequest;
import com.mss301.petclinic.products.dto.req.UpdateProductRequest;
import com.mss301.petclinic.products.dto.res.ProductResponse;
import com.mss301.petclinic.products.model.ProductType;

/** Quản lý catalog (thuốc / dịch vụ / vật tư) + tồn kho. */
public interface ProductService {

    Page<ProductResponse> search(String q, ProductType type, Boolean active, Boolean lowStock, Pageable pageable);

    ProductResponse getById(Long id);

    ProductResponse create(CreateProductRequest request);

    ProductResponse update(Long id, UpdateProductRequest request);

    void delete(Long id);

    /** Trừ tồn kho (cấp phát thuốc/vật tư khi kê đơn). */
    ProductResponse consumeStock(Long id, int quantity);

    /** Nhập thêm tồn kho. */
    ProductResponse restock(Long id, int quantity);
}
