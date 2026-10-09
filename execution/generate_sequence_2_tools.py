import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

out_word_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/outils_qualite_word/sequence_2"
out_unified_docx = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_2_VENTES_MARGES_ACHATS/DOCX"
out_unified_html = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_2_VENTES_MARGES_ACHATS/HTML"
out_unified_md = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_2_VENTES_MARGES_ACHATS/MD"

os.makedirs(out_word_dir, exist_ok=True)
os.makedirs(out_unified_docx, exist_ok=True)
os.makedirs(out_unified_html, exist_ok=True)
os.makedirs(out_unified_md, exist_ok=True)

# BRAND COLORS
BRAND_GREEN = RGBColor(27, 77, 62)     # #1B4D3E Vibrant Emerald/Forest Green
DARK_GREEN = RGBColor(21, 40, 34)      # #152822
LIGHT_GREEN = RGBColor(74, 108, 92)    # #4A6C5C
GOLD = RGBColor(197, 160, 101)         # #C5A065
WHITE = RGBColor(255, 255, 255)
GREEN_TEXT = RGBColor(27, 94, 32)      # #1B5E20
RED_TEXT = RGBColor(183, 28, 28)       # #B71C1C
MUTED_TEXT = RGBColor(120, 120, 120)

CREAM_BG = "F9F9F7"
WHY_BG = "FDFBF7"
THEMES_BG = "F7F9F8"
BORDER_ACCENT = "E2DCCC"

FONT_SERIF = "Georgia"
FONT_SANS = "Arial"

HEADER_IMG_PATH = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/.tmp/header_brand_unified_hd.png"

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

def save_doc(doc, filename):
    doc.save(os.path.join(out_word_dir, filename))
    doc.save(os.path.join(out_unified_docx, filename))

def create_base_document():
    doc = Document()
    section = doc.sections[0]
    
    section.header_distance = Inches(0.35)
    section.footer_distance = Inches(0.35)
    section.top_margin = Inches(0.95)
    section.bottom_margin = Inches(0.65)
    section.left_margin = Inches(0.6)
    section.right_margin = Inches(0.6)
    
    header = section.header
    p_head = header.paragraphs[0]
    p_head.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_head.paragraph_format.space_after = Pt(0)
    
    if os.path.exists(HEADER_IMG_PATH):
        r_img = p_head.add_run()
        r_img.add_picture(HEADER_IMG_PATH, width=Inches(7.3))
    
    # 100% OPENXML COMPLIANT FOOTER (ZERO WORD MAC WARNING POPUPS + PERFECT RIGHT TAB ALIGNMENT)
    footer = section.footer
    p_ft = footer.paragraphs[0]
    p_ft.text = ""
    p_ft.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_ft.paragraph_format.space_after = Pt(0)
    
    pPr = p_ft._p.get_or_add_pPr()
    tabs = OxmlElement('w:tabs')
    tab = OxmlElement('w:tab')
    tab.set(qn('w:val'), 'right')
    tab.set(qn('w:pos'), '10512') # 7.3 inches exact right margin
    tabs.append(tab)
    pPr.append(tabs)
    
    r_l = p_ft.add_run("Cabinet Delacour - delacour.melchior@cabinetdelacour.com")
    r_l.font.name = FONT_SANS
    r_l.font.size = Pt(7.5)
    r_l.font.italic = True
    r_l.font.color.rgb = MUTED_TEXT
    
    r_tab = p_ft.add_run("\t\t")
    
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

# 1. HEADER BRAND IN BODY
def add_header_brand(doc, tool_code, tool_title, clause_q_text):
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
    
    p_title = c_t.paragraphs[0]
    p_title.paragraph_format.space_after = Pt(2)
    r_cl = p_title.add_run(f"SÉQUENCE 2 - {tool_code} — {clause_q_text}\n")
    r_cl.font.name = FONT_SANS
    r_cl.font.size = Pt(8.5)
    r_cl.font.bold = True
    r_cl.font.color.rgb = GOLD
    
    r_main_t = p_title.add_run(tool_title)
    r_main_t.font.name = FONT_SERIF
    r_main_t.font.size = Pt(14.5)
    r_main_t.font.bold = True
    r_main_t.font.color.rgb = BRAND_GREEN
    
    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_after = Pt(4)

