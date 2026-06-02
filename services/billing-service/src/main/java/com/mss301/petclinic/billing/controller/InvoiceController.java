package com.mss301.petclinic.billing.controller;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.mss301.petclinic.billing.dto.req.AddInvoiceItemRequest;
import com.mss301.petclinic.billing.dto.req.CheckoutRequest;
import com.mss301.petclinic.billing.dto.req.CreateInvoiceRequest;
import com.mss301.petclinic.billing.dto.res.InvoiceResponse;
import com.mss301.petclinic.billing.model.InvoiceStatus;
import com.mss301.petclinic.billing.service.InvoiceService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Hoá đơn gộp + thanh toán ở quầy. Role rules ở {@link com.mss301.petclinic.billing.config.BillingSecurityConfig};
 * ownership chi tiết hoá đơn (USER chỉ xem hoá đơn của mình) check ở controller.
 *
 * <p>Method name UNIQUE cross-service (gotcha #23): listInvoices / getInvoice / getMyInvoices /
 * createInvoice / addInvoiceItem / removeInvoiceItem / checkoutInvoice / cancelInvoice.
 */
@RestController
@RequestMapping("/api/v1/invoices")
@Tag(name = "Invoices", description = "Hoá đơn gộp (phí khám + bệnh + đồ shop) + thanh toán quầy")
public class InvoiceController {

    private static final List<String> PRIVILEGED_ROLES = List.of("STAFF", "ADMIN", "VET");

    private final InvoiceService service;

    public InvoiceController(InvoiceService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List hoá đơn (STAFF/ADMIN/VET) — lọc customerUserId, status, from, to")
    public Page<InvoiceResponse> listInvoices(
            @RequestParam(required = false) UUID customerUserId,
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            Pageable pageable) {
        return service.search(customerUserId, status, from, to, pageable);
    }

    @GetMapping("/me")
    @Operation(summary = "Hoá đơn của chính khách đang đăng nhập")
    public Page<InvoiceResponse> getMyInvoices(
            @RequestParam(required = false) InvoiceStatus status,
            Pageable pageable,
            @AuthenticationPrincipal Jwt jwt) {
        return service.search(currentUserId(jwt), status, null, null, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết hoá đơn — owner hoặc STAFF/ADMIN/VET")
    public InvoiceResponse getInvoice(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        InvoiceResponse invoice = service.getById(id);
        if (!isPrivileged(jwt) && !currentUserId(jwt).equals(invoice.customerUserId())) {
            throw new AccessDeniedException("Bạn không thể xem hoá đơn của người khác");
        }
        return invoice;
    }

    @PostMapping
    @Operation(summary = "Mở hoá đơn (tab) ở quầy — STAFF/ADMIN")
    public ResponseEntity<InvoiceResponse> createInvoice(@Valid @RequestBody CreateInvoiceRequest request) {
        InvoiceResponse created = service.createInvoice(request);
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PostMapping("/{id}/items")
    @Operation(summary = "Thêm dòng (bệnh từ danh mục / đồ shop tự do) — STAFF/ADMIN/VET")
    public InvoiceResponse addInvoiceItem(@PathVariable Long id,
                                          @Valid @RequestBody AddInvoiceItemRequest request) {
        return service.addItem(id, request);
    }

    @DeleteMapping("/{id}/items/{itemId}")
    @Operation(summary = "Xoá dòng khỏi hoá đơn — STAFF/ADMIN")
    public InvoiceResponse removeInvoiceItem(@PathVariable Long id, @PathVariable Long itemId) {
        return service.removeItem(id, itemId);
    }

    @PostMapping("/{id}/checkout")
    @Operation(summary = "Chốt + thanh toán hoá đơn TRỰC TIẾP tại quầy — STAFF/ADMIN")
    public InvoiceResponse checkoutInvoice(@PathVariable Long id,
                                           @Valid @RequestBody CheckoutRequest request) {
        return service.checkout(id, request);
    }

    @PatchMapping("/{id}/cancel")
    @Operation(summary = "Huỷ hoá đơn — STAFF/ADMIN")
    public InvoiceResponse cancelInvoice(@PathVariable Long id) {
        return service.cancel(id);
    }

    private static UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    private static boolean isPrivileged(Jwt jwt) {
        List<String> roles = jwt.getClaimAsStringList("roles");
        return roles != null && roles.stream().anyMatch(PRIVILEGED_ROLES::contains);
    }
}
