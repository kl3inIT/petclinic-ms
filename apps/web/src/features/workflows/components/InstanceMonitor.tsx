import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import zeebeModdle from 'zeebe-bpmn-moddle/resources/zeebe.json';
import {
  Activity,
  AlertTriangle,
  Braces,
  CircleDot,
  ClipboardList,
  Clock3,
  FileText,
  Info,
  ListTree,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Workflow,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  getWorkflowInstance,
  getWorkflowInstanceDiagramXml,
  listUserTasks,
  type FlowNodeRecord,
  type UserTask,
  type WorkflowInstance,
} from '@/features/workflows/api';

interface InstanceMonitorProps {
  instanceKey: string;
  open: boolean;
  onClose: () => void;
}

type CanvasApi = {
  zoom: (mode: string) => void;
  resized: () => void;
  addMarker: (elementId: string, marker: string) => void;
  removeMarker: (elementId: string, marker: string) => void;
};

type EventBusApi = {
  on: (event: string, cb: (event: { element?: { id: string; type: string } }) => void) => void;
  off: (event: string, cb: (event: { element?: { id: string; type: string } }) => void) => void;
};

type BpmnWaypoint = {
  x: number;
  y: number;
};

type BpmnShape = {
  id: string;
  elementId: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type BpmnEdge = {
  id: string;
  elementId: string;
  waypoints: BpmnWaypoint[];
};

type ParsedBpmnDiagram = {
  shapes: BpmnShape[];
  edges: BpmnEdge[];
  viewBox: string;
};

const STATE_CLASS: Record<string, string> = {
  ACTIVE: 'border-sky-300 bg-sky-50 text-sky-700',
  PENDING: 'border-slate-300 bg-slate-50 text-slate-600',
  COMPLETED: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  CANCELED: 'border-red-300 bg-red-50 text-red-700',
  TERMINATED: 'border-red-300 bg-red-50 text-red-700',
  INCIDENT: 'border-red-300 bg-red-50 text-red-700',
};

const NODE_STATE_CLASS: Record<string, string> = {
  ACTIVE: 'border-sky-300 bg-sky-50 text-sky-700',
  COMPLETED: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  TERMINATED: 'border-red-300 bg-red-50 text-red-700',
  INCIDENT: 'border-red-300 bg-red-50 text-red-700',
};

function isTerminal(state?: string) {
  return state === 'COMPLETED' || state === 'CANCELED' || state === 'TERMINATED';
}

function formatDate(iso?: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function localName(node: Element) {
  return node.localName || node.nodeName.split(':').pop() || node.nodeName;
}

function getAttr(element: Element, name: string) {
  return element.getAttribute(name) ?? element.getAttribute(`bpmn:${name}`) ?? '';
}

function numberAttr(element: Element, name: string) {
  return Number.parseFloat(getAttr(element, name) || '0');
}

function descendantsByLocalName(parent: Element | Document, name: string) {
  return Array.from(parent.getElementsByTagName('*')).filter(
    (node) => name === '*' || localName(node) === name,
  );
}

function parseBpmnDiagram(xml?: string): ParsedBpmnDiagram | null {
  if (!xml) return null;

  const document = new DOMParser().parseFromString(xml, 'text/xml');
  if (document.getElementsByTagName('parsererror').length > 0) return null;

  const elementMeta = new Map<string, { type: string; name: string }>();
  descendantsByLocalName(document, '*').forEach((element) => {
    const id = getAttr(element, 'id');
    const name = getAttr(element, 'name');
    const type = `bpmn:${localName(element)}`;
    if (id && !['BPMNShape', 'BPMNEdge', 'Bounds', 'waypoint'].includes(localName(element))) {
      elementMeta.set(id, { type, name });
    }
  });

  const shapes = descendantsByLocalName(document, 'BPMNShape')
    .map((shapeElement) => {
      const bounds = descendantsByLocalName(shapeElement, 'Bounds')[0];
      const elementId = getAttr(shapeElement, 'bpmnElement');
      if (!bounds || !elementId) return null;

      const meta = elementMeta.get(elementId);
      return {
        id: getAttr(shapeElement, 'id') || `${elementId}_di`,
        elementId,
        type: meta?.type ?? 'bpmn:Task',
        name: meta?.name || elementId,
        x: numberAttr(bounds, 'x'),
        y: numberAttr(bounds, 'y'),
        width: numberAttr(bounds, 'width'),
        height: numberAttr(bounds, 'height'),
      };
    })
    .filter((shape): shape is BpmnShape => Boolean(shape));

  const edges = descendantsByLocalName(document, 'BPMNEdge')
    .map((edgeElement) => {
      const waypoints = descendantsByLocalName(edgeElement, 'waypoint').map((point) => ({
        x: numberAttr(point, 'x'),
        y: numberAttr(point, 'y'),
      }));
      if (waypoints.length < 2) return null;
      return {
        id: getAttr(edgeElement, 'id') || `${getAttr(edgeElement, 'bpmnElement')}_di`,
        elementId: getAttr(edgeElement, 'bpmnElement'),
        waypoints,
      };
    })
    .filter((edge): edge is BpmnEdge => Boolean(edge));

  if (shapes.length === 0) return null;

  const allX = [
    ...shapes.flatMap((shape) => [shape.x, shape.x + shape.width]),
    ...edges.flatMap((edge) => edge.waypoints.map((point) => point.x)),
  ];
  const allY = [
    ...shapes.flatMap((shape) => [shape.y, shape.y + shape.height]),
    ...edges.flatMap((edge) => edge.waypoints.map((point) => point.y)),
  ];
  const padding = 35;
  const minX = Math.min(...allX) - padding;
  const minY = Math.min(...allY) - padding;
  const maxX = Math.max(...allX) + padding;
  const maxY = Math.max(...allY) + padding;

  return {
    shapes,
    edges,
    viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
  };
}

function nodeForShape(shape: BpmnShape, flowNodes: FlowNodeRecord[]) {
  return flowNodes.find((node) => node.elementId === shape.elementId);
}

function shapeStroke(shape: BpmnShape, flowNodes: FlowNodeRecord[], selectedElementId: string | null) {
  if (shape.elementId === selectedElementId) return '#f59e0b';
  const node = nodeForShape(shape, flowNodes);
  if (node?.state === 'ACTIVE') return '#0284c7';
  if (node?.state === 'COMPLETED') return '#059669';
  if (node?.state === 'INCIDENT' || node?.state === 'TERMINATED') return '#dc2626';
  return '#1f2937';
}

function shapeFill(shape: BpmnShape, flowNodes: FlowNodeRecord[]) {
  const node = nodeForShape(shape, flowNodes);
  if (node?.state === 'ACTIVE') return '#e0f2fe';
  if (node?.state === 'COMPLETED') return '#dcfce7';
  if (node?.state === 'INCIDENT' || node?.state === 'TERMINATED') return '#fee2e2';
  return '#ffffff';
}

function shortLabel(label: string, max = 26) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function BpmnTaskMarker({ shape }: { shape: BpmnShape }) {
  const type = shape.type.toLowerCase();
  if (!type.includes('task')) return null;
  const iconFill = shapeFill(shape, []);
  const iconStroke = '#1f2937';

  return (
    <g transform={`translate(${shape.x} ${shape.y})`} className="pointer-events-none">
      {type.includes('servicetask') && (
        <g>
          <circle cx="11" cy="11" r="5" fill={iconFill} stroke="none" />
          <path
            d="m 12,18 v -1.71335 c 0.352326,-0.0705 0.703932,-0.17838 1.047628,-0.32133 0.344416,-0.14465 0.665822,-0.32133 0.966377,-0.52145 l 1.19431,1.18005 1.567487,-1.57688 -1.195028,-1.18014 c 0.403376,-0.61394 0.683079,-1.29908 0.825447,-2.01824 l 1.622133,-0.01 v -2.2196 l -1.636514,0.01 c -0.07333,-0.35153 -0.178319,-0.70024 -0.323564,-1.04372 -0.145244,-0.34406 -0.321407,-0.6644 -0.522735,-0.96217 l 1.131035,-1.13631 -1.583305,-1.56293 -1.129598,1.13589 c -0.614052,-0.40108 -1.302883,-0.68093 -2.022633,-0.82247 l 0.0093,-1.61852 h -2.241173 l 0.0042,1.63124 c -0.353763,0.0736 -0.705369,0.17977 -1.049785,0.32371 -0.344415,0.14437 -0.665102,0.32092 -0.9635006,0.52046 l -1.1698628,-1.15823 -1.5667691,1.5792 1.1684265,1.15669 c -0.4026573,0.61283 -0.68308,1.29797 -0.8247287,2.01713 l -1.6588041,0.003 v 2.22174 l 1.6724648,-0.006 c 0.073327,0.35077 0.1797598,0.70243 0.3242851,1.04472 0.1452428,0.34448 0.3214064,0.6644 0.5227339,0.96066 l -1.1993431,1.19723 1.5840256,1.56011 1.1964668,-1.19348 c 0.6140517,0.40346 1.3028827,0.68232 2.0233517,0.82331 l 7.19e-4,1.69892 h 2.226848 z m 0.221462,-3.9957 c -1.788948,0.7502 -3.8576,-0.0928 -4.6097055,-1.87438 -0.7521065,-1.78321 0.090598,-3.84627 1.8802645,-4.59604 1.78823,-0.74936 3.856881,0.0929 4.608987,1.87437 0.752106,1.78165 -0.0906,3.84612 -1.879546,4.59605 z"
            fill={iconFill}
            stroke={iconStroke}
            strokeWidth="1"
          />
          <circle cx="16" cy="15" r="5" fill={iconFill} stroke="none" />
          <path
            d="m 17,22 v -1.71335 c 0.352326,-0.0705 0.703932,-0.17838 1.047628,-0.32133 0.344416,-0.14465 0.665822,-0.32133 0.966377,-0.52145 l 1.19431,1.18005 1.567487,-1.57688 -1.195028,-1.18014 c 0.403376,-0.61394 0.683079,-1.29908 0.825447,-2.01824 l 1.622133,-0.01 v -2.2196 l -1.636514,0.01 c -0.07333,-0.35153 -0.178319,-0.70024 -0.323564,-1.04372 -0.145244,-0.34406 -0.321407,-0.6644 -0.522735,-0.96217 l 1.131035,-1.13631 -1.583305,-1.56293 -1.129598,1.13589 c -0.614052,-0.40108 -1.302883,-0.68093 -2.022633,-0.82247 l 0.0093,-1.61852 h -2.241173 l 0.0042,1.63124 c -0.353763,0.0736 -0.705369,0.17977 -1.049785,0.32371 -0.344415,0.14437 -0.665102,0.32092 -0.9635006,0.52046 l -1.1698628,-1.15823 -1.5667691,1.5792 1.1684265,1.15669 c -0.4026573,0.61283 -0.68308,1.29797 -0.8247287,2.01713 l -1.6588041,0.003 v 2.22174 l 1.6724648,-0.006 c 0.073327,0.35077 0.1797598,0.70243 0.3242851,1.04472 0.1452428,0.34448 0.3214064,0.6644 0.5227339,0.96066 l -1.1993431,1.19723 1.5840256,1.56011 1.1964668,-1.19348 c 0.6140517,0.40346 1.3028827,0.68232 2.0233517,0.82331 l 7.19e-4,1.69892 h 2.226848 z m 0.221462,-3.9957 c -1.788948,0.7502 -3.8576,-0.0928 -4.6097055,-1.87438 -0.7521065,-1.78321 0.090598,-3.84627 1.8802645,-4.59604 1.78823,-0.74936 3.856881,0.0929 4.608987,1.87437 0.752106,1.78165 -0.0906,3.84612 -1.879546,4.59605 z"
            fill={iconFill}
            stroke={iconStroke}
            strokeWidth="1"
          />
        </g>
      )}
      {type.includes('usertask') && (
        <g>
          <path
            d="m 15,12 c 0.909,-0.845 1.594,-2.049 1.594,-3.385 0,-2.554 -1.805,-4.62199999 -4.357,-4.62199999 -2.55199998,0 -4.28799998,2.06799999 -4.28799998,4.62199999 0,1.348 0.974,2.562 1.89599998,3.405 -0.52899998,0.187 -5.669,2.097 -5.794,4.7560005 v 6.718 h 17 v -6.718 c 0,-2.2980005 -5.5279996,-4.5950005 -6.0509996,-4.7760005 z m -8,6 l 0,5.5 m 11,0 l 0,-5"
            fill={iconFill}
            stroke={iconStroke}
            strokeWidth="0.5"
          />
          <path
            d="m 15,12 m 2.162,1.009 c 0,2.4470005 -2.158,4.4310005 -4.821,4.4310005 -2.66499998,0 -4.822,-1.981 -4.822,-4.4310005"
            fill="none"
            stroke={iconStroke}
            strokeWidth="0.5"
          />
          <path
            d="m 15,12 m -6.9,-3.80 c 0,0 2.25099998,-2.358 4.27399998,-1.177 2.024,1.181 4.221,1.537 4.124,0.965 -0.098,-0.57 -0.117,-3.79099999 -4.191,-4.13599999 -3.57499998,0.001 -4.20799998,3.36699999 -4.20699998,4.34799999 z"
            fill={iconStroke}
            stroke={iconStroke}
            strokeWidth="0.5"
          />
        </g>
      )}
    </g>
  );
}

function DeployedBpmnDiagram({
  diagram,
  flowNodes,
  selectedElementId,
  onSelect,
  zoom,
}: {
  diagram: ParsedBpmnDiagram;
  flowNodes: FlowNodeRecord[];
  selectedElementId: string | null;
  onSelect: (elementId: string) => void;
  zoom: number;
}) {
  const [minX = 0, minY = 0, width = 1, height = 1] = diagram.viewBox.split(' ').map(Number);
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  return (
    <svg className="h-full w-full bg-white" viewBox={diagram.viewBox} role="img" aria-label="Deployed BPMN diagram">
      <defs>
        <marker id="flowset-arrow" markerHeight="10" markerUnits="strokeWidth" markerWidth="10" orient="auto" refX="9" refY="3">
          <path d="M0,0 L0,6 L9,3 z" fill="#1f2937" />
        </marker>
      </defs>
      <g transform={`translate(${centerX} ${centerY}) scale(${zoom}) translate(${-centerX} ${-centerY})`}>
        <g fill="none" stroke="#1f2937" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2">
          {diagram.edges.map((edge) => (
            <polyline
              key={edge.id}
              points={edge.waypoints.map((point) => `${point.x},${point.y}`).join(' ')}
              markerEnd="url(#flowset-arrow)"
            />
          ))}
        </g>
        {diagram.shapes.map((shape) => {
          const stroke = shapeStroke(shape, flowNodes, selectedElementId);
          const fill = shapeFill(shape, flowNodes);
          const type = shape.type.toLowerCase();
          const selected = selectedElementId === shape.elementId;
          const strokeWidth = selected ? 4 : nodeForShape(shape, flowNodes) ? 3 : 2.2;
          const label = shortLabel(shape.name || shape.elementId);

          return (
            <g
              key={shape.id}
              className="cursor-pointer"
              onClick={() => onSelect(shape.elementId)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelect(shape.elementId);
              }}
              role="button"
              tabIndex={0}
            >
              {type.includes('gateway') ? (
                <polygon
                  points={`${shape.x + shape.width / 2},${shape.y} ${shape.x + shape.width},${shape.y + shape.height / 2} ${shape.x + shape.width / 2},${shape.y + shape.height} ${shape.x},${shape.y + shape.height / 2}`}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                />
              ) : type.includes('event') ? (
                <>
                  <circle
                    cx={shape.x + shape.width / 2}
                    cy={shape.y + shape.height / 2}
                    r={Math.min(shape.width, shape.height) / 2}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={type.includes('endevent') ? strokeWidth + 1.5 : strokeWidth}
                  />
                  {type.includes('startevent') && (
                    <circle
                      cx={shape.x + shape.width / 2}
                      cy={shape.y + shape.height / 2}
                      r={Math.max(3, Math.min(shape.width, shape.height) / 2 - 6)}
                      fill="none"
                      stroke={stroke}
                      strokeWidth="1.2"
                      opacity="0.35"
                    />
                  )}
                </>
              ) : (
                <>
                  <rect
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    rx="10"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                  <BpmnTaskMarker shape={shape} />
                </>
              )}
              {!type.includes('event') && (
                <text
                  x={shape.x + shape.width / 2}
                  y={shape.y + shape.height / 2 + 5}
                  textAnchor="middle"
                  className="pointer-events-none fill-slate-900 text-[13px] font-semibold"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function StateBadge({ state }: { state: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('w-fit rounded-[3px]', STATE_CLASS[state] ?? 'border-slate-300 text-slate-600')}
    >
      {state}
    </Badge>
  );
}

function NodeBadge({ state }: { state: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'w-fit rounded-[3px] text-[10px]',
        NODE_STATE_CLASS[state] ?? 'border-slate-300 text-slate-600',
      )}
    >
      {state}
    </Badge>
  );
}

function fitDiagram(modeler: NavigatedViewer) {
  const canvas = modeler.get<CanvasApi>('canvas');
  canvas.resized?.();
  canvas.zoom('fit-viewport');
}

export function InstanceMonitor({ instanceKey, open, onClose }: InstanceMonitorProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const modelerRef = useRef<NavigatedViewer | null>(null);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [modelerVersion, setModelerVersion] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [diagramState, setDiagramState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [diagramError, setDiagramError] = useState<string | null>(null);
  const [fallbackZoom, setFallbackZoom] = useState(1);
  const [diagramHeight, setDiagramHeight] = useState(300);

  const { data: instance, refetch, isFetching } = useQuery<WorkflowInstance>({
    queryKey: ['workflow-instance', instanceKey],
    queryFn: () => getWorkflowInstance(instanceKey),
    refetchInterval: (query) => {
      const data = query.state.data as WorkflowInstance | undefined;
      if (isTerminal(data?.state) && (data?.flowNodes?.length ?? 0) > 0) return false;
      return 2000;
    },
    enabled: open && !!instanceKey,
    staleTime: 0,
  });

  const processDefinitionId = instance?.bpmnProcessId ?? instance?.processDefinitionKey;

  const {
    data: definitionXml,
    isLoading: xmlLoading,
    isError: xmlError,
    error: xmlFetchError,
  } = useQuery({
    queryKey: ['workflow-instance', instanceKey, 'diagram-xml'],
    queryFn: () => getWorkflowInstanceDiagramXml(instanceKey),
    enabled: open && !!instanceKey,
    retry: 1,
  });

  const { data: userTasks = [] } = useQuery<UserTask[]>({
    queryKey: ['workflow-instance', instanceKey, 'tasks'],
    queryFn: () => listUserTasks(instanceKey),
    enabled: open && !!instanceKey,
    refetchInterval: 5000,
  });

  const deployedDiagram = useMemo(
    () => parseBpmnDiagram(definitionXml?.bpmnXml),
    [definitionXml?.bpmnXml],
  );

  useEffect(() => {
    if (!open || !canvasRef.current) return;

    let modeler: NavigatedViewer | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let cancelled = false;

    const frame = window.requestAnimationFrame(() => {
      if (cancelled || !canvasRef.current) return;

      try {
        const Viewer = (NavigatedViewer as any).default || NavigatedViewer;
        modeler = new Viewer({
          container: canvasRef.current,
          moddleExtensions: {
            zeebe: zeebeModdle,
          },
        });
        modelerRef.current = modeler;
        setModelerVersion((v) => v + 1);

        resizeObserver = new ResizeObserver(() => {
          if (!modelerRef.current) return;
          try {
            modelerRef.current.get<CanvasApi>('canvas').resized?.();
          } catch {
            // viewer not ready yet
          }
        });
        resizeObserver.observe(canvasRef.current);
      } catch (err) {
        console.error('Failed to instantiate NavigatedViewer:', err);
        setDiagramState('error');
        setDiagramError(err instanceof Error ? err.message : String(err));
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      modeler?.destroy();
      modelerRef.current = null;
      setDiagramState('loading');
      setDiagramError(null);
      setSelectedElementId(null);
    };
  }, [open]);

  useEffect(() => {
    const modeler = modelerRef.current;
    if (!modeler) return;

    const eventBus = modeler.get<EventBusApi>('eventBus');
    const onClick = (event: { element?: { id: string; type: string } }) => {
      const element = event.element;
      if (!element || element.type === 'bpmn:Process' || element.type === 'bpmn:Collaboration') return;
      setSelectedElementId(element.id);
    };
    eventBus.on('element.click', onClick);

    return () => {
      eventBus.off('element.click', onClick);
    };
  }, [modelerVersion]);

  useEffect(() => {
    const modeler = modelerRef.current;
    const xml = definitionXml?.bpmnXml;
    if (!modeler || !xml) return;

    setDiagramState('loading');
    setDiagramError(null);

    let cancelled = false;
    const forceReady = window.setTimeout(() => {
      if (cancelled) return;
      setDiagramState('ready');
      try {
        fitDiagram(modeler);
      } catch (error) {
        console.warn('Could not force-fit BPMN diagram', error);
      }
    }, 1200);

    const importDiagram = async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

      try {
        const result = await modeler.importXML(xml);
        if (cancelled) return;
        window.clearTimeout(forceReady);

        if (result?.warnings?.length > 0) {
          console.warn('BPMN import warnings', result.warnings);
        }

        setDiagramState('ready');
        fitDiagram(modeler);
        window.setTimeout(() => {
          if (!cancelled) {
            fitDiagram(modeler);
          }
        }, 50);
        window.setTimeout(() => {
          if (!cancelled) {
            fitDiagram(modeler);
          }
        }, 250);
      } catch (error) {
        if (cancelled) return;
        window.clearTimeout(forceReady);
        const message = error instanceof Error ? error.message : 'Could not import deployed BPMN XML';
        console.error('BPMN import failed', error);
        setDiagramState('error');
        setDiagramError(message);
      }
    };

    void importDiagram();

    return () => {
      cancelled = true;
      window.clearTimeout(forceReady);
    };
  }, [definitionXml?.bpmnXml, modelerVersion]);

  useEffect(() => {
    const modeler = modelerRef.current;
    if (!modeler || diagramState !== 'ready') return;
    const canvas = modeler.get<CanvasApi>('canvas');

    instance?.flowNodes.forEach((node) => {
      canvas.removeMarker(node.elementId, 'flowset-node-active');
      canvas.removeMarker(node.elementId, 'flowset-node-completed');
      canvas.removeMarker(node.elementId, 'flowset-node-incident');
      canvas.removeMarker(node.elementId, 'flowset-node-selected');

      if (node.state === 'ACTIVE') canvas.addMarker(node.elementId, 'flowset-node-active');
      if (node.state === 'COMPLETED') canvas.addMarker(node.elementId, 'flowset-node-completed');
      if (node.state === 'INCIDENT' || node.state === 'TERMINATED') {
        canvas.addMarker(node.elementId, 'flowset-node-incident');
      }
    });

    if (selectedElementId) {
      canvas.addMarker(selectedElementId, 'flowset-node-selected');
    }
  }, [diagramState, instance?.flowNodes, selectedElementId]);

  const state = instance?.state ?? 'PENDING';
  const flowNodes = instance?.flowNodes ?? [];

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const container = layoutRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startY = event.clientY;
    const startHeight = diagramHeight;
    const minDiagram = 180;
    const minRuntime = 220;
    const maxDiagram = Math.max(minDiagram, rect.height - minRuntime);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextHeight = Math.min(maxDiagram, Math.max(minDiagram, startHeight + moveEvent.clientY - startY));
      setDiagramHeight(nextHeight);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  if (!open) return null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
        <style>
          {`
            .flowset-instance-viewer .djs-palette,
            .flowset-instance-viewer .djs-context-pad,
            .flowset-instance-viewer .djs-popup,
            .flowset-instance-viewer .bio-properties-panel,
            .flowset-instance-viewer .bjs-powered-by {
              display: none !important;
            }
            .flowset-instance-viewer .djs-hit,
            .flowset-instance-viewer .djs-outline {
              pointer-events: all;
            }
            .flowset-instance-viewer .djs-container {
              background: #ffffff;
            }
            .flowset-node-active .djs-visual > :nth-child(1) { stroke: #0284c7 !important; stroke-width: 4px !important; fill: rgba(186, 230, 253, 0.35) !important; }
            .flowset-node-completed .djs-visual > :nth-child(1) { stroke: #059669 !important; stroke-width: 4px !important; fill: rgba(162, 224, 172, 0.45) !important; }
            .flowset-node-incident .djs-visual > :nth-child(1) { stroke: #dc2626 !important; stroke-width: 4px !important; }
            .flowset-node-selected .djs-visual > :nth-child(1) { stroke: #f59e0b !important; stroke-width: 5px !important; }
            .flowset-runtime-table th,
            .flowset-runtime-table td {
              height: 34px;
              padding-top: 0.35rem;
              padding-bottom: 0.35rem;
            }
          `}
        </style>

          <header className="flex h-12 shrink-0 items-center justify-between border-b bg-white px-4">
            <div className="flex min-w-0 items-center gap-3">
              <Activity className="size-5 text-[#0f5b6b]" />
              <h2 className="truncate text-base font-bold text-slate-950">
                Process instance "{instanceKey}"
              </h2>
              <StateBadge state={state} />
              {processDefinitionId && (
                <Badge variant="secondary" className="h-7 rounded-full px-3 text-xs">
                  {processDefinitionId}
                </Badge>
              )}
              {!isTerminal(state) && <span className="size-2 animate-pulse rounded-full bg-sky-500" />}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-[3px]"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </header>

          <div className={cn('grid min-h-0 flex-1', infoOpen ? 'grid-cols-[minmax(0,1fr)_360px]' : 'grid-cols-[minmax(0,1fr)_56px]')}>
            <section ref={layoutRef} className="flex min-w-0 flex-col overflow-hidden">
              <div
                className="relative shrink-0 overflow-hidden border-b bg-white"
                style={{ height: diagramHeight }}
              >
                {definitionXml?.bpmnXml && deployedDiagram && (
                  <div className="absolute inset-0 z-0 overflow-hidden bg-white">
                    <DeployedBpmnDiagram
                      diagram={deployedDiagram}
                      flowNodes={flowNodes}
                      selectedElementId={selectedElementId}
                      onSelect={setSelectedElementId}
                      zoom={fallbackZoom}
                    />
                  </div>
                )}
                <div
                  ref={canvasRef}
                  className={cn(
                    'flowset-instance-viewer absolute inset-0 z-10 h-full w-full',
                    'pointer-events-none opacity-0',
                  )}
                />
                {definitionXml?.bpmnXml && deployedDiagram && (
                  <div className="absolute right-3 top-3 z-20 flex flex-col overflow-hidden rounded-[3px] border bg-white shadow-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-none border-b"
                      title="Reset zoom"
                      onClick={() => setFallbackZoom(1)}
                    >
                      <CircleDot className="size-4 text-[#0f5b6b]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-none border-b text-lg font-semibold"
                      title="Zoom in"
                      onClick={() => setFallbackZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))))}
                    >
                      +
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-none text-lg font-semibold"
                      title="Zoom out"
                      onClick={() => setFallbackZoom((value) => Math.max(0.35, Number((value - 0.25).toFixed(2))))}
                    >
                      -
                    </Button>
                  </div>
                )}
                {!definitionXml?.bpmnXml && xmlLoading && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                    Loading deployed BPMN XML...
                  </div>
                )}
                {!definitionXml?.bpmnXml && xmlError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-red-600">
                    <p className="font-semibold">Could not load deployed BPMN XML</p>
                    <p className="text-xs">
                      {(xmlFetchError as Error | undefined)?.message
                        ?? 'Ensure Camunda 8 is running (docker compose --profile workflow up -d).'}
                    </p>
                  </div>
                )}
                {!definitionXml?.deployed && definitionXml?.bpmnXml && diagramState !== 'error' && (
                  <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-[3px] border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                    Fallback diagram — deployed BPMN not found in Camunda
                  </div>
                )}
                {definitionXml?.bpmnXml && diagramState === 'loading' && !deployedDiagram && null}
                {diagramState === 'error' && !deployedDiagram && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/80 text-sm text-red-600">
                    <p className="font-semibold">Could not import deployed BPMN diagram</p>
                    <p className="max-w-xl text-center text-xs">{diagramError}</p>
                  </div>
                )}
              </div>

              <div
                role="separator"
                aria-orientation="horizontal"
                title="Drag to resize diagram and runtime panels"
                className="group relative z-30 h-3 shrink-0 cursor-row-resize bg-slate-50"
                onPointerDown={startResize}
              >
                <div className="absolute left-1/2 top-1/2 h-1 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300 transition group-hover:bg-[#0f5b6b]" />
              </div>

              <div className="min-h-0 flex-1 overflow-hidden bg-slate-50 p-2 pt-0">
                <Tabs defaultValue="runtime" className="flex h-full min-h-0 flex-col">
                  <TabsList className="h-8 w-fit shrink-0 rounded-[3px] bg-white">
                    <TabsTrigger value="runtime" className="gap-1.5 rounded-[3px]">
                      <ListTree className="size-3.5" />
                      Runtime
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-1.5 rounded-[3px]" disabled>
                      <Clock3 className="size-3.5" />
                      History
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="runtime" className="mt-2 min-h-0 flex-1 overflow-hidden rounded-[3px] border bg-white">
                    <div className="grid h-full min-h-0 grid-cols-[32%_minmax(0,1fr)]">
                      <div className="flex min-h-0 flex-col overflow-hidden border-r p-3">
                        <h3 className="mb-3 text-sm font-semibold text-slate-900">Activity instances</h3>
                        <div className="flex min-h-0 flex-1 flex-col rounded-[3px] border">
                          <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                            Activity Id
                          </div>
                          <div className="min-h-0 flex-1 overflow-auto">
                            {flowNodes.length === 0 ? (
                              <div className="px-3 py-10 text-center text-sm text-slate-500">
                                Waiting for Camunda to index activity data...
                              </div>
                            ) : (
                              <div className="py-1">
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                                  onClick={() => setSelectedElementId(null)}
                                >
                                  <span className="text-slate-400">⌄</span>
                                  <span className="truncate font-mono text-xs">{instanceKey}</span>
                                </button>
                                {flowNodes.map((node: FlowNodeRecord, index) => (
                                  <button
                                    key={`${node.elementId}-${index}`}
                                    type="button"
                                    className={cn(
                                      'flex w-full items-center justify-between gap-2 px-7 py-1.5 text-left text-sm hover:bg-slate-50',
                                      selectedElementId === node.elementId && 'bg-sky-50',
                                    )}
                                    onClick={() => setSelectedElementId(node.elementId)}
                                  >
                                    <span className="truncate">{node.elementName || node.elementId}</span>
                                    <NodeBadge state={node.state} />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <Tabs defaultValue="variables" className="flex min-h-0 flex-col p-3">
                        <TabsList className="h-8 w-fit shrink-0 rounded-[3px] bg-white">
                          <TabsTrigger value="variables" className="gap-1.5 rounded-[3px]">
                            <Braces className="size-3.5" />
                            Variables ({Object.keys(instance?.variables ?? {}).length})
                          </TabsTrigger>
                          <TabsTrigger value="tasks" className="gap-1.5 rounded-[3px]">
                            <ClipboardList className="size-3.5" />
                            User tasks ({userTasks.length})
                          </TabsTrigger>
                          <TabsTrigger value="jobs" className="gap-1.5 rounded-[3px]" disabled>
                            <Settings className="size-3.5" />
                            Jobs (0)
                          </TabsTrigger>
                          <TabsTrigger value="external" className="gap-1.5 rounded-[3px]" disabled>
                            <Workflow className="size-3.5" />
                            External tasks (0)
                          </TabsTrigger>
                          <TabsTrigger value="incidents" className="gap-1.5 rounded-[3px]" disabled>
                            <AlertTriangle className="size-3.5" />
                            Incidents (0)
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="variables" className="mt-2 min-h-0 flex-1 overflow-auto rounded-[3px] border bg-white">
                          <Table className="flowset-runtime-table">
                            <TableHeader>
                              <TableRow className="bg-slate-50">
                                <TableHead className="w-[220px]">Name</TableHead>
                                <TableHead className="w-[120px]">Type</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead className="w-[220px]">Scope</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {!instance || Object.keys(instance.variables).length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="h-32 text-center text-sm text-slate-500">
                                    No variables.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                Object.entries(instance.variables).map(([name, value]) => (
                                  <TableRow key={name}>
                                    <TableCell className="font-semibold text-[#0f5b6b]">{name}</TableCell>
                                    <TableCell className="text-sm">{Array.isArray(value) ? 'Array' : value === null ? 'Null' : typeof value}</TableCell>
                                    <TableCell className="max-w-[520px] truncate font-mono text-xs">{formatValue(value)}</TableCell>
                                    <TableCell className="truncate font-mono text-xs text-slate-500">{instanceKey}</TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </TabsContent>

                        <TabsContent value="tasks" className="mt-2 min-h-0 flex-1 overflow-auto rounded-[3px] border bg-white">
                          <Table className="flowset-runtime-table">
                            <TableHeader>
                              <TableRow className="bg-slate-50">
                                <TableHead>Task id</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Element</TableHead>
                                <TableHead>State</TableHead>
                                <TableHead>Assignee</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {userTasks.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="h-32 text-center text-sm text-slate-500">
                                    No user tasks for this instance.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                userTasks.map((task) => (
                                  <TableRow key={task.userTaskKey}>
                                    <TableCell className="font-mono text-xs">{task.userTaskKey}</TableCell>
                                    <TableCell>{task.name || '-'}</TableCell>
                                    <TableCell className="font-mono text-xs">{task.elementId || '-'}</TableCell>
                                    <TableCell><NodeBadge state={task.state} /></TableCell>
                                    <TableCell>{task.assignee || 'Unassigned'}</TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </section>

            <aside className="flex min-h-0 border-l bg-white">
              {infoOpen && (
                <div className="min-w-0 flex-1 overflow-auto p-4">
                  <h3 className="mb-4 font-semibold text-slate-950">Instance information</h3>
                  <div className="space-y-3">
                    <InfoField label="Id" value={instanceKey} mono />
                    <InfoField label="Start time" value={formatDate(instance?.startDate)} />
                    <InfoField label="End time" value={formatDate(instance?.endDate)} />
                    <InfoField label="Business key" value="-" />
                    <InfoField label="Process definition" value={processDefinitionId || '-'} mono />
                    <InfoField label="State" value={state} />
                  </div>
                </div>
              )}
              <div className="flex w-14 shrink-0 flex-col items-center gap-2 border-l bg-slate-50 py-3">
                <Button
                  variant={infoOpen ? 'default' : 'outline'}
                  size="icon"
                  className="size-9 rounded-[3px]"
                  onClick={() => setInfoOpen((value) => !value)}
                  title="View process instance details"
                >
                  <Info className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="size-9 rounded-[3px]" onClick={() => refetch()} title="Reload process instance details">
                  <RefreshCw className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="size-9 rounded-[3px]" disabled title="Activate is not available for Camunda 8 process instances">
                  <Play className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="size-9 rounded-[3px]" disabled title="Suspend is not available for Camunda 8 process instances">
                  <Pause className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="size-9 rounded-[3px]" disabled title="Migration is not implemented yet">
                  <FileText className="size-4" />
                </Button>
                    <Button variant="outline" size="icon" className="size-9 rounded-[3px]" disabled title="Terminate from the Process instances grid">
                  <CircleDot className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="size-9 rounded-[3px]" onClick={onClose} title="Close">
                  <X className="size-4" />
                </Button>
              </div>
            </aside>
          </div>

    </div>
  );
}

function InfoField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-slate-500">{label}</p>
      <p className={cn('break-all rounded-[3px] border bg-slate-50 px-2 py-1.5 text-sm', mono && 'font-mono text-xs')}>
        {value}
      </p>
    </div>
  );
}
