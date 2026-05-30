package com.mss301.petclinic.customers.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.mss301.petclinic.common.testing.JwtTestSupport;
import com.mss301.petclinic.common.web.exception.ExceptionTranslator;
import com.mss301.petclinic.customers.dto.res.PetTypeResponse;
import com.mss301.petclinic.customers.service.PetTypeService;

@WebMvcTest(PetTypeController.class)
@Import(ExceptionTranslator.class)
class PetTypeControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean PetTypeService service;

    @Test
    @DisplayName("GET /api/v1/pet-types → returns sorted list")
    void listPetTypes_returnsList() throws Exception {
        given(service.findAll()).willReturn(List.of(
                new PetTypeResponse(1L, "dog", "Chó", 10),
                new PetTypeResponse(2L, "cat", "Mèo", 20)));

        mockMvc.perform(get("/api/v1/pet-types")
                        .with(jwt().jwt(JwtTestSupport.userJwt())
                                .authorities(JwtTestSupport.userAuthorities())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("dog"))
                .andExpect(jsonPath("$[1].name").value("Mèo"));
    }

    @Test
    @DisplayName("POST /api/v1/pet-types — invalid code (uppercase) → 400 fieldErrors")
    void createPetType_invalidCode_returns400() throws Exception {
        // uppercase code fails @Pattern
        String body = """
                {"code": "DOG", "name": "Chó", "displayOrder": 10}
                """;

        mockMvc.perform(post("/api/v1/pet-types")
                        .with(jwt().jwt(JwtTestSupport.adminJwt())
                                .authorities(JwtTestSupport.adminAuthorities()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'code')]").exists());
    }

    @Test
    @DisplayName("POST /api/v1/pet-types — valid body → 201 with id")
    void createPetType_valid_returns201() throws Exception {
        given(service.create(any())).willReturn(new PetTypeResponse(99L, "frog", "Ếch", 80));

        String body = """
                {"code": "frog", "name": "Ếch", "displayOrder": 80}
                """;

        mockMvc.perform(post("/api/v1/pet-types")
                        .with(jwt().jwt(JwtTestSupport.adminJwt())
                                .authorities(JwtTestSupport.adminAuthorities()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(99))
                .andExpect(jsonPath("$.code").value("frog"));
    }
}
