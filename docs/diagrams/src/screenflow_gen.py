# -*- coding: utf-8 -*-
"""PCMS Screen Flow / navigation map (React SPA, TanStack Router)."""
from _dio import Canvas, emit
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
c = Canvas()
W, H = 1560, 1180

def screen(id, label, x, y, fill, stroke, w=150, h=46):
    c.rrect(id, label, x, y, w, h, fill, stroke, fontsize=11)
def start(id, label, x, y, fill, stroke, w=130, h=48):
    st=(f"rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};"
        f"fontSize=11;fontStyle=1;fontColor=#1a1a1a;")
    c.box(id,label,x,y,w,h,st)
def diamond(id,label,x,y,fill,stroke,w=120,h=72):
    st=(f"rhombus;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};"
        f"fontSize=11;fontStyle=1;fontColor=#1a1a1a;")
    c.box(id,label,x,y,w,h,st)
def nav(a,b,label="",color="#5a5a5a",dashed=False,**k):
    c.edge(a,b,label=label,color=color,dashed=dashed,arrow="block",**k)

PUB="#f1f3f5"; PUBS="#868e96"
CUST="#e7f5ff"; CS="#1971c2"
VET="#ebfbee"; VES="#2f9e44"
ADM="#f3f0ff"; AS="#7048e8"

# ---------- PUBLIC band ----------
c.band("b_pub","PUBLIC  (no auth)", 40, 70, W-80, 120, "#f8f9fa", PUBS)
start("s_land","Landing  /", 90, 110, "#ced4da", "#495057")
screen("s_store","Store  /store", 270, 112, PUB, PUBS, w=130)
screen("s_login","Login  /login", 470, 112, "#fff3bf", "#f08c00", w=130)
screen("s_reg","Register  /register", 620, 112, "#fff3bf", "#f08c00", w=140)
screen("s_403","Forbidden  /forbidden", 1330, 112, "#ffe3e3", "#e03131", w=160)
diamond("d_role","Role?", 800, 100, "#ffec99", "#f59f00", w=104, h=66)

nav("s_land","s_login","sign in", ex=1,ey=0.5,tx=0,ty=0.5)
nav("s_land","s_store","shop", dashed=True)
nav("s_reg","s_login","after register", color="#f08c00")
nav("s_login","d_role","authenticated", color="#f08c00", ex=1,ey=0.5,tx=0,ty=0.5)

# ---------- role-gated portal bands (3 stacked) ----------
def portal(bid, title, y, fill, stroke, screens, dash_note):
    c.band(bid, title, 40, y, W-80, 230, fill, stroke)
    # place screens in up to 6 per row
    x0, yy = 70, y+44
    per=8; cw=170; ch=46; gx=6; gy=64
    ids=[]
    for i,(sid,label) in enumerate(screens):
        col=i%per; row=i//per
        sx=x0+col*(cw+gx); sy=yy+row*gy
        screen(sid,label,sx,sy,fill,stroke,w=cw,h=ch)
        ids.append(sid)
    return ids

# Customer portal
cust = [("c_dash","Dashboard  /customer"),("c_book","Book Visit  /book"),
        ("c_pets","My Pets  /pets"),("c_visits","My Visits  /visits"),
        ("c_prof","Profile  /profile"),("c_pay","Payments"),
        ("c_sec","Security"),("c_help","Help / Lang / Notif")]
portal("b_cust","CUSTOMER PORTAL  ·  role USER", 230, CUST, CS, cust, "")
# Vet portal
vet = [("v_dash","Dashboard  /vet"),("v_visits","Visits  /visits"),
       ("v_sched","Schedule  /schedule"),("v_prof","Profile  /profile"),
       ("v_rate","Ratings  /ratings"),("v_badge","Badges  /badges"),
       ("v_set","Settings  /settings"),("v_secn","Security / Notif / Lang")]
portal("b_vet","VETERINARIAN PORTAL  ·  role VET / STAFF", 490, VET, VES, vet, "")
# Admin portal
adm = [("a_dash","Dashboard  /admin"),("a_visits","Visits"),("a_owners","Owners"),
       ("a_pets","Pets"),("a_vets","Vets"),("a_vdet","Vet Detail  /vets/$id"),
       ("a_inv","Invoices"),("a_rev","Vet-Reviews"),("a_dis","Diseases"),
       ("a_prod","Products"),("a_wf","Workflows"),("a_ai","AI Config")]
portal("b_adm","ADMIN / STAFF PORTAL  ·  role ADMIN / STAFF", 750, ADM, AS, adm, "")

# role router -> each portal dashboard
nav("d_role","c_dash","USER", color=CS, ex=0.5,ey=1, tx=0,ty=0)
nav("d_role","v_dash","VET / STAFF", color=VES)
nav("d_role","a_dash","ADMIN / STAFF", color=AS)

# primary in-portal flows (hub = dashboard)
for t,lbl in [("c_book",""),("c_pets",""),("c_visits",""),("c_prof","")]:
    nav("c_dash",t,lbl,color=CS,dashed=True)
nav("c_book","c_visits","after booking",color=CS)
nav("c_visits","c_pay","pay invoice",color=CS,dashed=True)
for t in ["v_visits","v_sched","v_prof","v_rate","v_badge","v_set"]:
    nav("v_dash",t,"",color=VES,dashed=True)
nav("v_visits","v_visits","start→complete→prescribe",color=VES,dashed=True)
for t in ["a_visits","a_owners","a_pets","a_vets","a_inv","a_rev","a_dis","a_prod","a_wf","a_ai"]:
    nav("a_dash",t,"",color=AS,dashed=True)
nav("a_vets","a_vdet","open",color=AS)

# any role wrong -> 403
nav("d_role","s_403","no role match",color="#e03131",dashed=True, ex=1,ey=0.2,tx=0.5,ty=0)

# note
c.text("note","Solid = user action / redirect   ·   Dashed = sidebar navigation   ·   AI Chat widget floats on all authenticated screens",
       40, H-46, W-80, 22, fontsize=11, color="#666")

emit(c, W, H, "PCMS — Screen Flow (React SPA · TanStack Router)",
     ROOT / "docs/diagrams/out/screenflow.drawio",
     ROOT / "docs/diagrams/out/screenflow.png", width=2300)
