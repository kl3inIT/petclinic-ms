package com.mss301.petclinic.customers.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.mss301.petclinic.common.testing.JwtTestSupport;
import com.mss301.petclinic.common.web.exception.ExceptionTranslator;
import com.mss301.petclinic.customers.dto.res.OwnerResponse;
import com.mss301.petclinic.customers.exception.OwnerNotFoundException;
import com.mss301.petclinic.customers.service.OwnerService;

/**
 * Slice test cho web layer. Spring Boot khởi tạo CHỈ controller + ControllerAdvice + MockMvc —
 * KHÔNG load JPA, KHÔNG load service implementation. Service được mock qua {@link MockitoBean}.
 *
 * <h4>Spring Boot 4 lưu ý</h4>
 * - {@code @MockBean} đã rename → {@link MockitoBean} (package {@code test.context.bean.override.mockito}).
 *   Hành vi giống nhưng namespace mới. KHÔNG xài @MockBean cho dự án mới.
 * - KHÔNG @Import PetClinicSecurityAutoConfiguration ở slice test — custom autoconfig đó cần
 *   HttpSecurity bean (chỉ có trong full Spring Boot context), không có ở @WebMvcTest slice.
 *   @WebMvcTest tự setup Spring Security default chain → {@code .with(jwt())} của
 *   spring-security-test vẫn inject Authentication như mong đợi.
 * - @Import ExceptionTranslator riêng vì nó là @RestControllerAdvice nằm trong shared module,
 *   không scan auto bởi @WebMvcTest.
 */
@WebMvcTest(OwnerController.class)
@Import(ExceptionTranslator.class)
class OwnerControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean OwnerService service;

    // KHÔNG test "401 khi không auth" ở slice: @WebMvcTest default security chain permitAll —
    // assert auth enforcement ở OwnerIntegrationTest (full context có PetClinicSecurityAutoConfiguration).

    @Test
    @DisplayName("GET /api/v1/owners — authenticated user → returns paged owners")
    void listOwners_authenticated_returnsPage() throws Exception {
        var owner = new OwnerResponse(1L, "Anh", "Nguyễn", "12 Lê Lợi", "Hồ Chí Minh", "0901111001", null, List.of());
        given(service.findAll(any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(owner)));

        mockMvc.perform(get("/api/v1/owners")
                        .with(jwt().jwt(JwtTestSupport.userJwt()).authorities(JwtTestSupport.userAuthorities())))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.content[0].firstName").value("Anh"))
                .andExpect(jsonPath("$.content[0].lastName").value("Nguyễn"));
    }

    @Test
    @DisplayName("GET /api/v1/owners/{id} — missing → 404 ProblemDetail")
    void getOwner_missing_returns404() throws Exception {
        given(service.findById(999L)).willThrow(new OwnerNotFoundException("999"));

        mockMvc.perform(get("/api/v1/owners/999")
                        .with(jwt().jwt(JwtTestSupport.userJwt()).authorities(JwtTestSupport.userAuthorities())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Entity not found"));
    }

    @Test
    @DisplayName("POST /api/v1/owners — invalid body (blank firstName) → 400 fieldErrors")
    void createOwner_invalidBody_returns400() throws Exception {
        String invalidJson = """
                {"firstName": "", "lastName": "Trần"}
                """;

        mockMvc.perform(post("/api/v1/owners")
                        .with(jwt().jwt(JwtTestSupport.userJwt()).authorities(JwtTestSupport.userAuthorities()))
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'firstName')].code").value("NotBlank"));
    }

    @Test
    @DisplayName("DELETE /api/v1/owners/{id} → 204")
    void deleteOwner_success_returns204() throws Exception {
        mockMvc.perform(delete("/api/v1/owners/1")
                        .with(jwt().jwt(JwtTestSupport.userJwt()).authorities(JwtTestSupport.userAuthorities()))
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("DELETE missing → 404 (service throws → ExceptionTranslator maps)")
    void deleteOwner_missing_returns404() throws Exception {
        willThrow(new OwnerNotFoundException("999")).given(service).deleteById(999L);

        mockMvc.perform(delete("/api/v1/owners/999")
                        .with(jwt().jwt(JwtTestSupport.userJwt()).authorities(JwtTestSupport.userAuthorities()))
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isNotFound());
    }

    // /me endpoints test ở OwnerIntegrationTest (full Spring context cần thiết cho
    // AuthenticationPrincipalArgumentResolver — @WebMvcTest slice không auto-wire
    // security arg resolver → Jwt args bị DataBinder rỗng).
}
