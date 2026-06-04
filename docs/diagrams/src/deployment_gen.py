# -*- coding: utf-8 -*-
"""Figure: PCMS GKE Deployment Architecture.

Pro split — stateless services on GKE, stateful infra + observability on VMs.
Run:    python docs/diagrams/src/deployment_gen.py
Output: docs/diagrams/out/deployment.png
"""
from diagrams import Diagram, Cluster, Edge
from diagrams.gcp.compute import KubernetesEngine, ComputeEngine
from diagrams.gcp.network import LoadBalancing
from diagrams.gcp.storage import GCS
from diagrams.gcp.devtools import ContainerRegistry
from diagrams.programming.framework import Spring, React
from diagrams.programming.language import Go
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.queue import RabbitMQ
from diagrams.onprem.monitoring import Grafana, Prometheus
from diagrams.onprem.logging import Loki
from diagrams.onprem.tracing import Tempo
from diagrams.elastic.elasticsearch import Elasticsearch
from diagrams.generic.storage import Storage
from diagrams.onprem.client import Users
from diagrams.onprem.compute import Server
from diagrams.custom import Custom

from pathlib import Path
# graphviz needs ABSOLUTE image paths (relative paths silently render blank on Windows)
_IC = (Path(__file__).resolve().parent.parent / "icons").as_posix() + "/"

graph_attr = {"fontsize": "26", "fontname": "Arial", "bgcolor": "white",
              "pad": "0.6", "nodesep": "0.45", "ranksep": "1.1", "splines": "spline", "labelloc": "t"}
node_attr = {"fontsize": "14", "fontname": "Arial"}
edge_attr = {"fontsize": "12", "fontname": "Arial", "color": "#5a5a5a"}

BLUE = "#1971c2"
GRAY = "#868e96"
DASH = "#adb5bd"

with Diagram("PCMS Deployment Architecture (GKE)", filename="docs/diagrams/out/deployment",
             outformat="png", show=False, direction="TB",
             graph_attr=graph_attr, node_attr=node_attr, edge_attr=edge_attr):

    users = Users("Users\n(Owner · Staff · Vet · Admin)")

    with Cluster("External", graph_attr={"bgcolor": "#f8f9fa"}):
        llm = Custom("LLM Provider\n(OpenRouter / OpenAI)", _IC + "openrouter.png")
        smtp = Custom("SMTP Server", _IC + "gmail.png")

    with Cluster("Google Cloud Project (one VPC)", graph_attr={"bgcolor": "#eef3fb"}):
        lb = LoadBalancing("HTTP(S) LB\n+ GKE Ingress")
        spa = GCS("Frontend SPA\n(Cloud Storage + CDN)")
        ar = ContainerRegistry("Artifact Registry")

        with Cluster("GKE cluster — stateless (e2-standard-8)", graph_attr={"bgcolor": "#e7f5ff"}):
            gateway = Spring("api-gateway")
            with Cluster("platform", graph_attr={"bgcolor": "#d0ebff"}):
                cfg = Spring("config-server")
                disco = Spring("discovery\n(Eureka)")
                admin = Spring("admin-server")
            with Cluster("services", graph_attr={"bgcolor": "#d0ebff"}):
                auth = Spring("auth")
                customers = Spring("customers")
                vets = Spring("vets")
                visits = Spring("visits")
                reviews = Spring("reviews")
                genai = Spring("genai")
                mcp = Spring("mcp-server")
                workflow = Spring("workflow")
                products = Spring("products")
                billing = Spring("billing")
                mailer = Go("mailer")
                files = Go("files-service")
            alloy = Prometheus("Alloy\n(DaemonSet)")

        with Cluster("Data / Infra VM (e2-standard-8)", graph_attr={"bgcolor": "#ebfbee"}):
            pg = PostgreSQL("Postgres 18\n+ pgvector")
            mq = RabbitMQ("RabbitMQ")
            redis = Redis("Redis")
            minio = Custom("MinIO", _IC + "minio.png")
            camunda = Custom("Camunda 8", _IC + "camunda.png")
            es = Elasticsearch("Elasticsearch")

        with Cluster("Observability VM (e2-standard-4)", graph_attr={"bgcolor": "#fff0f6"}):
            grafana = Grafana("Grafana")
            prom = Prometheus("Prometheus")
            loki = Loki("Loki")
            tempo = Tempo("Tempo")

    # ---- ingress / frontend ----
    users >> Edge(label="HTTPS", color=BLUE) >> lb >> Edge(color=BLUE) >> gateway
    users >> Edge(label="static", color=BLUE) >> spa
    ar >> Edge(label="image pull", color=DASH, style="dashed") >> gateway

    # ---- persistence (representative; all services use the Data VM) ----
    auth >> Edge(label="JDBC · AMQP · cache · S3\n(all services)", color=GRAY) >> pg
    visits >> Edge(color=GRAY) >> mq
    billing >> Edge(color=GRAY) >> pg
    products >> Edge(color=GRAY) >> pg
    files >> Edge(label="media · PDF", color=GRAY) >> minio
    workflow >> Edge(label="gRPC", color=GRAY) >> camunda
    camunda >> Edge(color=DASH, style="dashed") >> es
    gateway >> Edge(label="rate-limit", color=GRAY, style="dashed") >> redis

    # ---- telemetry ----
    alloy >> Edge(label="metrics", color=GRAY) >> prom
    alloy >> Edge(label="logs", color=GRAY) >> loki
    visits >> Edge(label="OTLP traces\n(all services)", color=GRAY) >> tempo
    grafana >> Edge(color=DASH, style="dashed") >> prom
    tempo >> Edge(label="S3 backend", color=DASH, style="dashed") >> minio

    # ---- external ----
    genai >> Edge(label="completion · embed", color=GRAY) >> llm
    mailer >> Edge(label="email", color=GRAY) >> smtp

print("rendered docs/diagrams/out/deployment.png")
