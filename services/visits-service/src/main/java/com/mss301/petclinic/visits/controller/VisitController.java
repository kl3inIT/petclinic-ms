package com.mss301.petclinic.visits.controller;

import com.mss301.petclinic.visits.dto.req.BookVisitRequest;
import com.mss301.petclinic.visits.dto.req.CompleteVisitRequest;
import com.mss301.petclinic.visits.dto.res.VisitResponse;
import com.mss301.petclinic.visits.model.VisitStatus;
import com.mss301.petclinic.visits.service.VisitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Visits API. Authorization rules:
 * <ul>
 *   <li>Role + URL → khai báo ở {@link com.mss301.petclinic.visits.config.VisitsSecurityConfig}</li>
 *   <li>Ownership / view filter → ở Service layer (đọc role từ JWT, pass xuống)</li>
 * </ul>
 * Controller thuần routing + extract JWT context.
 */
@RestController
@RequestMapping("/api/v1/visits")
@Tag(name = "Visits", description = "Visit booking + lifecycle (schedule → in-progress → complete)")
public class VisitController {

    private static final Set<String> PRIVILEGED_ROLES = Set.of("STAFF", "ADMIN", "VET");

    private final VisitService service;

    public VisitController(VisitService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Đặt visit cho pet với vet vào giờ xác định")
    public VisitResponse book(@Valid @RequestBody BookVisitRequest request,
                              @AuthenticationPrincipal Jwt jwt) {
        return service.book(request, currentUserId(jwt));
    }

    @GetMapping
    @Operation(summary = "List visits — USER thấy của mình, STAFF/ADMIN/VET thấy theo filter")
    public Page<VisitResponse> search(
            @RequestParam(required = false) Long vetId,
            @RequestParam(required = false) Long petId,
            @RequestParam(required = false) VisitStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            Pageable pageable,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID customerFilter = isPrivileged(jwt) ? null : currentUserId(jwt);
        return service.search(customerFilter, vetId, petId, status, from, to, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get visit detail")
    public VisitResponse get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PatchMapping("/{id}/start")
    @Operation(summary = "Mark visit IN_PROGRESS (vet/staff)")
    public VisitResponse start(@PathVariable Long id) {
        return service.start(id);
    }

    @PatchMapping("/{id}/complete")
    @Operation(summary = "Vet đóng visit + ghi diagnosis/treatment/fee")
    public VisitResponse complete(@PathVariable Long id,
                                   @Valid @RequestBody CompleteVisitRequest req) {
        return service.complete(id, req);
    }

    @PatchMapping("/{id}/cancel")
    @Operation(summary = "Cancel visit — USER chỉ hủy của mình; STAFF/ADMIN hủy được hết")
    public VisitResponse cancel(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return service.cancel(id, currentUserId(jwt), isPrivileged(jwt));
    }

    // --- helpers ---

    private static UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    private static boolean isPrivileged(Jwt jwt) {
        List<String> roles = jwt.getClaimAsStringList("roles");
        return roles != null && roles.stream().anyMatch(PRIVILEGED_ROLES::contains);
    }
}