# 2. CONSULTANT BOX & 2x2 THEME CARDS
def add_consultant_box(doc, advice_text, themes_tuples):
    while len(themes_tuples) < 4:
        themes_tuples.append(("", ""))

    tbl = doc.add_table(rows=4, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False

    c_title = tbl.cell(0, 0)
    c_title_r = tbl.cell(0, 1)
    c_title.merge(c_title_r)
    set_explicit_cell_width(c_title, 10200)
    set_cell_background(c_title, THEMES_BG)
    set_cell_margins(c_title, top=80, bottom=60, left=120, right=120)
    set_cell_border(c_title, left={'sz': 24, 'val': 'single', 'color': '1B4D3E'},
                             top={'sz': 4, 'val': 'single', 'color': '4A6C5C'},
                             right={'sz': 4, 'val': 'single', 'color': '4A6C5C'},
                             bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    p_t = c_title.paragraphs[0]
    p_t.paragraph_format.space_after = Pt(0)
    r_t = p_t.add_run("CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER")
    r_t.font.name = FONT_SERIF
    r_t.font.size = Pt(10)
    r_t.font.bold = True
    r_t.font.color.rgb = BRAND_GREEN

    c_posture = tbl.cell(1, 0)
    c_posture_r = tbl.cell(1, 1)
    c_posture.merge(c_posture_r)
    set_explicit_cell_width(c_posture, 10200)
    set_cell_background(c_posture, THEMES_BG)
    set_cell_margins(c_posture, top=40, bottom=60, left=120, right=120)
    set_cell_border(c_posture, left={'sz': 24, 'val': 'single', 'color': '1B4D3E'},
                               right={'sz': 4, 'val': 'single', 'color': '4A6C5C'},
                               bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    p_p = c_posture.paragraphs[0]
    p_p.paragraph_format.space_after = Pt(0)
    r_lbl = p_p.add_run("Posture & Animation : ")
    r_lbl.font.name = FONT_SANS
    r_lbl.font.bold = True
    r_lbl.font.size = Pt(8)
    r_lbl.font.color.rgb = BRAND_GREEN
    r_txt = p_p.add_run(advice_text.replace("PME", "entreprise"))
    r_txt.font.name = FONT_SANS
    r_txt.font.italic = True
    r_txt.font.size = Pt(8)

    cards_config = [
        (tbl.cell(2, 0), themes_tuples[0][0], themes_tuples[0][1], True),
        (tbl.cell(2, 1), themes_tuples[1][0], themes_tuples[1][1], False),
        (tbl.cell(3, 0), themes_tuples[2][0], themes_tuples[2][1], True),
        (tbl.cell(3, 1), themes_tuples[3][0], themes_tuples[3][1], False),
    ]

    for idx, (cell, t_head, t_body, is_left) in enumerate(cards_config):
        set_explicit_cell_width(cell, 5100)
        set_cell_background(cell, "FFFFFF")
        set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
        
        left_b = {'sz': 24, 'val': 'single', 'color': '1B4D3E'} if is_left else {'sz': 4, 'val': 'single', 'color': BORDER_ACCENT}
        right_b = {'sz': 4, 'val': 'single', 'color': '4A6C5C'} if not is_left else {'sz': 4, 'val': 'single', 'color': BORDER_ACCENT}
        bottom_b = {'sz': 4, 'val': 'single', 'color': '4A6C5C'} if idx >= 2 else {'sz': 4, 'val': 'single', 'color': BORDER_ACCENT}
        
        set_cell_border(cell, left=left_b, right=right_b, top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT}, bottom=bottom_b)
        
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(1)
        if t_head:
            r_th = p.add_run(t_head.replace("PME", "entreprise") + "\n")
            r_th.font.name = FONT_SERIF
            r_th.font.bold = True
            r_th.font.size = Pt(8)
            r_th.font.color.rgb = BRAND_GREEN
            r_tb = p.add_run(t_body.replace("PME", "entreprise"))
            r_tb.font.name = FONT_SANS
            r_tb.font.size = Pt(7.5)
            r_tb.font.color.rgb = BRAND_GREEN

# 3AB. FINANCIAL ROI BOX
def add_financial_roi_box(doc, gain_text, cout_text):
    tbl = doc.add_table(rows=2, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False

    c_title = tbl.cell(0, 0)
    c_title_r = tbl.cell(0, 1)
    c_title.merge(c_title_r)
    set_explicit_cell_width(c_title, 10200)
    set_cell_background(c_title, CREAM_BG)
    set_cell_margins(c_title, top=80, bottom=50, left=120, right=120)
    set_cell_border(c_title, top={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                             left={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                             right={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                             bottom={'sz': 4, 'val': 'single', 'color': 'C5A065'})
    p_t = c_title.paragraphs[0]
    p_t.paragraph_format.space_after = Pt(0)
    r_t = p_t.add_run("ANCRAGE FINANCIER & IMPACT ROI SUR LA MARGE DE L'ENTREPRISE")
    r_t.font.name = FONT_SERIF
    r_t.font.size = Pt(10)
    r_t.font.bold = True
    r_t.font.color.rgb = BRAND_GREEN

    c1 = tbl.cell(1, 0)
    set_explicit_cell_width(c1, 5100)
    set_cell_background(c1, CREAM_BG)
    set_cell_margins(c1, top=60, bottom=80, left=120, right=120)
    set_cell_border(c1, left={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         bottom={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                         top={'sz': 4, 'val': 'single', 'color': 'C5A065'})
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(2)
    r1 = p1.add_run("GAIN STRATÉGIQUE OU PROTECTION DE MARGE BRUTE (€) :\n")
    r1.font.name = FONT_SERIF
    r1.font.bold = True
    r1.font.size = Pt(8.5)
    r1.font.color.rgb = GREEN_TEXT
    r1_b = p1.add_run("- " + gain_text.replace("PME", "entreprise"))
    r1_b.font.name = FONT_SANS
    r1_b.font.size = Pt(8)

    c2 = tbl.cell(1, 1)
    set_explicit_cell_width(c2, 5100)
    set_cell_background(c2, CREAM_BG)
    set_cell_margins(c2, top=60, bottom=80, left=120, right=120)
    set_cell_border(c2, right={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         bottom={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                         top={'sz': 4, 'val': 'single', 'color': 'C5A065'})
    p2 = c2.paragraphs[0]
    p2.paragraph_format.space_after = Pt(2)
    r2 = p2.add_run("COÛT DE NON-QUALITÉ OU PERTE EN CAS D'INACTION (€) :\n")
    r2.font.name = FONT_SERIF
    r2.font.bold = True
    r2.font.size = Pt(8.5)
    r2.font.color.rgb = RED_TEXT
    r2_b = p2.add_run("- " + cout_text.replace("PME", "entreprise"))
    r2_b.font.name = FONT_SANS
    r2_b.font.size = Pt(8)

    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_after = Pt(4)

# 3B. INTERCONNECTIONS BOX
def add_interconnections_box(doc, inputs_list, outputs_list):
    tbl = doc.add_table(rows=2, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False

    c_title = tbl.cell(0, 0)
    c_title_r = tbl.cell(0, 1)
    c_title.merge(c_title_r)
    set_explicit_cell_width(c_title, 10200)
    set_cell_background(c_title, CREAM_BG)
    set_cell_margins(c_title, top=80, bottom=50, left=120, right=120)
    set_cell_border(c_title, top={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                             left={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                             right={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                             bottom={'sz': 4, 'val': 'single', 'color': 'C5A065'})
    p_t = c_title.paragraphs[0]
    p_t.paragraph_format.space_after = Pt(0)
    r_t = p_t.add_run("MATRICE D'INTERCONNEXIONS & FLUX DE DONNÉES ENTRANTES / SORTANTES")
    r_t.font.name = FONT_SERIF
    r_t.font.size = Pt(10)
    r_t.font.bold = True
    r_t.font.color.rgb = BRAND_GREEN

    c1 = tbl.cell(1, 0)
    set_explicit_cell_width(c1, 5100)
    set_cell_background(c1, CREAM_BG)
    set_cell_margins(c1, top=60, bottom=80, left=120, right=120)
    set_cell_border(c1, left={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         bottom={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                         top={'sz': 4, 'val': 'single', 'color': 'C5A065'})
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(2)
    r1 = p1.add_run("DONNÉES ENTRANTES (D'où viennent les informations ?) :\n")
    r1.font.name = FONT_SERIF
    r1.font.bold = True
    r1.font.size = Pt(8.5)
    r1.font.color.rgb = BRAND_GREEN
    for inp in inputs_list:
        p = c1.add_paragraph()
        p.paragraph_format.space_after = Pt(1)
        r = p.add_run("- " + inp.replace("PME", "entreprise"))
        r.font.name = FONT_SANS
        r.font.size = Pt(8)

    c2 = tbl.cell(1, 1)
    set_explicit_cell_width(c2, 5100)
    set_cell_background(c2, CREAM_BG)
    set_cell_margins(c2, top=60, bottom=80, left=120, right=120)
    set_cell_border(c2, right={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         bottom={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                         top={'sz': 4, 'val': 'single', 'color': 'C5A065'})
    p2 = c2.paragraphs[0]
    p2.paragraph_format.space_after = Pt(2)
    r2 = p2.add_run("DONNÉES SORTANTES (Vers quoi cet outil alimente-t-il ?) :\n")
    r2.font.name = FONT_SERIF
    r2.font.bold = True
    r2.font.size = Pt(8.5)
    r2.font.color.rgb = BRAND_GREEN
    for out in outputs_list:
        p = c2.add_paragraph()
        p.paragraph_format.space_after = Pt(1)
        r = p.add_run("- " + out.replace("PME", "entreprise"))
        r.font.name = FONT_SANS
        r.font.size = Pt(8)

    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_after = Pt(4)

# 3. WHY BOX
def add_why_box(doc, gains_list, risques_list):
    tbl = doc.add_table(rows=2, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False

    c_title = tbl.cell(0, 0)
    c_title_r = tbl.cell(0, 1)
    c_title.merge(c_title_r)
    set_explicit_cell_width(c_title, 10200)
    set_cell_background(c_title, WHY_BG)
    set_cell_margins(c_title, top=80, bottom=50, left=120, right=120)
    set_cell_border(c_title, top={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                             left={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                             right={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                             bottom={'sz': 4, 'val': 'single', 'color': 'C5A065'})
    p_t = c_title.paragraphs[0]
    p_t.paragraph_format.space_after = Pt(0)
    r_t = p_t.add_run("POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE ENTREPRISE ?")
    r_t.font.name = FONT_SERIF
    r_t.font.size = Pt(10)
    r_t.font.bold = True
    r_t.font.color.rgb = BRAND_GREEN

    c1 = tbl.cell(1, 0)
    set_explicit_cell_width(c1, 5100)
    set_cell_background(c1, WHY_BG)
    set_cell_margins(c1, top=60, bottom=80, left=120, right=120)
    set_cell_border(c1, left={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         bottom={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                         top={'sz': 4, 'val': 'single', 'color': 'C5A065'})
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(2)
    r1 = p1.add_run("Ce que vous gagnez à l'utiliser :\n")
    r1.font.name = FONT_SERIF
    r1.font.bold = True
    r1.font.size = Pt(8.5)
    r1.font.color.rgb = GREEN_TEXT
    for g in gains_list:
        p = c1.add_paragraph()
        p.paragraph_format.space_after = Pt(1)
        r = p.add_run("- " + g.replace("PME", "entreprise"))
        r.font.name = FONT_SANS
        r.font.size = Pt(8)

    c2 = tbl.cell(1, 1)
    set_explicit_cell_width(c2, 5100)
    set_cell_background(c2, WHY_BG)
    set_cell_margins(c2, top=60, bottom=80, left=120, right=120)
    set_cell_border(c2, right={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         bottom={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                         left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                         top={'sz': 4, 'val': 'single', 'color': 'C5A065'})
    p2 = c2.paragraphs[0]
    p2.paragraph_format.space_after = Pt(2)
    r2 = p2.add_run("Ce que vous risquez sans cet outil :\n")
    r2.font.name = FONT_SERIF
    r2.font.bold = True
    r2.font.size = Pt(8.5)
    r2.font.color.rgb = RED_TEXT
    for r_item in risques_list:
        p = c2.add_paragraph()
        p.paragraph_format.space_after = Pt(1)
        r = p.add_run("- " + r_item.replace("PME", "entreprise"))
        r.font.name = FONT_SANS
        r.font.size = Pt(8)

    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_after = Pt(4)

# 4. GUIDE BOX
def add_guide_box(doc, steps_list):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    cell = tbl.cell(0, 0)
    set_explicit_cell_width(cell, 10200)
    set_cell_background(cell, "FFFFFF")
    set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
    set_cell_border(cell, left={'sz': 24, 'val': 'single', 'color': '1B4D3E'},
                          top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                          bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                          right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    
    p0 = cell.paragraphs[0]
    p0.paragraph_format.space_after = Pt(3)
    r0 = p0.add_run("GUIDE DE REMPLISSAGE PAS À PAS (4 ÉTAPES)\n")
    r0.font.name = FONT_SERIF
    r0.font.size = Pt(9.5)
    r0.font.bold = True
    r0.font.color.rgb = BRAND_GREEN
    
    for idx, step in enumerate(steps_list, 1):
        p = cell.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        r_num = p.add_run(f"Étape {idx} : ")
        r_num.font.name = FONT_SANS
        r_num.font.bold = True
        r_num.font.size = Pt(8)
        r_num.font.color.rgb = BRAND_GREEN
        r_txt = p.add_run(step.replace("PME", "entreprise"))
        r_txt.font.name = FONT_SANS
        r_txt.font.size = Pt(8)
        
    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_after = Pt(4)

# 5. NEXT STEPS BOX
def add_next_steps_box(doc, next_list):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    cell = tbl.cell(0, 0)
    set_explicit_cell_width(cell, 10200)
    set_cell_background(cell, CREAM_BG)
    set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
    set_cell_border(cell, left={'sz': 24, 'val': 'single', 'color': '1B4D3E'},
                          top={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                          bottom={'sz': 6, 'val': 'single', 'color': 'C5A065'},
                          right={'sz': 6, 'val': 'single', 'color': 'C5A065'})
    
    p0 = cell.paragraphs[0]
    p0.paragraph_format.space_after = Pt(3)
    r0 = p0.add_run("QUE FAIRE UNE FOIS CET OUTIL COMPLÉTÉ ?\n")
    r0.font.name = FONT_SERIF
    r0.font.size = Pt(9.5)
    r0.font.bold = True
    r0.font.color.rgb = BRAND_GREEN
    
    for n in next_list:
        p = cell.add_paragraph()
        p.paragraph_format.space_after = Pt(1.5)
        r = p.add_run("- " + n.replace("PME", "entreprise"))
        r.font.name = FONT_SANS
        r.font.size = Pt(8)
        r.font.color.rgb = BRAND_GREEN
        
    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_after = Pt(4)

# 6. TABLE FORMATTER
def format_word_table(doc, headers, rows_data, col_widths_dxa=None):
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    hdr_cells = tbl.rows[0].cells
    for i, h_text in enumerate(headers):
        clean_h = h_text.replace("PME", "entreprise")
        hdr_cells[i].text = clean_h
        if col_widths_dxa and i < len(col_widths_dxa):
            set_explicit_cell_width(hdr_cells[i], col_widths_dxa[i])
        set_cell_background(hdr_cells[i], "1B4D3E")
        set_cell_margins(hdr_cells[i], top=60, bottom=60, left=60, right=60)
        set_cell_border(hdr_cells[i], top={'sz': 4, 'val': 'single', 'color': '1B4D3E'},
                                      bottom={'sz': 4, 'val': 'single', 'color': '1B4D3E'},
                                      left={'sz': 4, 'val': 'single', 'color': '1B4D3E'},
                                      right={'sz': 4, 'val': 'single', 'color': '1B4D3E'})
        for p in hdr_cells[i].paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.name = FONT_SANS
                r.font.size = Pt(8)
                r.font.bold = True
                r.font.color.rgb = WHITE
                
    for r_idx, row_data in enumerate(rows_data):
        row_cells = tbl.add_row().cells
        bg_hex = "F9F9F7" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            clean_val = val.replace("🟢", "").replace("🔴", "").replace("🟠", "").replace("🟡", "").replace("PME", "entreprise").strip()
            row_cells[c_idx].text = clean_val
            if col_widths_dxa and c_idx < len(col_widths_dxa):
                set_explicit_cell_width(row_cells[c_idx], col_widths_dxa[c_idx])
            set_cell_background(row_cells[c_idx], bg_hex)
            set_cell_margins(row_cells[c_idx], top=50, bottom=50, left=60, right=60)
            set_cell_border(row_cells[c_idx], top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
            for p in row_cells[c_idx].paragraphs:
                for r in p.runs:
                    r.font.name = FONT_SANS
                    r.font.size = Pt(7.5)
                    if "[Votre" in val or "____" in val or "[Saisissez" in val:
                        r.font.italic = True
                        r.font.bold = True
                        r.font.color.rgb = GOLD
    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_after = Pt(4)

def add_section_header(doc, text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    c = tbl.cell(0, 0)
    set_explicit_cell_width(c, 10200)
    set_cell_background(c, THEMES_BG)
    set_cell_margins(c, top=80, bottom=80, left=120, right=120)
    set_cell_border(c, left={'sz': 20, 'val': 'single', 'color': '1B4D3E'},
                       top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                       bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                       right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    p = c.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(text)
    r.font.name = FONT_SERIF
    r.font.size = Pt(10)
    r.font.bold = True
    r.font.color.rgb = BRAND_GREEN
    
    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_after = Pt(4)

# BUILDERS FOR SEQUENCE 2

# 1. START HERE SEQUENCE 2
def make_start_here_seq2():
    doc = create_base_document()
    add_header_brand(doc, "NOTICE CLIENT", "Guide de Démarrage Client Autonome (Séquence 2)", "Ventes, Marges & Achats - 3 Jours")
    add_consultant_box(doc, "Bienvenue dans votre Kit d'Outils Qualité Séquence 2. Cette séquence sécurise le cœur financier de votre entreprise : la rentabilité brute de vos devis et la fiabilité de vos fournisseurs.", [
        ("1. Validation Obligatoire Devis", "Imposer une revue systématique des offres > 10k€ pour ne signer aucune affaire à perte."),
        ("2. Évaluation des Fournisseurs", "Noter les prestataires critiques sur des faits réels (Qualité, Délais OTD, Réactivité)."),
        ("3. Registre & NPS Clients", "Accuser réception de toute réclamation sous 24h et mesurer votre score NPS."),
        ("4. Archivage dans la GED", "Enregistrer les grilles signées sous 02_VENTES_MARGES_ACHATS/.")
    ])
    add_why_box(doc, [
        "Protection immédiate du taux de marge brute (cible ≥ 35%).",
        "Élimination des retards de livraison dus aux défaillances fournisseurs.",
        "Fidélisation renforcée de vos clients grands comptes."
    ], [
        "Signer des marchés déficitaires qui bloquent l'atelier à perte.",
        "Arrêt de production sur livraison de matières non conformes.",
        "Pertes de clients stratégiques suite à des réclamations non traitées."
    ])
    days_data = [
        ("JOUR 1 : SÉCURISATION DES DEVIS & CONTRATS (25 MIN)", "Mettez en place la checklist de validation obligatoire des devis complexes.", "Fichier : OUTIL_08_REVUE_DEVIS_CONTRATS.docx"),
        ("JOUR 2 : HOMOLOGATION & ÉVALUATION FOURNISSEURS (20 MIN)", "Notez vos 3 principaux fournisseurs et sous-traitants d'achats critiques.", "Fichier : OUTIL_09_EVALUATION_FOURNISSEURS.docx"),
        ("JOUR 3 : TRAITEMENT RÉCLAMATIONS & ENQUÊTE NPS (20 MIN)", "Renseignez le registre des réclamations et mesurez votre score NPS client.", "Fichier : OUTIL_10_RECLAMATIONS_NPS_CLIENT.docx")
    ]
    add_section_header(doc, "VOTRE PARCOURS AUTONOME EN 3 JOURS")
    for day_title, day_desc, day_files in days_data:
        tbl_d = doc.add_table(rows=1, cols=1)
        tbl_d.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl_d.autofit = False
        c_d = tbl_d.cell(0, 0)
        set_explicit_cell_width(c_d, 10200)
        set_cell_background(c_d, CREAM_BG)
        set_cell_margins(c_d, top=60, bottom=60, left=120, right=120)
        set_cell_border(c_d, left={'sz': 20, 'val': 'single', 'color': '1B4D3E'},
                             top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                             bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                             right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
        p = c_d.paragraphs[0]
        r_dt = p.add_run(day_title + "\n")
        r_dt.font.name = FONT_SERIF
        r_dt.font.bold = True
        r_dt.font.size = Pt(9.5)
        r_dt.font.color.rgb = BRAND_GREEN
        r_dd = p.add_run(day_desc + "\n")
        r_dd.font.name = FONT_SANS
        r_dd.font.size = Pt(8)
        r_df = p.add_run(day_files)
        r_df.font.name = FONT_SANS
        r_df.font.bold = True
        r_df.font.size = Pt(8)
        r_df.font.color.rgb = GOLD
        doc.add_paragraph().paragraph_format.space_after = Pt(3)
    add_next_steps_box(doc, [
        "Transmettre vos grilles complétées au Cabinet Delacour.",
        "Archiver les versions sous 02_VENTES_MARGES_ACHATS/."
    ])
    save_doc(doc, "START_HERE_SEQUENCE_2.docx")

# 2. OUTIL 08: REVUE DEVIS & CONTRATS
def make_outil_08():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 08", "Grille de Revue de Devis, Offres & Contrats (Checklist Marge & Faisabilité)", "Clause ISO 9001:2015 - 8.2 - Question Q8")
    add_consultant_box(doc, "Exigez une validation formelle avant la signature de tout devis > 10 000 € ou présentant une exigence technique spécifique. Ne signez aucune affaire en dessous de votre seuil de marge brute cible (35%).", [
        ("1. Marge Brute & Chiffrage", "Vérification du coût réel des matières (avec inflation +15%), heures sous-traitance et frais de transport."),
        ("2. Faisabilité & Délais", "Confirmation de la capacité des machines et des heures atelier disponibles par le Chef de Production."),
        ("3. Conditions de Règlement", "Acompte de 30% exigé à la commande, vérification de la solvabilité du nouveau client."),
        ("4. Exigences Particulières", "Certificats matières 3.1, contrôle 3D, emballage spécifique, pénalités de retard plafonnées à 5% max.")
    ])
    add_why_box(doc, [
        "Élimination des affaires conclues à perte avant lancement en fabrication.",
        "Sécurisation du résultat d'exploitation et de la trésorerie.",
        "Preuve N°1 de maîtrise du processus commercial (ISO 9001 Clause 8.2)."
    ], [
        "Projets déficitaires bloquant l'atelier pendant des semaines.",
        "Litiges contractuels coûteux sur exigences clients mal comprises.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 8.2)."
    ])
    add_financial_roi_box(doc,
        "Garantie de la Marge Brute souscrite et sécurisation des conditions de règlement.",
        "Risque de perte financière et d'exécution d'affaires sous-estimées à perte."
    )
    add_interconnections_box(doc, [
        "OUTIL A8 (QQOQCCP) : Cadrage du besoin et spécifications du client.",
        "OUTIL 09 (Fournisseurs) : Tarifs des sous-traitants et matières de l'affaire.",
        "OUTIL A2A (RDV Client) : Compte-rendu des négociations commerciales."
    ], [
        "OUTIL 03 & 26 (Dashboards KPIs) : Taux de marge brute prévisionnelle.",
        "OUTIL 11 & 12 (Cartographie & Interactions) : Transmission de l'OF à la Prod/BE.",
        "OUTIL 15 (Jalons APQP BE) : Lancement des études de conception."
    ])
    add_guide_box(doc, [
        "Ouvrir la grille pour tout devis ou contrat dont le montant est > 10 000 € HT.",
        "Vérifier les 5 points de contrôle obligatoires (Marge, Faisabilité, Délais, Règlement, Exigences).",
        "Faire apposer les visas du Responsable Commercial et du Responsable Production/BE.",
        "Consigner l'accord dans le registre et archiver avec l'offre commerciale."
    ])
    
    doc.add_page_break()
    add_section_header(doc, "CHECKLIST DE VALIDATION OBLIGATOIRE DE DEVIS PRÊTE À REMPLIR")
    
    headers1 = ["N°", "Point de Contrôle Stratégique", "Exigence / Seuil de Sécurité Target", "Validé (Oui/Non)", "Risque Identifié si Non Conforme", "Action Corrective ou Révision Imposée", "Responsable"]
    rows1 = [
        ["1", "Seuil de Marge Brute Minimum", "Marge Brute HT ≥ 35 % du montant total", "Oui", "Vente à perte, dégradation du résultat EBE", "Réviser le chiffrage ou refuser la commande", "Dir. Commercial"],
        ["2", "Faisabilité Technique BE/Atelier", "Outillage disponible & tolérances réalisables", "Oui", "Rebuts massifs en prod, impossibilité technique", "Validation formelle du Responsable BE/Prod", "Chef Prod"],
        ["3", "Délais de Livraison Promis", "Planning machines & heures atelier disponibles", "Oui", "Pénalités de retard (5%/jour), perte du client", "Ajuster la date de livraison confirmée (+15j)", "Resp. Planning"],
        ["4", "Conditions de Paiement & Acompte", "Acompte 30% à la commande + encours sain", "Oui", "Trou de trésorerie, impayé client en fin d'affaire", "Conditionner le lancement de prod au virement", "RAF / DG"],
        ["5", "Exigences Spécifiques & Pénalités", "Certificats 3.1 requis & pénalités plafonnées ≤5%", "Oui", "Pénalités de retard illimitées, blocage livraison", "Négocier le plafonnement des pénalités", "Dir. Commercial"],
        ["[N°]", "[Votre point de contrôle]", "[Exigence cible]", "[Oui/Non]", "[Risque identifié]", "[Action de révision]", "[Nom]"]
    ]
    format_word_table(doc, headers1, rows1, col_widths_dxa=[500, 2000, 2200, 900, 1800, 1800, 1000])

    add_section_header(doc, "REGISTRE DES DEVIS ET CONTRATS REVUS & VALIDÉS")
    headers2 = ["N° Devis", "Nom Client", "Montant HT (€)", "Marge Brute %", "Faisabilité Validée", "Visa Commercial", "Visa Prod / DG", "Statut Affaire"]
    rows2 = [
        ["DEV-2026-089", "Client Grand Compte ALFA", "45 000 €", "38.5 %", "Conforme BE", "V. Commercial", "V. Dir. Prod", "Validé & Signé"],
        ["DEV-2026-092", "Client Groupe BETA", "18 500 €", "32.0 %", "Sous réserve", "V. Commercial", "Attente Acompte", "En révision tarif"],
        ["DEV-2026-095", "Client Société GAMMA", "62 000 €", "41.0 %", "Conforme BE", "V. Commercial", "V. DG", "Validé & Signé"],
        ["[N° Devis]", "[Nom du Client]", "[Montant]", "[Marge %]", "[Faisabilité]", "[Visa Com]", "[Visa Prod]", "[Statut]"]
    ]
    format_word_table(doc, headers2, rows2, col_widths_dxa=[1400, 2200, 1300, 1200, 1400, 1300, 1400, 1000])

    add_next_steps_box(doc, [
        "Visa obligatoire avant transmission de toute offre > 10k€.",
        "Archivage de la grille visée dans le dossier affaire sous 02_VENTES_MARGES_ACHATS/DEVIS_VALIDES/.",
        "Revue mensuelle du taux de marge réelle vs prévisionnelle."
    ])
    save_doc(doc, "OUTIL_08_REVUE_DEVIS_CONTRATS.docx")

# 3. OUTIL 09: EVALUATION FOURNISSEURS
def make_outil_09():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 09", "Grille d'Évaluation & Homologation des Fournisseurs Critiques", "Clause ISO 9001:2015 - 8.4 - Question Q9")
    add_consultant_box(doc, "Évaluez vos fournisseurs sur des critères factuels mesurés (Taux de respect des délais OTD et Taux de non-conformité FNC). Un fournisseur non évalué est une menace directe sur votre chaîne de fabrication.", [
        ("1. Qualité & Conformité (FNC)", "Taux de réception conforme du premier coup (≥ 98%), présence obligatoire des certificats matières 3.1."),
        ("2. Respect des Délais (OTD %)", "Livraison à la date promise confirmée sur l'AR de commande (objectif ≥ 95%)."),
        ("3. Réactivité & Service Client", "Délai de réponse aux demandes d'offres (< 24h), réactivité sur traitement des FNC sous 48h."),
        ("4. Santé Financière & RSE", "Stabilité financière du prestataire, engagement environnemental et sécurité.")
    ])
    add_why_box(doc, [
        "Approvisionnements 100% fiables et conformes.",
        "Élimination des arrêts de production pour matière manquante.",
        "Preuve incontestable de maîtrise des achats (ISO 9001 Clause 8.4)."
    ], [
        "Fabrication de pièces défectueuses suite matière hors spécification.",
        "Pénalités de retard subies par la faute d'un sous-traitant défaillant.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 8.4)."
    ])
    add_financial_roi_box(doc,
        "Sécurisation des approvisionnements et respect des délais d'expédition clients.",
        "Risque de surcoûts liés aux retards de livraison ou pièces fournisseurs non conformes."
    )
    add_interconnections_box(doc, [
        "OUTIL 16 (Traçabilité) : Réceptions matières et certificats 3.1.",
        "OUTIL 19 (FNC) : Historique des non-conformités générées par les fournisseurs."
    ], [
        "OUTIL 08 (Revue Devis) : Agrément des sous-traitants retenus.",
        "OUTIL 07 (Revue Direction) : Bilans de performance et cotation annuelle des achats."
    ])
    add_guide_box(doc, [
        "Identifier la liste des 5 à 10 fournisseurs et sous-traitants critiques pour votre entreprise.",
        "Renseigner les indicateurs de l'année (Nombre de commandes, FNC générées, Retards).",
        "Calculer la note finale sur 20 points.",
        "Déterminer le statut d'agrément (Agréé / Sous Surveillance / Déréférencé) et notifier le fournisseur."
    ])
    
    doc.add_page_break()
    add_section_header(doc, "GRILLE DE COTATION & BARÈME D'ÉVALUATION FOURNISSEURS")
    
    headers1 = ["Critère d'Évaluation", "Poids / Barème", "Méthode de Mesure Exacte", "Seuil Minimum Requis", "Action si Seuil Non Atteint"]
    rows1 = [
        ["1. Qualité des Livraisons", "8 Points", "(Nb livraisons conformes / Nb total livraisons) x 8", "≥ 7.5 / 8 (95%)", "Fiche de Non-Conformité Fournisseur + Audit site"],
        ["2. Respect des Délais (OTD)", "8 Points", "(Nb livraisons à date / Nb total livraisons) x 8", "≥ 7.2 / 8 (90%)", "Mise en demeure + pénalités de retard contractuelles"],
        ["3. Réactivité & Service", "4 Points", "Réponse devis < 24h & traitement FNC < 48h", "≥ 3.0 / 4", "Entretien de cadrage avec la direction commerciale"],
        ["[Votre Critère]", "[Barème]", "[Formule de calcul]", "[Seuil]", "[Action corrective]"]
    ]
    format_word_table(doc, headers1, rows1, col_widths_dxa=[2200, 1400, 2600, 1800, 2200])

    add_section_header(doc, "REGISTRE D'ÉVALUATION ET LISTE DES FOURNISSEURS AGRÉÉS")
    headers2 = ["Nom Fournisseur / Sous-Traitant", "Famille d'Achat", "Note Qualité /8", "Note Délais /8", "Note Service /4", "Note Totale /20", "Statut d'Agrément", "Plan d'Action / Échéance", "Responsable"]
    rows2 = [
        ["Fournisseur Métaux ACIER-X", "Matières Premières Aciers", "7.8", "7.6", "3.6", "19.0 / 20", "Agréé (A)", "Maintenir le volume d'achat", "Resp. Achats"],
        ["Sous-traitant Usinage USIN-PRO", "Usinage Spécifique BE", "6.2", "5.8", "2.5", "14.5 / 20", "Sous Surveillance (B)", "Audit sur site requis sous 30 jours", "Resp. QSE / Achats"],
        ["Transporteur CHRONO-EXPRESS", "Transport & Logistique", "7.5", "7.4", "3.5", "18.4 / 20", "Agréé (A)", "Renouvellement contrat annuel", "Resp. Logistique"],
        ["[Nom du Fournisseur]", "[Famille]", "[/8]", "[/8]", "[/4]", "[/20]", "Agréé / Alert", "[Plan d'action]", "[Nom]"]
    ]
    format_word_table(doc, headers2, rows2, col_widths_dxa=[2000, 1600, 900, 900, 900, 1000, 1300, 1600, 1000])

    add_next_steps_box(doc, [
        "Revue annuelle des évaluations fournisseurs en Comité d'Achats.",
        "Communication du bulletin de note individuel à chaque fournisseur clé.",
        "Archivage sous 02_VENTES_MARGES_ACHATS/FOURNISSEURS_AGREES.pdf."
    ])
    save_doc(doc, "OUTIL_09_EVALUATION_FOURNISSEURS.docx")

# 4. OUTIL 10: RECLAMATIONS & NPS CLIENT
def make_outil_10():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 10", "Registre de Traitement des Réclamations & NPS Client", "Clauses ISO 9001:2015 - 8.2.1 & 9.1.2 - Question Q10")
    add_consultant_box(doc, "Une réclamation client prise en charge et résolue sous 24 heures transforme un client mécontent en ambassadeur fidèle de votre entreprise. Ne masquez pas les litiges : traitez-les avec rigueur !", [
        ("1. Prise en Charge sous 24h", "Envoi d'un accusé de réception officiel au client avec désignation du pilote interne du dossier."),
        ("2. Action Immédiate de Secours", "Lancement d'une fabrication ou expédition prioritaire de pièces de remplacement H+24 sans frais."),
        ("3. Analyse Cause Profonde (5 Pourquoi)", "Identification de l'erreur initiale (plan non à jour, mauvais réglage, emballage fragile) via Outil 19."),
        ("4. Enquête NPS (Net Promoter Score)", "Mesure semestrielle du score d'évaluation globale de satisfaction client.")
    ])
    add_why_box(doc, [
        "Fidélisation totale et transformation des réclamations en opportunités commercial.",
        "Perception d'un service après-vente réactif et irréprochable.",
        "Preuve de mesure de la satisfaction client (ISO 9001 Clause 8.2.1 & 9.1.2)."
    ], [
        "Perte irrémédiable de clients majeurs au profit de concurrents.",
        "Surcoûts d'avoirs et de réfections non maîtrisés.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 8.2.1)."
    ])
    add_financial_roi_box(doc,
        "Fidélisation de la clientèle et récurrence du Chiffre d'Affaires.",
        "Coûts directs des litiges, avoirs et pénalités de retard d'expédition."
    )
    add_interconnections_box(doc, [
        "OUTIL A2A (RDV Client) : Remontées d'insatisfaction ou d'écarts de livraison.",
        "OUTIL 17 (PV Recette) : Litiges constatés lors des réceptions sur site."
    ], [
        "OUTIL 19 (FNC & 5 Pourquoi) : Traitement de la cause racine du dysfonctionnement.",
        "OUTIL A6 (Ishikawa 5M) : Analyse des causes si le problème concerne plusieurs services.",
        "OUTIL 03 & 26 (Dashboards KPIs) : Intégration du score NPS et du nombre de réclamations."
    ])
    add_guide_box(doc, [
        "Enregistrer toute réclamation client dès sa réception dans le registre.",
        "Transmettre l'accusé de réception formel au client sous 24h max.",
        "Engager l'analyse des causes et l'action corrective avec le responsable du pôle.",
        "Mesurer le score NPS lors des enquêtes semestrielles."
    ])
    
    doc.add_page_break()
    add_section_header(doc, "REGISTRE CENTRALISÉ DE TRAITEMENT DES RÉCLAMATIONS CLIENTS")
    
    headers1 = ["N° RC", "Date", "Nom Client", "Description du Litige / Problème", "Coût Estimé (€)", "Accusé <24h", "Action Corrective Déployée", "Clôture Validée", "Responsable"]
    rows1 = [
        ["RC-2026-01", "12/01", "Client Grand Compte ALFA", "Défaut de bavure sur lot 500 pièces usinées", "1 200 €", "Oui (H+4)", "Reprise en atelier + remplacement express 48h", "Oui (15/01)", "Resp. QSE / Prod"],
        ["RC-2026-02", "28/01", "Client Groupe BETA", "Retard de livraison de 24h par le transporteur", "0 €", "Oui (H+2)", "Changement de transporteur sur ce secteur", "Oui (29/01)", "Resp. Logistique"],
        ["RC-2026-03", "05/02", "Client Société GAMMA", "Erreur d'étiquetage sur emballage carton", "350 €", "Oui (H+6)", "Implémentation étiquette code-barres automatique", "Oui (08/02)", "Resp. Expedition"],
        ["[N° RC]", "[Date]", "[Nom du Client]", "[Description du problème]", "[Coût €]", "[Oui/Non]", "[Action corrective]", "[Oui/Date]", "[Nom]"]
    ]
    format_word_table(doc, headers1, rows1, col_widths_dxa=[900, 700, 1800, 2400, 1000, 900, 1500, 1000, 1000])

    add_section_header(doc, "SUIVI ET BAROMÈTRE NET PROMOTER SCORE (NPS CLIENT)")
    headers2 = ["Période / Trimestre", "Nb Envois Enquêtes", "Nb Réponses", "Promoteurs (9-10)", "Neutres (7-8)", "Détracteurs (0-6)", "Score NPS Net", "Plan d'Amélioration Associé"]
    rows2 = [
        ["Trimestre 1 (T1 2026)", "45", "32", "20 (62.5%)", "9 (28.1%)", "3 (9.4%)", "+ 53", "Optimiser les délais de livraison devis complexes"],
        ["Trimestre 2 (T2 2026)", "50", "38", "26 (68.4%)", "9 (23.7%)", "3 (7.9%)", "+ 60", "Objectif NPS > 50 maintenu"],
        ["[Période]", "[Nb]", "[Nb]", "[Promoteurs]", "[Neutres]", "[Détracteurs]", "[NPS]", "[Plan d'amélioration]"]
    ]
    format_word_table(doc, headers2, rows2, col_widths_dxa=[1500, 1100, 1100, 1300, 1200, 1300, 1100, 1600])

    add_next_steps_box(doc, [
        "Accusé de réception obligatoire sous 24h pour toute alerte client.",
        "Analyse de cause profonde systématique via la Fiche 5 Pourquoi (Outil 19).",
        "Archivage sous 02_VENTES_MARGES_ACHATS/REGISTRE_RECLAMATIONS_2026.pdf."
    ])
    save_doc(doc, "OUTIL_10_RECLAMATIONS_NPS_CLIENT.docx")

# RUN ALL BUILDERS FOR SEQUENCE 2
make_start_here_seq2()
make_outil_08()
make_outil_09()
make_outil_10()

print("Successfully generated all Sequence 2 Word (.docx) documents according to guidelines!")
