import { useForm } from '@tanstack/react-form';
import { Loader2, CheckCircle2, XCircle, Save, Beaker, PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/lib/form/FieldError';
import { Skeleton } from '@/components/ui/skeleton';

import {
  useLlmConfigCurrent,
  useSaveLlmConfig,
  useTestCurrentLlmConfig,
  useValidateLlmConfig,
  type ValidateLlmConfigResponse,
} from '../api';
import { saveLlmConfigSchema } from '../schemas';

const MODEL_SUGGESTIONS = [
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-3.5-sonnet',
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'google/gemini-2.5-flash',
  'meta-llama/llama-3.3-70b-instruct',
];

export function LlmConfigForm() {
  const { data: current, isLoading } = useLlmConfigCurrent();
  const saveMutation = useSaveLlmConfig();
  const validateMutation = useValidateLlmConfig();
  const testMutation = useTestCurrentLlmConfig();

  const [validateResult, setValidateResult] = useState<ValidateLlmConfigResponse | null>(
    null,
  );
  const [testResult, setTestResult] = useState<ValidateLlmConfigResponse | null>(null);

  const form = useForm({
    defaultValues: {
      baseUrl: current?.baseUrl ?? 'https://openrouter.ai/api/v1',
      apiKey: '',
      chatModel: current?.chatModel ?? 'anthropic/claude-3.5-haiku',
    },
    validators: { onChange: saveLlmConfigSchema },
    onSubmit: ({ value }) =>
      saveMutation.mutate(value, {
        onSuccess: () => {
          toast.success('Đã lưu LLM config — ChatClient rebuild ngay.');
          form.setFieldValue('apiKey', ''); // wipe input sau save
        },
        onError: (err: Error) => toast.error(err.message || 'Lưu thất bại'),
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current state card */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Config hiện tại</h3>
          <span
            className={
              current?.source === 'DATABASE'
                ? 'rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/40 dark:text-green-300'
                : 'rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
            }
          >
            {current?.source ?? '—'}
          </span>
        </div>
        <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Base URL</dt>
          <dd className="col-span-2 font-mono">{current?.baseUrl}</dd>
          <dt className="text-muted-foreground">Model</dt>
          <dd className="col-span-2 font-mono">{current?.chatModel}</dd>
          <dt className="text-muted-foreground">API key</dt>
          <dd className="col-span-2 font-mono">{current?.apiKeyMasked}</dd>
          {current?.updatedAt && (
            <>
              <dt className="text-muted-foreground">Cập nhật</dt>
              <dd className="col-span-2">
                {new Date(current.updatedAt).toLocaleString('vi-VN')} bởi{' '}
                {current.updatedBy}
              </dd>
            </>
          )}
        </dl>
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setTestResult(null);
              testMutation.mutate(undefined, {
                onSuccess: (r) => setTestResult(r),
                onError: (err: Error) =>
                  setTestResult({ ok: false, message: err.message || 'Test thất bại' }),
              });
            }}
            disabled={testMutation.isPending}
          >
            {testMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PlayCircle className="size-4" />
            )}
            Test config đang chạy
          </Button>
          <ResultBadge result={testResult} />
        </div>
      </div>

      {/* Save form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field
          name="baseUrl"
          children={(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Base URL *</Label>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="https://openrouter.ai/api/v1"
              />
              <FieldError field={field} />
              <p className="text-xs text-muted-foreground">
                OpenAI-compatible endpoint. Vd: OpenRouter, OpenAI, vLLM, Ollama (compat
                layer).
              </p>
            </div>
          )}
        />

        <form.Field
          name="apiKey"
          children={(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>API key *</Label>
              <Input
                id={field.name}
                type="password"
                autoComplete="off"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="sk-or-v1-..."
              />
              <FieldError field={field} />
              <p className="text-xs text-muted-foreground">
                Key encrypt AES-GCM ở DB. Sau save, input sẽ wipe — KHÔNG hiển thị lại.
              </p>
            </div>
          )}
        />

        <form.Field
          name="chatModel"
          children={(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Chat model *</Label>
              <Input
                id={field.name}
                list="model-suggestions"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <datalist id="model-suggestions">
                {MODEL_SUGGESTIONS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <FieldError field={field} />
              <p className="text-xs text-muted-foreground">
                OpenRouter format: <code>provider/model</code>. Gợi ý ở dropdown.
              </p>
            </div>
          )}
        />

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={validateMutation.isPending || !form.state.canSubmit}
            onClick={() => {
              setValidateResult(null);
              const value = form.state.values;
              validateMutation.mutate(value, {
                onSuccess: (r) => setValidateResult(r),
                onError: (err: Error) =>
                  setValidateResult({
                    ok: false,
                    message: err.message || 'Validate thất bại',
                  }),
              });
            }}
          >
            {validateMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Beaker className="size-4" />
            )}
            Validate (chưa lưu)
          </Button>

          <Button
            type="submit"
            disabled={saveMutation.isPending || !form.state.canSubmit}
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Lưu + áp dụng ngay
          </Button>

          <ResultBadge result={validateResult} />
        </div>
      </form>
    </div>
  );
}

function ResultBadge({ result }: { result: ValidateLlmConfigResponse | null }) {
  if (!result) return null;
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded px-2 py-1 text-xs ' +
        (result.ok
          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300')
      }
    >
      {result.ok ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {result.message}
    </span>
  );
}
