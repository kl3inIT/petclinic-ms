package com.mss301.petclinic.workflow.service.impl;

import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.workflow.dto.req.DeployWorkflowDefinitionRequest;
import com.mss301.petclinic.workflow.dto.res.ServiceTaskCatalogItemResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDefinitionDeploymentResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDefinitionSummaryResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDefinitionXmlResponse;
import com.mss301.petclinic.workflow.dto.res.WorkflowDeploymentSummaryResponse;
import com.mss301.petclinic.workflow.service.WorkflowDesignerService;

import io.camunda.client.CamundaClient;
import io.camunda.client.api.response.DeploymentEvent;
import io.camunda.client.api.response.Process;

@Service
@Transactional(readOnly = true)
public class WorkflowDesignerServiceImpl implements WorkflowDesignerService {

    private static final Logger log = LoggerFactory.getLogger(WorkflowDesignerServiceImpl.class);

    private static final String ENTITY_NAME = "workflowDefinition";
    private static final String BPMN_NS = "http://www.omg.org/spec/BPMN/20100524/MODEL";
    private static final String ZEEBE_NS = "http://camunda.org/schema/zeebe/1.0";

    private final ObjectProvider<CamundaClient> camundaClient;
    private final HttpClient operateHttp;
    private final String operateBaseUrl;
    private final String operateBasicAuth;
    private final ObjectMapper objectMapper;
    private final Map<String, ManagedDefinition> definitions = new ConcurrentHashMap<>();
    private final Map<String, ManagedDeployment> deployments = new ConcurrentHashMap<>();

