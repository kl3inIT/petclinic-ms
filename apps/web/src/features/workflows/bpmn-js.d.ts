declare module 'bpmn-js/lib/Modeler' {
  export default class BpmnModeler {
    constructor(options: Record<string, unknown>);
    importXML(xml: string): Promise<{ warnings: unknown[] }>;
    saveXML(options?: Record<string, unknown>): Promise<{ xml: string }>;
    destroy(): void;
    get<T = unknown>(name: string): T;
  }
}

declare module 'bpmn-js/lib/NavigatedViewer' {
  export default class BpmnViewer {
    constructor(options: Record<string, unknown>);
    importXML(xml: string): Promise<{ warnings: unknown[] }>;
    destroy(): void;
    get<T = unknown>(name: string): T;
  }
}

declare module 'bpmn-js/lib/Viewer' {
  export default class BpmnViewer {
    constructor(options: Record<string, unknown>);
    attachTo(parentNode: HTMLElement): void;
    importXML(xml: string): Promise<{ warnings: unknown[] }>;
    destroy(): void;
    get<T = unknown>(name: string): T;
  }
}

declare module 'bpmn-js-properties-panel' {
  export const BpmnPropertiesPanelModule: unknown;
  export const BpmnPropertiesProviderModule: unknown;
  export const ZeebePropertiesProviderModule: unknown;
}

declare module 'zeebe-bpmn-moddle/resources/zeebe.json' {
  const descriptor: unknown;
  export default descriptor;
}

declare module 'camunda-bpmn-js-behaviors/lib/camunda-cloud' {
  const module: unknown;
  export default module;
}
