import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, GraduationCap, Image as ImageIcon, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useListPendingVetPhotos,
  useListPendingVetEducations,
} from '@/lib/api/generated/vet-reviews/vet-reviews';
import {
  useApproveVetPhoto,
  useRejectVetPhoto,
} from '@/lib/api/generated/vet-photo/vet-photo';
import {
  useApproveVetEducation,
  useRejectVetEducation,
} from '@/lib/api/generated/vet-educations/vet-educations';

export const Route = createFileRoute('/admin/vet-reviews')({
  component: VetReviewsPage,
});

type RejectTarget =
  | { kind: 'photo'; vetId: number }
  | { kind: 'education'; vetId: number; educationId: number };

function VetReviewsPage() {
  const qc = useQueryClient();
  const photosQuery = useListPendingVetPhotos();
  const eduQuery = useListPendingVetEducations();

  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const invalidate = () => {
    void qc.invalidateQueries({
      predicate: (q) => {
        const k = q.queryKey[0];
        return typeof k === 'string' && k.includes('/vets/');
      },
    });
  };

  const approvePhoto = useApproveVetPhoto({
    mutation: {
      onSuccess: () => {
        toast.success('Đã duyệt ảnh');
        invalidate();
      },
      onError: (e: Error) => toast.error(e.message || 'Duyệt ảnh thất bại'),
    },
  });
  const rejectPhoto = useRejectVetPhoto({
    mutation: {
      onSuccess: () => {
        toast.success('Đã từ chối ảnh');
        invalidate();
        setRejectTarget(null);
        setRejectReason('');
      },
      onError: (e: Error) => toast.error(e.message || 'Từ chối ảnh thất bại'),
    },
  });
  const approveEdu = useApproveVetEducation({
    mutation: {
      onSuccess: () => {
        toast.success('Đã duyệt học vấn');
        invalidate();
      },
      onError: (e: Error) => toast.error(e.message || 'Duyệt thất bại'),
    },
  });
  const rejectEdu = useRejectVetEducation({
    mutation: {
      onSuccess: () => {
        toast.success('Đã từ chối học vấn');
        invalidate();
        setRejectTarget(null);
        setRejectReason('');
      },
      onError: (e: Error) => toast.error(e.message || 'Từ chối thất bại'),
    },
  });

  const photos = photosQuery.data ?? [];
  const educations = eduQuery.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Duyệt thay đổi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Yêu cầu cập nhật ảnh đại diện và trình độ học vấn từ bác sĩ — cần duyệt mới hiển
          thị công khai.
        </p>
      </div>

      {/* Photos section */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <ImageIcon className="size-4 text-violet-600" />
          <h2 className="text-base font-semibold text-slate-900">
            Ảnh đại diện chờ duyệt
          </h2>
          <span className="ml-auto rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700">
            {photos.length}
          </span>
        </header>
        <div className="p-5">
          {photosQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : photos.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Không có yêu cầu nào.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {photos.map((p) => (
                <li
                  key={p.vetId}
                  className="flex gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <div className="size-20 shrink-0 overflow-hidden rounded-md border bg-slate-50">
                    {p.presignedUrl ? (
                      <img
                        src={p.presignedUrl}
                        alt={`Vet ${p.vetId}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="m-auto size-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Vet #{p.vetId}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {p.contentType ?? '—'} •{' '}
                        {p.sizeBytes != null
                          ? `${Math.round(p.sizeBytes / 1024)} KB`
                          : '—'}
                      </p>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={approvePhoto.isPending}
                        onClick={() => p.vetId && approvePhoto.mutate({ vetId: p.vetId })}
                      >
                        <Check className="mr-1 size-3.5" /> Duyệt
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          p.vetId && setRejectTarget({ kind: 'photo', vetId: p.vetId })
                        }
                      >
                        <X className="mr-1 size-3.5" /> Từ chối
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Educations section */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <GraduationCap className="size-4 text-violet-600" />
          <h2 className="text-base font-semibold text-slate-900">Học vấn chờ duyệt</h2>
          <span className="ml-auto rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700">
            {educations.length}
          </span>
        </header>
        <div className="p-5">
          {eduQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : educations.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Không có yêu cầu nào.
            </p>
          ) : (
            <ul className="space-y-3">
              {educations.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {e.degree} — {e.fieldOfStudy ?? 'Chưa rõ chuyên ngành'}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{e.schoolName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Vet #{e.vetId} • {e.startDate}
                      {e.endDate ? ` → ${e.endDate}` : ' → đang học'}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="default"
                      disabled={approveEdu.isPending}
                      onClick={() =>
                        e.id != null &&
                        e.vetId != null &&
                        approveEdu.mutate({ vetId: e.vetId, educationId: e.id })
                      }
                    >
                      <Check className="mr-1 size-3.5" /> Duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        e.id != null &&
                        e.vetId != null &&
                        setRejectTarget({
                          kind: 'education',
                          vetId: e.vetId,
                          educationId: e.id,
                        })
                      }
                    >
                      <X className="mr-1 size-3.5" /> Từ chối
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Reject reason dialog */}
      <Dialog
        open={rejectTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lý do từ chối</DialogTitle>
            <DialogDescription>
              Lý do sẽ được hiển thị cho bác sĩ để chỉnh sửa và gửi lại.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder="VD: Ảnh không rõ mặt / bằng cấp không phù hợp chuyên ngành thú y"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={
                !rejectReason.trim() || rejectPhoto.isPending || rejectEdu.isPending
              }
              onClick={() => {
                if (!rejectTarget) return;
                const reason = rejectReason.trim();
                if (rejectTarget.kind === 'photo') {
                  rejectPhoto.mutate({
                    vetId: rejectTarget.vetId,
                    data: { reason },
                  });
                } else {
                  rejectEdu.mutate({
                    vetId: rejectTarget.vetId,
                    educationId: rejectTarget.educationId,
                    data: { reason },
                  });
                }
              }}
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
