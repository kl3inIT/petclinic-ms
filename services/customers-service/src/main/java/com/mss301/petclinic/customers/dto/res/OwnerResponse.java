package com.mss301.petclinic.customers.dto.res;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.function.Function;

import com.mss301.petclinic.customers.model.Owner;
import com.mss301.petclinic.customers.model.Pet;

public record OwnerResponse(
        Long id,
        String firstName,
        String lastName,
        String address,
        String city,
        String telephone,
        String avatarUrl,
        List<PetDto> pets
) {
    /** Map không có ảnh — dùng khi caller không có quyền truy cập storage (vd test). */
    public static OwnerResponse from(Owner owner) {
        return from(owner, key -> null);
    }

    /**
     * Map kèm resolver biến MinIO object key → presigned URL ({@code null} nếu chưa có ảnh).
     * Service layer truyền {@code key -> storage.presignedGet(key, ttl).toString()}.
     */
    public static OwnerResponse from(Owner owner, Function<String, String> urlResolver) {
        var pets = owner.getPets() == null
                ? List.<PetDto>of()
                : owner.getPets().stream().map(p -> PetDto.from(p, urlResolver)).toList();
        return new OwnerResponse(
                owner.getId(),
                owner.getFirstName(),
                owner.getLastName(),
                owner.getAddress(),
                owner.getCity(),
                owner.getTelephone(),
                urlResolver.apply(owner.getAvatarObjectKey()),
                pets
        );
    }

    public record PetDto(Long id, String name, LocalDate birthDate, String type,
                         Long petTypeId, Boolean isActive, BigDecimal weight,
                         String photoId, String photoUrl) {
        public static PetDto from(Pet pet) {
            return from(pet, key -> null);
        }

        public static PetDto from(Pet pet, Function<String, String> urlResolver) {
            return new PetDto(
                    pet.getId(),
                    pet.getName(),
                    pet.getBirthDate(),
                    pet.getType(),
                    pet.getPetTypeId(),
                    pet.getIsActive(),
                    pet.getWeight(),
                    pet.getPhotoId(),
                    urlResolver.apply(pet.getPhotoId()));
        }
    }
}
