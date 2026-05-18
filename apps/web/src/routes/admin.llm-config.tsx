import { createFileRoute, redirect } from '@tanstack/react-router';
import { LlmConfigForm } from '@/features/ai/components/LlmConfigForm';
import { useAuthStore } from '@/features/auth/store';

export const Route = createFileRoute('/admin/llm-config')({
  beforeLoad: () => {
    // Admin-only — gateway sẽ 403 nếu không có ADMIN role, nhưng guard sớm ở FE để UX tốt.
    const user = useAuthStore.getState().user;
    if (!user?.roles.includes('ADMIN')) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/admin' });
    }
  },
  component: LlmConfigPage,
});

function LlmConfigPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Provider Config</h1>
        <p className="text-sm text-muted-foreground">
          Cấu hình LLM provider (OpenRouter / OpenAI / bất kỳ OpenAI-compatible endpoint).
          API key được encrypt AES-GCM ở DB; thay đổi áp dụng ngay không cần restart.
        </p>
      </div>
      <LlmConfigForm />
    </div>
  );
}
