package com.mss301.petclinic.customers.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.mss301.petclinic.common.testing.JwtTestSupport;
import com.mss301.petclinic.common.web.exception.ExceptionTranslator;
import com.mss301.petclinic.customers.dto.res.PetResponse;
import com.mss301.petclinic.customers.exception.PetNotFoundException;
import com.mss301.petclinic.customers.service.PetService;

@WebMvcTest(PetController.class)
@Import(ExceptionTranslator.class)
class PetControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean PetService service;

    @Test
    @DisplayName("GET /api/v1/pets → returns page")
    void listPets_returnsPage() throws Exception {
        var pet = new PetResponse(1L, "Milu", null, "dog", 1L, true, null, null, 10L);
        given(service.findAll(any(), any(), any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(pet)));

        mockMvc.perform(get("/api/v1/pets")
                        .with(jwt().jwt(JwtTestSupport.userJwt())
                                .authorities(JwtTestSupport.userAuthorities())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Milu"))
                .andExpect(jsonPath("$.content[0].ownerId").value(10));
    }

    @Test
    @DisplayName("GET /api/v1/pets?ownerId=5 → service receives ownerId filter")
    void listPets_withOwnerIdFilter_forwardsParam() throws Exception {
        given(service.findAll(eq(5L), any(), any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/v1/pets?ownerId=5")
                        .with(jwt().jwt(JwtTestSupport.userJwt())
                                .authorities(JwtTestSupport.userAuthorities())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/v1/pets/{id} → 404 ProblemDetail when missing")
    void getPet_missing_returns404() throws Exception {
        given(service.findById(999L)).willThrow(new PetNotFoundException("999"));

        mockMvc.perform(get("/api/v1/pets/999")
                        .with(jwt().jwt(JwtTestSupport.userJwt())
                                .authorities(JwtTestSupport.userAuthorities())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Entity not found"));
    }
}
