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

type Modeling = {
  updateProperties: (element: unknown, properties: Record<string, unknown>) => void;
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
}

export function WorkflowDesigner({
  initialProcessKey = '',
  processKey: controlledProcessKey,
  onProcessKeyChange,
  onDeployed,
  chrome = 'default',
}: WorkflowDesignerProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const propertiesRef = useRef<HTMLDivElement | null>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [processKey, setProcessKey] = useState(initialProcessKey);
  // null = new blank canvas not yet loaded from backend
  const [loadedKey, setLoadedKey] = useState<string | null>(initialProcessKey || null);
  const [selected, setSelected] = useState<{ id: string; type: string; name?: string } | null>(null);
  const [isImported, setIsImported] = useState(false);

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
      if (!modeler) throw new Error('Modeler is not ready');
      const name = processKey.trim();
      if (!name) throw new Error('Enter a process name before deploying');
      const { xml } = await modeler.saveXML({ format: true });
      return deployWorkflowDefinition(`${name}.bpmn`, xml);
    },
    onSuccess: (result) => {
      toast.success(`Deployed ${result.name}`);
      setLoadedKey(processKey.trim());
      onDeployed?.();
    },
    onError: (err: Error) => toast.error(err.message || 'Deploy failed'),
  });

  const modules = useMemo(
    () => [
      BpmnPropertiesPanelModule,
      BpmnPropertiesProviderModule,
      ZeebePropertiesProviderModule,
      ZeebeBehaviorsModule,
    ],
    [],
  );

  // Sync when parent passes a controlled processKey (e.g. opened from Processes tab)
  useEffect(() => {
    if (!controlledProcessKey || controlledProcessKey === loadedKey) return;
    setProcessKey(controlledProcessKey);
    setLoadedKey(controlledProcessKey);
  }, [controlledProcessKey, loadedKey]);

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

    const eventBus = modeler.get<{ on: (event: string, cb: () => void) => void }>('eventBus');
    eventBus.on('selection.changed', () => {
      const selection = modeler.get<Selection>('selection');
      const [element] = selection.get();
      setSelected(
        element
          ? { id: element.id, type: element.type, name: element.businessObject?.name }
          : null,
      );
    });

    if (!initialProcessKey) {
      (modeler as DiagramModeler)
        .createDiagram()
        .then(() => {
          const canvas = modeler.get<{ zoom: (mode: string) => void }>('canvas');
          canvas.zoom('fit-viewport');
          setIsImported(true);
        })
        .catch(() => {});
    }

    return () => {
      modeler.destroy();
      modelerRef.current = null;
    };
  }, [modules]);

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
        toast.error(err.message || 'Could not load BPMN');
      });
  }, [definitionQuery.data?.bpmnXml]);

  const loadDefinition = () => {
    const trimmed = processKey.trim();
    if (!trimmed) {
      toast.error('Enter a process name to load');
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
      toast.error('Select a BPMN service task first');
      return;
    }
    const selection = modeler.get<Selection>('selection');
    const [element] = selection.get();
    const modeling = modeler.get<Modeling>('modeling');
    modeling.updateProperties(element, { name: item.name });
    toast.success(`Applied ${item.name}`);
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
          toast.success(`Imported ${file.name}`);
        })
        .catch((err: Error) => toast.error(err.message || 'Could not import BPMN'));
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
            onChange={(e) => setProcessKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadDefinition()}
            placeholder="Process key — e.g. VisitApproval"
            className="h-9 w-72 rounded-[3px] border-slate-300 font-mono text-sm shadow-none"
            aria-label="Process key"
          />
          <Button
            variant="outline"
            className="h-9 rounded-[3px]"
            onClick={loadDefinition}
            disabled={!processKey.trim() || definitionQuery.isFetching}
            title="Load or create the process with this key"
          >
            <FolderOpen className="size-4" />
            {definitionQuery.isFetching ? 'Loading…' : 'Load'}
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-[3px]"
            onClick={handleNew}
            title="Start a new blank diagram"
          >
            <Plus className="size-4" />
            New
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-[3px]"
            onClick={handleImportFile}
            title="Import a .bpmn file from your computer"
          >
            <Upload className="size-4" />
            Import
          </Button>

          <div className="ml-auto flex items-center gap-2">
            {definitionQuery.data && (
              <Badge variant={definitionQuery.data.deployed ? 'default' : 'secondary'}>
                {definitionQuery.data.deployed ? 'Deployed' : 'New'}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={downloadXml}
              disabled={!isImported}
            >
              <Download className="size-4" />
              Export
            </Button>
            <Button
              className="h-9 rounded-[3px] bg-[#0f5b6b] px-4 hover:bg-[#0d4d5b]"
              onClick={() => deployMutation.mutate()}
              disabled={!canDeploy}
              title={!processKey.trim() ? 'Enter a process name first' : undefined}
            >
              <Rocket className="size-4" />
              {deployMutation.isPending ? 'Deploying…' : 'Deploy'}
            </Button>
          </div>
        </div>

        {/* Service tasks bar */}
        <div className="flex min-h-10 items-center gap-2 border-b bg-slate-50 px-5 py-1.5">
          <span className="shrink-0 text-xs font-medium text-slate-500">Service tasks</span>
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
              <span className="self-center text-xs text-muted-foreground">Loading…</span>
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
            placeholder="Process key"
            aria-label="Process key"
          />
          <Button variant="secondary" size="sm" onClick={loadDefinition} disabled={!processKey.trim()}>
            <FolderOpen className="size-4" />
            Load
          </Button>
          <Button variant="outline" size="sm" onClick={handleNew}>
            <Plus className="size-4" />
            New
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportFile} title="Import a .bpmn file">
            <Upload className="size-4" />
            Import
          </Button>
          {definitionQuery.data && (
            <Badge variant={definitionQuery.data.deployed ? 'default' : 'secondary'}>
              {definitionQuery.data.deployed ? 'Deployed' : 'New'}
            </Badge>
          )}
          {selected && (
            <span className="truncate text-sm text-muted-foreground">
              {selected.type} · {selected.name || selected.id}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadXml} disabled={!isImported}>
            <Download className="size-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => deployMutation.mutate()} disabled={!canDeploy}>
            <Rocket className="size-4" />
            {deployMutation.isPending ? 'Deploying…' : 'Deploy'}
          </Button>
        </div>
      </div>

      <div className="flex min-h-12 items-center gap-2 border-b bg-muted/25 px-4 py-2">
        <div className="flex shrink-0 items-center gap-2 text-sm font-medium">
          Service tasks
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
            <span className="self-center text-sm text-muted-foreground">Loading…</span>
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
