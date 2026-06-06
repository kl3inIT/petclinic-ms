import { Link } from '@tanstack/react-router';
import { Edit3, PawPrint, Scale, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { PetDto } from '@/lib/api/generated/model/petDto';
import { petAgeLabel, petEmoji, petTypeLabel } from '../labels';
import { PetPill } from './parts';

/**
 * Hero card thú cưng trọng tâm. Chỉ hiển thị thông tin THẬT từ PetDto
 * (loài, tuổi từ birthDate, cân nặng) — ẩn pill khi thiếu data, không bịa.
 */
export function CustomerVisitHero({ focusPet }: { focusPet?: PetDto }) {
  const name = focusPet?.name ?? 'thú cưng';
  const emoji = petEmoji(focusPet?.type);
  const age = petAgeLabel(focusPet?.birthDate);
  const hasType = Boolean(focusPet?.type);
  const weight =
    typeof focusPet?.weight === 'number' && Number.isFinite(focusPet.weight)
      ? focusPet.weight
      : null;

  return (
    <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
            Lịch khám của bé <span className="text-primary">{name}</span>
          </h1>
          <PawPrint className="size-5 text-primary/60" />
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-500">
          Theo dõi lịch hẹn, kết quả khám và trạng thái chăm sóc thú cưng của bạn.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-violet-100 bg-gradient-to-br from-white via-violet-50 to-violet-100/70 p-4 shadow-[0_14px_40px_rgba(104,93,199,0.12)]">
        <PawPrint className="absolute -top-4 -right-4 size-24 text-primary/5" />
        <div className="relative flex items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-amber-100 to-orange-200 text-4xl shadow-md">
            {focusPet?.photoUrl ? (
              <img
                src={focusPet.photoUrl}
                alt={name}
                className="size-full object-cover"
              />
            ) : (
              emoji
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-950">{name}</h2>
              <Button
                asChild
                variant="ghost"
                size="icon-xs"
                className="text-primary hover:bg-primary/10"
                title="Chỉnh sửa hồ sơ thú cưng"
              >
                <Link to="/customer/pets">
                  <Edit3 className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {hasType ? (
                <PetPill icon={PawPrint} label={petTypeLabel(focusPet?.type)} />
              ) : null}
              {age ? <PetPill icon={UserRound} label={age} /> : null}
              {weight !== null ? <PetPill icon={Scale} label={`${weight} kg`} /> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
