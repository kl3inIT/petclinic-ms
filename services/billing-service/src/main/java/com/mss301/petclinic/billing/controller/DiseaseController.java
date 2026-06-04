package com.mss301.petclinic.billing.controller;

import java.net.URI;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.mss301.petclinic.billing.dto.req.CreateDiseaseRequest;
import com.mss301.petclinic.billing.dto.req.UpdateDiseaseRequest;
import com.mss301.petclinic.billing.dto.res.DiseaseResponse;
import com.mss301.petclinic.billing.service.DiseaseService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Danh mục bệnh + chi phí. Read mở cho user đã đăng nhập; write (CRUD) chỉ ADMIN
 * (khai báo ở {@link com.mss301.petclinic.billing.config.BillingSecurityConfig}).
 *
 * <p>Method name UNIQUE cross-service cho OpenAPI aggregation (gotcha #23):
 * listDiseases / getDisease / createDisease / updateDisease / deleteDisease.
 */
@RestController
@RequestMapping("/api/v1/diseases")
@Tag(name = "Diseases", description = "Danh mục bệnh + chi phí điều trị")
public class DiseaseController {

    private final DiseaseService service;

    public DiseaseController(DiseaseService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List bệnh — lọc theo q (code/name), category, active")
    public Page<DiseaseResponse> listDiseases(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean active,
            Pageable pageable) {
        return service.search(q, category, active, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết bệnh")
    public DiseaseResponse getDisease(@PathVariable Long id) {
        return service.getById(id);
    }

    @PostMapping
    @Operation(summary = "Tạo bệnh mới (ADMIN)")
    public ResponseEntity<DiseaseResponse> createDisease(@Valid @RequestBody CreateDiseaseRequest request) {
        DiseaseResponse created = service.create(request);
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Cập nhật bệnh (ADMIN)")
    public DiseaseResponse updateDisease(@PathVariable Long id,
                                         @Valid @RequestBody UpdateDiseaseRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Xoá bệnh (ADMIN)")
    public void deleteDisease(@PathVariable Long id) {
        service.delete(id);
    }
}
