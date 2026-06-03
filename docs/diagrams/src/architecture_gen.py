# -*- coding: utf-8 -*-
"""Figure 1-1: PCMS System Architecture (container view).

Renders a draw.io-style architecture diagram with real service icons using
mingrammer `diagrams` (Graphviz backend).

Run:    python docs/diagrams/src/architecture_gen.py
Output: docs/diagrams/out/architecture.png
"""
from diagrams import Diagram, Cluster, Edge
from diagrams.programming.framework import Spring, React
from diagrams.programming.language import Go
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.queue import RabbitMQ
from diagrams.onprem.network import Kong, Consul
from diagrams.onprem.monitoring import Prometheus, Grafana
from diagrams.onprem.tracing import Jaeger
from diagrams.onprem.compute import Server
from diagrams.onprem.client import Users
from diagrams.generic.storage import Storage

graph_attr = {
    "fontsize": "26", "fontname": "Arial", "bgcolor": "white",
    "pad": "0.6", "nodesep": "0.45", "ranksep": "1.0", "splines": "spline",
    "labelloc": "t",
}
node_attr = {"fontsize": "15", "fontname": "Arial"}
edge_attr = {"fontsize": "12", "fontname": "Arial", "color": "#5a5a5a"}

BLUE = "#1971c2"      # routing
GRAY = "#868e96"      # data / infra
DASH = "#adb5bd"

with Diagram(
    "PCMS System Architecture",
    filename="docs/diagrams/out/architecture",
    outformat="png", show=False, direction="TB",
    graph_attr=graph_attr, node_attr=node_attr, edge_attr=edge_attr,
):
    with Cluster("Client", graph_attr={"bgcolor": "#f1f3f5"}):
        users = Users("Owner · Staff\nVet · Admin")
        web = React("Web SPA\n(React + Vite)")

    gateway = Kong("API Gateway\nJWT · rate-limit · routing")

    with Cluster("Platform", graph_attr={"bgcolor": "#e7f5ff"}):
        eureka = Consul("discovery-server\n(Eureka)")
        config = Spring("config-server")
        admin = Spring("admin-server")
        files = Go("files-service")

    with Cluster("Business Services", graph_attr={"bgcolor": "#fff4e6"}):
        auth = Spring("auth-service")
        customers = Spring("customers-service")
        vets = Spring("vets-service")
        visits = Spring("visits-service")
        reviews = Spring("reviews-service")
        products = Spring("products-service")
        billing = Spring("billing-service")
    biz = [auth, customers, vets, visits, reviews, products, billing]

    with Cluster("AI & Async", graph_attr={"bgcolor": "#f3f0ff"}):
        genai = Spring("genai-service\n(Spring AI · RAG)")
        mcp = Spring("mcp-server")
        workflow = Spring("workflow-service")
        mailer = Go("mailer-service")

    with Cluster("Data & Messaging", graph_attr={"bgcolor": "#ebfbee"}):
        pg = PostgreSQL("PostgreSQL 18\nschema per service")
        mq = RabbitMQ("RabbitMQ")
        redis = Redis("Redis")
        minio = Storage("Object Storage\n(MinIO / S3)")

    with Cluster("External Systems", graph_attr={"bgcolor": "#f8f9fa"}):
        smtp = Server("SMTP Server")
        llm = Server("LLM Provider\n(OpenAI-compatible)")
        bank = Server("Bank Transfer\nChannel")
        with Cluster("Observability", graph_attr={"bgcolor": "#fff0f6"}):
            prom = Prometheus("Prometheus")
            graf = Grafana("Grafana")
            tempo = Jaeger("Tempo")

    # ---- client -> edge ----
    users >> Edge(color=BLUE) >> web >> Edge(label="HTTPS", color=BLUE) >> gateway

    # ---- gateway routing ----
    for s in biz:
        gateway >> Edge(color=BLUE) >> s
    gateway >> Edge(label="/api/v1/ai", color=BLUE) >> genai
    gateway >> Edge(color=BLUE) >> mcp
    gateway >> Edge(label="rate-limit", color=GRAY, style="dashed") >> redis
    gateway >> Edge(label="discovery", color=DASH, style="dashed") >> eureka
    gateway >> Edge(label="metrics · traces", color=DASH, style="dashed") >> prom

    # ---- persistence ----
    for s in biz + [genai]:
        s >> Edge(color=GRAY) >> pg

    # ---- async events ----
    visits >> Edge(label="events", color=GRAY) >> mq
    billing >> Edge(color=GRAY) >> mq
    mq >> Edge(color=GRAY) >> mailer
    workflow >> Edge(color=GRAY, style="dashed") >> visits

    # ---- external ----
    files >> Edge(label="media · PDF", color=GRAY) >> minio
    mailer >> Edge(label="email", color=GRAY) >> smtp
    genai >> Edge(label="completion · embed", color=GRAY) >> llm
    billing >> Edge(label="transfer ref", color=GRAY, style="dashed") >> bank
    prom >> Edge(color=DASH, style="dashed") >> graf

print("rendered docs/diagrams/out/architecture.png")
