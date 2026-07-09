# -*- coding: utf-8 -*-
"""PCMS System Context diagram + Core Business Process strip."""
from _dio import Canvas, emit
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
c = Canvas()
W, H = 1480, 1080

# ---------- central system ----------
SXc, SYc = 740, 430
c.rrect("sys", "PetClinic Management System (PCMS)\n\nReact SPA  ·  API Gateway  ·  16 Spring Cloud microservices\nPostgreSQL · RabbitMQ · Redis · MinIO",
        SXc-200, SYc-90, 400, 180, "#d0ebff", "#1864ab", fontsize=13, bold=True)

# ---------- external entities ----------
def entity(id, label, x, y, fill, stroke, w=180, h=72):
    c.rrect(id, label, x, y, w, h, fill, stroke, fontsize=12, bold=True)

# human actors (corners/sides)
entity("e_owner", "Pet Owner\n(Customer)",   120,  150, "#e7f5ff", "#1971c2")
entity("e_vet",   "Veterinarian",            120,  430, "#ebfbee", "#2f9e44")
entity("e_staff", "Clinic Staff\n(Receptionist)", 1180, 150, "#f3f0ff", "#7048e8")
entity("e_admin", "Administrator",           1180, 430, "#ffe3e3", "#e03131")
# external systems (bottom + top)
entity("e_store", "Object Storage\n(MinIO / S3)",   120,  690, "#fff9db", "#f08c00")
entity("e_mail",  "Email / SMTP\n(notifications)",  490,  720, "#fff3bf", "#e8590c")
entity("e_pay",   "Payment /\nBank Channel",        760,  720, "#ffe8cc", "#e8590c")
entity("e_llm",   "LLM Provider\n(OpenRouter / OpenAI)", 1180, 690, "#e9ecef", "#495057")

BLUE, GRN, PUR, RED, ORG, GRY = "#1971c2","#2f9e44","#7048e8","#e03131","#e8590c","#868e96"
def flow(a, b, label, color, dashed=False, both=False, fs=10):
    c.edge(a, b, label=label, color=color, dashed=dashed, arrow="block",
           start=("block" if both else "none"), style="straight", fontsize=fs)

# human → system (requests) and system → human (responses) summarized on one bidirectional arrow
flow("e_owner", "sys", "book · manage pets · pay · chat   /   confirmations · prescriptions · AI replies", BLUE, both=True)
flow("e_vet",   "sys", "diagnose · prescribe · set schedule   /   appointments · ratings", GRN, both=True)
flow("e_staff", "sys", "manage owners/vets · invoices · moderate", PUR, both=True)
flow("e_admin", "sys", "catalog · account links · AI & workflow config", RED, both=True)
# system → external systems
flow("sys", "e_store", "store / fetch photos · prescription PDFs", ORG, both=True)
flow("sys", "e_mail",  "send booking &amp; receipt emails", ORG)
flow("sys", "e_pay",   "checkout reference", ORG)
flow("sys", "e_llm",   "prompt + RAG embeddings   /   completions", GRY, both=True)

# ---------- business process strip ----------
PY = 900
c.text("bp_t", "Core Business Process — Visit-to-Payment lifecycle (event-driven choreography + saga)",
       60, PY-30, W-120, 24, fontsize=14, bold=True, color="#1864ab", align="left")
steps = [
    ("Book\nAppointment", "#e7f5ff", "#1971c2", "Owner"),
    ("Approve\nBooking", "#f3f0ff", "#7048e8", "Staff / Camunda"),
    ("Start\nExamination", "#ebfbee", "#2f9e44", "Vet"),
    ("Complete Visit\n&amp; Diagnose", "#ebfbee", "#2f9e44", "Vet"),
    ("Issue\nPrescription", "#ebfbee", "#2f9e44", "Vet"),
    ("Auto-build\nInvoice", "#fff9db", "#f08c00", "events → Billing"),
    ("Checkout\n&amp; Pay", "#ffe8cc", "#e8590c", "Staff / Owner"),
    ("Email\nReceipt", "#fff3bf", "#e8590c", "Mailer (saga)"),
]
n = len(steps); gap = 14
sw = (W - 120 - gap * (n - 1)) / n
x = 60
ids = []
for i, (label, fill, stroke, who) in enumerate(steps):
    sid = f"bp{i}"
    st = (f"shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;"
          f"fillColor={fill};strokeColor={stroke};fontSize=11;fontStyle=1;fontColor=#1a1a1a;")
    c.box(sid, label, int(x), PY, int(sw), 64, st)
    c.text(f"who{i}", who, int(x), PY+66, int(sw), 18, fontsize=9, color="#666")
    ids.append(sid)
    x += sw + gap
for i in range(n-1):
    c.edge(ids[i], ids[i+1], color="#888", arrow="block", style="straight",
           ex=1, ey=0.5, tx=0, ty=0.5)

emit(c, W, H, "PCMS — Application Context &amp; Core Business Process",
     ROOT / "docs/diagrams/out/context.drawio",
     ROOT / "docs/diagrams/out/context.png", width=2300)
