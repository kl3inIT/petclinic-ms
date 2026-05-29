import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  ZeebePropertiesProviderModule,
} from 'bpmn-js-properties-panel';
import zeebeModdle from 'zeebe-bpmn-moddle/resources/zeebe.json';
import ZeebeBehaviorsModule from 'camunda-bpmn-js-behaviors/lib/camunda-cloud';
import { Download, FolderOpen, Plus, Rocket, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  deployWorkflowDefinition,
  getWorkflowDefinitionXml,
  listWorkflowServiceTasks,
  type ServiceTaskCatalogItem,
} from '@/features/workflows/api';
import { BpmnVietnameseModule } from '@/features/workflows/bpmnVietnamese';

type Modeling = {
  updateProperties: (element: unknown, properties: Record<string, unknown>) => void;
};

type Canvas = {
  getRootElement: () => {
    id: string;
    businessObject?: {
      id?: string;
      name?: string;
    };
  };
  resized?: () => void;
  zoom: (mode: string) => void;
};

type Selection = {
  get: () => Array<{
    id: string;
    type: string;
    businessObject?: { name?: string };
  }>;
};

type DiagramModeler = BpmnModeler & {
  createDiagram: () => Promise<void>;
};

interface WorkflowDesignerProps {
  initialProcessKey?: string;
  processKey?: string;
  onProcessKeyChange?: (processKey: string) => void;
  onDeployed?: () => void;
  chrome?: 'default' | 'flowset';
  active?: boolean;
}

