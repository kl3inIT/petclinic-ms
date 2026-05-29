import { apiClient } from '@/lib/api/client';

export interface ServiceTaskCatalogItem {
  id: string;
  name: string;
  taskType: string;
  description: string;
  inputParameters: string[];
}

export interface WorkflowDefinitionXml {
  processDefinitionKey: string;
  bpmnXml: string;
  deployed: boolean;
}

export interface WorkflowDefinitionDeployment {
  deploymentId: string;
  name: string;
  deployedDefinitions: number;
}

export interface WorkflowDefinitionSummary {
  id: string;
  key: string;
  name?: string;
  version: number;
  deploymentId: string;
  resourceName?: string;
  suspended: boolean;
}

export interface WorkflowDeploymentSummary {
  id: string;
  name?: string;
  deployedAt: string;
  source?: string;
}

export interface FlowNodeRecord {
  elementId: string;
  elementName?: string;
  type: string;
  state: string;
  startDate?: string;
  endDate?: string;
}

export interface WorkflowInstance {
  processInstanceKey: string;
  processDefinitionKey?: string;
  bpmnProcessId?: string;
  state: string;
  startDate?: string;
  endDate?: string;
  variables: Record<string, unknown>;
  flowNodes: FlowNodeRecord[];
}

export async function listWorkflowServiceTasks() {
  const { data } = await apiClient.get<ServiceTaskCatalogItem[]>(
    '/api/v1/workflows/designer/service-tasks',
  );
  return data;
}

export async function listWorkflowDefinitions() {
  const { data } = await apiClient.get<WorkflowDefinitionSummary[]>(
    '/api/v1/workflows/designer/definitions',
  );
  return data;
}

export async function listWorkflowDeployments() {
  const { data } = await apiClient.get<WorkflowDeploymentSummary[]>(
    '/api/v1/workflows/designer/deployments',
  );
  return data;
}

export async function getWorkflowDefinitionXml(processDefinitionKey: string) {
  const { data } = await apiClient.get<WorkflowDefinitionXml>(
    `/api/v1/workflows/designer/definitions/${encodeURIComponent(processDefinitionKey)}/xml`,
  );
  return data;
}

export async function deployWorkflowDefinition(name: string, bpmnXml: string) {
  const { data } = await apiClient.post<WorkflowDefinitionDeployment>(
    '/api/v1/workflows/designer/definitions/deploy',
    { name, bpmnXml },
  );
  return data;
}

export async function deleteWorkflowDefinition(processDefinitionKey: string) {
  await apiClient.delete(
    `/api/v1/workflows/designer/definitions/${encodeURIComponent(processDefinitionKey)}`,
  );
}

export async function startWorkflow(
  processDefinitionKey: string,
  variables: Record<string, unknown> = {},
) {
  const { data } = await apiClient.post<WorkflowInstance>('/api/v1/workflows/instances', {
    processDefinitionKey,
    variables,
  });
  return data;
}

export async function getWorkflowInstance(processInstanceId: string) {
  const { data } = await apiClient.get<WorkflowInstance>(
    `/api/v1/workflows/instances/${encodeURIComponent(processInstanceId)}`,
  );
  return data;
}

export async function getWorkflowInstanceDiagramXml(processInstanceId: string) {
  const { data } = await apiClient.get<WorkflowDefinitionXml>(
    `/api/v1/workflows/instances/${encodeURIComponent(processInstanceId)}/diagram-xml`,
  );
  return data;
}

// ── Process instance list ──────────────────────────────────────────────────

export interface ProcessInstanceSummary {
  processInstanceKey: string;
  processDefinitionKey?: string;
  processDefinitionId?: string;
  processDefinitionVersion: number;
  state: string;
  hasIncident: boolean;
  startDate?: string;
  endDate?: string;
}

export async function listProcessInstances(processDefinitionId?: string, state?: string) {
  const params: Record<string, string> = {};
  if (processDefinitionId) params.processDefinitionId = processDefinitionId;
  if (state) params.state = state;
  const { data } = await apiClient.get<ProcessInstanceSummary[]>(
    '/api/v1/workflows/instances',
    { params },
  );
  return data;
}

export async function terminateWorkflowInstance(processInstanceKey: string) {
  await apiClient.post(
    `/api/v1/workflows/instances/${encodeURIComponent(processInstanceKey)}/terminate`,
  );
}

export async function deleteWorkflowInstance(processInstanceKey: string) {
  await apiClient.delete(
    `/api/v1/workflows/instances/${encodeURIComponent(processInstanceKey)}`,
  );
}

// ── User tasks ─────────────────────────────────────────────────────────────

export interface UserTask {
  userTaskKey: string;
  elementId?: string;
  elementInstanceKey?: string;
  processDefinitionKey?: string;
  processDefinitionId?: string;
  processInstanceKey?: string;
  name?: string;
  assignee?: string;
  state: string;
  creationDate?: string;
  completionDate?: string;
  dueDate?: string;
  formKey?: string;
}

export async function listUserTasks(processInstanceKey?: string, state?: string) {
  const params: Record<string, string> = {};
  if (processInstanceKey) params.processInstanceKey = processInstanceKey;
  if (state) params.state = state;
  const { data } = await apiClient.get<UserTask[]>('/api/v1/workflows/tasks', { params });
  return data;
}

export async function getUserTask(userTaskKey: string) {
  const { data } = await apiClient.get<UserTask>(
    `/api/v1/workflows/tasks/${encodeURIComponent(userTaskKey)}`,
  );
  return data;
}

export async function completeUserTask(
  userTaskKey: string,
  variables: Record<string, unknown> = {},
) {
  await apiClient.post(
    `/api/v1/workflows/tasks/${encodeURIComponent(userTaskKey)}/complete`,
    {
      variables,
    },
  );
}

// ── Visit workflow domain actions ──────────────────────────────────────────

export async function approveVisit(visitId: number) {
  await apiClient.post(`/api/v1/workflows/visits/${visitId}/approve`);
}

export async function rejectVisit(visitId: number) {
  await apiClient.post(`/api/v1/workflows/visits/${visitId}/reject`);
}

export async function startVisitExam(visitId: number) {
  await apiClient.post(`/api/v1/workflows/visits/${visitId}/start`);
}

export async function completeVisitExam(
  visitId: number,
  diagnosis: string,
  treatment: string,
  fee: number,
) {
  await apiClient.post(`/api/v1/workflows/visits/${visitId}/complete`, {
    diagnosis,
    treatment,
    fee,
  });
}
