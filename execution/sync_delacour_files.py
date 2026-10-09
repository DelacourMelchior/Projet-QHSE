# -*- coding: utf-8 -*-
"""
CABINET DELACOUR - SYNCHRONISATEUR FICHIERS DISQUE LOCAL & CLOUD
Reçoit les données modifiées de l'application Web/Mobile et réécrit les fichiers
.docx (Pack Outils de Rentabilité) et .xlsx (Cockpit de Pilotage) directement sur le disque dur Mac/PC.
Conforme à la Charte Graphique et aux Directives de Conception du Cabinet Delacour.
"""

import os
import sys
import json
import argparse
import datetime
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

BASE_DIR = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_RENTABILITE_DELACOUR"
HEADER_IMG_PATH = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/.tmp/header_brand_unified_hd.png"

# PALETTE OFFICIELLE CABINET DELACOUR
BRAND_GREEN = RGBColor(27, 77, 62)     # #1B4D3E Vert Forêt Signature
DARK_GREEN = RGBColor(21, 40, 34)      # #152822 Fond Sombre
LIGHT_GREEN = RGBColor(74, 108, 92)    # #4A6C5C Vert Émeraude
GOLD = RGBColor(197, 160, 101)         # #C5A065 Doré Noble
WHITE = RGBColor(255, 255, 255)
GREEN_TEXT = RGBColor(27, 94, 32)      # #1B5E20 Statut Conforme
RED_TEXT = RGBColor(183, 28, 28)       # #B71C1C Statut Alerte
ORANGE_TEXT = RGBColor(230, 81, 0)     # #E65100 Statut À surveiller
MUTED_TEXT = RGBColor(120, 120, 120)

CREAM_BG = "F9F9F7"
WHY_BG = "FDFBF7"
THEMES_BG = "F7F9F8"
CASH_BG = "F4F8F5"
BORDER_ACCENT = "E2DCCC"

FONT_SERIF = "Georgia"
FONT_SANS = "Arial"

TOOL_PATHS = {
    # PACK ESSENTIEL 11 OUTILS INDISPENSABLES
    "1.1": "01_PROCESSUS_1_DIRECTION_ET_PILOTAGE/OUTIL_1.1_TABLEAU_SUIVI_MENSUEL_INDICATEURS_KPI.docx",
    "1.2": "01_PROCESSUS_1_DIRECTION_ET_PILOTAGE/OUTIL_1.2_PLAN_CONTINUITE_ET_GESTION_DES_RISQUES.xlsx",
    "2.1": "02_PROCESSUS_2_COMMERCIAL_ET_CONTRATS/OUTIL_2.1_GRILLE_FAISABILITE_ET_MARGE_DEVIS.docx",
    "2.2": "02_PROCESSUS_2_COMMERCIAL_ET_CONTRATS/OUTIL_2.2_FICHE_REFLEXE_AVENANT_ACCORD_CLIENT.docx",
    "2.3": "02_PROCESSUS_2_COMMERCIAL_ET_CONTRATS/OUTIL_2.3_REGISTRE_RECLAMATIONS_ALERTE_48H.docx",
    "3.1": "03_PROCESSUS_3_REALISATION_ET_OPERATIONS/OUTIL_3.1_NOTATION_FOURNISSEURS_ET_FICHE_DEBIT.docx",
    "3.2": "03_PROCESSUS_3_REALISATION_ET_OPERATIONS/OUTIL_3.2_AUTOCONTROLE_ET_PV_RECEPTION_95_5.docx",
    "4.1": "04_PROCESSUS_4_RESSOURCES_HUMAINES_ET_ORGANISATION/OUTIL_4.1_MATRICE_SUPPLEANCES_URGENCE.docx",
    "4.2": "04_PROCESSUS_4_RESSOURCES_HUMAINES_ET_ORGANISATION/OUTIL_4.2_MATRICE_POLYVALENCE_HOMME_CLE.docx",
    "5.1": "05_PROCESSUS_5_AMELIORATION_ET_NON_CONFORMITES/OUTIL_5.1_PROTOCOLE_QUARANTAINE_BAC_ROUGE.docx",
    "5.2": "05_PROCESSUS_5_AMELIORATION_ET_NON_CONFORMITES/OUTIL_5.2_CHIFFRAGE_MINUTE_COUT_NON_QUALITE.docx",
    # ALIASES COMPATIBILITÉ
    "1.3": "01_PROCESSUS_1_DIRECTION_ET_PILOTAGE/OUTIL_1.1_TABLEAU_SUIVI_MENSUEL_INDICATEURS_KPI.docx",
    "3.4": "03_PROCESSUS_3_REALISATION_ET_OPERATIONS/OUTIL_3.2_AUTOCONTROLE_ET_PV_RECEPTION_95_5.docx",
}

# ---------------------------------------------------------
# OPENXML HELPER FUNCTIONS (CHARTE CABINET DELACOUR)
# ---------------------------------------------------------
def set_cell_background(cell, fill_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=60, bottom=60, left=100, right=100):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_explicit_cell_width(cell, width_dxa):
    tcPr = cell._tc.get_or_add_tcPr()
    tcW = parse_xml(f'<w:tcW {nsdecls("w")} w:w="{width_dxa}" w:type="dxa"/>')
    tcPr.append(tcW)

def set_cell_border(cell, **kwargs):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = f'w:{edge}'
            element = OxmlElement(tag)
            element.set(qn('w:val'), edge_data.get('val', 'single'))
            element.set(qn('w:sz'), str(edge_data.get('sz', 4)))
            element.set(qn('w:space'), '0')
            element.set(qn('w:color'), edge_data.get('color', 'auto'))
            tcBorders.append(element)
        else:
            tag = f'w:{edge}'
            element = OxmlElement(tag)
            element.set(qn('w:val'), 'none')
            tcBorders.append(element)
    tcPr.append(tcBorders)

def create_base_delacour_document():
    doc = Document()
    section = doc.sections[0]
    section.header_distance = Inches(0.35)
    section.footer_distance = Inches(0.35)
    section.top_margin = Inches(0.95)
    section.bottom_margin = Inches(0.65)
    section.left_margin = Inches(0.6)
    section.right_margin = Inches(0.6)

    # NATIVE HEADER BANNER
    header = section.header
    p_head = header.paragraphs[0]
    p_head.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_head.paragraph_format.space_after = Pt(0)
    if os.path.exists(HEADER_IMG_PATH):
        r_img = p_head.add_run()
        r_img.add_picture(HEADER_IMG_PATH, width=Inches(7.3))

    # NATIVE OPENXML FOOTER (ZERO MAC / WINDOWS WARNINGS)
    footer = section.footer
    p_ft = footer.paragraphs[0]
    p_ft.text = ""
    p_ft.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_ft.paragraph_format.space_after = Pt(0)

    pPr = p_ft._p.get_or_add_pPr()
    tabs = OxmlElement('w:tabs')
    tab = OxmlElement('w:tab')
    tab.set(qn('w:val'), 'right')
    tab.set(qn('w:pos'), '10512')  # 7.3 inches exact right margin
    tabs.append(tab)
    pPr.append(tabs)

    r_l = p_ft.add_run("Cabinet Delacour • delacour.melchior@cabinetdelacour.com")
    r_l.font.name = FONT_SANS
    r_l.font.size = Pt(7.5)
    r_l.font.italic = True
    r_l.font.color.rgb = MUTED_TEXT

    p_ft.add_run("\t\t")

    r_pg = p_ft.add_run("Page ")
    r_pg.font.name = FONT_SANS
    r_pg.font.size = Pt(7.5)
    r_pg.font.italic = True
    r_pg.font.color.rgb = MUTED_TEXT

    fld1 = OxmlElement('w:fldSimple')
    fld1.set(qn('w:instr'), 'PAGE')
    p_ft._p.append(fld1)

    r_sl = p_ft.add_run(" / ")
    r_sl.font.name = FONT_SANS
    r_sl.font.size = Pt(7.5)
    r_sl.font.italic = True
    r_sl.font.color.rgb = MUTED_TEXT

    fld2 = OxmlElement('w:fldSimple')
    fld2.set(qn('w:instr'), 'NUMPAGES')
    p_ft._p.append(fld2)

    return doc

