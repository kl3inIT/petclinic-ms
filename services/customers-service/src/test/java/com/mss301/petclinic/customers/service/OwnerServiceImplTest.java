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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import com.mss301.petclinic.customers.dto.req.OwnerRequest;
import com.mss301.petclinic.customers.exception.OwnerNotFoundException;
import com.mss301.petclinic.customers.model.Owner;
import com.mss301.petclinic.customers.repository.OwnerRepository;
import com.mss301.petclinic.customers.service.impl.OwnerServiceImpl;

/**
 * Pure unit test — repository mocked. Test business logic của service KHÔNG đụng DB/Spring context.
 *
 * <h4>Why @ExtendWith(MockitoExtension) thay vì @SpringBootTest?</h4>
 * Pyramid: unit > slice > integration. Service layer test rất nhiều, phải nhanh (~10ms/test).
 * Mockito mở rộng JUnit 5 đủ để @Mock + @InjectMocks; KHÔNG cần Spring context.
 */
@ExtendWith(MockitoExtension.class)
class OwnerServiceImplTest {

    @Mock OwnerRepository repository;
    @InjectMocks OwnerServiceImpl service;

    @Test
    @DisplayName("findAll(blank lastName) → repository.findAll(pageable) (no filter)")
    void findAll_withoutLastName_callsFindAll() {
        var owner = new Owner("Anh", "Nguyễn", null, "Hồ Chí Minh", null);
        given(repository.findAll(any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(owner)));

        var result = service.findAll(null, Pageable.unpaged());

        assertThat(result.getContent()).hasSize(1)
                .first()
                .extracting("firstName", "lastName")
                .containsExactly("Anh", "Nguyễn");
        then(repository).should(never()).findByLastNameContainingIgnoreCase(any(), any());
    }

    @Test
    @DisplayName("findAll(lastName) → repository.findByLastNameContainingIgnoreCase")
    void findAll_withLastName_callsFiltered() {
        given(repository.findByLastNameContainingIgnoreCase(any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of()));

        service.findAll("Nguyễn", Pageable.unpaged());

        then(repository).should().findByLastNameContainingIgnoreCase("Nguyễn", Pageable.unpaged());
        then(repository).should(never()).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("findById missing → OwnerNotFoundException")
    void findById_missing_throws() {
        given(repository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(999L))
                .isInstanceOf(OwnerNotFoundException.class);
    }

    @Test
    @DisplayName("create → repository.save invoked with request fields")
    void create_savesEntity() {
        var request = new OwnerRequest("Bình", "Trần", "12 Lê Lợi", "Hà Nội", "0901111002");
        given(repository.save(any(Owner.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        var result = service.create(request);

        assertThat(result.firstName()).isEqualTo("Bình");
        assertThat(result.lastName()).isEqualTo("Trần");
        then(repository).should().save(any(Owner.class));
    }

    @Test
    @DisplayName("deleteById missing → OwnerNotFoundException (no delete called)")
    void deleteById_missing_throws() {
        given(repository.existsById(999L)).willReturn(false);

        assertThatThrownBy(() -> service.deleteById(999L))
                .isInstanceOf(OwnerNotFoundException.class);

        then(repository).should(never()).deleteById(any());
    }
}