    public WorkflowDesignerServiceImpl(
            ObjectProvider<CamundaClient> camundaClient,
            @Qualifier("camundaOperateHttpClient") HttpClient operateHttp,
            @Qualifier("camundaOperateBaseUrl") String operateBaseUrl,
            @Qualifier("camundaOperateBasicAuth") String operateBasicAuth,
            ObjectMapper objectMapper) {
        this.camundaClient = camundaClient;
        this.operateHttp = operateHttp;
        this.operateBaseUrl = operateBaseUrl;
        this.operateBasicAuth = operateBasicAuth;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<ServiceTaskCatalogItemResponse> listServiceTasks() {
        return List.of(
                new ServiceTaskCatalogItemResponse(
                        "call-vets-service",
                        "Call Vets Service",
                        "call-vets-service",
                        "Calls vets-service through the load-balanced RestClient and stores the result in process variables.",
                        List.of("visitId", "vetId")
                ),
                new ServiceTaskCatalogItemResponse(
                        "camel-http-call",
                        "Generic HTTP Call",
                        "camel-http-call",
                        "Uses the Camel direct route to call a URL/method configured on the BPMN service task.",
                        List.of("url", "method", "body")
                )
        );
    }

    @Override
    public List<WorkflowDefinitionSummaryResponse> listDefinitions() {
        List<WorkflowDefinitionSummaryResponse> camundaDefinitions = listCamundaDefinitions();
        if (!camundaDefinitions.isEmpty()) {
            return camundaDefinitions;
        }

        return definitions.values().stream()
                .sorted(Comparator.comparing(ManagedDefinition::key).thenComparing(ManagedDefinition::version).reversed())
                .map(definition -> new WorkflowDefinitionSummaryResponse(
                        definition.id(),
                        definition.key(),
                        definition.name(),
                        definition.version(),
                        definition.deploymentId(),
                        definition.resourceName(),
                        false
                ))
                .toList();
    }

    @Override
    public List<WorkflowDeploymentSummaryResponse> listDeployments() {
        return deployments.values().stream()
                .sorted(Comparator.comparing(ManagedDeployment::deployedAt).reversed())
                .map(deployment -> new WorkflowDeploymentSummaryResponse(
                        deployment.id(),
                        deployment.name(),
                        deployment.deployedAt(),
                        "camunda-8"
                ))
                .toList();
    }

    @Override
    public WorkflowDefinitionXmlResponse getDefinitionXml(String processDefinitionKey) {
        return resolveDefinitionXml(processDefinitionKey, null);
    }

    @Override
    public WorkflowDefinitionXmlResponse resolveInstanceDiagramXml(String bpmnProcessId, String numericProcessDefinitionKey) {
        return resolveDefinitionXml(bpmnProcessId, numericProcessDefinitionKey);
    }

    private WorkflowDefinitionXmlResponse resolveDefinitionXml(String bpmnProcessId, String numericProcessDefinitionKey) {
        if (bpmnProcessId != null && !bpmnProcessId.isBlank()) {
            ManagedDefinition cached = definitions.get(bpmnProcessId);
            if (cached != null) {
                return toXmlResponse(bpmnProcessId, cached.bpmnXml(), true);
            }
        }

        if (numericProcessDefinitionKey != null && !numericProcessDefinitionKey.isBlank()) {
            ManagedDefinition cachedByKey = definitions.get(numericProcessDefinitionKey);
            if (cachedByKey != null) {
                return toXmlResponse(bpmnProcessId != null ? bpmnProcessId : cachedByKey.key(), cachedByKey.bpmnXml(), true);
            }

            String xmlByNumericKey = getCamundaDefinitionXml(numericProcessDefinitionKey);
            if (xmlByNumericKey != null && !xmlByNumericKey.isBlank()) {
                cacheDefinition(
                        numericProcessDefinitionKey,
                        bpmnProcessId,
                        bpmnProcessId != null ? bpmnProcessId : numericProcessDefinitionKey,
                        xmlByNumericKey
                );
                return toXmlResponse(bpmnProcessId != null ? bpmnProcessId : numericProcessDefinitionKey, xmlByNumericKey, true);
            }
        }

        if (bpmnProcessId != null && !bpmnProcessId.isBlank()) {
            CamundaDefinition camundaDefinition = findLatestCamundaDefinition(bpmnProcessId);
            if (camundaDefinition != null) {
                String xml = getCamundaDefinitionXml(camundaDefinition.processDefinitionKey());
                if (xml != null && !xml.isBlank()) {
                    cacheDefinition(
                            camundaDefinition.processDefinitionKey(),
                            camundaDefinition.processDefinitionId(),
                            camundaDefinition.name() != null ? camundaDefinition.name() : camundaDefinition.processDefinitionId(),
                            xml
                    );
                    return toXmlResponse(camundaDefinition.processDefinitionId(), xml, true);
                }
            }
        }

        String fallbackKey = bpmnProcessId != null && !bpmnProcessId.isBlank()
                ? bpmnProcessId
                : numericProcessDefinitionKey;
        if (fallbackKey == null || fallbackKey.isBlank()) {
            fallbackKey = "Process";
        }
        log.warn("Could not resolve deployed BPMN XML for bpmnProcessId={} numericKey={}", bpmnProcessId, numericProcessDefinitionKey);
        return toXmlResponse(fallbackKey, newDiagram(fallbackKey), false);
    }

    private WorkflowDefinitionXmlResponse toXmlResponse(String key, String xml, boolean deployed) {
        return new WorkflowDefinitionXmlResponse(key, xml, deployed);
    }

    private void cacheDefinition(String numericKey, String bpmnProcessId, String displayName, String xml) {
        ManagedDefinition managed = new ManagedDefinition(
                numericKey,
                bpmnProcessId,
                displayName,
                0,
                numericKey,
                bpmnProcessId + ".bpmn",
                xml
        );
        if (bpmnProcessId != null && !bpmnProcessId.isBlank()) {
            definitions.put(bpmnProcessId, managed);
        }
        if (numericKey != null && !numericKey.isBlank()) {
            definitions.put(numericKey, managed);
        }
    }

    @Override
    @Transactional
    public WorkflowDefinitionDeploymentResponse deployDefinition(DeployWorkflowDefinitionRequest request) {
        String resourceName = normalizeResourceName(request.name());
        try {
            String deployableXml = toCamunda8Bpmn(request.bpmnXml());
            BpmnMetadata metadata = extractMetadata(deployableXml, resourceName);
            DeploymentEvent deployment = requireClient().newDeployResourceCommand()
                    .addResourceStringUtf8(deployableXml, resourceName)
                    .send()
                    .join();

            String deploymentId = String.valueOf(deployment.getKey());
            deployments.put(deploymentId, new ManagedDeployment(deploymentId, resourceName, Instant.now()));
            int deployedDefinitions = 0;
            for (Process process : deployment.getProcesses()) {
                String key = process.getBpmnProcessId();
                String numericKey = String.valueOf(process.getProcessDefinitionKey());
                ManagedDefinition managed = new ManagedDefinition(
                        numericKey,
                        key,
                        metadata.name(),
                        process.getVersion(),
                        deploymentId,
                        process.getResourceName(),
                        deployableXml
                );
                definitions.put(key, managed);
                definitions.put(numericKey, managed);
                deployedDefinitions++;
            }

            if (deployedDefinitions == 0) {
                definitions.put(metadata.key(), new ManagedDefinition(
                        metadata.key(),
                        metadata.key(),
                        metadata.name(),
                        1,
                        deploymentId,
                        resourceName,
                        deployableXml
                ));
            }

            return new WorkflowDefinitionDeploymentResponse(deploymentId, resourceName, Math.max(deployedDefinitions, 1));
        } catch (RuntimeException ex) {
            throw new BadRequestAlertException(
                    "BPMN deployment failed: " + ex.getMessage(),
                    ENTITY_NAME,
                    "deploymentFailed"
            );
        }
    }

    private CamundaClient requireClient() {
        CamundaClient client = camundaClient.getIfAvailable();
        if (client == null) {
            throw new BadRequestAlertException(
                    "Camunda 8 client is disabled or not configured.",
                    ENTITY_NAME,
                    "camundaClientUnavailable"
            );
        }
        return client;
    }

    private List<WorkflowDefinitionSummaryResponse> listCamundaDefinitions() {
        try {
            Map<String, Object> body = Map.of(
                    "filter", Map.of(),
                    "sort", List.of(Map.of("field", "version", "order", "DESC")));
            Map<String, Object> result = postJson("/v2/process-definitions/search", body);
            return extractCamundaDefinitions(result).stream()
                    .map(definition -> new WorkflowDefinitionSummaryResponse(
                            definition.processDefinitionKey(),
                            definition.processDefinitionId(),
                            definition.name(),
                            definition.version(),
                            definition.processDefinitionKey(),
                            definition.resourceName(),
                            false
                    ))
                    .toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private CamundaDefinition findLatestCamundaDefinition(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return null;
        }

        CamundaDefinition byBpmnId = searchLatestCamundaDefinition(Map.of("processDefinitionId", identifier));
        if (byBpmnId != null) {
            return byBpmnId;
        }

        if (identifier.matches("\\d+")) {
            return searchLatestCamundaDefinition(Map.of("processDefinitionKey", Long.parseLong(identifier)));
        }

        return null;
    }

    private CamundaDefinition searchLatestCamundaDefinition(Map<String, Object> filter) {
        try {
            Map<String, Object> body = Map.of(
                    "filter", filter,
                    "sort", List.of(Map.of("field", "version", "order", "DESC")));
            Map<String, Object> result = postJson("/v2/process-definitions/search", body);
            List<CamundaDefinition> found = extractCamundaDefinitions(result);
            return found.isEmpty() ? null : found.getFirst();
        } catch (Exception ex) {
            log.warn("Camunda definition search failed filter={}: {}", filter, ex.getMessage());
            return null;
        }
    }

    private String getCamundaDefinitionXml(String processDefinitionKey) {
        if (processDefinitionKey == null || processDefinitionKey.isBlank()) {
            return null;
        }
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(operateBaseUrl + "/v1/process-definitions/" + processDefinitionKey + "/xml"))
                    .header("Accept", "application/xml, text/xml, application/json, */*")
                    .header("Authorization", operateBasicAuth)
                    .GET()
                    .build();

            HttpResponse<String> response = operateHttp.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("Camunda XML fetch failed key={} status={}", processDefinitionKey, response.statusCode());
                return null;
            }

            String body = response.body();
            if (body == null || body.isBlank()) {
                return null;
            }

            String trimmed = body.trim();
            if (trimmed.startsWith("{")) {
                Map<?, ?> payload = objectMapper.readValue(trimmed, Map.class);
                Object xml = payload.get("bpmn20Xml");
                if (xml == null) {
                    xml = payload.get("bpmnXml");
                }
                if (xml == null) {
                    xml = payload.get("xml");
                }
                return xml != null ? String.valueOf(xml) : null;
            }

            if (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) {
                return trimmed;
            }

            log.warn("Camunda XML fetch returned unexpected payload for key={}", processDefinitionKey);
            return null;
        } catch (Exception ex) {
            log.warn("Camunda XML fetch error key={}: {}", processDefinitionKey, ex.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> postJson(String path, Object body) throws IOException, InterruptedException {
        String bodyJson = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(operateBaseUrl + path))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("Authorization", operateBasicAuth)
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                .build();

        HttpResponse<String> response = operateHttp.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            return Map.of();
        }
        return objectMapper.readValue(response.body(), Map.class);
    }

