package com.mss301.petclinic.customers.dto.res;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.function.Function;

import com.mss301.petclinic.customers.model.Pet;

/**
 * Standalone Pet response — exposed cho cross-service consumers (vd visits-service)
 * cần validate pet tồn tại + lấy ownerId. {@code photoUrl} = presigned URL ảnh (null nếu chưa có).
 */
public record PetResponse(
        Long id,
        String name,
        LocalDate birthDate,
        String type,
        Long petTypeId,
        Boolean isActive,
        BigDecimal weight,
        String photoId,
        String photoUrl,
        Long ownerId
) {
    public static PetResponse from(Pet pet) {
        return from(pet, key -> null);
    }

    public static PetResponse from(Pet pet, Function<String, String> urlResolver) {
        return new PetResponse(pet.getId(), pet.getName(), pet.getBirthDate(),
                pet.getType(), pet.getPetTypeId(), pet.getIsActive(), pet.getWeight(),
                pet.getPhotoId(), urlResolver.apply(pet.getPhotoId()), pet.getOwnerId());
    }
}
