package com.mss301.petclinic.customers.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.customers.dto.req.PetTypeRequest;
import com.mss301.petclinic.customers.exception.PetTypeNotFoundException;
import com.mss301.petclinic.customers.model.PetType;
import com.mss301.petclinic.customers.repository.PetRepository;
import com.mss301.petclinic.customers.repository.PetTypeRepository;
import com.mss301.petclinic.customers.service.impl.PetTypeServiceImpl;

@ExtendWith(MockitoExtension.class)
class PetTypeServiceImplTest {

    @Mock PetTypeRepository repository;
    @Mock PetRepository petRepository;
    @InjectMocks PetTypeServiceImpl service;

    private static PetType petType(Long id, String code) {
        var pt = new PetType(code, code, 10);
        ReflectionTestUtils.setField(pt, "id", id);
        return pt;
    }

    @Test
    @DisplayName("findAll → sorted by display_order asc, name asc")
    void findAll_delegatesToSortedRepo() {
        given(repository.findAllByOrderByDisplayOrderAscNameAsc())
                .willReturn(List.of(petType(1L, "dog"), petType(2L, "cat")));

        var result = service.findAll();

        assertThat(result).hasSize(2)
                .extracting("code")
                .containsExactly("dog", "cat");
    }

    @Test
    @DisplayName("create with duplicate code → BadRequestAlertException")
    void create_duplicateCode_throws() {
        var existing = petType(1L, "dog");
        given(repository.findByCode("dog")).willReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.create(new PetTypeRequest("dog", "Chó", 10)))
                .isInstanceOf(BadRequestAlertException.class)
                .hasMessageContaining("dog");

        then(repository).should(never()).save(any());
    }

    @Test
    @DisplayName("create with new code → repository.save")
    void create_newCode_saves() {
        given(repository.findByCode("frog")).willReturn(Optional.empty());
        given(repository.save(any(PetType.class)))
                .willAnswer(inv -> {
                    PetType saved = inv.getArgument(0);
                    ReflectionTestUtils.setField(saved, "id", 99L);
                    return saved;
                });

        var result = service.create(new PetTypeRequest("frog", "Ếch", 80));

        assertThat(result.code()).isEqualTo("frog");
        assertThat(result.id()).isEqualTo(99L);
    }

    @Test
    @DisplayName("update with new code conflict on another row → throws")
    void update_codeConflict_throws() {
        var current = petType(1L, "dog");
        var other = petType(2L, "cat");
        given(repository.findById(1L)).willReturn(Optional.of(current));
        given(repository.findByCode("cat")).willReturn(Optional.of(other));

        assertThatThrownBy(() -> service.update(1L, new PetTypeRequest("cat", "Mèo", 20)))
                .isInstanceOf(BadRequestAlertException.class);
    }

    @Test
    @DisplayName("update with same code (only label change) → succeeds")
    void update_sameCode_succeeds() {
        var current = petType(1L, "dog");
        given(repository.findById(1L)).willReturn(Optional.of(current));

        var result = service.update(1L, new PetTypeRequest("dog", "Chó cảnh", 15));

        assertThat(result.name()).isEqualTo("Chó cảnh");
        assertThat(result.displayOrder()).isEqualTo(15);
    }

    @Test
    @DisplayName("deleteById in-use → BadRequestAlertException (chặn FK violation)")
    void deleteById_inUse_throws() {
        given(repository.existsById(1L)).willReturn(true);
        given(petRepository.countByPetTypeId(1L)).willReturn(5L);

        assertThatThrownBy(() -> service.deleteById(1L))
                .isInstanceOf(BadRequestAlertException.class)
                .hasMessageContaining("5");

        then(repository).should(never()).deleteById(any());
    }

    @Test
    @DisplayName("deleteById missing → PetTypeNotFoundException")
    void deleteById_missing_throws() {
        given(repository.existsById(999L)).willReturn(false);

        assertThatThrownBy(() -> service.deleteById(999L))
                .isInstanceOf(PetTypeNotFoundException.class);
    }

    @Test
    @DisplayName("resolve(null) → null (no-op)")
    void resolve_null_returnsNull() {
        assertThat(service.resolve(null)).isNull();
    }

    @Test
    @DisplayName("resolve(missing id) → PetTypeNotFoundException")
    void resolve_missing_throws() {
        given(repository.findById(404L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.resolve(404L))
                .isInstanceOf(PetTypeNotFoundException.class);
    }
}