def add_header_brand(doc, tool_code, tool_title, subtitle):
    tbl_title = doc.add_table(rows=1, cols=1)
    tbl_title.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_title.autofit = False
    c_t = tbl_title.cell(0, 0)
    set_explicit_cell_width(c_t, 10200)
    set_cell_background(c_t, CREAM_BG)
    set_cell_margins(c_t, top=100, bottom=100, left=140, right=140)
    set_cell_border(c_t, left={'sz': 24, 'val': 'single', 'color': 'C5A065'},
                          top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                          bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                          right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})

    p = c_t.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    r_cl = p.add_run(f"SÉQUENCE 1 • DIRECTION & PILOTAGE • {tool_code}\n")
    r_cl.font.name = FONT_SANS
    r_cl.font.size = Pt(8.5)
    r_cl.font.bold = True
    r_cl.font.color.rgb = GOLD

    r_main = p.add_run(tool_title + "\n")
    r_main.font.name = FONT_SERIF
    r_main.font.size = Pt(14)
    r_main.font.bold = True
    r_main.font.color.rgb = BRAND_GREEN

    r_sub = p.add_run(subtitle)
    r_sub.font.name = FONT_SANS
    r_sub.font.size = Pt(8)
    r_sub.font.italic = True
    r_sub.font.color.rgb = MUTED_TEXT

    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_after = Pt(4)

