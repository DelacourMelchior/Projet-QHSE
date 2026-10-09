#!/usr/bin/env python3
"""
Générateur du Document Planning Gantt de Déploiement SMQ (Cabinet Delacour) :
- PLANNING_GANTT_DEPLOIEMENT_DELACOUR (DOCX, HTML, MD)

Caractéristiques :
- Calendrier visuel sur 6 mois (Horaires Mois 1 à Mois 6 / Semaines S1 à S24).
- Shading de cellules visuel (Brand Green #1B4D3E, Gold #C5A065) pour figurer les barres Gantt.
- Structuré par les 5 Sessions Métiers et intégrant le Top 3 Quick Wins 15j.
- Intégration des Jalons de Gouvernance (COPIL bimensuels 1h & Ateliers Terrain 2x/mois).
- Titres épurés sans émoji ni parenthèses.
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

FONT_SERIF = "Georgia"
FONT_SANS = "Arial"

BRAND_GREEN = RGBColor(0x1B, 0x4D, 0x3E)
ACCENT_GOLD = RGBColor(0xC5, 0xA0, 0x65)
TEXT_DARK   = RGBColor(0x22, 0x22, 0x22)
MUTED_GRAY  = RGBColor(0x55, 0x55, 0x55)

CREAM_BG     = "F9F9F7"
HEADER_BG    = "1B4D3E"
SUBHEADER_BG = "EBEFEA"
THEMES_BG    = "F4F6F4"
BORDER_GOLD  = "C5A065"
BORDER_ACCENT= "D0D7D1"
GANTT_GREEN  = "1B4D3E"
GANTT_GOLD   = "C5A065"
GANTT_GRAY   = "E8ECE9"

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=80, bottom=80, left=100, right=100):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tcPr.append(tcMar)

def set_explicit_cell_width(cell, width_dxa):
    cell.width = width_dxa
    tcPr = cell._tc.get_or_add_tcPr()
    tcW = parse_xml(f'<w:tcW {nsdecls("w")} w:w="{width_dxa}" w:type="dxa"/>')
    tcPr.append(tcW)

def set_cell_border(cell, **kwargs):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}/>')
    for edge in ('top', 'left', 'bottom', 'right'):
        edge_data = kwargs.get(edge)
        if edge_data:
            val = edge_data.get('val', 'single')
            color = edge_data.get('color', 'auto')
            sz = edge_data.get('sz', '4')
            b_xml = parse_xml(f'<w:{edge} {nsdecls("w")} w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>')
            tcBorders.append(b_xml)
        else:
            b_xml = parse_xml(f'<w:{edge} {nsdecls("w")} w:val="none"/>')
            tcBorders.append(b_xml)
    tcPr.append(tcBorders)

# ==============================================================================
# DONNÉES DU PLANNING GANTT (29 ACTIONS ET GOVERNANCE SUR 6 MOIS)
# ==============================================================================

GANTT_TASKS = [
    # Top 3 Quick Wins
    {"type": "header", "title": "PHASE 1 : URGENCES CRITIQUES ET QUICK WINS (MOIS 1 / S1-S4)"},
    {"ref": "Réf 2.2", "task": "Commercial : Validation des devis & calcul de marge (Outil 08)", "m1": True, "m2": False, "m3": False, "m4": False, "m5": False, "m6": False, "resp": "Resp Commercial"},
    {"ref": "Réf 3.1", "task": "Opérations : Gammes opératoires visuelles d'atelier (Outil 14)", "m1": True, "m2": False, "m3": False, "m4": False, "m5": False, "m6": False, "resp": "Chef d'Atelier"},
    {"ref": "Réf 4.1", "task": "RH : Matrice RACI des responsabilités (Outil 20)", "m1": True, "m2": False, "m3": False, "m4": False, "m5": False, "m6": False, "resp": "Responsable RH"},
    {"ref": "Réf 5.1", "task": "Data/IT : Charte informatique & plan de sauvegardes (Outil 25)", "m1": True, "m2": False, "m3": False, "m4": False, "m5": False, "m6": False, "resp": "Responsable IT"},

    # Phase 2 : Standardisation
    {"type": "header", "title": "PHASE 2 : STANDARDISATION ET EXPANSION (MOIS 2 & 3 / S5-S12)"},
    {"ref": "Réf 1.1", "task": "Direction : Matrice SWOT & enjeux stratégiques (Outil 01)", "m1": False, "m2": True, "m3": False, "m4": False, "m5": False, "m6": False, "resp": "Direction"},
    {"ref": "Réf 1.3", "task": "Direction : Grille d'objectifs qualité par service (Outil 03)", "m1": False, "m2": True, "m3": False, "m4": False, "m5": False, "m6": False, "resp": "Direction & QSE"},
    {"ref": "Réf 2.3", "task": "Commercial : Procédure d'avenant de commande (Outil 07)", "m1": False, "m2": True, "m3": False, "m4": False, "m5": False, "m6": False, "resp": "Commercial"},
    {"ref": "Réf 2.4", "task": "Achats : Évaluation initiale des sous-traitants (Outil 09)", "m1": False, "m2": True, "m3": True, "m4": False, "m5": False, "m6": False, "resp": "Resp Achats"},
    {"ref": "Réf 3.2", "task": "Opérations : Traçabilité des lots de fabrication (Outil 12)", "m1": False, "m2": True, "m3": True, "m4": False, "m5": False, "m6": False, "resp": "Prod & Logistique"},
    {"ref": "Réf 3.7", "task": "Opérations : Isolement de la zone rebuts & NC (Outil 18)", "m1": False, "m2": True, "m3": False, "m4": False, "m5": False, "m6": False, "resp": "Qualité Terrain"},
    {"ref": "Réf 3.8", "task": "Opérations : Analyse 5 Pourquoi des non-conformités (Outil 19)", "m1": False, "m2": False, "m3": True, "m4": False, "m5": False, "m6": False, "resp": "Qualité Terrain"},
    {"ref": "Réf 4.2", "task": "RH : Plan de polyvalence & suppléance hommes-clés (Outil 21)", "m1": False, "m2": True, "m3": True, "m4": False, "m5": False, "m6": False, "resp": "Responsable RH"},
    {"ref": "Réf 4.3", "task": "RH : Matrice compétences & habilitations (Outil 22)", "m1": False, "m2": False, "m3": True, "m4": False, "m5": False, "m6": False, "resp": "Responsable RH"},

    # Phase 3 : Pilotage & Certification
    {"type": "header", "title": "PHASE 3 : PILOTAGE DATA ET ANCRAGE (MOIS 4 A 6 / S13-S24)"},
    {"ref": "Réf 2.1", "task": "Commercial : Baromètre de satisfaction client (Outil 06)", "m1": False, "m2": False, "m3": False, "m4": True, "m5": False, "m6": False, "resp": "ADV & Commercial"},
    {"ref": "Réf 5.3", "task": "Data/IT : Arborescence GED standard d'entreprise (Outil 27)", "m1": False, "m2": False, "m3": False, "m4": True, "m5": False, "m6": False, "resp": "Responsable IT"},
    {"ref": "Réf 5.4", "task": "Data/IT : Dashboard KPIs temps réel (Annexes A1-A5)", "m1": False, "m2": False, "m3": False, "m4": True, "m5": True, "m6": False, "resp": "Dir & IT"},
    {"ref": "Réf 4.5", "task": "RH : Guide de capitalisation du savoir-faire (Outil 24)", "m1": False, "m2": False, "m3": False, "m4": False, "m5": True, "m6": False, "resp": "Responsable RH"},
    {"ref": "Réf 1.5", "task": "Direction : Revue de direction stratégique (Outil 05)", "m1": False, "m2": False, "m3": False, "m4": False, "m5": True, "m6": False, "resp": "Direction"},
    {"ref": "Réf 5.5", "task": "Qualité : Planning & Trame d'Audit Blanc (Annexes A6-A10)", "m1": False, "m2": False, "m3": False, "m4": False, "m5": False, "m6": True, "resp": "Cabinet Delacour"},

    # Gouvernance Delacour
    {"type": "header", "title": "GOUVERNANCE ET ACCOMPAGNEMENT CABINET DELACOUR (OPTION B)"},
    {"ref": "COPIL", "task": "Comité de Pilotage Bimensuel (1h en visio ou site)", "m1": True, "m2": True, "m3": True, "m4": True, "m5": True, "m6": True, "resp": "Melchior Delacour"},
    {"ref": "ATELIER", "task": "Ateliers Terrain & Co-construction (2 demi-journées/mois)", "m1": True, "m2": True, "m3": True, "m4": True, "m5": True, "m6": True, "resp": "Melchior Delacour"}
]

def generate_docx(output_path):
    doc = docx.Document()
    
    # Orientation Paysage (Landscape) pour le Gantt
    for section in doc.sections:
        new_width, new_height = section.page_height, section.page_width
        section.page_width = new_width
        section.page_height = new_height
        section.top_margin = Inches(0.6)
        section.bottom_margin = Inches(0.6)
        section.left_margin = Inches(0.6)
        section.right_margin = Inches(0.6)
        
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        header_img_path = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/.tmp/header_brand_unified_hd.png"
        if os.path.exists(header_img_path):
            hrun = hp.add_run()
            hrun.add_picture(header_img_path, width=Inches(10.0))

        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        frun = fp.add_run("Cabinet Delacour - Planning Gantt de Déploiement SMQ PME\t\tPage ")
        frun.font.name = FONT_SANS
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = MUTED_GRAY

        f_xml = parse_xml(r'<w:r %s><w:fldChar w:fldCharType="begin"/></w:r>' % nsdecls('w'))
        fp._p.append(f_xml)
        f_xml2 = parse_xml(r'<w:r %s><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>' % nsdecls('w'))
        fp._p.append(f_xml2)
        f_xml3 = parse_xml(r'<w:r %s><w:fldChar w:fldCharType="separate"/></w:r>' % nsdecls('w'))
        fp._p.append(f_xml3)
        f_xml4 = parse_xml(r'<w:r %s><w:fldChar w:fldCharType="end"/></w:r>' % nsdecls('w'))
        fp._p.append(f_xml4)

        tab_xml = parse_xml(r'<w:tabs %s><w:tab w:val="right" w:pos="15000"/></w:tabs>' % nsdecls('w'))
        fp._p.get_or_add_pPr().append(tab_xml)

    # Title
    p_t = doc.add_paragraph()
    p_t.paragraph_format.space_after = Pt(2)
    r_t = p_t.add_run("PLANNING GANTT DE DÉPLOIEMENT ET FEUILLE DE ROUTE CHRONOLOGIQUE")
    r_t.font.name = FONT_SERIF
    r_t.font.size = Pt(16)
    r_t.font.bold = True
    r_t.font.color.rgb = BRAND_GREEN

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(10)
    r_s = p_sub.add_run("Planning Opérationnel sur 6 Mois - Calendrier d'Exécution des Outils Delacour & Jalons COPIL")
    r_s.font.name = FONT_SANS
    r_s.font.size = Pt(10)
    r_s.font.italic = True
    r_s.font.color.rgb = ACCENT_GOLD

    # Box Synthèse des Horizons
    box = doc.add_table(rows=1, cols=1)
    box.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_box = box.cell(0, 0)
    set_explicit_cell_width(c_box, 14500)
    set_cell_background(c_box, CREAM_BG)
    set_cell_margins(c_box, top=100, bottom=100, left=140, right=140)
    set_cell_border(c_box, left={'sz': 24, 'val': 'single', 'color': '1B4D3E'},
                           top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                           bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                           right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    cp = c_box.paragraphs[0]
    cp.paragraph_format.space_after = Pt(2)
    r_bh = cp.add_run("LÉGENDE ET RYTHME D'EXÉCUTION (OPTION B ACCOMPAGNÉE) :\n")
    r_bh.font.name = FONT_SERIF
    r_bh.font.bold = True
    r_bh.font.size = Pt(9.5)
    r_bh.font.color.rgb = BRAND_GREEN
    
    r_bb = cp.add_run(
        "- Phase 1 (Mois 1 / S1-S4) : Secourisme organisationnel & Quick Wins 15j (Commercial, Gammes atelier, RACI, IT).\n"
        "- Phase 2 (Mois 2-3 / S5-S12) : Standardisation des processus, maîtrise des sous-traitants & matrice des compétences.\n"
        "- Phase 3 (Mois 4-6 / S13-S24) : Pilotage Data temps réel, mémoire d'entreprise & Audit Blanc de certification.\n"
        "- Gouvernance Delacour : 1 COPIL bimensuel (1h) + 2 Ateliers Terrain de co-construction par mois."
    )
    r_bb.font.name = FONT_SANS
    r_bb.font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Tableau Gantt Visuel (Cols: Ref, Action, M1, M2, M3, M4, M5, M6, Responsable)
    headers_gantt = ["Ref", "Action & Outil Delacour", "Mois 1", "Mois 2", "Mois 3", "Mois 4", "Mois 5", "Mois 6", "Porteur Interne"]
    widths_gantt = [1100, 5200, 1100, 1100, 1100, 1100, 1100, 1100, 1600]
    
    tbl_g = doc.add_table(rows=1, cols=len(headers_gantt))
    tbl_g.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_g.autofit = False

    for i, h in enumerate(headers_gantt):
        tbl_g.rows[0].cells[i].text = h
        set_explicit_cell_width(tbl_g.rows[0].cells[i], widths_gantt[i])
        set_cell_background(tbl_g.rows[0].cells[i], HEADER_BG)
        set_cell_margins(tbl_g.rows[0].cells[i], top=50, bottom=50, left=30, right=30)
        p = tbl_g.rows[0].cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if i in range(2, 8) else WD_ALIGN_PARAGRAPH.LEFT
        for r in p.runs:
            r.font.name = FONT_SANS
            r.font.size = Pt(8)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    for item in GANTT_TASKS:
        if item.get("type") == "header":
            row_cells = tbl_g.add_row().cells
            a_cell = row_cells[0]
            for c in row_cells[1:]:
                a_cell.merge(c)
            set_explicit_cell_width(a_cell, 14500)
            set_cell_background(a_cell, SUBHEADER_BG)
            set_cell_margins(a_cell, top=60, bottom=60, left=50, right=50)
            set_cell_border(a_cell, top={'sz': 6, 'val': 'single', 'color': BORDER_GOLD},
                                    bottom={'sz': 6, 'val': 'single', 'color': BORDER_GOLD},
                                    left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                    right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
            p = a_cell.paragraphs[0]
            r = p.add_run(item["title"])
            r.font.name = FONT_SERIF
            r.font.size = Pt(8.5)
            r.font.bold = True
            r.font.color.rgb = BRAND_GREEN
        else:
            row_cells = tbl_g.add_row().cells
            row_cells[0].text = item["ref"]
            row_cells[1].text = item["task"]
            row_cells[8].text = item["resp"]

            # Set widths & borders
            for c_idx in range(9):
                set_explicit_cell_width(row_cells[c_idx], widths_gantt[c_idx])
                set_cell_margins(row_cells[c_idx], top=40, bottom=40, left=30, right=30)
                set_cell_border(row_cells[c_idx], top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                                  bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                                  left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                                  right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
                for p in row_cells[c_idx].paragraphs:
                    for r in p.runs:
                        r.font.name = FONT_SANS
                        r.font.size = Pt(7.5)

            # Shading for Months 1 to 6
            months_flag = [item["m1"], item["m2"], item["m3"], item["m4"], item["m5"], item["m6"]]
            for m_i, is_active in enumerate(months_flag):
                target_cell = row_cells[m_i + 2]
                if is_active:
                    fill_hex = GANTT_GOLD if "COPIL" in item["ref"] or "ATELIER" in item["ref"] else GANTT_GREEN
                    set_cell_background(target_cell, fill_hex)
                    target_cell.text = "████"
                    p_m = target_cell.paragraphs[0]
                    p_m.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    for r in p_m.runs:
                        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF) if fill_hex == GANTT_GREEN else TEXT_DARK
                        r.font.size = Pt(7)
                else:
                    set_cell_background(target_cell, "FFFFFF")

    doc.save(output_path)

def generate_html(output_path):
    html = """<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Planning Gantt de Déploiement SMQ — Cabinet Delacour</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 30px; background-color: #fcfcfc; color: #222; line-height: 1.5; }
        h1 { font-family: Georgia, serif; color: #1B4D3E; margin-bottom: 5px; }
        .subtitle { font-style: italic; color: #C5A065; margin-bottom: 20px; }
        .box { background-color: #F9F9F7; border-left: 4px solid #1B4D3E; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th { background-color: #1B4D3E; color: white; padding: 8px; text-align: left; }
        td { padding: 6px; border: 1px solid #D0D7D1; }
        tr.hdr { background-color: #EBEFEA; font-weight: bold; color: #1B4D3E; }
        .bar-green { background-color: #1B4D3E; color: white; text-align: center; font-weight: bold; }
        .bar-gold { background-color: #C5A065; color: black; text-align: center; font-weight: bold; }
    </style>
</head>
<body>
    <h1>PLANNING GANTT DE DÉPLOIEMENT ET FEUILLE DE ROUTE CHRONOLOGIQUE</h1>
    <div class="subtitle">Planning Opérationnel sur 6 Mois - Cabinet Delacour</div>
    
    <div class="box">
        <strong>LÉGENDE ET RYTHME D'EXÉCUTION (OPTION B ACCOMPAGNÉE) :</strong><br>
        - Phase 1 (Mois 1) : Quick Wins 15j (Commercial, Gammes atelier, RACI, IT).<br>
        - Phase 2 (Mois 2-3) : Standardisation des processus & sous-traitance.<br>
        - Phase 3 (Mois 4-6) : Pilotage Data temps réel & Audit Blanc.<br>
        - Gouvernance : 1 COPIL bimensuel (1h) + 2 Ateliers Terrain / mois.
    </div>

    <table>
        <thead>
            <tr><th>Ref</th><th>Action & Outil Delacour</th><th>M1</th><th>M2</th><th>M3</th><th>M4</th><th>M5</th><th>M6</th><th>Porteur</th></tr>
        </thead>
        <tbody>
"""
    for item in GANTT_TASKS:
        if item.get("type") == "header":
            html += f'            <tr class="hdr"><td colspan="9">{item["title"]}</td></tr>\n'
        else:
            flags = [item["m1"], item["m2"], item["m3"], item["m4"], item["m5"], item["m6"]]
            html += f'            <tr><td><strong>{item["ref"]}</strong></td><td>{item["task"]}</td>'
            for f in flags:
                if f:
                    cls = "bar-gold" if ("COPIL" in item["ref"] or "ATELIER" in item["ref"]) else "bar-green"
                    html += f'<td class="{cls}">■■■</td>'
                else:
                    html += '<td></td>'
            html += f'<td>{item["resp"]}</td></tr>\n'

    html += """        </tbody>
    </table>
</body>
</html>
"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

def generate_md(output_path):
    md = """# PLANNING GANTT DE DÉPLOIEMENT ET FEUILLE DE ROUTE CHRONOLOGIQUE
> **Cabinet Delacour - Planning Opérationnel d'Exécution sur 6 Mois**

---

### LÉGENDE ET RYTHME D'EXÉCUTION
- `████` : Période d'exécution des actions et ateliers terrain.
- **Phase 1 (Mois 1)** : Quick Wins 15j (Commercial, Gammes atelier, RACI, IT).
- **Phase 2 (Mois 2-3)** : Standardisation des processus & sous-traitance.
- **Phase 3 (Mois 4-6)** : Pilotage Data temps réel & Audit Blanc de certification.

---

| Ref | Action & Outil Delacour | Mois 1 | Mois 2 | Mois 3 | Mois 4 | Mois 5 | Mois 6 | Porteur Interne |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
"""
    for item in GANTT_TASKS:
        if item.get("type") == "header":
            md += f"| **{item['title']}** | | | | | | | | |\n"
        else:
            flags = [item["m1"], item["m2"], item["m3"], item["m4"], item["m5"], item["m6"]]
            bars = ["`████`" if f else " " for f in flags]
            md += f"| **{item['ref']}** | {item['task']} | {bars[0]} | {bars[1]} | {bars[2]} | {bars[3]} | {bars[4]} | {bars[5]} | {item['resp']} |\n"

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(md)

def main():
    dest_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE"
    os.makedirs(os.path.join(dest_dir, "DOCX"), exist_ok=True)
    os.makedirs(os.path.join(dest_dir, "HTML"), exist_ok=True)
    os.makedirs(os.path.join(dest_dir, "MD"), exist_ok=True)

    generate_docx(os.path.join(dest_dir, "DOCX", "PLANNING_GANTT_DEPLOIEMENT_DELACOUR.docx"))
    generate_html(os.path.join(dest_dir, "HTML", "PLANNING_GANTT_DEPLOIEMENT_DELACOUR.html"))
    generate_md(os.path.join(dest_dir, "MD", "PLANNING_GANTT_DEPLOIEMENT_DELACOUR.md"))

    generate_docx(os.path.join(dest_dir, "04_RESTITUTION_ET_GOUVERNANCE", "PLANNING_GANTT_DEPLOIEMENT_DELACOUR.docx"))
    generate_html(os.path.join(dest_dir, "PLANNING_GANTT_DEPLOIEMENT_DELACOUR.html"))
    generate_md(os.path.join(dest_dir, "PLANNING_GANTT_DEPLOIEMENT_DELACOUR.md"))

    print("✅ Document Planning Gantt de Déploiement généré avec succès en DOCX, HTML et MD !")

if __name__ == "__main__":
    main()
