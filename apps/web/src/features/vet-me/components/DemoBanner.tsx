import { Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { disableDemoMode, isDemoMode } from '@/features/vet-me/mock';

export function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50/80 p-3 text-sm text-violet-700">
      <Sparkles className="size-4 shrink-0 text-violet-600" />
      <div className="flex-1">
        <span className="font-semibold text-violet-900">Chế độ demo</span>
        <span className="ml-2">
          Đang xem dữ liệu mẫu, thay đổi sẽ không lưu vào hệ thống.
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-violet-700 hover:bg-violet-100"
        onClick={() => disableDemoMode()}
      >
        <X className="size-3.5" />
        Thoát demo
      </Button>
    </div>
  );
}