    @SuppressWarnings("unchecked")
    private static List<CamundaDefinition> extractCamundaDefinitions(Map<String, Object> result) {
        if (result == null) {
            return List.of();
        }
        Object items = result.get("items");
        if (!(items instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
                .filter(item -> item instanceof Map)
                .map(item -> {
                    Map<String, Object> definition = (Map<String, Object>) item;
                    return new CamundaDefinition(
                            getString(definition, "processDefinitionKey", ""),
                            getString(definition, "processDefinitionId", ""),
                            getString(definition, "name", null),
                            getInt(definition, "version", 0),
                            getString(definition, "resourceName", null)
                    );
                })
                .filter(definition -> !definition.processDefinitionId().isBlank())
                .toList();
    }

    private static String getString(Map<String, Object> map, String key, String defaultValue) {
        Object value = map.get(key);
        return value != null ? String.valueOf(value) : defaultValue;
    }

    private static int getInt(Map<String, Object> map, String key, int defaultValue) {
        Object value = map.get(key);
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value != null) {
            try {
                return Integer.parseInt(String.valueOf(value));
            } catch (NumberFormatException ignored) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    private static String normalizeResourceName(String name) {
        String trimmed = name.trim();
        return trimmed.endsWith(".bpmn") ? trimmed : trimmed + ".bpmn";
    }

    private static String toCamunda8Bpmn(String bpmnXml) {
        try {
            Document document = parseXml(bpmnXml);
            Element root = document.getDocumentElement();
            if (!root.hasAttribute("xmlns:zeebe")) {
                root.setAttributeNS(XMLConstants.XMLNS_ATTRIBUTE_NS_URI, "xmlns:zeebe", ZEEBE_NS);
            }

            NodeList tasks = document.getElementsByTagNameNS(BPMN_NS, "serviceTask");
            for (int i = 0; i < tasks.getLength(); i++) {
                Element task = (Element) tasks.item(i);
                String taskType = inferTaskType(task);
                task.removeAttribute("camunda:delegateExpression");
                task.removeAttributeNS("http://camunda.org/schema/1.0/bpmn", "delegateExpression");
                task.removeAttribute("zeebe:taskDefinition:type");
                task.removeAttributeNS(ZEEBE_NS, "taskDefinition:type");
                applyZeebeTaskDefinition(document, task, taskType);
            }

            NodeList processes = document.getElementsByTagNameNS(BPMN_NS, "process");
            for (int i = 0; i < processes.getLength(); i++) {
                Element process = (Element) processes.item(i);
                process.removeAttribute("camunda:historyTimeToLive");
                process.removeAttributeNS("http://camunda.org/schema/1.0/bpmn", "historyTimeToLive");
            }

            return writeXml(document);
        } catch (IOException | ParserConfigurationException | SAXException | TransformerException ex) {
            throw new BadRequestAlertException(
                    "Invalid BPMN XML: " + ex.getMessage(),
                    ENTITY_NAME,
                    "invalidBpmnXml"
            );
        }
    }

    private static String inferTaskType(Element task) {
        NodeList taskDefinitions = task.getElementsByTagNameNS(ZEEBE_NS, "taskDefinition");
        for (int i = 0; i < taskDefinitions.getLength(); i++) {
            Element taskDefinition = (Element) taskDefinitions.item(i);
            String type = taskDefinition.getAttribute("type");
            if (!type.isBlank()) {
                return type;
            }
        }

        String invalidZeebeType = task.getAttribute("zeebe:taskDefinition:type");
        if (!invalidZeebeType.isBlank()) {
            return invalidZeebeType;
        }

        String zeebeType = task.getAttributeNS(ZEEBE_NS, "type");
        if (!zeebeType.isBlank()) {
            return zeebeType;
        }
        String delegateExpression = task.getAttributeNS("http://camunda.org/schema/1.0/bpmn", "delegateExpression");
        if (delegateExpression.contains("camelHttpCall")) {
            return "camel-http-call";
        }
        String name = task.getAttribute("name");
        if (name.toLowerCase().contains("http")) {
            return "camel-http-call";
        }
        return "call-vets-service";
    }

    private static void applyZeebeTaskDefinition(Document document, Element task, String taskType) {
        Element extensionElements = getOrCreateExtensionElements(document, task);
        NodeList existingDefinitions = extensionElements.getElementsByTagNameNS(ZEEBE_NS, "taskDefinition");
        for (int i = existingDefinitions.getLength() - 1; i >= 0; i--) {
            Node existing = existingDefinitions.item(i);
            existing.getParentNode().removeChild(existing);
        }

        Element taskDefinition = document.createElementNS(ZEEBE_NS, "zeebe:taskDefinition");
        taskDefinition.setAttribute("type", taskType);
        extensionElements.appendChild(taskDefinition);
    }

    private static Element getOrCreateExtensionElements(Document document, Element task) {
        NodeList children = task.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node child = children.item(i);
            if (child instanceof Element element
                    && BPMN_NS.equals(element.getNamespaceURI())
                    && "extensionElements".equals(element.getLocalName())) {
                return element;
            }
        }

        Element extensionElements = document.createElementNS(BPMN_NS, "bpmn:extensionElements");
        Node firstChild = task.getFirstChild();
        if (firstChild == null) {
            task.appendChild(extensionElements);
        } else {
            task.insertBefore(extensionElements, firstChild);
        }
        return extensionElements;
    }

    private static BpmnMetadata extractMetadata(String bpmnXml, String resourceName) {
        try {
            Document document = parseXml(bpmnXml);
            NodeList processes = document.getElementsByTagNameNS(BPMN_NS, "process");
            if (processes.getLength() == 0) {
                return new BpmnMetadata(resourceName.replace(".bpmn", ""), resourceName);
            }
            Element process = (Element) processes.item(0);
            String key = process.getAttribute("id");
            String name = process.getAttribute("name");
            return new BpmnMetadata(key.isBlank() ? resourceName.replace(".bpmn", "") : key, name.isBlank() ? key : name);
        } catch (IOException | ParserConfigurationException | SAXException ex) {
            throw new BadRequestAlertException(
                    "Invalid BPMN XML: " + ex.getMessage(),
                    ENTITY_NAME,
                    "invalidBpmnXml"
            );
        }
    }

    private static Document parseXml(String bpmnXml) throws ParserConfigurationException, IOException, SAXException {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        return factory.newDocumentBuilder().parse(new InputSource(new StringReader(bpmnXml)));
    }

    private static String writeXml(Document document) throws TransformerException {
        TransformerFactory transformerFactory = TransformerFactory.newInstance();
        transformerFactory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        transformerFactory.setAttribute(XMLConstants.ACCESS_EXTERNAL_STYLESHEET, "");
        var transformer = transformerFactory.newTransformer();
        transformer.setOutputProperty(OutputKeys.ENCODING, StandardCharsets.UTF_8.name());
        transformer.setOutputProperty(OutputKeys.INDENT, "yes");

        StringWriter writer = new StringWriter();
        transformer.transform(new DOMSource(document), new StreamResult(writer));
        return writer.toString();
    }

    private static String newDiagram(String processDefinitionKey) {
        String safeKey = processDefinitionKey.replaceAll("[^A-Za-z0-9_\\-]", "_");
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                                  id="Definitions_%1$s"
                                  targetNamespace="http://mss301.petclinic/workflow">
                  <bpmn:process id="%1$s" name="%1$s" isExecutable="true">
                    <bpmn:startEvent id="StartEvent_1" name="Start">
                      <bpmn:outgoing>Flow_1</bpmn:outgoing>
                    </bpmn:startEvent>
                    <bpmn:serviceTask id="ServiceTask_1" name="Call Vets Service">
                      <bpmn:incoming>Flow_1</bpmn:incoming>
                      <bpmn:outgoing>Flow_2</bpmn:outgoing>
                    </bpmn:serviceTask>
                    <bpmn:endEvent id="EndEvent_1" name="Done">
                      <bpmn:incoming>Flow_2</bpmn:incoming>
                    </bpmn:endEvent>
                    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="ServiceTask_1" />
                    <bpmn:sequenceFlow id="Flow_2" sourceRef="ServiceTask_1" targetRef="EndEvent_1" />
                  </bpmn:process>
                  <bpmndi:BPMNDiagram id="BPMNDiagram_%1$s">
                    <bpmndi:BPMNPlane id="BPMNPlane_%1$s" bpmnElement="%1$s">
                      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
                        <dc:Bounds x="150" y="120" width="36" height="36" />
                      </bpmndi:BPMNShape>
                      <bpmndi:BPMNShape id="ServiceTask_1_di" bpmnElement="ServiceTask_1">
                        <dc:Bounds x="260" y="98" width="140" height="80" />
                      </bpmndi:BPMNShape>
                      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
                        <dc:Bounds x="480" y="120" width="36" height="36" />
                      </bpmndi:BPMNShape>
                      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
                        <di:waypoint x="186" y="138" />
                        <di:waypoint x="260" y="138" />
                      </bpmndi:BPMNEdge>
                      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
                        <di:waypoint x="400" y="138" />
                        <di:waypoint x="480" y="138" />
                      </bpmndi:BPMNEdge>
                    </bpmndi:BPMNPlane>
                  </bpmndi:BPMNDiagram>
                </bpmn:definitions>
                """.formatted(safeKey);
    }

    private record BpmnMetadata(String key, String name) {}

    private record ManagedDeployment(String id, String name, Instant deployedAt) {}

    private record CamundaDefinition(
            String processDefinitionKey,
            String processDefinitionId,
            String name,
            int version,
            String resourceName
    ) {}

    private record ManagedDefinition(
            String id,
            String key,
            String name,
            int version,
            String deploymentId,
            String resourceName,
            String bpmnXml
    ) {}
}