def add_consultant_box(doc, advice_text, themes):
    tbl = doc.add_table(rows=4, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False

    c_title = tbl.cell(0, 0)
    c_title.merge(tbl.cell(0, 1))
    set_explicit_cell_width(c_title, 10200)
    set_cell_background(c_title, THEMES_BG)
    set_cell_margins(c_title, top=70, bottom=50, left=120, right=120)
    set_cell_border(c_title, left={'sz': 24, 'val': 'single', 'color': '1B4D3E'},
                             top={'sz': 4, 'val': 'single', 'color': '4A6C5C'},
                             right={'sz': 4, 'val': 'single', 'color': '4A6C5C'},
                             bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    p_t = c_title.paragraphs[0]
    p_t.paragraph_format.space_after = Pt(0)
    r_t = p_t.add_run("POSTURE CONSULTANT & AXES DE SURVEILLANCE RENTABILITÉ")
    r_t.font.name = FONT_SERIF
    r_t.font.size = Pt(9.5)
    r_t.font.bold = True
    r_t.font.color.rgb = BRAND_GREEN

    c_posture = tbl.cell(1, 0)
    c_posture.merge(tbl.cell(1, 1))
    set_explicit_cell_width(c_posture, 10200)
    set_cell_background(c_posture, THEMES_BG)
    set_cell_margins(c_posture, top=30, bottom=50, left=120, right=120)
    set_cell_border(c_posture, left={'sz': 24, 'val': 'single', 'color': '1B4D3E'},
                               right={'sz': 4, 'val': 'single', 'color': '4A6C5C'},
                               bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    p_p = c_posture.paragraphs[0]
    p_p.paragraph_format.space_after = Pt(0)
    r_lbl = p_p.add_run("Règle d'or du dirigeant : ")
    r_lbl.font.name = FONT_SANS
    r_lbl.font.bold = True
    r_lbl.font.size = Pt(8)
    r_lbl.font.color.rgb = BRAND_GREEN
    r_txt = p_p.add_run(advice_text)
    r_txt.font.name = FONT_SANS
    r_txt.font.italic = True
    r_txt.font.size = Pt(8)

    cards = [
        (tbl.cell(2, 0), themes[0][0], themes[0][1], True),
        (tbl.cell(2, 1), themes[1][0], themes[1][1], False),
        (tbl.cell(3, 0), themes[2][0], themes[2][1], True),
        (tbl.cell(3, 1), themes[3][0], themes[3][1], False),
    ]
    for idx, (cell, t_h, t_b, is_l) in enumerate(cards):
        set_explicit_cell_width(cell, 5100)
        set_cell_background(cell, "FFFFFF")
        set_cell_margins(cell, top=50, bottom=50, left=90, right=90)
        left_b = {'sz': 24, 'val': 'single', 'color': '1B4D3E'} if is_l else {'sz': 4, 'val': 'single', 'color': BORDER_ACCENT}
        right_b = {'sz': 4, 'val': 'single', 'color': '4A6C5C'} if not is_l else {'sz': 4, 'val': 'single', 'color': BORDER_ACCENT}
        bottom_b = {'sz': 4, 'val': 'single', 'color': '4A6C5C'} if idx >= 2 else {'sz': 4, 'val': 'single', 'color': BORDER_ACCENT}
        set_cell_border(cell, left=left_b, right=right_b, top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT}, bottom=bottom_b)

        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(1)
        r_h = p.add_run(t_h + "\n")
        r_h.font.name = FONT_SERIF
        r_h.font.bold = True
        r_h.font.size = Pt(8)
        r_h.font.color.rgb = BRAND_GREEN
        r_b = p.add_run(t_b)
        r_b.font.name = FONT_SANS
        r_b.font.size = Pt(7.5)
        r_b.font.color.rgb = BRAND_GREEN

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(3)

def add_why_box(doc, gains, risques):
    tbl = doc.add_table(rows=2, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False

    c_t = tbl.cell(0, 0)
    c_t.merge(tbl.cell(0, 1))
    set_explicit_cell_width(c_t, 10200)
    set_cell_background(c_t, WHY_BG)
    set_cell_margins(c_t, top=70, bottom=40, left=120, right=120)
    set_cell_border(c_t, top={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         left={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         right={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         bottom={'sz': 4, 'val': 'single', 'color': 'C5A065'})
    p_t = c_t.paragraphs[0]
    p_t.paragraph_format.space_after = Pt(0)
    r_t = p_t.add_run("POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE ENTREPRISE ?")
    r_t.font.name = FONT_SERIF
    r_t.font.size = Pt(9.5)
    r_t.font.bold = True
    r_t.font.color.rgb = BRAND_GREEN

    c1 = tbl.cell(1, 0)
    set_explicit_cell_width(c1, 5100)
    set_cell_background(c1, WHY_BG)
    set_cell_margins(c1, top=50, bottom=60, left=120, right=120)
    set_cell_border(c1, left={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                        bottom={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                        right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                        top={'sz': 4, 'val': 'single', 'color': 'C5A065'})
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(2)
    r1 = p1.add_run("Ce que vous gagnez à l'utiliser :\n")
    r1.font.name = FONT_SERIF
    r1.font.bold = True
    r1.font.size = Pt(8)
    r1.font.color.rgb = GREEN_TEXT
    for g in gains:
        p = c1.add_paragraph()
        p.paragraph_format.space_after = Pt(1)
        r = p.add_run("• " + g)
        r.font.name = FONT_SANS
        r.font.size = Pt(7.5)

    c2 = tbl.cell(1, 1)
    set_explicit_cell_width(c2, 5100)
    set_cell_background(c2, WHY_BG)
    set_cell_margins(c2, top=50, bottom=60, left=120, right=120)
    set_cell_border(c2, right={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                        bottom={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                        left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                        top={'sz': 4, 'val': 'single', 'color': 'C5A065'})
    p2 = c2.paragraphs[0]
    p2.paragraph_format.space_after = Pt(2)
    r2 = p2.add_run("Ce que vous risquez sans cet outil :\n")
    r2.font.name = FONT_SERIF
    r2.font.bold = True
    r2.font.size = Pt(8)
    r2.font.color.rgb = RED_TEXT
    for r_item in risques:
        p = c2.add_paragraph()
        p.paragraph_format.space_after = Pt(1)
        r = p.add_run("• " + r_item)
        r.font.name = FONT_SANS
        r.font.size = Pt(7.5)

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(3)

def add_guide_box(doc, steps):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    c = tbl.cell(0, 0)
    set_explicit_cell_width(c, 10200)
    set_cell_background(c, "FFFFFF")
    set_cell_margins(c, top=80, bottom=80, left=120, right=120)
    set_cell_border(c, left={'sz': 24, 'val': 'single', 'color': '1B4D3E'},
                       top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                       bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                       right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    p0 = c.paragraphs[0]
    p0.paragraph_format.space_after = Pt(2)
    r0 = p0.add_run("GUIDE D'ANIMATION CHRONO (15 MINUTES LE 1ER DU MOIS)\n")
    r0.font.name = FONT_SERIF
    r0.font.size = Pt(9)
    r0.font.bold = True
    r0.font.color.rgb = BRAND_GREEN

    for idx, step in enumerate(steps, 1):
        p = c.add_paragraph()
        p.paragraph_format.space_after = Pt(1.5)
        r_n = p.add_run(f"Étape {idx} : ")
        r_n.font.name = FONT_SANS
        r_n.font.bold = True
        r_n.font.size = Pt(7.5)
        r_n.font.color.rgb = BRAND_GREEN
        r_t = p.add_run(step)
        r_t.font.name = FONT_SANS
        r_t.font.size = Pt(7.5)

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(3)

def add_section_header(doc, text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    c = tbl.cell(0, 0)
    set_explicit_cell_width(c, 10200)
    set_cell_background(c, THEMES_BG)
    set_cell_margins(c, top=60, bottom=60, left=100, right=100)
    set_cell_border(c, left={'sz': 20, 'val': 'single', 'color': '1B4D3E'},
                       top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                       bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                       right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    p = c.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(text)
    r.font.name = FONT_SERIF
    r.font.size = Pt(9.5)
    r.font.bold = True
    r.font.color.rgb = BRAND_GREEN

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(2)

def format_delacour_table(doc, headers, rows_data, col_widths_dxa=None):
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False

    hdr_cells = tbl.rows[0].cells
    for i, h_text in enumerate(headers):
        hdr_cells[i].text = h_text
        if col_widths_dxa and i < len(col_widths_dxa):
            set_explicit_cell_width(hdr_cells[i], col_widths_dxa[i])
        set_cell_background(hdr_cells[i], "1B4D3E")
        set_cell_margins(hdr_cells[i], top=50, bottom=50, left=50, right=50)
        set_cell_border(hdr_cells[i], top={'sz': 4, 'val': 'single', 'color': '1B4D3E'},
                                      bottom={'sz': 4, 'val': 'single', 'color': '1B4D3E'},
                                      left={'sz': 4, 'val': 'single', 'color': '1B4D3E'},
                                      right={'sz': 4, 'val': 'single', 'color': '1B4D3E'})
        for p in hdr_cells[i].paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.name = FONT_SANS
                r.font.size = Pt(7.5)
                r.font.bold = True
                r.font.color.rgb = WHITE

    for r_idx, row_data in enumerate(rows_data):
        row_cells = tbl.add_row().cells
        bg_hex = CREAM_BG if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            row_cells[c_idx].text = str(val)
            if col_widths_dxa and c_idx < len(col_widths_dxa):
                set_explicit_cell_width(row_cells[c_idx], col_widths_dxa[c_idx])
            set_cell_background(row_cells[c_idx], bg_hex)
            set_cell_margins(row_cells[c_idx], top=40, bottom=40, left=50, right=50)
            set_cell_border(row_cells[c_idx], top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
            for p in row_cells[c_idx].paragraphs:
                for r in p.runs:
                    r.font.name = FONT_SANS
                    r.font.size = Pt(7)
                    if "🔴" in str(val) or "Alerte" in str(val):
                        r.font.bold = True
                        r.font.color.rgb = RED_TEXT
                    elif "🟢" in str(val) or "Conforme" in str(val):
                        r.font.bold = True
                        r.font.color.rgb = GREEN_TEXT
                    elif "🟠" in str(val) or "surveiller" in str(val):
                        r.font.bold = True
                        r.font.color.rgb = ORANGE_TEXT
                    elif "[" in str(val) or "____" in str(val):
                        r.font.italic = True
                        r.font.bold = True
                        r.font.color.rgb = GOLD

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(3)

def add_next_steps_box(doc, steps):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    c = tbl.cell(0, 0)
    set_explicit_cell_width(c, 10200)
    set_cell_background(c, CREAM_BG)
    set_cell_margins(c, top=80, bottom=80, left=120, right=120)
    set_cell_border(c, left={'sz': 24, 'val': 'single', 'color': '1B4D3E'},
                       top={'sz': 4, 'val': 'single', 'color': 'C5A065'},
                       bottom={'sz': 4, 'val': 'single', 'color': 'C5A065'},
                       right={'sz': 4, 'val': 'single', 'color': 'C5A065'})
    p0 = c.paragraphs[0]
    p0.paragraph_format.space_after = Pt(2)
    r0 = p0.add_run("QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ & VALIDÉ ?\n")
    r0.font.name = FONT_SERIF
    r0.font.size = Pt(9)
    r0.font.bold = True
    r0.font.color.rgb = BRAND_GREEN

    for s in steps:
        p = c.add_paragraph()
        p.paragraph_format.space_after = Pt(1)
        r = p.add_run("• " + s)
        r.font.name = FONT_SANS
        r.font.size = Pt(7.5)
        r.font.color.rgb = BRAND_GREEN

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(3)

# ---------------------------------------------------------
# DEDICATED TOOL 1.1 WORD GENERATOR (CHARTE DELACOUR V2)
# ---------------------------------------------------------
def generate_tool_1_1_word_document(tool_data, client_name="Entreprise Client", abs_path=None):
    """
    Génère le livrable Word A4 officiel pour l'Outil 1.1 (Cockpit de Pilotage Mensuel des Indicateurs).
    Conforme aux clauses ISO 9001:2015 5.1, 6.2, 9.1, 9.3 et 10.2.
    """
    doc = create_base_delacour_document()

    # BLOCK 1: HEADER BRAND TITLE
    today_str = datetime.date.today().strftime("%d/%m/%Y")
    add_header_brand(
        doc,
        tool_code="OUTIL 1.1 — Clauses ISO 9001:2015 §5.1, §6.2, §9.1 & §9.3",
        tool_title="Tableau de Suivi Mensuel des Indicateurs de Rentabilité (Cockpit PME)",
        subtitle=f"Entreprise : {client_name} • Date de révision : {today_str} • Fréquence : Mensuelle (15 min chrono)"
    )

    # BLOCK 2: POSTURE CONSULTANT & 4 THÉMATIQUES PROCESSUS
    add_consultant_box(
        doc,
        advice_text="« 15 minutes le 1er ouvré du mois avec les pilotes de processus évitent 15 heures de gestion d'urgence en fin de trimestre. Un indicateur rouge sans arbitrage immédiat est une perte sèche pour l'entreprise. »",
        themes=[
            ("1. P1 Direction & Trésorerie", "Surveiller le CA facturé HT, la marge brute réelle et le solde bancaire net disponible à 30 jours."),
            ("2. P2 Marketing & Commercial", "Mesurer le taux de transformation des devis et traquer impitoyablement les devis sans relance > 7 jours."),
            ("3. P3 Réalisation & Atelier", "Assurer le taux de respect des délais promis (OTD) et stopper l'hémorragie des rebuts et pièces retouchées."),
            ("4. P4 RH & P5 Non-Qualité", "Contrôler le taux d'absentéisme imprévu, la polyvalence postes clés et traiter les litiges clients sous 48h.")
        ]
    )

    # BLOCK 3: WHY BOX (POURQUOI CET OUTIL EST CAPITAL)
    add_why_box(
        doc,
        gains=[
            "Sécurisation immédiate de 2 à 4 points de marge brute dès le premier trimestre d'utilisation.",
            "Suppression des surprises de trésorerie et visibilité à 30 jours pour le dirigeant.",
            "Conformité totale ISO 9001:2015 (§5.1, §6.2, §9.1, §9.3) lors des audits clients et de certification.",
            "Mobilisation concrète des chefs de pôle autour d'objectifs chiffrés et partagés."
        ],
        risques=[
            "Découvrir un trou de trésorerie ou une érosion des marges 6 mois trop tard lors du bilan comptable.",
            "Accumulation silencieuse des retards d'atelier générant des pénalités financières et litiges clients.",
            "Non-conformité majeure d'audit ISO 9001 par défaut de surveillance et de revue de direction.",
            "Désorganisation d'atelier lors de l'absence imprévue d'un collaborateur clé non suppléé."
        ]
    )

    # BLOCK 4: GUIDE CHRONO EN 4 ÉTAPES
    add_guide_box(
        doc,
        steps=[
            "Le 1er ouvré du mois à 08h30 (10 min chrono) : chaque pilote relève sa valeur réelle brute du mois M.",
            "Comparaison automatique avec la Cible et le Seuil d'Alerte (🟢 Conforme / 🟠 À surveiller / 🔴 Alerte).",
            "Si Alerte Rouge : le pilote apporte immédiatement une proposition d'arbitrage concrète (Qui, Quoi, Quand).",
            "Le Dirigeant arbitre en 5 min, alloue les moyens nécessaires et signe le registre de revue mensuelle (§9.3)."
        ]
    )

    # PAGE BREAK FOR THE MAIN WORK TABLE
    doc.add_page_break()

    # BLOCK 5: TABLEAU DE BORD MENSUEL DÉTAILLÉ (DONNÉES ENREGISTRÉES)
    add_section_header(doc, "LE TABLEAU DE BORD MENSUEL DES INDICATEURS PAR PROCESSUS")

    headers_kpi = [
        "Processus", "Indicateur Clé (KPI)", "Formule de Calcul", "Cible", "Mois M-1", "Mois M", "Statut", "Plan d'Action Correctif (§10.2)"
    ]

    # SI L'ENTREPRISE A TRANSMIS SES PROCESSUS & INDICATEURS PERSONNALISÉS
    if "processes" in tool_data and isinstance(tool_data["processes"], list) and len(tool_data["processes"]) > 0:
        rows_kpi = []
        for proc in tool_data["processes"]:
            proc_name = proc.get("name", "Processus").split(":")[0].strip()
            for ind in proc.get("indicators", []):
                name = ind.get("name", "Indicateur")
                formula = ind.get("source", "Relevé terrain")
                target = ind.get("target", "---")
                months = ind.get("months", [])
                
                # Récupérer les deux derniers mois renseignés
                filled = [m for m in months if m is not None and str(m).strip() not in ("", "---")]
                if len(filled) >= 2:
                    m1_str = str(filled[-2])
                    m_str = str(filled[-1])
                elif len(filled) == 1:
                    m1_str = "---"
                    m_str = str(filled[0])
                else:
                    m1_str = "---"
                    m_str = "---"
                
                # Statut dynamique
                action_txt = ind.get("actionText", "")
                action_done = ind.get("actionDone", False)
                if action_done:
                    status = "🟢 Clôturé"
                elif action_txt and str(action_txt).strip():
                    status = "🔴 Alerte"
                elif m_str != "---":
                    status = "🟢 Conforme"
                else:
                    status = "⏳ En attente"

                pilot = ind.get("actionPilot", "")
                deadline = ind.get("actionDeadline", "")
                plan_action = f"{pilot} ({deadline}) : {action_txt}" if (pilot or deadline) else (action_txt or "Objectif tenu.")
                
                rows_kpi.append([proc_name, name, formula, target, m1_str, m_str, status, plan_action])

        # Ajouter une ligne vierge d'extension pour l'entreprise
        rows_kpi.append(["[Votre Processus]", "[Indicateur Personnalisé]", "[Formule de calcul]", "[Cible]", "[M-1]", "[M]", "🟢 / 🔴", "[Action corrective d'urgence]"])
    else:
        # Extraire les valeurs passées ou utiliser les données étalons PME
        ca_cible = tool_data.get("ca_cible", "≥ 125 000 €")
        ca_m1 = tool_data.get("ca_m1", "120 000 €")
        ca_reel = tool_data.get("ca_reel", tool_data.get("ca_actuel", "132 500 €"))

        marge_cible = tool_data.get("marge_cible", "≥ 42.0 %")
        marge_m1 = tool_data.get("marge_m1", "41.2 %")
        marge_reel = tool_data.get("marge_reel", tool_data.get("marge_actuel", "38.5 %"))
        marge_status = "🔴 Alerte" if "38" in str(marge_reel) else "🟢 Conforme"

        rows_kpi = [
            ["P1 Direction", "Chiffre d'Affaires Mensuel (€)", "Somme des factures nettes émises HT", str(ca_cible), str(ca_m1), str(ca_reel), "🟢 Conforme", "Objectif dépassé. Maintenir le carnet de commandes."],
            ["P1 Direction", "Marge Brute Globale (%)", "(CA HT - Coûts achats directs) / CA", str(marge_cible), str(marge_m1), str(marge_reel), marge_status, "Audit express chiffrage devis + renégociation achat acier."],
            ["P1 Direction", "Solde Bancaire Disponible (€)", "Solde net consolidé comptes courants", "≥ 50 000 €", "58 000 €", "64 200 €", "🟢 Conforme", "Trésorerie saine (45j de charges fixes sécurisées)."],
            ["P2 Commercial", "Taux de Transformation Devis (%)", "(Devis signés / Devis émis) × 100", "≥ 35.0 %", "32.0 %", "37.5 %", "🟢 Conforme", "Campagne de relance systématique à J+5 efficace."],
            ["P2 Commercial", "Encours Devis en Souffrance > 7j", "Somme des devis sans réponse client", "≤ 30 000 €", "42 000 €", "24 500 €", "🟢 Conforme", "Radar des relances épuré chaque mardi matin."],
            ["P3 Atelier/Prod", "Taux de Respect Délais OTD (%)", "(Livraisons à date / Livraisons tot.) × 100", "≥ 95.0 %", "91.5 %", "96.2 %", "🟢 Conforme", "Dégoulottage poste découpe réussi."],
            ["P3 Atelier/Prod", "Coût Rebuts & Retouches (€)", "Coût pièces jetées + heures retouches", "≤ 1 500 €", "2 400 €", "1 180 €", "🟢 Conforme", "Borne tactile atelier : déclaration immédiate au poste."],
            ["P4 RH/Social", "Taux d'Absentéisme Imprévu (%)", "Heures absences non planif. / Heures tot.", "≤ 3.5 %", "4.2 %", "2.8 %", "🟢 Conforme", "Climat serein, charge équilibrée sur le mois."],
            ["P4 RH/Social", "Couverture Postes Clés Doublés", "Postes stratégiques avec suppléant prêt", "100 % (3/3)", "2/3", "3/3", "🟢 Conforme", "Suppléance opérationnelle Découpe & Soudure."],
            ["P5 Qualité/QSE", "Coût Total Non-Qualité CNQ (€)", "Rebuts + retouches + litiges + pénalités", "≤ 2 500 €", "3 800 €", "2 100 €", "🟢 Conforme", "Débit d'office fournisseur appliqué (Outil 3.1)."],
            ["P5 Qualité/QSE", "Clôture Réclamations Client < 48h", "Délai moyen de réponse curative client", "≤ 48 heures", "72 h", "36 heures", "🟢 Conforme", "Fiche réflexe litige 48h systématique (Outil 2.3)."],
            ["[Votre Processus]", "[Indicateur Personnalisé]", "[Formule de calcul]", "[Cible]", "[M-1]", "[M]", "🟢 / 🔴", "[Action corrective d'urgence]"]
        ]
    format_delacour_table(doc, headers_kpi, rows_kpi, col_widths_dxa=[1100, 1600, 1800, 950, 800, 800, 950, 2200])

    # BLOCK 6: REGISTRE OFFICIEL DES ARBITRAGES DE DIRECTION (ISO 9001:2015 §9.3)
    add_section_header(doc, "REGISTRE D'ARBITRAGE DE DIRECTION & REVUE DES PROCESSUS (ISO 9001:2015 §9.3)")
    headers_arb = ["Paramètre de Revue", "Décision et Arbitrage Ferme de la Direction Générale"]
    rows_arb = [
        ["Date de la Revue & Lieu", f"{today_str} à 08h30 • Salle de Direction / Visioconférence"],
        ["Participants Présents", "Dirigeant (DG), Responsable Commercial, Chef d'Atelier, Responsable Qualité / RH"],
        ["Constat / Dérive Analysée", "Marge brute réelle à 38.5% (Cible 42%) due aux hausses matière non répercutées sur devis."],
        ["Arbitrage Ferme de la Direction", "Blocage immédiat des devis avec marge brute < 38% + renégociation achat acier sous 8 jours."],
        ["Pilote Responsable & Échéance", "Directeur Commercial & Responsable Achats • Clôture impérative sous 15 jours"],
        ["Moyens & Ressources Alloués", "4 heures d'analyse du barème tarifaire + validation expresse des nouveaux coefficients"],
        ["Statut de l'Action Corrective", "🟢 Action engagée et tracée dans le plan d'amélioration (§10.2)"]
    ]
    format_delacour_table(doc, headers_arb, rows_arb, col_widths_dxa=[2800, 7400])

    # BLOCK 7: SIGNATURES FORMELLES (ÉMARGEMENT CONFORME AUDIT)
    tbl_sig = doc.add_table(rows=1, cols=2)
    tbl_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_sig.autofit = False

    c_sig1 = tbl_sig.cell(0, 0)
    set_explicit_cell_width(c_sig1, 5100)
    set_cell_background(c_sig1, CREAM_BG)
    set_cell_margins(c_sig1, top=80, bottom=80, left=100, right=100)
    set_cell_border(c_sig1, left={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                            top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                            bottom={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                            right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    p_s1 = c_sig1.paragraphs[0]
    p_s1.paragraph_format.space_after = Pt(2)
    r = p_s1.add_run("POUR LA DIRECTION GÉNÉRALE :\n")
    r.font.name = FONT_SERIF
    r.font.bold = True
    r.font.size = Pt(8)
    r.font.color.rgb = BRAND_GREEN
    r = p_s1.add_run(f"Nom du Dirigeant : ___________________________\nDate : {today_str}\nMention : « Bon pour arbitrage et application »\n\nSignature :")
    r.font.name = FONT_SANS
    r.font.size = Pt(7.5)

    c_sig2 = tbl_sig.cell(0, 1)
    set_explicit_cell_width(c_sig2, 5100)
    set_cell_background(c_sig2, CREAM_BG)
    set_cell_margins(c_sig2, top=80, bottom=80, left=100, right=100)
    set_cell_border(c_sig2, right={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                            top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                            bottom={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                            left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    p_s2 = c_sig2.paragraphs[0]
    p_s2.paragraph_format.space_after = Pt(2)
    r = p_s2.add_run("POUR LES PILOTES DE PROCESSUS & QUALITÉ :\n")
    r.font.name = FONT_SERIF
    r.font.bold = True
    r.font.size = Pt(8)
    r.font.color.rgb = BRAND_GREEN
    r = p_s2.add_run(f"Nom du Resp. Qualité : ___________________________\nDate : {today_str}\nMention : « Diffusé & Enregistré GED »\n\nSignature :")
    r.font.name = FONT_SANS
    r.font.size = Pt(7.5)

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(4)

    # BLOCK 8: NEXT STEPS
    add_next_steps_box(
        doc,
        steps=[
            "Archivage électronique sous GED : 01_PROCESSUS_1_DIRECTION_ET_PILOTAGE/REVUES_MENSUELLES_2026.pdf.",
            "Affichage en atelier des 2 indicateurs clés de fabrication (Respect des Délais OTD et Taux de Rebuts).",
            "Revue d'avancement intermédiaire de 15 minutes le lundi matin lors du rituel de pilotage de direction."
        ]
    )

    if abs_path:
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        doc.save(abs_path)
        print(f"[SUCCESS] Document officiel Outil 1.1 sauvegardé : {abs_path}")
    return doc

# ---------------------------------------------------------
# DEDICATED TOOL 1.2 EXCEL WORKBOOK GENERATOR (CHARTE DELACOUR V2)
# ---------------------------------------------------------
def generate_tool_1_2_excel_workbook(tool_data=None, client_name="Entreprise Client", abs_path=None):
    """
    Génère le livrable Excel .xlsx officiel pour l'Outil 1.2 (Plan de Continuité d'Activité et Solutions de Repli).
    Format classeur 3 onglets conforme aux directives du Cabinet Delacour :
    - Onglet 1 : 01_PLAN_CONTINUITE_PLANS_B (Cartographie des risques vitaux et parades chiffrées)
    - Onglet 2 : 02_METHODE_4_ETAPES_REMPLISSAGE (Guide pas-à-pas pour remplir sans se tromper)
    - Onglet 3 : 03_BOITE_A_PARADES_PME (Catalogue d'idées réelles par secteur PME)
    """
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "01_PLAN_CONTINUITE_PLANS_B"
    ws.views.sheetView[0].showGridLines = True

    # Palette Delacour
    DARK_GREEN = "1B4D3E"
    LIGHT_GREEN_BG = "E8F0EC"
    CREAM_BG = "F9F9F7"
    WHITE = "FFFFFF"
    BORDER_GRAY = "CBD5E1"

    font_title = Font(name="Arial", size=13, bold=True, color="FFFFFF")
    font_subtitle = Font(name="Arial", size=9, italic=True, color="E2DCCC")
    font_hdr = Font(name="Arial", size=9.5, bold=True, color="FFFFFF")
    font_meta_lbl = Font(name="Arial", size=9, bold=True, color="1B4D3E")
    font_meta_val = Font(name="Arial", size=9, color="1E293B")
    font_cell = Font(name="Arial", size=9, color="0F172A")
    font_bold = Font(name="Arial", size=9, bold=True, color="0F172A")

    fill_dark_green = PatternFill(start_color=DARK_GREEN, end_color=DARK_GREEN, fill_type="solid")
    fill_light_green = PatternFill(start_color=LIGHT_GREEN_BG, end_color=LIGHT_GREEN_BG, fill_type="solid")
    fill_cream = PatternFill(start_color=CREAM_BG, end_color=CREAM_BG, fill_type="solid")
    fill_white = PatternFill(start_color=WHITE, end_color=WHITE, fill_type="solid")

    thin_side = Side(border_style="thin", color=BORDER_GRAY)
    border_cell = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

    # 1. Title Banner
    ws.merge_cells("A1:G1")
    ws["A1"] = "CABINET DELACOUR • OUTIL 1.2 — PLAN DE CONTINUITÉ D'ACTIVITÉ & SOLUTIONS DE REPLI (PLAN B)"
    ws["A1"].font = font_title
    ws["A1"].fill = fill_dark_green
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30

    today_str = datetime.date.today().strftime("%d/%m/%Y")
    ws.merge_cells("A2:G2")
    ws["A2"] = f"Entreprise : {client_name} • Date de révision : {today_str} • Méthode en 4 étapes • Zéro vœu pieux"
    ws["A2"].font = font_subtitle
    ws["A2"].fill = fill_dark_green
    ws["A2"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 18

    # 2. Meta Cadrage
    meta = [
        ("Entreprise :", str(client_name), "Date d'actualisation :", today_str),
        ("Méthode de déploiement :", "Règle des 4 étapes (Goulet, Temps, 4 Parades PME, Verrou)", "Délai max d'engagement :", "Bascule sous 2h à 4h chrono")
    ]
    for r_idx, (l1, v1, l2, v2) in enumerate(meta, start=4):
        ws[f"A{r_idx}"] = l1
        ws[f"B{r_idx}"] = v1
        ws[f"D{r_idx}"] = l2
        ws[f"E{r_idx}"] = v2
        ws[f"A{r_idx}"].font = font_meta_lbl
        ws[f"B{r_idx}"].font = font_meta_val
        ws[f"D{r_idx}"].font = font_meta_lbl
        ws[f"E{r_idx}"].font = font_meta_val
        ws.row_dimensions[r_idx].height = 20

    # 3. Main Headers
    headers = [
        "Macro-Processus & Goulet Vital (Coût Arrêt €)",
        "Solution de Repli Plan B (Négociée à Froid)",
        "Chantier / Commande Sacrifiée d'Office",
        "Contact d'Urgence 24/7 & Emplacement Clés / MDP",
        "Délai Max Bascule",
        "Délégation € Sans DG",
        "Dernier Crash-Test & Statut"
    ]
    header_row = 7
    ws.row_dimensions[header_row].height = 28
    for c_idx, h_text in enumerate(headers, start=1):
        cell = ws.cell(row=header_row, column=c_idx, value=h_text)
        cell.font = font_hdr
        cell.fill = fill_dark_green
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = border_cell

    # 4. Data Rows
    default_rows = [
        [
            "P1 • Cyberattaque ERP / Ransomware (4 500 €/j)",
            "Bascule tableur miroir hors-réseau + sauvegardes J-1 sur disque étanche déconnecté",
            "Gel saisie nouveaux devis et facturation en cours",
            "Thomas M. (IT 24/7 : 06 11 22 33 44) - Clé root coffre atelier",
            "4 heures",
            "1 500 €",
            "15/01/2026 : 🟢 Conforme (2h30)"
        ],
        [
            "P1 • Blocage bancaire / Fraude président (25 k€)",
            "Activation convention ligne trésorerie secours 2e banque partenaire active",
            "Report 72h des investissements fournitures non critiques",
            "Hélène R. (Banque B : 06 22 33 44 55) - Token physique bureau DG",
            "24 heures",
            "5 000 €",
            "10/11/2025 : 🟢 Conforme (Ligne active)"
        ],
        [
            "P2 • Perte brutale client n°1 > 30% CA (18 k€/m)",
            "Plan urgence : activation 15 devis chauds (-5% contre acompte 50%) + fin contrats intérim",
            "Abandon prospection froide / déplacements éloignés",
            "Laurent B. (Dir Com : 06 33 44 55 66) - CRM offline clé DG",
            "48 heures",
            "2 000 €",
            "02/02/2026 : 🟢 Conforme (Vivier testé)"
        ],
        [
            "P3 • Casse broche machine goulet CNC (850 €/h)",
            "Accord réciproque Confrère X (5 axes testées, capacité 15h/mois réservée)",
            "Commande stock B sacrifiée d'office (OF-2026-90)",
            "David K. (Atelier : 06 44 55 66 77) - Répertoire FAO partagé Confrère",
            "4 heures",
            "2 500 €",
            "12/12/2025 : 🟢 Conforme (Usinage test OK)"
        ],
        [
            "P3 • Rupture tôle / matière critique (3 200 €/j)",
            "Stock sécurité Distributeur B (compte urgence pré-ouvert + 1 cde test/an)",
            "Chantier Client D décalé de 48h après accord",
            "Sophie V. (Achats : 06 55 66 77 88) - Astreinte Aciers Sud (06 88 77 66 55)",
            "8 heures",
            "3 000 €",
            "20/01/2026 : 🟢 Conforme (Livraison 5h30)"
        ],
        [
            "P4 • Absence inopinée programmeur / expert (1 200 €/j)",
            "Binôme certifié formé selon Matrice 4.1 + SOP visuelle 3.2 au poste",
            "Mise en pause études R&D et devis complexes",
            "Marc M. (Suppléant : 06 66 77 88 99) - Clé licence armoire atelier",
            "2 heures",
            "800 €",
            "08/01/2026 : 🟢 Conforme (Prise poste 1h15)"
        ],
        [
            "P5 • Lot non-conforme livré grand compte (15 k€)",
            "Rappel commando sous 2h : expédition stock tampon + équipe tri sur site client",
            "Contrôles finaux pièces non urgentes différés 24h",
            "Antoine P. (Qualité : 06 77 88 99 00) - Kit mobile prêt zone contrôle",
            "2 heures",
            "2 000 €",
            "14/02/2026 : 🟢 Conforme (Simulation 1h45)"
        ]
    ]

    rows_data = default_rows
    if tool_data and isinstance(tool_data, dict) and "rows" in tool_data and len(tool_data["rows"]) >= 3:
        rows_data = tool_data["rows"]

    for r_idx, r_data in enumerate(rows_data, start=8):
        ws.row_dimensions[r_idx].height = 36
        row_fill = fill_cream if r_idx % 2 == 1 else fill_white
        for c_idx, val in enumerate(r_data, start=1):
            cell = ws.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_cell
            cell.fill = row_fill
            cell.border = border_cell
            if c_idx in (1, 2, 3, 4):
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            elif c_idx in (5, 6):
                cell.alignment = Alignment(horizontal="center", vertical="center")
                if c_idx == 6:
                    cell.font = font_bold
            else:
                cell.alignment = Alignment(horizontal="center", vertical="center")

    col_widths = [32, 42, 28, 36, 16, 18, 28]
    for c_idx, w in enumerate(col_widths, start=1):
        ws.column_dimensions[get_column_letter(c_idx)].width = w

    # Sheet 2: METHODE 4 ETAPES
    ws2 = wb.create_sheet("02_METHODE_4_ETAPES_REMPLISSAGE")
    ws2.views.sheetView[0].showGridLines = True
    ws2.column_dimensions["A"].width = 25
    ws2.column_dimensions["B"].width = 75

    ws2.merge_cells("A1:B1")
    ws2["A1"] = "GUIDE MÉTHODOLOGIQUE : COMMENT REMPLIR L'OUTIL 1.2 SANS SE TROMPER"
    ws2["A1"].font = font_title
    ws2["A1"].fill = fill_dark_green
    ws2["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws2.row_dimensions[1].height = 30

    etapes = [
        ("ÉTAPE 1 : IDENTIFIER LE GOULET VITAL", "Se poser la question : 'Quelle est la machine, la personne, la matière ou le système qui, s'il s'arrête 24h, bloque toute la facturation ?'\nNe pas lister 50 petits problèmes : cibler uniquement les 2 goulets mortels par processus."),
        ("ÉTAPE 2 : CHIFFRER LE TEMPS CRITIQUE", "Combien d'heures l'entreprise peut-elle tenir avant que le client n'annule ou exige des pénalités ?\nExemple : 4h pour une machine goulet, 24h pour un blocage bancaire, 48h pour un client mécontent."),
        ("ÉTAPE 3 : CHOISIR LA PARADE RÉALISTE", "Choisir parmi les 4 familles universelles PME (pas d'idées en l'air) :\n1. Réciprocité Confrère (capacité machine réservée à froid contre échange de bons procédés)\n2. Double Sourcing Actif (compte pré-ouvert chez distributeur B avec 1 commande test par an)\n3. Mode Dégradé Accepté (procédure de fabrication simplifiée ou programmation en télétravail)\n4. Doublure Pratique (suppléant formé selon Matrice 4.1 et armoire des 3 pièces d'usure sous clé)"),
        ("ÉTAPE 4 : LE TEST DU VERROU (Anti-Vœu Pieux)", "Pour valider qu'un Plan B est réel et efficace, vérifier 3 verrous absolus :\n• Le contact 24/7 direct (06 personnel) est-il écrit ? L'emplacement de la clé/code est-il connu ?\n• Sait-on quelle commande non-urgente on arrête immédiatement sans déranger le patron ?\n• Le responsable a-t-il le droit d'engager les fonds (mandat financier) sans faire signer le DG ?")
    ]
    for i, (titre, desc) in enumerate(etapes, start=3):
        r = (i - 3) * 3 + 3
        ws2.cell(row=r, column=1, value=titre).font = font_meta_lbl
        ws2.cell(row=r, column=1).fill = fill_light_green
        ws2.cell(row=r, column=1).alignment = Alignment(vertical="top")
        ws2.cell(row=r, column=2, value=desc).font = font_cell
        ws2.cell(row=r, column=2).alignment = Alignment(vertical="top", wrap_text=True)
        ws2.row_dimensions[r].height = 45

    # Sheet 3: BOITE A PARADES PME
    ws3 = wb.create_sheet("03_BOITE_A_PARADES_PME")
    ws3.views.sheetView[0].showGridLines = True
    ws3.column_dimensions["A"].width = 25
    ws3.column_dimensions["B"].width = 35
    ws3.column_dimensions["C"].width = 50

    ws3.merge_cells("A1:C1")
    ws3["A1"] = "BOÎTE À IDÉES : PARADES TYPES PAR MÉTIER PME"
    ws3["A1"].font = font_title
    ws3["A1"].fill = fill_dark_green
    ws3["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws3.row_dimensions[1].height = 30

    exemples = [
        ("Secteur / Métier", "Risque Fréquent", "Parade Réelle & Efficace"),
        ("Usinage & Métallurgie", "Casse broche centre d'usinage 5 axes", "Accord de réciprocité signé avec confrère voisin (post-processeurs testés d'avance)"),
        ("Usinage & Métallurgie", "Rupture approvisionnement nuance spéciale", "Compte d'urgence ouvert chez 2e aciériste + commande test semestrielle"),
        ("BTP & Artisanat", "Panne camion grue ou nacelle sur chantier", "Contrat cadre d'astreinte avec loueur local sous 2h + franchise négociée"),
        ("BTP & Artisanat", "Accident ou arrêt maladie chef de chantier", "Binôme désigné avec accès plans sur tablette cloud et numéro conducteur travaux"),
        ("Négoce & Logistique", "Panne chariot élévateur principal", "Chariot de secours manuel + accord de prêt avec entreprise voisine de la zone"),
        ("Négoce & Logistique", "Coupure connexion internet / télécom", "Routeur 4G/5G de secours pré-configuré avec carte SIM secours en tiroir"),
        ("Services & Bureau d'Études", "Crash station CAO / perte fichiers 3D", "Sauvegarde miroir automatique NAS déconnecté à 12h et 18h + poste portable prêt"),
        ("Services & Bureau d'Études", "Départ soudain ingénieur expert calcul", "Convention d'assistance technique avec indépendant externe sous 24h")
    ]
    for r_idx, (m, rsk, par) in enumerate(exemples, start=3):
        ws3.cell(row=r_idx, column=1, value=m)
        ws3.cell(row=r_idx, column=2, value=rsk)
        ws3.cell(row=r_idx, column=3, value=par)
        ws3.row_dimensions[r_idx].height = 24
        is_hdr = (r_idx == 3)
        for c in range(1, 4):
            cell = ws3.cell(row=r_idx, column=c)
            cell.font = font_hdr if is_hdr else font_cell
            cell.fill = fill_dark_green if is_hdr else (fill_cream if r_idx % 2 == 1 else fill_white)
            cell.alignment = Alignment(vertical="center", wrap_text=True)
            cell.border = border_cell

    if abs_path:
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        wb.save(abs_path)
        print(f"[SUCCESS] Classeur officiel Excel Outil 1.2 sauvegardé : {abs_path}")
    return wb

# ---------------------------------------------------------
# GENERIC WORD GENERATOR (POUR AUTRES OUTILS DU PACK)
# ---------------------------------------------------------
def generate_generic_word_document(tool_id, tool_data, client_name="Entreprise Client", abs_path=None):
    """
    Génère un document Word soigné selon la charte Delacour pour les autres outils.
    """
    doc = create_base_delacour_document()
    today_str = datetime.date.today().strftime("%d/%m/%Y")
    add_header_brand(
        doc,
        tool_code=f"OUTIL {tool_id} — Système de Management de la Qualité",
        tool_title=f"Fiche Opérationnelle de Gestion • Outil {tool_id}",
        subtitle=f"Entreprise : {client_name} • Date de révision : {today_str} • Statut : Validé"
    )

    add_section_header(doc, "DONNÉES ENREGISTRÉES & DÉCISIONS OPÉRATIONNELLES")

    headers = ["Élément de Contrôle / Paramètre Métier", "Donnée & Décision Enregistrée"]
    rows = []
    for k, v in tool_data.items():
        clean_k = str(k).replace("_", " ").title()
        rows.append([clean_k, str(v)])

    if not rows:
        rows = [["[Paramètre 1]", "[Valeur enregistrée]"], ["[Paramètre 2]", "[Valeur enregistrée]"]]

    format_delacour_table(doc, headers, rows, col_widths_dxa=[3500, 6700])

    add_next_steps_box(
        doc,
        steps=[
            f"Archiver ce document dans le dossier de processus correspondant sous OUTILS_RENTABILITE_DELACOUR/.",
            "Diffuser les décisions aux collaborateurs concernés sous 24 heures.",
            "Contrôler l'application lors du prochain point de suivi opérationnel."
        ]
    )

    if abs_path:
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        doc.save(abs_path)
        print(f"[SUCCESS] Document Word {tool_id} sauvegardé : {abs_path}")
    return doc

def sync_tool_data(tool_id, tool_data, client_name="Entreprise Client"):
    """
    Met à jour le fichier .docx ou .xlsx de l'outil sur le disque dur.
    """
    rel_path = TOOL_PATHS.get(tool_id)
    if not rel_path:
        print(f"[ERROR] Tool ID {tool_id} introuvable.")
        return False

    abs_path = os.path.join(BASE_DIR, rel_path)
    print(f"[SYNC] Mise à jour du fichier local : {abs_path}")

    if tool_id in ("1.1", "1.3"):
        generate_tool_1_1_word_document(tool_data, client_name, abs_path)
    elif tool_id == "1.2":
        generate_tool_1_2_excel_workbook(tool_data, client_name, abs_path)
    else:
        generate_generic_word_document(tool_id, tool_data, client_name, abs_path)

    return True

# ---------------------------------------------------------
# EXCEL COCKPIT SYNCHRONIZER (NON-DESTRUCTIVE SAFE SYNC)
# ---------------------------------------------------------
def sync_excel_cockpit(cockpit_data, client_name="Entreprise Démo & Co.", week_label=None):
    """
    Met à jour le classeur Excel principal COCKPIT_PILOTAGE_ET_RENTABILITE_DELACOUR.xlsx
    de manière non-destructive :
    - Cible l'onglet '01_COCKPIT_HEBDO'
    - Met à jour les cellules de relevé C8:C12 et l'en-tête B4
    - Met à jour les arbitrages en lignes 17:18 si fournis
    - Préserve l'intégralité des formules (=IF(C8="","",...), styles, onglets et données.
    """
    try:
        import openpyxl
        wb_path = os.path.join(BASE_DIR, "COCKPIT_PILOTAGE_ET_RENTABILITE_DELACOUR.xlsx")
        if not os.path.exists(wb_path):
            print(f"[ERROR] Classeur Excel introuvable à : {wb_path}")
            return False

        wb = openpyxl.load_workbook(wb_path)
        if "01_COCKPIT_HEBDO" not in wb.sheetnames:
            print(f"[ERROR] Onglet '01_COCKPIT_HEBDO' absent du classeur.")
            return False

        ws = wb["01_COCKPIT_HEBDO"]

        # 1. Mise à jour de l'en-tête (Semaine / Entreprise)
        if week_label:
            ws['B4'] = week_label
        elif client_name:
            ws['B4'] = f"Semaine S-{datetime.date.today().isocalendar()[1]} • {client_name}"

        ws['D4'] = f"Lundi {datetime.datetime.now().strftime('%d/%m/%Y')} 08h30"

        # 2. Helper de conversion numérique intelligente
        def parse_kpi_value(val, is_pct=False):
            if val is None:
                return None
            if isinstance(val, (int, float)):
                if is_pct and val > 1.0:
                    return round(val / 100.0, 4)
                return val
            # Traiter string
            s = str(val).replace("€", "").replace("%", "").replace(" ", "").replace("\xa0", "").replace(",", ".").strip()
            try:
                num = float(s)
                if is_pct and num > 1.0:
                    return round(num / 100.0, 4)
                if num.is_integer():
                    return int(num)
                return num
            except ValueError:
                return str(val)

        # 3. Mapping dynamique des 5 processus (Lignes 8 à 12)
        kpi_configs = [
            (8, "p1", ["p1", "tresorerie", "solde", "p1_direction"], False, "higher"),
            (9, "p2", ["p2", "conversion", "transformation", "p2_commercial"], True, "higher"),
            (10, "p3", ["p3", "retards", "delais", "p3_atelier"], False, "lower"),
            (11, "p4", ["p4", "presence", "absenteisme", "p4_rh"], True, "higher"),
            (12, "p5", ["p5", "rebuts", "non_qualite", "cnq", "p5_qualite"], False, "lower")
        ]

        # Si une liste complète de KPIs personnalisés est fournie
        if "kpis" in cockpit_data and isinstance(cockpit_data["kpis"], list):
            for idx, item in enumerate(cockpit_data["kpis"][:5]):
                row_idx = 8 + idx
                if isinstance(item, dict):
                    if "name" in item: ws.cell(row=row_idx, column=2, value=str(item["name"]))
                    if "val" in item:
                        is_pct = "%" in str(item.get("unit", "")) or item.get("is_pct", False)
                        ws.cell(row=row_idx, column=3, value=parse_kpi_value(item["val"], is_pct=is_pct))
                    if "target" in item:
                        is_pct = "%" in str(item.get("unit", "")) or item.get("is_pct", False)
                        ws.cell(row=row_idx, column=4, value=parse_kpi_value(item["target"], is_pct=is_pct))
                    if "direction" in item:
                        op = "<" if item["direction"] == "higher" else ">"
                        ws.cell(row=row_idx, column=6, value=f'=IF(C{row_idx}="","",IF(C{row_idx}{op}D{row_idx},"🔴 ALERTE","🟢 CONFORME"))')
        else:
            # Mapping par clés individuelles (p1..p5) avec support des libellés et cibles sur-mesure
            for row_idx, key, aliases, default_pct, default_dir in kpi_configs:
                # Libellé personnalisé de l'indicateur
                custom_name = cockpit_data.get(f"{key}_name", cockpit_data.get(f"{key}_label", cockpit_data.get(f"{key}_indicateur")))
                if custom_name:
                    ws.cell(row=row_idx, column=2, value=str(custom_name))

                # Cible personnalisée
                custom_target = cockpit_data.get(f"{key}_cible", cockpit_data.get(f"{key}_threshold", cockpit_data.get(f"{key}_target")))
                if custom_target is not None:
                    parsed_target = parse_kpi_value(custom_target, is_pct=default_pct)
                    ws.cell(row=row_idx, column=4, value=parsed_target)

                # Sens personnalisé de performance (higher vs lower)
                custom_dir = cockpit_data.get(f"{key}_direction")
                if custom_dir in ("higher", "lower"):
                    op = "<" if custom_dir == "higher" else ">"
                    ws.cell(row=row_idx, column=6, value=f'=IF(C{row_idx}="","",IF(C{row_idx}{op}D{row_idx},"🔴 ALERTE","🟢 CONFORME"))')

                # Valeur réelle relevée
                val = None
                for alias in aliases:
                    if alias in cockpit_data:
                        val = cockpit_data[alias]
                        break
                if val is not None:
                    parsed = parse_kpi_value(val, is_pct=default_pct)
                    ws.cell(row=row_idx, column=3, value=parsed)
                    print(f"[EXCEL] {key.upper()} C{row_idx} mis à jour : {parsed}")

        # 4. Arbitrages éventuels (Ligne 17)
        if "arbitrage_probleme" in cockpit_data:
            ws['B17'] = str(cockpit_data["arbitrage_probleme"])
        if "arbitrage_decision" in cockpit_data:
            ws['C17'] = str(cockpit_data["arbitrage_decision"])
        if "arbitrage_pilote" in cockpit_data:
            ws['D17'] = str(cockpit_data["arbitrage_pilote"])
        if "arbitrage_echeance" in cockpit_data:
            ws['E17'] = str(cockpit_data["arbitrage_echeance"])
        if "arbitrage_statut" in cockpit_data:
            ws['F17'] = str(cockpit_data["arbitrage_statut"])
        if "arbitrage_resultat" in cockpit_data:
            ws['G17'] = str(cockpit_data["arbitrage_resultat"])

        wb.save(wb_path)
        print(f"[SUCCESS] Excel Cockpit mis à jour en toute sécurité : {wb_path}")
        return True
    except Exception as e:
        print(f"[ERROR] Échec de synchronisation Excel Cockpit : {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Synchronisateur de fichiers locaux Delacour Quality OS")
    parser.add_argument("--tool-id", type=str, help="ID de l'outil (ex: 1.1, 2.2)")
    parser.add_argument("--json-data", type=str, help="JSON des données modifiées")
    parser.add_argument("--client", type=str, default="Entreprise Démo & Co.", help="Nom de l'entreprise")
    parser.add_argument("--test", action="store_true", help="Exécuter un test de synchronisation")

    args = parser.parse_args()

    if args.test:
        print("[TEST] Exécution d'un test complet de synchronisation locale...")
        test_tool_data = {
            "ca_cible": "130 000 €",
            "ca_m1": "122 000 €",
            "ca_reel": "135 000 €",
            "marge_cible": "42.0 %",
            "marge_m1": "41.5 %",
            "marge_reel": "38.5 %"
        }
        sync_tool_data("1.1", test_tool_data, "Atelier Mécanique Précision 38")
        sync_excel_cockpit({
            "p1": 72500,
            "p2": 38.5,
            "p3": 1,
            "p4": 95.0,
            "p5": 1150,
            "arbitrage_probleme": "Surcoût matière inox sur commande #412",
            "arbitrage_decision": "Avenant commercial immédiat + validation DG",
            "arbitrage_pilote": "Dir. Commercial",
            "arbitrage_echeance": "Vendredi 17h",
            "arbitrage_statut": "🟢 EN COURS",
            "arbitrage_resultat": "Marge préservée à 40%"
        }, "Atelier Mécanique Précision 38")
        print("[TEST] Fin du test avec succès.")
        return

    if args.tool_id and args.json_data:
        try:
            data = json.loads(args.json_data)
            sync_tool_data(args.tool_id, data, args.client)
        except Exception as e:
            print(f"[ERROR] Échec du traitement JSON : {e}")

if __name__ == "__main__":
    main()

