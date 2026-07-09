# -*- coding: utf-8 -*-
"""PCMS Use Case Diagram (UML). Actors + system boundary + use cases by area."""
from _dio import Canvas, emit
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
c = Canvas()
W, H = 1640, 1180

# ---- system boundary ----
BX, BY, BW, BH = 330, 90, 980, 1050
c.boundary("sys", "PetClinic Management System (PCMS)", BX, BY, BW, BH, stroke="#868e96")

# ---- use case columns (id, label) ----
# colors per swimlane area
UC_W = 168
COLX = {"A": 410, "B": 720, "C": 1090}   # centers per column -> x = center-UC_W/2
def col_x(k): return COLX[k] - UC_W // 2

ACCOUNT = "#fff9db"; AS = "#f08c00"      # account/shared
CUST = "#e7f5ff"; CS = "#1971c2"         # customer
VET = "#ebfbee"; VES = "#2f9e44"         # vet
OPS = "#f3f0ff"; OPSS = "#7048e8"        # staff/admin ops

# Column A — Account + Customer self-service
colA = [
    ("uc_reg", "Register Account", ACCOUNT, AS),
    ("uc_login", "Login / Logout", ACCOUNT, AS),
    ("uc_prof", "Manage Profile\n&amp; Password", ACCOUNT, AS),
    ("uc_pets", "Manage Pets\n(+ photos)", CUST, CS),
    ("uc_book", "Book Appointment", CUST, CS),
    ("uc_cancel", "Cancel Appointment", CUST, CS),
    ("uc_hist", "View Visit History\n&amp; Prescriptions", CUST, CS),
    ("uc_pay", "View &amp; Pay Invoice", CUST, CS),
    ("uc_review", "Write &amp; Vote Review", CUST, CS),
    ("uc_browse", "Browse Vets / Store", CUST, CS),
    ("uc_chat", "Chat with AI Assistant", CUST, CS),
]
# Column B — Veterinarian
colB = [
    ("uc_sched", "Manage Work Schedule", VET, VES),
    ("uc_start", "Start Examination", VET, VES),
    ("uc_complete", "Complete Visit\n&amp; Diagnose", VET, VES),
    ("uc_presc", "Issue Prescription", VET, VES),
    ("uc_vprof", "Manage Vet Profile", VET, VES),
    ("uc_ratings", "View Ratings &amp; Badges", VET, VES),
]
# Column C — Staff / Admin operations
colC = [
    ("uc_approve", "Approve Visit Booking", OPS, OPSS),
    ("uc_owners", "Manage Owners", OPS, OPSS),
    ("uc_vets", "Manage Vets", OPS, OPSS),
    ("uc_vetrev", "Approve Vet Changes", OPS, OPSS),
    ("uc_inv", "Create &amp; Checkout\nInvoice", OPS, OPSS),
    ("uc_mod", "Moderate Reviews", OPS, OPSS),
    ("uc_catalog", "Manage Catalog\n(Products · Diseases)", OPS, OPSS),
    ("uc_link", "Link User Accounts", OPS, OPSS),
    ("uc_ai", "Configure AI / Workflows", OPS, OPSS),
]
# included use cases (smaller, dashed-target)
INC = [
    ("uc_avail", "Check Vet\nAvailability", CUST, CS),
    ("uc_pdf", "Generate\nPDF", VET, VES),
    ("uc_autoinv", "Auto-append\nInvoice Line", OPS, OPSS),
    ("uc_email", "Send Email\nNotification", ACCOUNT, AS),
]

def stack(col, kx, y0, gap=88):
    for i, (uid, label, fill, stroke) in enumerate(col):
        c.usecase(uid, label, col_x(kx), y0 + i * gap, w=UC_W, h=58, fill=fill, stroke=stroke)

stack(colA, "A", 150)
stack(colB, "B", 150)
stack(colC, "C", 150)
# include UCs placed adjacent to their BASE use case (between columns)
# base uc_book = colA idx4 (y=502); uc_complete = colB idx2 (y=326); uc_presc = colB idx3 (y=414); uc_pay = colA idx7 (y=766)
c.usecase("uc_avail",  INC[0][1], 512, 582, w=112, h=48, fill=CUST, stroke=CS)      # below, in A-B gap
c.usecase("uc_autoinv",INC[2][1], 868, 322, w=128, h=48, fill=OPS, stroke=OPSS)     # right of Complete Visit
c.usecase("uc_pdf",    INC[1][1], 872, 412, w=110, h=48, fill=VET, stroke=VES)      # right of Issue Prescription
c.usecase("uc_email",  INC[3][1], 868, 692, w=120, h=48, fill=ACCOUNT, stroke=AS)   # shared by Pay + Complete

# ---- actors ----
c.actor("a_cust", "Pet Owner\n(Customer)", 70, 250, fill="#d0ebff", stroke="#1971c2")
c.actor("a_vet", "Veterinarian", 70, 620, fill="#d3f9d8", stroke="#2f9e44")
c.actor("a_staff", "Clinic Staff\n(Receptionist)", 1420, 250, fill="#e5dbff", stroke="#7048e8")
c.actor("a_admin", "Administrator", 1420, 640, fill="#ffe3e3", stroke="#e03131")
# secondary (system) actors — right/bottom
c.actor("a_mail", "Email / SMTP", 1430, 980, fill="#fff3bf", stroke="#f08c00")
c.actor("a_pay", "Payment /\nBank Channel", 560, 1090, fill="#ffe8cc", stroke="#e8590c")
c.actor("a_llm", "LLM Provider\n(OpenRouter)", 150, 1090, fill="#e9ecef", stroke="#495057")

# ---- associations ----
def assoc(a, u, **k): c.edge(a, u, arrow="none", color="#888", style="straight", **k)
# customer
for u in ["uc_reg","uc_login","uc_prof","uc_pets","uc_book","uc_cancel","uc_hist","uc_pay","uc_review","uc_browse","uc_chat"]:
    assoc("a_cust", u)
# vet (vets also start; vet does its column)
for u in ["uc_sched","uc_start","uc_complete","uc_presc","uc_vprof","uc_ratings","uc_login","uc_prof"]:
    assoc("a_vet", u)
# staff
for u in ["uc_approve","uc_owners","uc_vets","uc_vetrev","uc_inv","uc_mod","uc_login"]:
    assoc("a_staff", u)
# admin (extends staff + admin-only)
for u in ["uc_catalog","uc_link","uc_ai","uc_owners","uc_vets","uc_mod"]:
    assoc("a_admin", u)
# actor generalization: Admin -> Staff (admin is-a staff superset)
c.edge("a_admin", "a_staff", arrow="block", start="none", color="#e03131", style="straight",
       label="«inherits»")
# secondary actor links
assoc("a_mail", "uc_email")
assoc("a_pay", "uc_pay")
assoc("a_llm", "uc_chat")

# ---- include / extend ----
def include(base, inc): c.edge(base, inc, label="«include»", color="#1971c2", dashed=True, arrow="open", style="straight")
include("uc_book", "uc_avail")
include("uc_presc", "uc_pdf")
include("uc_complete", "uc_autoinv")
include("uc_pay", "uc_email")
include("uc_complete", "uc_email")

# legend
c.text("lg", "Associations —— solid   |   «include» - - - dashed   |   Actor inheritance ▸ Admin specializes Staff",
       330, BY + BH + 6, 980, 22, fontsize=11, color="#666")

emit(c, W, H, "PCMS — Use Case Diagram",
     ROOT / "docs/diagrams/out/usecase.drawio",
     ROOT / "docs/diagrams/out/usecase.png", width=2400)
