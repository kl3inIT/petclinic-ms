import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Exported avatar resolution (square, displayed as a circle). */
const OUTPUT = 512;
const MAX_ZOOM = 3;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export type AvatarCropHandle = {
  /** Render the current circular crop to a square File, ready for upload. */
  getCroppedFile: () => Promise<File>;
};

type AvatarCropFieldProps = {
  /** Original picked file. Cropping never mutates this — it stays the source. */
  file: File;
  className?: string;
};

/**
 * Inline circular crop editor — lives directly inside the profile form (no
 * dialog). Drag to pan, slider / wheel to zoom; nothing is produced until the
 * parent calls {@link AvatarCropHandle.getCroppedFile} on save, which renders
 * the visible circle to an offscreen canvas at {@link OUTPUT}px.
 *
 * Pointer math + canvas only — no external crop library.
 */
export const AvatarCropField = forwardRef<AvatarCropHandle, AvatarCropFieldProps>(
  function AvatarCropField({ file, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const natural = useRef({ w: 0, h: 0 });
    /** "cover" scale at zoom = 1, i.e. the image just fills the square viewport. */
    const baseScale = useRef(1);
    const dragging = useRef<{ x: number; y: number } | null>(null);

    const [src, setSrc] = useState<string | null>(null);
    const [size, setSize] = useState(0); // measured viewport edge (square, responsive)
    const [ready, setReady] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 }); // image top-left vs viewport

    const effScale = baseScale.current * zoom;

    /* ── object URL lifecycle (one per picked file) ── */
    useEffect(() => {
      const url = URL.createObjectURL(file);
      setSrc(url);
      setReady(false);
      return () => URL.revokeObjectURL(url);
    }, [file]);

    /* ── measure the (responsive) square viewport ── */
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (rect) setSize(Math.round(rect.width));
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    function clamp(x: number, y: number, scale: number) {
      const w = natural.current.w * scale;
      const h = natural.current.h * scale;
      return {
        x: Math.min(0, Math.max(size - w, x)),
        y: Math.min(0, Math.max(size - h, y)),
      };
    }

    /** Centre the image and reset zoom — runs on load and on resize. */
    function layout() {
      if (size === 0 || !natural.current.w) return;
      const base = Math.max(size / natural.current.w, size / natural.current.h);
      baseScale.current = base;
      const w = natural.current.w * base;
      const h = natural.current.h * base;
      setZoom(1);
      setOffset(clamp((size - w) / 2, (size - h) / 2, base));
      setReady(true);
    }

    function handleLoaded(el: HTMLImageElement) {
      natural.current = { w: el.naturalWidth, h: el.naturalHeight };
      layout();
    }

    /* Cached images may not fire onLoad — check completeness on src/size change. */
    useEffect(() => {
      const el = imgRef.current;
      if (el?.complete && el.naturalWidth) handleLoaded(el);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src, size]);

    function applyZoom(nextZoom: number) {
      const z = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
      const oldScale = baseScale.current * zoom;
      const newScale = baseScale.current * z;
      // keep the viewport centre anchored to the same image point
      const cx = (size / 2 - offset.x) / oldScale;
      const cy = (size / 2 - offset.y) / oldScale;
      setZoom(z);
      setOffset(clamp(size / 2 - cx * newScale, size / 2 - cy * newScale, newScale));
    }

    /* ── pointer drag (mouse + touch via Pointer Events) ── */
    function onPointerDown(e: React.PointerEvent) {
      if (!ready) return;
      (e.target as Element).setPointerCapture(e.pointerId);
      dragging.current = { x: e.clientX, y: e.clientY };
    }
    function onPointerMove(e: React.PointerEvent) {
      if (!dragging.current) return;
      const dx = e.clientX - dragging.current.x;
      const dy = e.clientY - dragging.current.y;
      dragging.current = { x: e.clientX, y: e.clientY };
      setOffset((o) => clamp(o.x + dx, o.y + dy, effScale));
    }
    function endDrag(e: React.PointerEvent) {
      dragging.current = null;
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
    }
    function onWheel(e: React.WheelEvent) {
      if (!ready) return;
      applyZoom(zoom - e.deltaY * 0.0015);
    }

    /* ── expose the crop result to the parent form (called on save) ── */
    useImperativeHandle(ref, () => ({
      getCroppedFile: async () => {
        const el = imgRef.current;
        if (!el || !natural.current.w) throw new Error('Ảnh đang tải, vui lòng thử lại');

        const scale = baseScale.current * zoom;
        const sSize = size / scale; // source square mapped from the viewport
        const sx = -offset.x / scale;
        const sy = -offset.y / scale;

        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT;
        canvas.height = OUTPUT;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas không khả dụng');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(el, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);

        const type = ACCEPTED.includes(file.type) ? file.type : 'image/jpeg';
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Không tạo được ảnh'))),
            type,
            0.92,
          ),
        );

        const ext = (type.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
        const baseName = file.name.replace(/\.[^./]+$/, '') || 'avatar';
        return new File([blob], `${baseName}-avatar.${ext}`, { type });
      },
    }));

    return (
      <div
        className={cn('flex w-full max-w-[180px] flex-col items-center gap-3', className)}
      >
        {/* Crop viewport */}
        <div
          ref={containerRef}
          className="relative aspect-square w-full touch-none overflow-hidden rounded-2xl bg-slate-900 select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={onWheel}
        >
          {src && (
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => handleLoaded(e.currentTarget)}
              className={cn(
                'absolute top-0 left-0 max-w-none will-change-transform',
                ready ? 'cursor-grab active:cursor-grabbing' : 'opacity-0',
              )}
              style={{
                width: natural.current.w * effScale,
                height: natural.current.h * effScale,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          )}

          {/* Circular mask: a full-size rounded box whose huge outer shadow
              darkens the corners outside the inscribed circle. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/90"
            style={{ boxShadow: '0 0 0 9999px rgba(15,23,42,0.55)' }}
          />
        </div>

        {/* Zoom control */}
        <div className="flex w-full items-center gap-2">
          <button
            type="button"
            aria-label="Thu nhỏ"
            onClick={() => applyZoom(zoom - 0.2)}
            disabled={!ready}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-primary transition hover:bg-accent disabled:opacity-40"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!ready}
            onChange={(e) => applyZoom(Number(e.target.value))}
            aria-label="Mức phóng to"
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-primary/15 accent-primary disabled:opacity-40"
          />
          <button
            type="button"
            aria-label="Phóng to"
            onClick={() => applyZoom(zoom + 0.2)}
            disabled={!ready}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-primary transition hover:bg-accent disabled:opacity-40"
          >
            <ZoomIn className="size-3.5" />
          </button>
        </div>
      </div>
    );
  },
);
