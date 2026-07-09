# -*- coding: utf-8 -*-
"""Tiny draw.io XML builder + exporter (native shapes, no embedded images)."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXE = str(ROOT / "tools/drawio/app/draw.io.exe")
VALIDATE = ROOT / ".claude/skills/drawio-skill/scripts/validate.py"

def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;").replace("\n", "&#xa;"))

class Canvas:
    def __init__(self):
        self.cells = []
        self._id = 1
    def nid(self, hint=None):
        if hint: return hint
        self._id += 1
        return f"n{self._id}"
    def raw(self, s): self.cells.append(s)
    def box(self, id, label, x, y, w, h, style, parent="1"):
        self.cells.append(
            f'<mxCell id="{id}" value="{esc(label)}" style="{style}" vertex="1" parent="{parent}">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
        return id
    def actor(self, id, label, x, y, fill="#dae8fc", stroke="#4c6ef5", w=46, h=78):
        st = (f"shape=umlActor;html=1;verticalLabelPosition=bottom;verticalAlign=top;"
              f"outlineConnect=0;fillColor={fill};strokeColor={stroke};fontSize=12;"
              f"fontStyle=1;fontColor=#1a1a1a;")
        return self.box(id, label, x, y, w, h, st)
    def usecase(self, id, label, x, y, w=156, h=54, fill="#e7f5ff", stroke="#1971c2"):
        st = (f"ellipse;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};"
              f"fontSize=11;fontColor=#0b3d66;")
        return self.box(id, label, x, y, w, h, st)
    def rrect(self, id, label, x, y, w, h, fill, stroke, fontsize=12, bold=False,
              valign="middle", align="center"):
        st = (f"rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor={fill};"
              f"strokeColor={stroke};fontSize={fontsize};fontColor=#1a1a1a;"
              f"verticalAlign={valign};align={align};{'fontStyle=1;' if bold else ''}")
        return self.box(id, label, x, y, w, h, st)
    def band(self, id, label, x, y, w, h, fill, stroke):
        st = (f"rounded=1;arcSize=3;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};"
              f"verticalAlign=top;align=left;spacingLeft=12;spacingTop=7;fontSize=13;fontStyle=1;"
              f"fontColor={stroke};")
        return self.box(id, label, x, y, w, h, st)
    def boundary(self, id, label, x, y, w, h, stroke="#888"):
        st = (f"rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor={stroke};"
              f"verticalAlign=top;align=center;fontSize=14;fontStyle=2;fontColor={stroke};"
              f"dashed=0;spacingTop=6;")
        return self.box(id, label, x, y, w, h, st)
    def text(self, id, label, x, y, w, h, fontsize=12, bold=False, color="#1a1a1a", align="center"):
        st = (f"text;html=1;align={align};verticalAlign=middle;fontSize={fontsize};"
              f"fontColor={color};{'fontStyle=1;' if bold else ''}")
        return self.box(id, label, x, y, w, h, st)
    def edge(self, s, t, label="", color="#5a5a5a", dashed=False, arrow="block",
             start="none", style="orthogonal", ex=None, ey=None, tx=None, ty=None,
             fontsize=10, dx=0):
        self._id += 1
        es = {"orthogonal": "edgeStyle=orthogonalEdgeStyle;rounded=1;",
              "straight": "", "curved": "edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;"}[style]
        extra = ""
        if ex is not None: extra += f"exitX={ex};exitY={ey};exitDx=0;exitDy=0;"
        if tx is not None: extra += f"entryX={tx};entryY={ty};entryDx=0;entryDy=0;"
        st = (f"{es}html=1;endArrow={arrow};startArrow={start};endFill={'1' if arrow=='block' else '0'};"
              f"strokeColor={color};fontSize={fontsize};fontColor=#444;{'dashed=1;' if dashed else ''}{extra}")
        self.cells.append(
            f'<mxCell id="e{self._id}" value="{esc(label)}" style="{st}" edge="1" parent="1" '
            f'source="{s}" target="{t}"><mxGeometry relative="1" as="geometry">'
            + (f'<mxPoint x="{dx}" y="0" as="offset"/>' if dx else '') +
            f'</mxGeometry></mxCell>')
    def build(self, w, h, title=None):
        head = ""
        if title:
            head = (f'<mxCell id="title" value="{esc(title)}" '
                    f'style="text;html=1;align=center;fontSize=20;fontStyle=1;fontColor=#1864ab;" '
                    f'vertex="1" parent="1"><mxGeometry x="20" y="16" width="{w-40}" height="32" '
                    f'as="geometry"/></mxCell>')
        return ('<?xml version="1.0" encoding="UTF-8"?>\n'
                '<mxfile host="drawio" version="26.0.0"><diagram name="d">'
                f'<mxGraphModel dx="1200" dy="800" grid="0" gridSize="10" guides="1" '
                f'tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" '
                f'pageWidth="{w}" pageHeight="{h}" math="0" shadow="0"><root>'
                '<mxCell id="0"/><mxCell id="1" parent="0"/>' + head + ''.join(self.cells) +
                '</root></mxGraphModel></diagram></mxfile>')

def emit(canvas, w, h, title, drawio_path, png_path, width=2200):
    xml = canvas.build(w, h, title)
    Path(drawio_path).write_text(xml, encoding="utf-8")
    v = subprocess.run(["python", str(VALIDATE), str(drawio_path)], capture_output=True, text=True)
    last = (v.stdout + v.stderr).strip().splitlines()
    print("validate:", last[-1] if last else "ok")
    r = subprocess.run([EXE, "-x", "-f", "png", "--no-sandbox", "--width", str(width),
                        "-o", str(png_path), str(drawio_path)],
                       capture_output=True, text=True, timeout=180)
    print("export rc:", r.returncode, "->", png_path, (r.stderr[-160:] if r.returncode else ""))
