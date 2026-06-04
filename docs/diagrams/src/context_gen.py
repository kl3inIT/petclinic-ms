"""Generate Figure 1-1 PCMS System Context.

Classic DFD context diagram:
  * central process drawn as a CIRCLE
  * external entities = equal-size rounded boxes on a rectangular perimeter,
    aligned in rows/columns (3 top, 3 right, 2 left, 2 bottom)
  * TWO separate parallel arrows per entity, each with its OWN label:
        entity -> PCMS  : request   (what the entity sends in)
        PCMS  -> entity : response  (what PCMS sends back)

Run:    python docs/diagrams/src/context_gen.py
Render: neato -Tpng docs/diagrams/src/context.dot -o docs/diagrams/out/context.png
"""
import os

# id -> (box label, request label [in], response label [out])
# aligned to the revised business model (no online shop / cart / payment gateway)
ENT = {
    "guest": ("Guest\\n(Anonymous)",            "browse vets / info",      "vet directory"),
    "owner": ("Pet Owner",                      "book visit · manage pets","visits · invoices · AI"),
    "staff": ("Receptionist\\n(Staff)",         "records · visits · billing","schedule · invoices"),
    "vet":   ("Veterinarian",                   "examine · prescribe · charge","assigned visits · slots"),
    "inv":   ("Inventory Manager",              "products · medicines · stock","catalog · stock levels"),
    "admin": ("System Admin",                   "users · AI · mail",       "metrics · config"),
    "llm":   ("LLM Provider",                   "completion · embed",      "prompt + context"),
    "pay":   ("Bank Transfer\\nChannel",        "transfer confirmation",   "payment reference"),
    "smtp":  ("SMTP Server",                    "delivery status",         "email message"),
    "obj":   ("Object Storage",                 "stored URL",              "upload media / PDF"),
}

# rectangular perimeter (points). x grows right, y grows up.
# generous spacing so each entity's two flow labels have room and never collide.
POS = {
    # TOP row (aligned y)
    "guest": (-620, 640), "owner": (0, 640), "staff": (620, 640),
    # RIGHT column (aligned x)
    "llm": (1060, 380), "pay": (1060, 0), "smtp": (1060, -380),
    # LEFT column (aligned x)
    "vet": (-1060, 200), "inv": (-1060, -200),
    # BOTTOM row (aligned y)
    "admin": (-380, -640), "obj": (380, -640),
}

lines = [
    'digraph context {',
    '  graph [splines=true, overlap=false, outputorder=edgesfirst,',
    '         bgcolor="white", dpi=160];',
    '  node  [fontname="Arial Bold", fontsize=15, fixedsize=true,',
    '         width=2.2, height=0.85];',          # equal-size boxes
    '  edge  [fontname="Arial", fontsize=12, fontcolor="#2b2b2b",',
    '         color="#5a5a5a", penwidth=1.5, arrowsize=0.85];',
    '',
    '  pcms [pos="0,0!", shape=circle, fixedsize=true, width=2.2,',
    '        style="filled,bold", fillcolor="#a5d8ff", color="#1971c2",',
    '        penwidth=4, fontsize=19, fontname="Arial Bold", fontcolor="#0b3d66",',
    '        label="Pet Care\\nManagement\\nSystem\\n(PCMS)"];',
    '',
    '  node [shape=box, style="rounded,filled", fillcolor="#ffe8cc",',
    '        color="#e8820c", penwidth=2.4, fontcolor="#8a4b00"];',
    '',
]

for eid, (label, _i, _o) in ENT.items():
    x, y = POS[eid]
    lines.append(f'  {eid} [pos="{x},{y}!", label="{label}"];')

lines.append('')
lines.append('  // labels sit near the ENTITY end of each spoke (tail/head label)')
lines.append('  // so they fan out around the perimeter instead of piling at center')
for eid, (_label, in_lbl, out_lbl) in ENT.items():
    # request: entity -> PCMS  (label nearer the entity, one side)
    lines.append(f'  {eid} -> pcms [taillabel="{in_lbl}", labeldistance=4.0, labelangle=34];')
    # response: PCMS -> entity (label staggered further out, other side)
    lines.append(f'  pcms -> {eid} [headlabel="{out_lbl}", labeldistance=8.0, labelangle=-34];')
lines.append('}')

out = os.path.join(os.path.dirname(__file__), "context.dot")
with open(out, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
print("wrote", os.path.abspath(out))
