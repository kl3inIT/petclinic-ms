import { useMemo } from 'react';

import { useListVets } from '@/lib/api/generated/vets/vets';
import { vnSpecialty } from '@/features/visits/labels';

/** Thông tin bác sĩ rút gọn để hiển thị, dẫn xuất từ VetResponse THẬT. */
export interface VetInfo {
  firstName?: string;
  lastName?: string;
  /** "BS. Họ Tên" nếu có tên, fallback "BS #id". */
  fullName: string;
  /** Chuyên khoa đầu tiên (đã dịch VN), null nếu vet không có chuyên khoa. */
  specialty: string | null;
  /** Ảnh đại diện thật (nếu vet đã upload), null nếu chưa có. */
  photoUrl: string | null;
}

/** Số bác sĩ tải về để map tên — clinic nhỏ, 1 trang đủ. */
const VET_FETCH_SIZE = 200;

/**
 * Map vetId → thông tin hiển thị thật (tên, chuyên khoa). Dùng chung cho mọi nơi
 * cần đổi vetId sang tên bác sĩ thật thay vì bịa.
 */
export function useVetMap() {
  const vetsQuery = useListVets({
    pageable: { page: 0, size: VET_FETCH_SIZE, sort: ['lastName,asc'] },
  });

  const vetMap = useMemo(() => {
    const map = new Map<number, VetInfo>();
    for (const v of vetsQuery.data?.content ?? []) {
      if (v.id === undefined) continue;
      const fullName = `${v.firstName ?? ''} ${v.lastName ?? ''}`.trim();
      map.set(v.id, {
        firstName: v.firstName,
        lastName: v.lastName,
        fullName: fullName ? `BS. ${fullName}` : `BS #${v.id}`,
        specialty: vnSpecialty(v.specialties?.[0]?.name) || null,
        photoUrl: v.photoUrl && v.photoUrl.length > 0 ? v.photoUrl : null,
      });
    }
    return map;
  }, [vetsQuery.data?.content]);

  return { vetMap, isLoading: vetsQuery.isLoading };
}
