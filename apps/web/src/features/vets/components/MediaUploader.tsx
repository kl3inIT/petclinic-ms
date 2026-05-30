import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

interface Props {
  onUpload: (file: File) => Promise<unknown>;
  busy?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

export function MediaUploader({ onUpload, busy, label, description, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  function handle(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Chỉ chấp nhận JPEG / PNG / WebP');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('File vượt quá 10MB');
      return;
    }
    setPreview(URL.createObjectURL(file));
    void onUpload(file).finally(() => {
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors',
        dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30',
        busy && 'pointer-events-none opacity-60',
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handle(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handle(file);
        }}
      />
      {preview ? (
        <div className="relative">
          <img src={preview} alt="preview" className="max-h-32 rounded" />
          <button
            type="button"
            className="absolute -top-2 -right-2 rounded-full bg-background p-1 shadow"
            onClick={() => setPreview(null)}
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <Upload className="size-6 text-muted-foreground" />
      )}
      <p className="font-medium">{label ?? 'Kéo thả ảnh hoặc bấm để chọn'}</p>
      <p className="text-xs text-muted-foreground">
        {description ?? 'JPEG / PNG / WebP, tối đa 10MB'}
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        Chọn ảnh
      </Button>
    </div>
  );
}
