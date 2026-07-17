#!/usr/bin/env python3
"""
build_pdf.py - Genera PDFs (free y vip) de una jornada de CuadroPerfecto.

Uso:
  python3 build_pdf.py --jornada-id valencia-18-07-2026 \
      --jornadas-json ../data/jornadas.json \
      --out-dir ../assets/pdf

El PDF "free" trae solo las bombas del dia (gancho para captar el email).
El PDF "vip" trae el analisis completo (lineas fijas + cuadro 5y6 + bombas).
"""
import argparse
import json
import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)

GOLD = colors.HexColor("#f59e0b")
DARK = colors.HexColor("#0a0a1a")
MUTED = colors.HexColor("#6b7280")


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "TituloPrincipal", parent=styles["Title"], textColor=DARK, fontSize=22, spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        "Subtitulo", parent=styles["Normal"], textColor=GOLD, fontSize=13, spaceAfter=14,
    ))
    styles.add(ParagraphStyle(
        "Seccion", parent=styles["Heading2"], textColor=DARK, fontSize=15, spaceBefore=16, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        "Clave", parent=styles["Normal"], textColor=MUTED, fontSize=9, spaceAfter=10, leftIndent=8,
    ))
    return styles


def linea_fija_table(carrera, styles):
    rows = [["#", "Ejemplar", "Pts", ""]]
    for h in carrera.get("top3", []):
        rows.append([str(h["pos"]) + "°", f"#{h['dorsal']} {h['nombre']}", f"{h['pts']} pts", h.get("icono", "")])
    tbl = Table(rows, colWidths=[1.5 * cm, 8 * cm, 3 * cm, 1.5 * cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    return tbl


def build_pdf(jornada: dict, out_path: str, mode: str):
    styles = build_styles()
    doc = SimpleDocTemplate(out_path, pagesize=letter,
                             topMargin=2 * cm, bottomMargin=2 * cm,
                             leftMargin=2 * cm, rightMargin=2 * cm)
    story = []

    tag = "VIP — Analisis Completo" if mode == "vip" else "GRATIS — Bombas del Dia"
    story.append(Paragraph(f"ZonaCaliente Pro — {jornada['hipodromo']}", styles["TituloPrincipal"]))
    story.append(Paragraph(f"{jornada['fecha']} · {tag}", styles["Subtitulo"]))
    story.append(Spacer(1, 6))

    if mode == "vip" and jornada.get("lineas_fijas"):
        story.append(Paragraph("Lineas Fijas", styles["Seccion"]))
        for c in jornada["lineas_fijas"]:
            hdr = f"{c['numero']} — {c['distancia']} — {c['hora']} — {c['categoria']}"
            if c.get("bomb_tag"):
                hdr += f"  [{c['bomb_tag']}]"
            story.append(Paragraph(hdr, styles["Heading4"]))
            story.append(linea_fija_table(c, styles))
            if c.get("clave"):
                story.append(Paragraph(f"Clave: {c['clave']}", styles["Clave"]))
            story.append(Spacer(1, 8))

    if mode == "vip" and jornada.get("validas"):
        story.append(Paragraph("Cuadro Perfecto 5y6", styles["Seccion"]))
        rows = [["Valida", "Carrera", "1a opcion", "2a opcion"]]
        for v in jornada["validas"]:
            top = f"#{v['top']['dorsal']} {v['top']['nombre']} ({v['top']['pts']}pts)"
            alt = f"#{v['alt']['dorsal']} {v['alt']['nombre']} ({v['alt']['pts']}pts)"
            rows.append([v["v"], f"{v['carrera']} {v['hora']}", top, alt])
        tbl = Table(rows, colWidths=[1.8 * cm, 3.2 * cm, 5.5 * cm, 5.5 * cm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), DARK),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ]))
        story.append(tbl)
        story.append(Spacer(1, 6))
        if jornada.get("jugada_combos"):
            combos = " - ".join(jornada["jugada_combos"])
            story.append(Paragraph(f"<b>Jugada Oficial:</b> {combos}", styles["Normal"]))
            story.append(Paragraph(jornada.get("jugada_info", ""), styles["Clave"]))

    if jornada.get("bombas"):
        story.append(Paragraph("Bombas del Dia", styles["Seccion"]))
        rows = [["#", "Ejemplar", "Carrera", "Pts"]]
        for b in jornada["bombas"]:
            rows.append([str(b["rank"]), f"#{b['dorsal']} {b['nombre']}", f"{b['carrera']} {b['hora']}", str(b["pts"])])
        tbl = Table(rows, colWidths=[1 * cm, 7 * cm, 4 * cm, 2 * cm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), GOLD),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ]))
        story.append(tbl)

    if mode == "free":
        story.append(Spacer(1, 20))
        story.append(Paragraph(
            "Este es el reporte gratuito (solo bombas). El analisis completo con lineas fijas, "
            "cuadro perfecto 5y6 y jugada oficial esta disponible en la version VIP en cuadroperfecto.com",
            styles["Clave"],
        ))

    story.append(Spacer(1, 20))
    story.append(Paragraph("cuadroperfecto.com — Sistema La Vencida", styles["Clave"]))

    doc.build(story)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jornada-id", required=True)
    ap.add_argument("--jornadas-json", default="data/jornadas.json")
    ap.add_argument("--out-dir", default="assets/pdf")
    args = ap.parse_args()

    with open(args.jornadas_json, encoding="utf-8") as f:
        jornadas = json.load(f)
    jornada = next((j for j in jornadas if j["id"] == args.jornada_id), None)
    if not jornada:
        raise SystemExit(f"No se encontro jornada con id={args.jornada_id}")

    os.makedirs(args.out_dir, exist_ok=True)
    slug = jornada.get("slug", jornada["id"])

    free_path = os.path.join(args.out_dir, f"{slug}_free.pdf")
    vip_path = os.path.join(args.out_dir, f"{slug}_vip.pdf")

    build_pdf(jornada, free_path, "free")
    build_pdf(jornada, vip_path, "vip")

    print(f"OK: {free_path}")
    print(f"OK: {vip_path}")


if __name__ == "__main__":
    main()