export function WorkflowDesigner({
  initialProcessKey = '',
  processKey: controlledProcessKey,
  onProcessKeyChange,
  onDeployed,
  chrome = 'default',
  active = true,
}: WorkflowDesignerProps) {
  const initialKey = controlledProcessKey || initialProcessKey;
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const propertiesRef = useRef<HTMLDivElement | null>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [processKey, setProcessKey] = useState(initialKey);
  // null = new blank canvas not yet loaded from backend
  const [loadedKey, setLoadedKey] = useState<string | null>(initialKey || null);
  const [selected, setSelected] = useState<{
    id: string;
    type: string;
    name?: string;
  } | null>(null);
  const [isImported, setIsImported] = useState(false);
  // Track the previous external key so we only sync when parent explicitly changes it
  const prevControlledKeyRef = useRef<string | undefined>(undefined);

  const catalogQuery = useQuery({
    queryKey: ['workflow-designer', 'service-tasks'],
    queryFn: listWorkflowServiceTasks,
  });

  const definitionQuery = useQuery({
    queryKey: ['workflow-designer', 'definition', loadedKey],
    queryFn: () => getWorkflowDefinitionXml(loadedKey!),
    enabled: !!loadedKey,
  });

  const deployMutation = useMutation({
    mutationFn: async () => {
      const modeler = modelerRef.current;
      if (!modeler) throw new Error('Bộ vẽ BPMN chưa sẵn sàng');
      const name = processKey.trim();
      if (!name) throw new Error('Nhập mã quy trình trước khi deploy');
      applyProcessKey(modeler, name);
      const { xml } = await modeler.saveXML({ format: true });
      return deployWorkflowDefinition(`${name}.bpmn`, xml);
    },
    onSuccess: (result) => {
      toast.success(`Đã triển khai ${result.name}`);
      setLoadedKey(processKey.trim());
      onDeployed?.();
    },
    onError: (err: Error) => toast.error(err.message || 'Triển khai thất bại'),
  });

  const modules = useMemo(
    () => [
      BpmnPropertiesPanelModule,
      BpmnPropertiesProviderModule,
      ZeebePropertiesProviderModule,
      ZeebeBehaviorsModule,
      BpmnVietnameseModule,
    ],
    [],
  );

  const normalizeProcessId = (value: string) => {
    const normalized = value.trim().replace(/[^A-Za-z0-9_.-]/g, '_');
    return /^[A-Za-z_]/.test(normalized) ? normalized : `Process_${normalized}`;
  };

  const applyProcessKey = (modeler: BpmnModeler, value: string) => {
    const canvas = modeler.get<Canvas>('canvas');
    const rootElement = canvas.getRootElement();
    const modeling = modeler.get<Modeling>('modeling');
    const processId = normalizeProcessId(value);

    modeling.updateProperties(rootElement, {
      id: processId,
      name: value,
    });
  };

  // Sync only when the parent explicitly changes controlledProcessKey (e.g. "Open in Modeler")
  // Do NOT depend on loadedKey — that would re-load the old key after every deploy.
  useEffect(() => {
    if (controlledProcessKey === prevControlledKeyRef.current) return;
    prevControlledKeyRef.current = controlledProcessKey;
    if (!controlledProcessKey) return;
    setProcessKey(controlledProcessKey);
    setLoadedKey(controlledProcessKey);
  }, [controlledProcessKey]);

  // Mount modeler; if no initial key start with a blank canvas immediately
  useEffect(() => {
    if (!canvasRef.current || !propertiesRef.current) return;

    const modeler = new BpmnModeler({
      container: canvasRef.current,
      propertiesPanel: {
        parent: propertiesRef.current,
      },
      additionalModules: modules,
      moddleExtensions: {
        zeebe: zeebeModdle,
      },
    });
    modelerRef.current = modeler;

    const eventBus = modeler.get<{ on: (event: string, cb: () => void) => void }>(
      'eventBus',
    );
    eventBus.on('selection.changed', () => {
      const selection = modeler.get<Selection>('selection');
      const [element] = selection.get();
      setSelected(
        element
          ? { id: element.id, type: element.type, name: element.businessObject?.name }
          : null,
      );
    });

    let cancelled = false;

    if (!initialKey) {
      (modeler as DiagramModeler)
        .createDiagram()
        .then(() => {
          if (cancelled) return;
          const canvas = modeler.get<{ zoom: (mode: string) => void }>('canvas');
          canvas.zoom('fit-viewport');
          setIsImported(true);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      modeler.destroy();
      modelerRef.current = null;
    };
  }, [initialKey, modules]);

  // Load XML into canvas whenever the backend returns a definition
  useEffect(() => {
    const xml = definitionQuery.data?.bpmnXml;
    const modeler = modelerRef.current;
    if (!xml || !modeler) return;

    setIsImported(false);
    modeler
      .importXML(xml)
      .then(() => {
        const canvas = modeler.get<{ zoom: (mode: string) => void }>('canvas');
        canvas.zoom('fit-viewport');
        setIsImported(true);
      })
      .catch((err: Error) => {
        toast.error(err.message || 'Không thể tải BPMN');
      });
  }, [definitionQuery.data?.bpmnXml]);

  useEffect(() => {
    if (!active || !isImported) return;
    const modeler = modelerRef.current;
    if (!modeler) return;

    const frame = window.requestAnimationFrame(() => {
      const canvas = modeler.get<Canvas>('canvas');
      canvas.resized?.();
      canvas.zoom('fit-viewport');
    });

    return () => window.cancelAnimationFrame(frame);
  }, [active, isImported]);

  const loadDefinition = () => {
    const trimmed = processKey.trim();
    if (!trimmed) {
      toast.error('Nhập mã quy trình để tải');
      return;
    }
    setLoadedKey(trimmed);
    onProcessKeyChange?.(trimmed);
  };

  const handleNew = () => {
    setProcessKey('');
    setLoadedKey(null);
    setIsImported(false);
    setSelected(null);
    const modeler = modelerRef.current;
    if (!modeler) return;
    (modeler as DiagramModeler)
      .createDiagram()
      .then(() => {
        const canvas = modeler.get<{ zoom: (mode: string) => void }>('canvas');
        canvas.zoom('fit-viewport');
        setIsImported(true);
      })
      .catch((err: Error) => toast.error(err.message));
  };

  const applyServiceTask = (item: ServiceTaskCatalogItem) => {
    const modeler = modelerRef.current;
    if (!modeler || !selected) return;
    if (selected.type !== 'bpmn:ServiceTask') {
      toast.error('Chọn một service task BPMN trước');
      return;
    }
    const selection = modeler.get<Selection>('selection');
    const [element] = selection.get();
    const modeling = modeler.get<Modeling>('modeling');
    modeling.updateProperties(element, { name: item.name });
    toast.success(`Đã áp dụng ${item.name}`);
  };

  const downloadXml = async () => {
    const modeler = modelerRef.current;
    if (!modeler) return;
    const { xml } = await modeler.saveXML({ format: true });
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${processKey.trim() || 'diagram'}.bpmn`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bpmn,.xml';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const xml = await file.text();
      const modeler = modelerRef.current;
      if (!modeler) return;
      modeler
        .importXML(xml)
        .then(() => {
          const canvas = modeler.get<{ zoom: (mode: string) => void }>('canvas');
          canvas.zoom('fit-viewport');
          setIsImported(true);
          const name = file.name.replace(/\.bpmn$|\.xml$/i, '');
          setProcessKey((prev) => prev || name);
          setLoadedKey(null);
          toast.success(`Đã import ${file.name}`);
        })
        .catch((err: Error) => toast.error(err.message || 'Không thể import BPMN'));
    };
    input.click();
  };

  const canDeploy = isImported && !deployMutation.isPending && !!processKey.trim();

  if (chrome === 'flowset') {
    return (
      <div className="workflow-designer flex h-full min-h-[720px] flex-col overflow-hidden bg-white">
        {/* Toolbar */}
        <div className="flex min-h-[64px] items-center gap-2 border-b bg-white px-5">
          <Input
            value={processKey}
            onChange={(e) => {
              const nextKey = e.target.value;
              setProcessKey(nextKey);
              const modeler = modelerRef.current;
              if (modeler && isImported && nextKey.trim()) {
                applyProcessKey(modeler, nextKey);
              }
            }}
            onKeyDown={(e) => e.key === 'Enter' && loadDefinition()}
            placeholder="Mã quy trình - vd: VisitApproval"
            className="h-9 w-72 rounded-md border-slate-300 font-mono text-sm shadow-none"
            aria-label="Mã quy trình"
          />
          <Button
            variant="outline"
            className="h-9 rounded-md"
            onClick={loadDefinition}
            disabled={!processKey.trim() || definitionQuery.isFetching}
            title="Tải hoặc tạo quy trình với mã này"
          >
            <FolderOpen className="size-4" />
            {definitionQuery.isFetching ? 'Đang tải…' : 'Tải'}
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-md"
            onClick={handleNew}
            title="Tạo sơ đồ trống mới"
          >
            <Plus className="size-4" />
            Mới
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-md"
            onClick={handleImportFile}
            title="Nhập file .bpmn từ máy"
          >
            <Upload className="size-4" />
            Nhập file
          </Button>

          <div className="ml-auto flex items-center gap-2">
            {definitionQuery.data && (
              <Badge variant={definitionQuery.data.deployed ? 'default' : 'secondary'}>
                {definitionQuery.data.deployed ? 'Đã triển khai' : 'Mới'}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={downloadXml}
              disabled={!isImported}
            >
              <Download className="size-4" />
              Xuất file
            </Button>
            <Button
              className="h-9 px-4"
              onClick={() => deployMutation.mutate()}
              disabled={!canDeploy}
              title={!processKey.trim() ? 'Nhập mã quy trình trước' : undefined}
            >
              <Rocket className="size-4" />
              {deployMutation.isPending ? 'Đang triển khai…' : 'Triển khai'}
            </Button>
          </div>
        </div>

        {/* Service tasks bar */}
        <div className="flex min-h-10 items-center gap-2 border-b bg-muted/40 px-5 py-1.5">
          <span className="shrink-0 text-xs font-medium text-slate-500">
            Tác vụ dịch vụ
          </span>
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
            {(catalogQuery.data ?? []).map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                size="sm"
                title={item.description}
                onClick={() => applyServiceTask(item)}
                disabled={selected?.type !== 'bpmn:ServiceTask'}
                className="shrink-0 text-xs"
              >
                {item.name}
                <Badge variant="secondary" className="ml-1 font-mono text-[10px]">
                  {item.taskType}
                </Badge>
              </Button>
            ))}
            {catalogQuery.isLoading && (
              <span className="self-center text-xs text-muted-foreground">Đang tải…</span>
            )}
          </div>
          {selected && (
            <span className="shrink-0 truncate text-xs text-muted-foreground">
              {selected.type} · {selected.name || selected.id}
            </span>
          )}
        </div>

        {/* Canvas + Properties */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_400px]">
          <div ref={canvasRef} className="min-w-0 bg-white" />
          <aside ref={propertiesRef} className="overflow-auto border-l bg-[#f0f2f4]" />
        </div>
      </div>
    );
  }

  return (
    <div className="workflow-designer h-full min-h-[720px] overflow-hidden rounded-md border bg-background">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Input
            value={processKey}
            onChange={(e) => setProcessKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadDefinition()}
            className="h-9 w-72"
            placeholder="Mã quy trình"
            aria-label="Mã quy trình"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={loadDefinition}
            disabled={!processKey.trim()}
          >
            <FolderOpen className="size-4" />
            Tải
          </Button>
          <Button variant="outline" size="sm" onClick={handleNew}>
            <Plus className="size-4" />
            Mới
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportFile}
            title="Nhập file .bpmn"
          >
            <Upload className="size-4" />
            Nhập file
          </Button>
          {definitionQuery.data && (
            <Badge variant={definitionQuery.data.deployed ? 'default' : 'secondary'}>
              {definitionQuery.data.deployed ? 'Đã triển khai' : 'Mới'}
            </Badge>
          )}
          {selected && (
            <span className="truncate text-sm text-muted-foreground">
              {selected.type} · {selected.name || selected.id}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadXml}
            disabled={!isImported}
          >
            <Download className="size-4" />
            Xuất file
          </Button>
          <Button size="sm" onClick={() => deployMutation.mutate()} disabled={!canDeploy}>
            <Rocket className="size-4" />
            {deployMutation.isPending ? 'Đang triển khai…' : 'Triển khai'}
          </Button>
        </div>
      </div>

      <div className="flex min-h-12 items-center gap-2 border-b bg-muted/25 px-4 py-2">
        <div className="flex shrink-0 items-center gap-2 text-sm font-medium">
          Tác vụ dịch vụ
        </div>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {(catalogQuery.data ?? []).map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="outline"
              size="sm"
              title={item.description}
              onClick={() => applyServiceTask(item)}
              disabled={selected?.type !== 'bpmn:ServiceTask'}
              className="shrink-0"
            >
              {item.name}
              <Badge variant="secondary" className="ml-1 font-mono text-[10px]">
                {item.taskType}
              </Badge>
            </Button>
          ))}
          {catalogQuery.isLoading && (
            <span className="self-center text-sm text-muted-foreground">Đang tải…</span>
          )}
        </div>
      </div>

      <div className="grid h-[calc(100%-6.5rem)] grid-cols-[minmax(0,1fr)_340px]">
        <div ref={canvasRef} className="min-w-0 bg-white" />
        <aside ref={propertiesRef} className="overflow-auto border-l bg-background" />
      </div>
    </div>
  );
}
