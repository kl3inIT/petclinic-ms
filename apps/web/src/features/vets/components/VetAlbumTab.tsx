import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import {
  getGetVetPhotoQueryKey,
  useDeleteVetPhoto,
  useGetVetPhoto,
  useUploadVetPhoto,
} from '@/lib/api/generated/vet-photo/vet-photo';
import {
  getListVetAlbumPhotosQueryKey,
  useDeleteVetAlbumPhoto,
  useListVetAlbumPhotos,
  useUploadVetAlbumPhoto,
} from '@/lib/api/generated/vet-album/vet-album';
import type { VetAlbumPhotoResponse } from '@/lib/api/generated/model';

import { MediaUploader } from './MediaUploader';

interface Props {
  vetId: number;
}

export function VetAlbumTab({ vetId }: Props) {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState<VetAlbumPhotoResponse | null>(null);
  const [deletePhotoOpen, setDeletePhotoOpen] = useState(false);

  const photoQuery = useGetVetPhoto(vetId, {
    query: {
      // BE trả 404 nếu chưa có avatar → đừng coi là lỗi noisy.
      retry: false,
    },
  });
  const albumQuery = useListVetAlbumPhotos(vetId, {
    pageable: { page, size: 12, sort: ['createdDate,desc'] },
  });

  function invalidatePhoto() {
    void qc.invalidateQueries({ queryKey: getGetVetPhotoQueryKey(vetId) });
  }
  function invalidateAlbum() {
    void qc.invalidateQueries({ queryKey: getListVetAlbumPhotosQueryKey(vetId) });
  }

  const uploadPhoto = useUploadVetPhoto({
    mutation: {
      onSuccess: () => {
        toast.success('Đã cập nhật ảnh đại diện');
        invalidatePhoto();
      },
      onError: (e: Error) => toast.error(e.message || 'Upload thất bại'),
    },
  });

  const deletePhoto = useDeleteVetPhoto({
    mutation: {
      onSuccess: () => {
        toast.success('Đã xóa ảnh đại diện');
        invalidatePhoto();
        setDeletePhotoOpen(false);
      },
      onError: (e: Error) => toast.error(e.message || 'Lỗi'),
    },
  });

  const uploadAlbum = useUploadVetAlbumPhoto({
    mutation: {
      onSuccess: () => {
        toast.success('Đã thêm ảnh vào album');
        invalidateAlbum();
      },
      onError: (e: Error) => toast.error(e.message || 'Upload thất bại'),
    },
  });

  const deleteAlbum = useDeleteVetAlbumPhoto({
    mutation: {
      onSuccess: () => {
        toast.success('Đã xóa ảnh');
        invalidateAlbum();
        setDeleting(null);
      },
      onError: (e: Error) => toast.error(e.message || 'Lỗi'),
    },
  });

  const photo = photoQuery.data;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Ảnh đại diện</h3>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex items-center justify-center sm:w-48">
            {photoQuery.isLoading ? (
              <Skeleton className="h-40 w-40 rounded-full" />
            ) : photo?.presignedUrl ? (
              <div className="relative">
                <img
                  src={photo.presignedUrl}
                  alt="avatar"
                  className="size-40 rounded-full object-cover"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute right-0 bottom-0"
                  onClick={() => setDeletePhotoOpen(true)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex size-40 items-center justify-center rounded-full bg-muted">
                <ImageIcon className="size-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <MediaUploader
            className="flex-1"
            label="Tải ảnh đại diện (PUT replace)"
            busy={uploadPhoto.isPending}
            onUpload={(file) => uploadPhoto.mutateAsync({ vetId, data: { file } })}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Album</h3>
        <MediaUploader
          label="Thêm ảnh vào album"
          busy={uploadAlbum.isPending}
          onUpload={(file) =>
            uploadAlbum.mutateAsync({ vetId, data: { file }, params: {} })
          }
        />

        {albumQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (albumQuery.data?.content ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Album trống
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {albumQuery.data?.content?.map((p) => (
              <Card key={p.id} className="group relative overflow-hidden">
                {p.presignedUrl && (
                  <img
                    src={p.presignedUrl}
                    alt={p.caption ?? ''}
                    className="aspect-square w-full object-cover"
                  />
                )}
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => setDeleting(p)}
                >
                  <Trash2 className="size-4" />
                </Button>
                {p.caption && (
                  <p className="p-2 text-xs text-muted-foreground">{p.caption}</p>
                )}
              </Card>
            ))}
          </div>
        )}

        {(albumQuery.data?.totalPages ?? 0) > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </Button>
            <span className="self-center text-sm">
              Trang {page + 1} / {albumQuery.data?.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= (albumQuery.data?.totalPages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        )}
      </section>

      <AlertDialog open={deletePhotoOpen} onOpenChange={setDeletePhotoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa ảnh đại diện</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletePhoto.mutate({ vetId })}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa ảnh</AlertDialogTitle>
            <AlertDialogDescription>
              Ảnh sẽ bị xóa khỏi album. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleting && deleteAlbum.mutate({ vetId, photoId: deleting.id ?? 0 })
              }
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
