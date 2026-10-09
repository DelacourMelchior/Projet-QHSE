import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

out_word_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/outils_qualite_word/sequence_3"
out_unified_docx = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_3_OPERATIONS_ATELIER_QUALITE/DOCX"

os.makedirs(out_word_dir, exist_ok=True)
os.makedirs(out_unified_docx, exist_ok=True)

# BRAND COLORS
BRAND_GREEN = RGBColor(27, 77, 62)     # #1B4D3E
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
    
    # FOOTER OPENXML CLEAN
    footer = section.footer
    p_ft = footer.paragraphs[0]
    p_ft.text = ""
    p_ft.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_ft.paragraph_format.space_after = Pt(0)
    
    pPr = p_ft._p.get_or_add_pPr()
    tabs = OxmlElement('w:tabs')
    tab = OxmlElement('w:tab')
    tab.set(qn('w:val'), 'right')
    tab.set(qn('w:pos'), '10512')
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
    r_cl = p_title.add_run(f"SÉQUENCE 3 - {tool_code} — {clause_q_text}\n")
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

# BUILDERS FOR SEQUENCE 3

# 1. START HERE SEQUENCE 3
def make_start_here_seq3():
    doc = create_base_document()
    add_header_brand(doc, "NOTICE CLIENT", "Guide de Démarrage Client Autonome (Séquence 3)", "Opérations, Atelier & Contrôle Qualité - 5 Jours")
    add_consultant_box(doc, "Bienvenue dans votre Kit d'Outils Qualité Séquence 3. Cette séquence structure le cœur opérationnel de votre entreprise : de la cartographie des processus et la maintenance préventive jusqu'au traitement des non-conformités par les 5 Pourquoi.", [
        ("1. Cartographie & Interactions", "Modéliser le fonctionnement global de votre entreprise et formaliser les échanges d'informations inter-services."),
        ("2. Maintenance Préventive & Instructions", "Planifier les révisions machines et afficher les fiches réflexes visuelles au poste de travail."),
        ("3. Jalons Conception & Traçabilité", "Valider les étapes BE avant lancement et tracer chaque lot de fabrication."),
        ("4. Autocontrôle, Isolement & 5 Pourquoi", "Délivrer le PV de recette, isoler les produits défectueux en quarantaine et éliminer la cause racine.")
    ])
    add_why_box(doc, [
        "Suppression des temps morts et des erreurs de communication inter-services.",
        "Zéro panne majeure sur les équipements stratégiques de production.",
        "Éradication définitive de la récidive sur les défauts d'usinage et d'assemblage."
    ], [
        "Arrêt de production imprévu coûtant plusieurs milliers d'euros par jour.",
        "Livraison de pièces non conformes chez un client stratégique.",
        "Non-conformité majeure d'audit ISO 9001 sur la maîtrise des activités opérationnelles (Clause 8)."
    ])
    days_data = [
        ("JOUR 1 : CARTOGRAPHIE & INTERACTIONS PROCESSUS (30 MIN)", "Formaliser les processus métiers et la matrice des données inter-services.", "Fichiers : OUTIL_11 & OUTIL_12"),
        ("JOUR 2 : MAINTENANCE PREVENTIVE & GAMMES VISUELLES (25 MIN)", "Établir le planning de révision des machines et les fiches réflexes au poste.", "Fichiers : OUTIL_13 & OUTIL_14"),
        ("JOUR 3 : JALONS CONCEPTION APQP & TRAÇABILITÉ (25 MIN)", "Mettre en place la grille de validation BE et les fiches de suivi de lot.", "Fichiers : OUTIL_15 & OUTIL_16"),
        ("JOUR 4 : PV DE RECETTE & LIBÉRATION CLIENT (20 MIN)", "Mettre en œuvre la fiche de contrôle final et d'autorisation de livraison.", "Fichier : OUTIL_17"),
        ("JOUR 5 : ISOLEMENT NC & MÉTHODE DES 5 POURQUOI (25 MIN)", "Délimiter la zone de quarantaine et formaliser le traitement des FNC.", "Fichiers : OUTIL_18 & OUTIL_19")
    ]
    add_section_header(doc, "VOTRE PARCOURS AUTONOME EN 5 JOURS")
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
        "Archiver les versions sous 03_OPERATIONS_PRODUCTION/."
    ])
    save_doc(doc, "START_HERE_SEQUENCE_3.docx")

# 2. OUTIL 11: CARTOGRAPHIE PROCESSUS
def make_outil_11():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 11", "Cartographie Macro des Processus & Fiches d'Identité", "Clause ISO 9001:2015 - 4.4 - Question Q11")
    add_consultant_box(doc, "Définissez clairement l'enchaînement de vos activités en 3 familles : Pilotage, Réalisation et Support. Désignez un Pilote unique par processus responsable de la performance et de la mise à jour des indicateurs.", [
        ("1. Processus de Pilotage", "Management Stratégique, Management Qualité & Amélioration Continue (Pilote : Direction Générale)."),
        ("2. Processus de Réalisation", "Commercial & Devis, Bureau d'Études, Achats & Approvisionnements, Fabrication & Atelier, Livraison."),
        ("3. Processus de Support", "Ressources Humaines & Compétences, Maintenance Équipements, Infrastructure & Système d'Information."),
        ("4. Fiche d'Identité Processus", "Pour chaque processus : Entrées, Sorties, Indicateurs KPIs, Risques associés et Moyens matériels.")
    ])
    add_why_box(doc, [
        "Vision claire et partagée du fonctionnement global de votre entreprise.",
        "Suppression des guerres de clochers et responsabilisation des pilotes.",
        "Preuve N°1 d'approche processus exigée par l'ISO 9001 (Clause 4.4)."
    ], [
        "Dysfonctionnements répétitifs aux frontières inter-services.",
        "Absence de responsable désigné en cas de problème de qualité.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 4.4)."
    ])
    add_interconnections_box(doc, [
        "OUTIL 01A & 01B (SWOT & PESTEL) : Orientations stratégiques de l'entreprise.",
        "OUTIL 04 (Politique Qualité) : Axes de développement prioritaires."
    ], [
        "OUTIL 12 (Interactions Inter-Services) : Découpage des flux de travail.",
        "OUTIL 20 (Organigramme RACI) : Attribution du pilote unique par processus.",
        "OUTIL 26 (Dashboard KPIs) : Suivi des indicateurs clés de chaque processus."
    ])
    add_guide_box(doc, [
        "Lister l'ensemble des activités métiers de votre entreprise.",
        "Les classer dans les 3 catégories (Pilotage, Réalisation, Support).",
        "Désigner le pilote officiel pour chaque processus.",
        "Formaliser la fiche d'identité et valider en Revue de Direction."
    ])
    doc.add_page_break()
    add_section_header(doc, "CARTOGRAPHIE ET REGISTRE DES PROCESSUS DE VOTRE ENTREPRISE")
    headers = ["Famille de Processus", "Nom du Processus", "Pilote Officiel Désigné", "Données Entrantes Majeures", "Données Sortantes Livrées", "Indicateur Clé de Performance (KPI)"]
    rows = [
        ["Pilotage", "P1. Management Stratégique & SMQ", "Directeur Général", "Résultats financiers, Audits, Marché", "Politique Qualité, Objectifs, PV Revue", "Taux d'atteinte des Objectifs SMART (%)"],
        ["Réalisation", "R1. Commercial & Relation Client", "Responsable Commercial", "Demandes de devis, Exigences client", "Devis revus & signés, Commandes validées", "Taux de transformation devis (%) & NPS"],
        ["Réalisation", "R2. Bureau d'Études & Conception", "Responsable BE", "Cahier des charges client, Normes", "Plans de fabrication, Nomenclature pièces", "Respect des jalons de conception (%)"],
        ["Réalisation", "R3. Achats & Approvisionnements", "Responsable Achats", "Besoins matières & composants BE", "Matières conformes reçues à date", "Taux de respect des délais OTD Fournisseurs (%)"],
        ["Réalisation", "R4. Fabrication & Contrôle Quality", "Responsable Production", "OF, Plans BE, Matières premières", "Produits finis contrôlés & conformes", "Taux de pièces conformes du 1er coup (%)"],
        ["Support", "S1. Ressources Humaines & Sécurité", "Responsable RH", "Besoins en recrutement & compétences", "Salariés formés, Matrice polyvalence", "Nombre d'heures de formation dispensées"],
        ["Support", "S2. Maintenance & Équipements", "Responsable Maintenance", "Demandes d'intervention, Planning", "Machines opérationnelles, PV révision", "Taux de disponibilité des machines critiques (%)"],
        ["[Famille]", "[Nom du Processus]", "[Nom du Pilote]", "[Données entrantes]", "[Données sortantes]", "[Indicateur KPI]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1500, 2000, 1500, 1700, 1700, 1800])
    add_next_steps_box(doc, [
        "Diffuser la cartographie à l'ensemble du personnel.",
        "Archiver la fiche sous 03_OPERATIONS_PRODUCTION/CARTOGRAPHIE_PROCESSUS.pdf."
    ])
    save_doc(doc, "OUTIL_11_CARTOGRAPHIE_PROCESSUS.docx")

# 3. OUTIL 12: INTERACTIONS INTER SERVICES
def make_outil_12():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 12", "Fiches d'Interactions Inter-Services (Entrées / Sorties)", "Clauses ISO 9001:2015 - 4.4.1 & 8.5.1 - Question Q12")
    add_consultant_box(doc, "Les pertes de temps et les erreurs surviennent quasi-systématiquement au moment du passage de relais entre deux services. Clarifiez la donnée exacte transmise, son format et son délai d'engagement.", [
        ("1. Interface Commercial -> BE", "Transmission de la revue de devis signée et du cahier des charges client complet sous 24h."),
        ("2. Interface BE -> Achats & Prod", "Nomination des références composants, diffusion du plan d'usinage Indice A validé."),
        ("3. Interface Achats -> Production", "Confirmation de la date de livraison des matières avec AR fournisseur sous 48h."),
        ("4. Interface Prod -> Qualité/Livraison", "Transmission du dossier de fabrication émargé et des fiches d'autocontrôle final.")
    ])
    add_why_box(doc, [
        "Élimination complète des temps morts et des malentendus inter-services.",
        "Responsabilisation mutuelle des responsables de pôles.",
        "Fluidité parfaite de la chaîne de valeur du devis à la livraison."
    ], [
        "Lancement en fabrication sur des plans non à jour (Indice obsolète).",
        "Commandes matières oubliées faute de transmission formelle.",
        "Non-conformité majeure d'audit ISO 9001 sur le fonctionnement des processus."
    ])
    add_interconnections_box(doc, [
        "OUTIL 11 (Cartographie Processus) : Délimitation des 3 familles de processus."
    ], [
        "OUTIL 15 (Jalons APQP BE) : Formalisation des engagements d'études BE ➔ Prod.",
        "OUTIL 16 (Traçabilité) : Suivi des données transmises lors des autocontrôles."
    ])
    add_guide_box(doc, [
        "Identifier les 4 interfaces critiques de votre chaîne de valeur.",
        "Renseigner pour chaque interface la donnée exacte transmise, le support et le délai engagé.",
        "Faire valider la fiche par les deux responsables de services concernés.",
        "Revoir l'efficacité lors des réunions de coordination hebdomadaires."
    ])
    doc.add_page_break()
    add_section_header(doc, "MATRICE D'ÉCHANGES ET D'INTERACTIONS INTER-SERVICES")
    headers = ["Service Émetteur (Fournisseur)", "Service Destinataire (Client)", "Donnée / Document Transmis", "Support / Format Exigé", "Délai Maximal d'Engagement", "Critère de Acceptation / Conformité"]
    rows = [
        ["Commercial", "Bureau d'Études", "Cahier des charges & Revue devis signée", "Dossier GED / Fichier numérique PDF", "Sous 24h après signature", "Présence des spécifications techniques valides"],
        ["Bureau d'Études", "Achats & Appro", "Nomenclature pièces & Liste composants", "Export ERP / Fichier Excel certifié", "J-15 avant lancement prod", "Toutes références cataloguées et disponibles"],
        ["Bureau d'Études", "Production", "Plans de fabrication validés (Indice à jour)", "Plan imprimé visé + Fichier 3D STEP", "J-3 avant lancement prod", "Visa Responsable BE apposé sur le cartouche"],
        ["Achats", "Production", "Disponibilité matières & AR Fournisseur", "Statut ERP + Matière physique en stock", "48h avant date de lancement", "Certificat matière 3.1 conforme réceptionné"],
        ["Production", "Qualité & Expédition", "Produit fini + Dossier de lot émargé", "Fiche de suivi + PV d'autocontrôle", "H-4 avant chargement camion", "100% des cotes critiques contrôlées et validées"],
        ["[Service Émetteur]", "[Service Destinataire]", "[Donnée transmise]", "[Format]", "[Délai engagé]", "[Critère de conformité]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1600, 1600, 2000, 1600, 1600, 1800])
    add_next_steps_box(doc, [
        "Afficher la matrice dans les bureaux et l'atelier.",
        "Archiver sous 03_OPERATIONS_PRODUCTION/INTERACTIONS_INTER_SERVICES.pdf."
    ])
    save_doc(doc, "OUTIL_12_INTERACTIONS_INTER_SERVICES.docx")

# 4. OUTIL 13: MAINTENANCE PREVENTIVE
def make_outil_13():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 13", "Plan de Maintenance Préventive & Planning Équipements", "Clauses ISO 9001:2015 - 7.1.3 & 8.5.1 - Question Q13")
    add_consultant_box(doc, "Ne subissez plus les pannes brutales au milieu d'une commande urgente ! Formalisez le calendrier de maintenance préventive pour chaque machine stratégique (niveaux d'huile, filtres, étalonnage).", [
        ("1. Inventaire des Équipements Critiques", "Liste des machines-outils, centres d'usinage, compresseurs, ponts roulants et véhicules."),
        ("2. Fréquence des Révisions", "Maintenance niveau 1 (quotidienne/hebdo par opérateur) vs niveau 2/3 (mensuelle/annuelle par expert)."),
        ("3. Carnet d'Intervention", "Traçabilité systématique de chaque vidange, changement de pièce et contrôle de précision."),
        ("4. Indicateur MTBF & Disponibilité", "Mesure du taux de disponibilité des équipements (objectif ≥ 98%).")
    ])
    add_why_box(doc, [
        "Disponibilité maximale de l'outil de production (≥ 98%).",
        "Prolongation de la durée de vie des machines et réduction des coûts de réparation d'urgence.",
        "Preuve de maîtrise des infrastructures exigée par l'ISO 9001 (Clause 7.1.3)."
    ], [
        "Casse machine majeure entraînant 10 jours d'arrêt d'atelier.",
        "Retards de livraison massifs et pénalités clients subies.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 7.1.3)."
    ])
    add_interconnections_box(doc, [
        "OUTIL 11 (Cartographie Processus) : Inventaire des équipements critiques.",
        "OUTIL A4 (Méthode 5S) : Propreté et maintenance autonome au poste."
    ], [
        "OUTIL 03 & 26 (Dashboards KPIs) : Taux de disponibilité et MTBF des machines.",
        "OUTIL 16 (Traçabilité) : Suivi des machines utilisées sur le dossier de lot."
    ])
    add_guide_box(doc, [
        "Lister les équipements stratégiques de votre atelier.",
        "Définir la périodicité et le contenu des révisions préventives.",
        "Planifier les dates sur le calendrier annuel.",
        "Émarger le carnet d'intervention après chaque maintenance."
    ])
    doc.add_page_break()
    add_section_header(doc, "PLANNING ET REGISTRE DE MAINTENANCE PREVENTIVE DES ÉQUIPEMENTS")
    headers = ["Code Machine", "Nom de l'Équipement / Machine", "Niveau de Criticité", "Opération Préventive à Réaliser", "Périodicité", "Dernière Révision", "Prochaine Échéance", "Intervenant", "Statut"]
    rows = [
        ["MAC-01", "Centre d'Usinage 5 Axes CNC", "Haute (A)", "Vidange huile broche, contrôle géométrie & filtres", "Trimestrielle", "15/01/2026", "15/04/2026", "Technicien Constructeur", "Conforme"],
        ["MAC-02", "Tour Numérique Bi-Broche", "Haute (A)", "Nettoyage bac arrosage, tension courroies, graissage", "Mensuelle", "01/02/2026", "01/03/2026", "Opérateur Référent", "Conforme"],
        ["COMP-01", "Centrale d'Air Comprimé 15 bar", "Vitale (S)", "Remplacement cartouches filtrantes & purge condensats", "Semestrielle", "10/11/2025", "10/05/2026", "Prestataire Externe", "Planifié"],
        ["PONT-01", "Pont Roulant Atelier 5 Tonnes", "Sécurité (S)", "Contrôle réglementaire APAVE câble & frein de levage", "Annuelle", "20/06/2025", "20/06/2026", "Organisme Agréé", "Conforme"],
        ["[Code]", "[Nom Machine]", "[Criticité]", "[Opération de maintenance]", "[Période]", "[Date]", "[Prochaine]", "[Nom]", "[Statut]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1000, 1800, 1100, 2200, 1100, 1000, 1000, 1000, 1000])
    add_next_steps_box(doc, [
        "Afficher le planning sur chaque machine.",
        "Archiver le carnet d'intervention sous 03_OPERATIONS_PRODUCTION/MAINTENANCE/."
    ])
    save_doc(doc, "OUTIL_13_MAINTENANCE_PREVENTIVE.docx")

# 5. OUTIL 14: GAMMES OPERATOIRES & INSTRUCTIONS VISUELLES
def make_outil_14():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 14", "Gammes Opératoires & Instructions Visuelles (One Point Lesson)", "Clause ISO 9001:2015 - 8.5.1 - Question Q14")
    add_consultant_box(doc, "Rédigez des consignes visuelles courtes et synthétiques affichées directement au poste de travail. Préférez les photos annotées et les schémas clairs aux longs textes illisibles.", [
        ("1. Standard de Travail Visuel", "Photos des Bons Gestes vs Gestes Interdits (OK / KO) positionnées à hauteur des yeux."),
        ("2. Paramètres de Réglage Clés", "Vitesse de coupe, pression de serrage, températures et cotes de contrôle au pied à coulisse."),
        ("3. Consignes de Sécurité & EPI", "EPI obligatoires (lunettes, gants, casque antibruit) et arrêts d'urgence."),
        ("4. Une Fiche = Une Idée (OPL)", "Fiche 'One Point Lesson' d'une page maximum pour transmettre un standard en 2 minutes.")
    ])
    add_why_box(doc, [
        "Garantie du respect du standard de fabrication par tous les opérateurs.",
        "Facilité d'intégration et de formation des nouveaux arrivants et intérimaires.",
        "Preuve de maîtrise des conditions d'exécution (ISO 9001 Clause 8.5.1)."
    ], [
        "Erreurs d'usinage dues à une mauvaise interprétation orale.",
        "Variabilité de qualité selon l'opérateur présent au poste.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 8.5.1)."
    ])
    add_interconnections_box(doc, [
        "OUTIL 15 (Jalons APQP BE) : Plans 3D et spécifications fonctionnelles validés.",
        "OUTIL A4 (Méthode 5S) : Standard de rangement au poste."
    ], [
        "OUTIL 16 (Traçabilité) : Exécution conforme lors des autocontrôles.",
        "OUTIL 22 (Polyvalence) : Support de formation pratique des binômes."
    ])
    add_guide_box(doc, [
        "Identifier les opérations de fabrication complexes ou sujettes à erreur.",
        "Prendre en photo le standard OK et le défaut KO.",
        "Rédiger l'instruction visuelle d'une page (Fiche OPL).",
        "Plastifier et afficher la fiche directement au poste de travail."
    ])
    doc.add_page_break()
    add_section_header(doc, "TRAME TYPE D'INSTRUCTION VISUELLE ET FICHE STANDARD DE POSTE")
    headers = ["Code Fiche", "Poste de Travail / Machine", "Titre de l'Instruction Standard", "Points Clés de Réglage & Sécurité", "Visualisation Standard (OK vs KO)", "Date Valid."]
    rows = [
        ["INS-01", "Poste Usinage CNC 5 Axes", "Montage & Bridage des Pièces Brut Aciers", "Pression étau : 80 bar exacts. Nettoyage mors au soufflet.", "Photos OK (plaquage parfait) / KO (copeau sous mors)", "10/01/2026"],
        ["INS-02", "Poste Soudures TIG / MIG", "Contrôle Visuel de Cordon de Soudure", "Pénétration continue sans rochage. Meulage d'aspect obligatoire.", "Photos OK (cordon régulier) / KO (fissure/porosité)", "15/01/2026"],
        ["INS-03", "Poste Emballage & Expédition", "Protection des Portées de Joint Inox", "Pose bouchon plastique + film étirable. Zéro choc autorisé.", "Photos OK (protection complète) / KO (portée nue)", "20/01/2026"],
        ["[Code]", "[Poste de travail]", "[Titre de l'instruction]", "[Points clés & Réglages]", "[Visualisation OK/KO]", "[Date]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1100, 1800, 2200, 2400, 1700, 1000])
    add_next_steps_box(doc, [
        "Afficher la fiche au poste de travail.",
        "Archiver la version numérique sous 03_OPERATIONS_PRODUCTION/INSTRUCTIONS_POSTES/."
    ])
    save_doc(doc, "OUTIL_14_GAMMES_INSTRUCTIONS_VISUELLES.docx")

# 6. OUTIL 15: JALONS CONCEPTION APQP
def make_outil_15():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 15", "Checklist de Jalons de Conception & Développement (APQP)", "Clause ISO 9001:2015 - 8.3 - Question Q15")
    add_consultant_box(doc, "Ne lancez aucun produit nouveau en fabrication série sans avoir validé les 4 jalons de conception. Chaque jalon verrouille la faisabilité, les coûts et la conformité avant d'investir dans l'outillage.", [
        ("1. Jalon 1 : Faisabilité & Devis", "Validation du cahier des charges client, estimation des coûts et des marges cibles."),
        ("2. Jalon 2 : Conception Numérique (BE)", "Revue de conception 3D, calculs de résistance des matériaux et validation des plans Indice A."),
        ("3. Jalon 3 : Prototypage & Essais", "Fabrication du prototype, essais fonctionnels et métrologie 3D complète."),
        ("4. Jalon 4 : Qualification Série (EI)", "Validation des Échantillons Initiaux (EI) et accord formel du client avant série.")
    ])
    add_why_box(doc, [
        "Développement de produits conformes du premier coup.",
        "Élimination des modifications de plans coûteuses en cours de production.",
        "Preuve d'excellence de maîtrise du processus de conception (ISO 9001 Clause 8.3)."
    ], [
        "Lancement d'un moule ou d'un outillage comportant une erreur de conception (coût > 50k€).",
        "Retard de 6 mois sur la mise sur le marché du nouveau produit.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 8.3)."
    ])
    add_interconnections_box(doc, [
        "OUTIL 08 (Revue Devis) : Cahier des charges et exigences client.",
        "OUTIL A8 (QQOQCCP) : Cadrage des spécifications initiales."
    ], [
        "OUTIL 14 (Gammes Visuelles) : Instructions opératoires pour l'atelier.",
        "OUTIL 17 (PV Recette) : Critères de libération des Échantillons Initiaux."
    ])
    add_guide_box(doc, [
        "Ouvrir la fiche de jalon dès l'enregistrement d'un nouveau projet BE.",
        "Organiser la réunion de revue de jalon à chaque étape franchie.",
        "Apposer les signatures conjointes du BE, de la Production et de la Qualité.",
        "Obtenir l'accord écrit du client sur les Échantillons Initiaux."
    ])
    doc.add_page_break()
    add_section_header(doc, "GRILLE DE VALIDATION PAS À PAS DES JALONS DE CONCEPTION")
    headers = ["N° Jalon", "Nom du Jalon de Conception", "Livrables Obligatoires à Présenter", "Critère de Validation Success", "Visa BE", "Visa Prod", "Visa Qualité", "Statut Jalon"]
    rows = [
        ["Jalon 1", "Faisabilité & Chiffrage Initial", "Cahier des charges client & Revue devis Outil 08", "Marge brute prévisionnelle ≥ 35%", "V. BE", "V. Prod", "V. QSE", "Validé"],
        ["Jalon 2", "Validation plans 3D & AMDEC BE", "Plans 3D STEP Indice A & Cotation fonctionnelle", "Zéro interférence 3D & AMDEC validée", "V. BE", "V. Prod", "V. QSE", "Validé"],
        ["Jalon 3", "Prototype & Essais Métrologie", "Rapport de contrôle 3D prototype & essais", "100% des cotes critiques conformes", "V. BE", "V. Prod", "V. QSE", "Validé"],
        ["Jalon 4", "Accord Client & Qualification Série", "Procès-Verbal accord Échantillons Initiaux (EI)", "Acceptation écrite formelle du client", "V. BE", "V. Prod", "V. QSE", "Validé"],
        ["[Jalon]", "[Nom du Jalon]", "[Livrables requis]", "[Critère de réussite]", "[Visa]", "[Visa]", "[Visa]", "[Statut]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[900, 2000, 2400, 2100, 900, 900, 1000, 1000])
    add_next_steps_box(doc, [
        "Consigner le PV de validation de jalon dans le dossier projet.",
        "Archiver sous 03_OPERATIONS_PRODUCTION/CONCEPTION_PROJETS/."
    ])
    save_doc(doc, "OUTIL_15_JALONS_CONCEPTION_APQP.docx")

# 7. OUTIL 16: TRAITABILITE & SUIVI FABRICATION
def make_outil_16():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 16", "Fiche de Suivi de Fabrication, Traçabilité & Dossier de Lot", "Clause ISO 9001:2015 - 8.5.2 - Question Q16")
    add_consultant_box(doc, "Garantissez une traçabilité totale de chaque pièce fabriquée : du numéro de coulée de la matière première jusqu'au nom de l'opérateur ayant réalisé l'assemblage final.", [
        ("1. N° de Lot & Ordre de Fabrication", "Numéro de lot unique gravé ou étiqueté sur le produit et reporté sur le dossier de fabrication."),
        ("2. Traçabilité Matière Première", "Certificat matière 3.1 rattaché au numéro de coulé de l'acier ou du composant critique."),
        ("3. Émargement Étape par Étape", "Signature obligatoire de l'opérateur à la fin de chaque opération (Debit, Usinage, Contrôle)."),
        ("4. Relevé des Cotes Critiques", "Enregistrement manuscrit ou numérique des dimensions réelles mesurées au pied à coulisse.")
    ])
    add_why_box(doc, [
        "Traçabilité ascendante et descendante instantanée en moins de 2 minutes.",
        "Ciblage exact des pièces impactées en cas de rappel ou de défaut.",
        "Preuve de maîtrise de l'identification exigée par l'ISO 9001 (Clause 8.5.2)."
    ], [
        "Impossibilité de retrouver la cause d'un défaut sur un lot livré.",
        "Obligation de rappeler 1 000 pièces au lieu de 10 pièces ciblées.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 8.5.2)."
    ])
    add_interconnections_box(doc, [
        "OUTIL 09 (Fournisseurs) : Certificats matières 3.1 et réceptions conformes.",
        "OUTIL 15 (Jalons APQP) : Dossier de fabrication certifié BE."
    ], [
        "OUTIL 17 (PV Recette) : Libération finale du lot de production.",
        "OUTIL 18 (Quarantaine NC) : Isolement immédiat en cas de déviation au poste."
    ])
    add_guide_box(doc, [
        "Imprimer la fiche de suivi de lot lors du lancement de l'Ordre de Fabrication (OF).",
        "Renseigner le numéro de coulée matière et le certificat 3.1.",
        "Faire émarger chaque opérateur à la fin de son poste.",
        "Archiver la fiche dans le dossier de fabrication clôturé."
    ])
    doc.add_page_break()
    add_section_header(doc, "FICHE DE SUIVI DE FABRICATION ET DOSSIER DE LOT (SUIVI FABRIC.)")
    headers = ["N° Étape", "Désignation de l'Opération", "Machine / Poste", "N° Lot Matière / Coulée", "Quantité Conforme", "Relevé Cotes / Contrôle", "Nom Opérateur", "Date & Signature"]
    rows = [
        ["10", "Débit & Tronçonnage Tubes Inox", "Scie Auto S-01", "Coulée N° C-88492 (Certif 3.1)", "100 Pcs", "Longueur 1200mm ± 0.5mm", "M. DUPONT", "10/02/2026 [Visa]"],
        ["20", "Usinage CNC & Tournage Face A", "Centre CNC-05", "Coulée N° C-88492", "99 Pcs (1 Rebut)", "Diamètre Ø 45.02mm (Conforme)", "J. MARTIN", "11/02/2026 [Visa]"],
        ["30", "Contrôle Autocontrôle Dim. 3D", "Poste Métrologie", "Coulée N° C-88492", "99 Pcs", "Fiche autocontrôle OK", "R. QSE", "12/02/2026 [Visa]"],
        ["40", "Conditionnement & Protection", "Poste Emballage", "Lot Fin N° LOT-2026-044", "99 Pcs", "Bouchons plastique posés", "P. LEROY", "12/02/2026 [Visa]"],
        ["[N°]", "[Désignation opération]", "[Machine]", "[N° Coulée / Lot]", "[Qté OK]", "[Relevé Cotes]", "[Nom]", "[Date & Visa]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[800, 2200, 1400, 1600, 1100, 1600, 1100, 1400])
    add_next_steps_box(doc, [
        "Rattacher la fiche au dossier d'expédition.",
        "Archiver sous 03_OPERATIONS_PRODUCTION/DOSSIERS_LOTS/."
    ])
    save_doc(doc, "OUTIL_16_TRAITABILITE_SUIVI_FABRICATION.docx")

# 8. OUTIL 17: PV RECETTE & LIBERATION
def make_outil_17():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 17", "Procès-Verbal (PV) de Recette, Libération & Autocontrôle Final", "Clause ISO 9001:2015 - 8.6 - Question Q17")
    add_consultant_box(doc, "Ne laissez aucun produit quitter votre usine sans la signature du PV de libération finale. Ce document atteste formellement que 100% des contrôles requis ont été réalisés et validés.", [
        ("1. Contrôle Dimensionnel Final", "Vérification des cotes critiques au moyen d'appareils de mesure étalonnés."),
        ("2. Contrôle d'Aspect & Propreté", "Absence de bavures, de rayures, de chocs et présence du traitement de surface conforme."),
        ("3. Validation du Dossier de Lot", "Vérification de la présence de toutes les signatures sur la fiche de suivi Outil 16."),
        ("4. Autorisation Formelle de Livraison", "Signature du Responsable Qualité autorisant le chargement et la facturation.")
    ])
    add_why_box(doc, [
        "Garantie absolue d'aucune livraison de pièce non conforme.",
        "Protection juridique et contractuelle de votre entreprise.",
        "Preuve de libération des produits exigée par l'ISO 9001 (Clause 8.6)."
    ], [
        "Livraison d'un produit défectueux provoquant un arrêt de chaîne chez le client.",
        "Contestation de facturation pour absence de certificat de conformité.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 8.6)."
    ])
    add_interconnections_box(doc, [
        "OUTIL 16 (Traçabilité) : Dossier de lot émargé et fiches d'autocontrôle."
    ], [
        "OUTIL 10 (Réclamations Client) : Garantie de livraison zéro litige.",
        "OUTIL 03 & 26 (Dashboards KPIs) : Taux de pièces conformes du 1er coup (%)."
    ])
    add_guide_box(doc, [
        "Renseigner les références du lot et le nom du client.",
        "Effectuer le contrôle final selon le plan de contrôle.",
        "Émarger le PV de recette et délivrer le Certificat de Conformité.",
        "Joindre une copie au bon de livraison."
    ])
    doc.add_page_break()
    add_section_header(doc, "PROCÈS-VERBAL DE RECETTE ET AUTORISATION DE LIBÉRATION FINALE")
    headers = ["Point de Contrôle Final", "Spécification Exigée", "Valeur Relevée / Statut", "Appareil de Mesure Utilisé", "Résultat (Conforme / NC)", "Visa Contrôleur"]
    rows = [
        ["1. Dimensionnel - Longueur Totale", "1 500 mm ± 0.2 mm", "1 500.08 mm", "Pied à coulisse num. ER-04", "Conforme", "V. Contrôleur"],
        ["2. Dimensionnel - Alésage Central", "Ø 50.00 H7 (+0.025/0)", "Ø 50.015 mm", "Tampon lisse P/NP ER-12", "Conforme", "V. Contrôleur"],
        ["3. Traitement Surface - Anodisation", "Épaisseur 15µm ± 3µm", "16.2 µm", "Mesureur d'épaisseur ER-08", "Conforme", "V. Contrôleur"],
        ["4. Aspect Visuel & Ébavurage", "Absence de bavure & rayure", "100% Net et propre", "Contrôle visuel sous loupe", "Conforme", "V. Contrôleur"],
        ["5. Dossier de Lot & Certificats 3.1", "Émargement 100% complet", "Dossier lot complet visé", "Vérification documentaire", "Conforme", "V. QSE"],
        ["[Point de contrôle]", "[Spécification]", "[Valeur mesurée]", "[Appareil utilisé]", "[Conforme / NC]", "[Visa]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[2200, 2000, 1800, 1800, 1200, 1200])
    add_next_steps_box(doc, [
        "Joindre le PV signé au Bon de Livraison.",
        "Archiver sous 03_OPERATIONS_PRODUCTION/PV_RECETTE/."
    ])
    save_doc(doc, "OUTIL_17_PV_RECETTE_LIBERATION.docx")

# 9. OUTIL 18: SIGNALETIQUE ISOLEMENT NC
def make_outil_18():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 18", "Signalétique & Fiche de Zone d'Isolement / Quarantaine NC", "Clause ISO 9001:2015 - 8.7 - Question Q18")
    add_consultant_box(doc, "Délimitez physiquement une zone d'isolement peinte en rouge au sol avec des bacs rouges identifiés 'STOP NC'. Tout produit douteux ou non conforme doit y être déposé immédiatement pour éviter tout mélange !", [
        ("1. Zone Physique Rouge Délimitée", "Emplacement verrouillé ou balisé au sol au centre de l'atelier réservé aux pièces NC."),
        ("2. Étiquette 'STOP NC' Rouge", "Fiche d'identification rouge collée sur la pièce indiquant la non-conformité et l'interdiction de toucher."),
        ("3. Registre d'Entrée / Sortie Quarantaine", "Traçabilité des pièces déposées en zone rouge et décision de la commission NC."),
        ("4. Traitement sous 48h Max", "Arbitrage obligatoire : Retouche, Rebut/Mise au mille, ou Dérogation acceptée par le client.")
    ])
    add_why_box(doc, [
        "Impossibilité physique d'expédier ou de monter une pièce défectueuse par erreur.",
        "Rangement et clarté visuelle immédiate dans l'atelier.",
        "Preuve de maîtrise des éléments non conformes exigée par l'ISO 9001 (Clause 8.7)."
    ], [
        "Montage d'une pièce défectueuse sur un ensemble prêt à livrer.",
        "Perte de temps à chercher des pièces douteuses éparpillées dans l'atelier.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 8.7)."
    ])
    add_interconnections_box(doc, [
        "OUTIL 16 (Traçabilité) : Détection d'une déviation lors d'un autocontrôle."
    ], [
        "OUTIL 19 (FNC & 5 Pourquoi) : Déclenchement automatique de la Fiche de Non-Conformité.",
        "OUTIL 23 (Coûts NC) : Sensibilisation du personnel au gaspillage matière."
    ])
    add_guide_box(doc, [
        "Coller l'étiquette rouge 'STOP NC' sur la pièce dès la détection du défaut.",
        "Déposer la pièce dans le bac rouge de la zone de quarantaine.",
        "Enregistrer la pièce dans le registre d'isolement.",
        "Staturer sous 48h (Rebut / Retouche / Dérogation)."
    ])
    doc.add_page_break()
    add_section_header(doc, "REGISTRE D'ENTRÉE / SORTIE DE ZONE DE QUARANTAINE NC (ZONE ROUGE)")
    headers = ["N° Fiche NC", "Date Entrée", "Désignation Pièce / Lot", "Quantité Isolée", "Description de la Non-Conformité", "Décision Commission NC", "Date Sortie", "Visa Qualité"]
    rows = [
        ["NC-2026-12", "02/02", "Axe Inox Ø 30 L=400", "5 Pcs", "Cote Ø 29.85mm au lieu de 30.00mm (Sous-cote)", "Rebut définitif (Mise au mille)", "03/02", "V. QSE"],
        ["NC-2026-13", "05/02", "Carter Aluminium Moulé", "12 Pcs", "Bavure sur face d'appui de joint", "Retouche reprise usinage atelier", "06/02", "V. QSE"],
        ["NC-2026-14", "10/02", "Support Acier Peint", "25 Pcs", "Épaisseur peinture 60µm au lieu de 80µm", "Dérogation acceptée par client", "11/02", "V. Com / QSE"],
        ["[N° Fiche]", "[Date]", "[Désignation pièce]", "[Qté]", "[Description non-conformité]", "[Décision Retouche/Rebut]", "[Date]", "[Visa]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1100, 900, 2000, 1000, 2400, 1800, 900, 1100])
    add_next_steps_box(doc, [
        "Vider la zone de quarantaine au moins une fois par semaine.",
        "Archiver le registre sous 03_OPERATIONS_PRODUCTION/QUARANTAINE_NC/."
    ])
    save_doc(doc, "OUTIL_18_SIGNALETIQUE_ISOLEMENT_NC.docx")

# 10. OUTIL 19: FNC METHODE 5 POURQUOI
def make_outil_19():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 19", "Fiche de Non-Conformité (FNC) & Analyse des 5 Pourquoi", "Clause ISO 9001:2015 - 10.2 - Question Q19")
    add_consultant_box(doc, "Ne vous arrêtez pas à la cause superficielle ('erreur humaine') ! Utilisez la méthode des 5 Pourquoi pour remonter jusqu'à la cause racine organisationnelle et stopper définitivement la récidive.", [
        ("1. Description Factuelle du Problème", "Qui, Quoi, Où, Quand, Combien ? (Méthode QQOQCCP sans jugement de valeur)."),
        ("2. Enchaînement des 5 Pourquoi", "Questionner 'Pourquoi ?' 5 fois de suite jusqu'à identifier la faille de procédure ou de formation."),
        ("3. Plan d'Action Correctif Chiffré", "Action immédiate (sécuriser le client) + Action corrective pérenne (modifier le standard Outil 14)."),
        ("4. Vérification d'Efficacité à 30 Jours", "Vérifier sur le terrain un mois plus tard que le problème ne s'est plus jamais produit.")
    ])
    add_why_box(doc, [
        "Éradication définitive des défauts répétitifs et des coûts de retouche.",
        "Montee en compétence de l'équipe par l'analyse factuelle collective.",
        "Preuve d'amélioration continue exigée par l'ISO 9001 (Clause 10.2)."
    ], [
        "Répétition du même défaut mois après mois (gaspillage financier).",
        "Recherche de coupables au lieu de traiter le problème de fond.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 10.2)."
    ])
    add_interconnections_box(doc, [
        "OUTIL 18 (Quarantaine NC) : Pièce isolée en atelier.",
        "OUTIL 10 (Réclamations Client) : Litige signalé par un client."
    ], [
        "OUTIL A5 (Cycle PDCA) : Suivi du plan d'action corrective pérenne.",
        "OUTIL 27 (Audit Interne) : Preuve de résolution de problème et d'amélioration continue."
    ])
    add_guide_box(doc, [
        "Lister les équipements stratégiques de votre atelier.",
        "Définir la périodicité et le contenu des révisions préventives.",
        "Planifier les dates sur le calendrier annuel.",
        "Émarger le carnet d'intervention après chaque maintenance."
    ])
    doc.add_page_break()
    add_section_header(doc, "PLANNING ET REGISTRE DE MAINTENANCE PREVENTIVE DES ÉQUIPEMENTS")
    headers = ["Code Machine", "Nom de l'Équipement / Machine", "Niveau de Criticité", "Opération Préventive à Réaliser", "Périodicité", "Dernière Révision", "Prochaine Échéance", "Intervenant", "Statut"]
    rows = [
        ["MAC-01", "Centre d'Usinage 5 Axes CNC", "Haute (A)", "Vidange huile broche, contrôle géométrie & filtres", "Trimestrielle", "15/01/2026", "15/04/2026", "Technicien Constructeur", "Conforme"],
        ["MAC-02", "Tour Numérique Bi-Broche", "Haute (A)", "Nettoyage bac arrosage, tension courroies, graissage", "Mensuelle", "01/02/2026", "01/03/2026", "Opérateur Référent", "Conforme"],
        ["COMP-01", "Centrale d'Air Comprimé 15 bar", "Vitale (S)", "Remplacement cartouches filtrantes & purge condensats", "Semestrielle", "10/11/2025", "10/05/2026", "Prestataire Externe", "Planifié"],
        ["PONT-01", "Pont Roulant Atelier 5 Tonnes", "Sécurité (S)", "Contrôle réglementaire APAVE câble & frein de levage", "Annuelle", "20/06/2025", "20/06/2026", "Organisme Agréé", "Conforme"],
        ["[Code]", "[Nom Machine]", "[Criticité]", "[Opération de maintenance]", "[Période]", "[Date]", "[Prochaine]", "[Nom]", "[Statut]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1000, 1800, 1100, 2200, 1100, 1000, 1000, 1000, 1000])
    add_next_steps_box(doc, [
        "Afficher le planning sur chaque machine.",
        "Archiver le carnet d'intervention sous 03_OPERATIONS_PRODUCTION/MAINTENANCE/."
    ])
    save_doc(doc, "OUTIL_13_MAINTENANCE_PREVENTIVE.docx")

# 5. OUTIL 14: GAMMES OPERATOIRES & INSTRUCTIONS VISUELLES
def make_outil_14():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 14", "Gammes Opératoires & Instructions Visuelles (One Point Lesson)", "Clause ISO 9001:2015 - 8.5.1 - Question Q14")
    add_consultant_box(doc, "Rédigez des consignes visuelles courtes et synthétiques affichées directement au poste de travail. Préférez les photos annotées et les schémas clairs aux longs textes illisibles.", [
        ("1. Standard de Travail Visuel", "Photos des Bons Gestes vs Gestes Interdits (OK / KO) positionnées à hauteur des yeux."),
        ("2. Paramètres de Réglage Clés", "Vitesse de coupe, pression de serrage, températures et cotes de contrôle au pied à coulisse."),
        ("3. Consignes de Sécurité & EPI", "EPI obligatoires (lunettes, gants, casque antibruit) et arrêts d'urgence."),
        ("4. Une Fiche = Une Idée (OPL)", "Fiche 'One Point Lesson' d'une page maximum pour transmettre un standard en 2 minutes.")
    ])
    add_why_box(doc, [
        "Garantie du respect du standard de fabrication par tous les opérateurs.",
        "Facilité d'intégration et de formation des nouveaux arrivants et intérimaires.",
        "Preuve de maîtrise des conditions d'exécution (ISO 9001 Clause 8.5.1)."
    ], [
        "Erreurs d'usinage dues à une mauvaise interprétation orale.",
        "Variabilité de qualité selon l'opérateur présent au poste.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 8.5.1)."
    ])
    add_guide_box(doc, [
        "Identifier les opérations de fabrication complexes ou sujettes à erreur.",
        "Prendre en photo le standard OK et le défaut KO.",
        "Rédiger l'instruction visuelle d'une page (Fiche OPL).",
        "Plastifier et afficher la fiche directement au poste de travail."
    ])
    doc.add_page_break()
    add_section_header(doc, "TRAME TYPE D'INSTRUCTION VISUELLE ET FICHE STANDARD DE POSTE")
    headers = ["Code Fiche", "Poste de Travail / Machine", "Titre de l'Instruction Standard", "Points Clés de Réglage & Sécurité", "Visualisation Standard (OK vs KO)", "Date Valid."]
    rows = [
        ["INS-01", "Poste Usinage CNC 5 Axes", "Montage & Bridage des Pièces Brut Aciers", "Pression étau : 80 bar exacts. Nettoyage mors au soufflet.", "Photos OK (plaquage parfait) / KO (copeau sous mors)", "10/01/2026"],
        ["INS-02", "Poste Soudures TIG / MIG", "Contrôle Visuel de Cordon de Soudure", "Pénétration continue sans rochage. Meulage d'aspect obligatoire.", "Photos OK (cordon régulier) / KO (fissure/porosité)", "15/01/2026"],
        ["INS-03", "Poste Emballage & Expédition", "Protection des Portées de Joint Inox", "Pose bouchon plastique + film étirable. Zéro choc autorisé.", "Photos OK (protection complète) / KO (portée nue)", "20/01/2026"],
        ["[Code]", "[Poste de travail]", "[Titre de l'instruction]", "[Points clés & Réglages]", "[Visualisation OK/KO]", "[Date]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1100, 1800, 2200, 2400, 1700, 1000])
    add_next_steps_box(doc, [
        "Afficher la fiche au poste de travail.",
        "Archiver la version numérique sous 03_OPERATIONS_PRODUCTION/INSTRUCTIONS_POSTES/."
    ])
    save_doc(doc, "OUTIL_14_GAMMES_INSTRUCTIONS_VISUELLES.docx")

# 6. OUTIL 15: JALONS CONCEPTION APQP
def make_outil_15():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 15", "Checklist de Jalons de Conception & Développement (APQP)", "Clause ISO 9001:2015 - 8.3 - Question Q15")
    add_consultant_box(doc, "Ne lancez aucun produit nouveau en fabrication série sans avoir validé les 4 jalons de conception. Chaque jalon verrouille la faisabilité, les coûts et la conformité avant d'investir dans l'outillage.", [
        ("1. Jalon 1 : Faisabilité & Devis", "Validation du cahier des charges client, estimation des coûts et des marges cibles."),
        ("2. Jalon 2 : Conception Numérique (BE)", "Revue de conception 3D, calculs de résistance des matériaux et validation des plans Indice A."),
        ("3. Jalon 3 : Prototypage & Essais", "Fabrication du prototype, essais fonctionnels et métrologie 3D complète."),
        ("4. Jalon 4 : Qualification Série (EI)", "Validation des Échantillons Initiaux (EI) et accord formel du client avant série.")
    ])
    add_why_box(doc, [
        "Développement de produits conformes du premier coup.",
        "Élimination des modifications de plans coûteuses en cours de production.",
        "Preuve d'excellence de maîtrise du processus de conception (ISO 9001 Clause 8.3)."
    ], [
        "Lancement d'un moule ou d'un outillage comportant une erreur de conception (coût > 50k€).",
        "Retard de 6 mois sur la mise sur le marché du nouveau produit.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 8.3)."
    ])
    add_guide_box(doc, [
        "Ouvrir la fiche de jalon dès l'enregistrement d'un nouveau projet BE.",
        "Organiser la réunion de revue de jalon à chaque étape franchie.",
        "Apposer les signatures conjointes du BE, de la Production et de la Qualité.",
        "Obtenir l'accord écrit du client sur les Échantillons Initiaux."
    ])
    doc.add_page_break()
    add_section_header(doc, "GRILLE DE VALIDATION PAS À PAS DES JALONS DE CONCEPTION")
    headers = ["N° Jalon", "Nom du Jalon de Conception", "Livrables Obligatoires à Présenter", "Critère de Validation Success", "Visa BE", "Visa Prod", "Visa Qualité", "Statut Jalon"]
    rows = [
        ["Jalon 1", "Faisabilité & Chiffrage Initial", "Cahier des charges client & Revue devis Outil 08", "Marge brute prévisionnelle ≥ 35%", "V. BE", "V. Prod", "V. QSE", "Validé"],
        ["Jalon 2", "Validation plans 3D & AMDEC BE", "Plans 3D STEP Indice A & Cotation fonctionnelle", "Zéro interférence 3D & AMDEC validée", "V. BE", "V. Prod", "V. QSE", "Validé"],
        ["Jalon 3", "Prototype & Essais Métrologie", "Rapport de contrôle 3D prototype & essais", "100% des cotes critiques conformes", "V. BE", "V. Prod", "V. QSE", "Validé"],
        ["Jalon 4", "Accord Client & Qualification Série", "Procès-Verbal accord Échantillons Initiaux (EI)", "Acceptation écrite formelle du client", "V. BE", "V. Prod", "V. QSE", "Validé"],
        ["[Jalon]", "[Nom du Jalon]", "[Livrables requis]", "[Critère de réussite]", "[Visa]", "[Visa]", "[Visa]", "[Statut]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[900, 2000, 2400, 2100, 900, 900, 1000, 1000])
    add_next_steps_box(doc, [
        "Consigner le PV de validation de jalon dans le dossier projet.",
        "Archiver sous 03_OPERATIONS_PRODUCTION/CONCEPTION_PROJETS/."
    ])
    save_doc(doc, "OUTIL_15_JALONS_CONCEPTION_APQP.docx")

# 7. OUTIL 16: TRAITABILITE & SUIVI FABRICATION
def make_outil_16():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 16", "Fiche de Suivi de Fabrication, Traçabilité & Dossier de Lot", "Clause ISO 9001:2015 - 8.5.2 - Question Q16")
    add_consultant_box(doc, "Garantissez une traçabilité totale de chaque pièce fabriquée : du numéro de coulée de la matière première jusqu'au nom de l'opérateur ayant réalisé l'assemblage final.", [
        ("1. N° de Lot & Ordre de Fabrication", "Numéro de lot unique gravé ou étiqueté sur le produit et reporté sur le dossier de fabrication."),
        ("2. Traçabilité Matière Première", "Certificat matière 3.1 rattaché au numéro de coulé de l'acier ou du composant critique."),
        ("3. Émargement Étape par Étape", "Signature obligatoire de l'opérateur à la fin de chaque opération (Debit, Usinage, Contrôle)."),
        ("4. Relevé des Cotes Critiques", "Enregistrement manuscrit ou numérique des dimensions réelles mesurées au pied à coulisse.")
    ])
    add_why_box(doc, [
        "Traçabilité ascendante et descendante instantanée en moins de 2 minutes.",
        "Ciblage exact des pièces impactées en cas de rappel ou de défaut.",
        "Preuve de maîtrise de l'identification exigée par l'ISO 9001 (Clause 8.5.2)."
    ], [
        "Impossibilité de retrouver la cause d'un défaut sur un lot livré.",
        "Obligation de rappeler 1 000 pièces au lieu de 10 pièces ciblées.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 8.5.2)."
    ])
    add_guide_box(doc, [
        "Imprimer la fiche de suivi de lot lors du lancement de l'Ordre de Fabrication (OF).",
        "Renseigner le numéro de coulée matière et le certificat 3.1.",
        "Faire émarger chaque opérateur à la fin de son poste.",
        "Archiver la fiche dans le dossier de fabrication clôturé."
    ])
    doc.add_page_break()
    add_section_header(doc, "FICHE DE SUIVI DE FABRICATION ET DOSSIER DE LOT (SUIVI FABRIC.)")
    headers = ["N° Étape", "Désignation de l'Opération", "Machine / Poste", "N° Lot Matière / Coulée", "Quantité Conforme", "Relevé Cotes / Contrôle", "Nom Opérateur", "Date & Signature"]
    rows = [
        ["10", "Débit & Tronçonnage Tubes Inox", "Scie Auto S-01", "Coulée N° C-88492 (Certif 3.1)", "100 Pcs", "Longueur 1200mm ± 0.5mm", "M. DUPONT", "10/02/2026 [Visa]"],
        ["20", "Usinage CNC & Tournage Face A", "Centre CNC-05", "Coulée N° C-88492", "99 Pcs (1 Rebut)", "Diamètre Ø 45.02mm (Conforme)", "J. MARTIN", "11/02/2026 [Visa]"],
        ["30", "Contrôle Autocontrôle Dim. 3D", "Poste Métrologie", "Coulée N° C-88492", "99 Pcs", "Fiche autocontrôle OK", "R. QSE", "12/02/2026 [Visa]"],
        ["40", "Conditionnement & Protection", "Poste Emballage", "Lot Fin N° LOT-2026-044", "99 Pcs", "Bouchons plastique posés", "P. LEROY", "12/02/2026 [Visa]"],
        ["[N°]", "[Désignation opération]", "[Machine]", "[N° Coulée / Lot]", "[Qté OK]", "[Relevé Cotes]", "[Nom]", "[Date & Visa]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[800, 2200, 1400, 1600, 1100, 1600, 1100, 1400])
    add_next_steps_box(doc, [
        "Rattacher la fiche au dossier d'expédition.",
        "Archiver sous 03_OPERATIONS_PRODUCTION/DOSSIERS_LOTS/."
    ])
    save_doc(doc, "OUTIL_16_TRAITABILITE_SUIVI_FABRICATION.docx")

# 8. OUTIL 17: PV RECETTE & LIBERATION
def make_outil_17():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 17", "Procès-Verbal (PV) de Recette, Libération & Autocontrôle Final", "Clause ISO 9001:2015 - 8.6 - Question Q17")
    add_consultant_box(doc, "Ne laissez aucun produit quitter votre usine sans la signature du PV de libération finale. Ce document atteste formellement que 100% des contrôles requis ont été réalisés et validés.", [
        ("1. Contrôle Dimensionnel Final", "Vérification des cotes critiques au moyen d'appareils de mesure étalonnés."),
        ("2. Contrôle d'Aspect & Propreté", "Absence de bavures, de rayures, de chocs et présence du traitement de surface conforme."),
        ("3. Validation du Dossier de Lot", "Vérification de la présence de toutes les signatures sur la fiche de suivi Outil 16."),
        ("4. Autorisation Formelle de Livraison", "Signature du Responsable Qualité autorisant le chargement et la facturation.")
    ])
    add_why_box(doc, [
        "Garantie absolue d'aucune livraison de pièce non conforme.",
        "Protection juridique et contractuelle de votre entreprise.",
        "Preuve de libération des produits exigée par l'ISO 9001 (Clause 8.6)."
    ], [
        "Livraison d'un produit défectueux provoquant un arrêt de chaîne chez le client.",
        "Contestation de facturation pour absence de certificat de conformité.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 8.6)."
    ])
    add_guide_box(doc, [
        "Renseigner les références du lot et le nom du client.",
        "Effectuer le contrôle final selon le plan de contrôle.",
        "Émarger le PV de recette et délivrer le Certificat de Conformité.",
        "Joindre une copie au bon de livraison."
    ])
    doc.add_page_break()
    add_section_header(doc, "PROCÈS-VERBAL DE RECETTE ET AUTORISATION DE LIBÉRATION FINALE")
    headers = ["Point de Contrôle Final", "Spécification Exigée", "Valeur Relevée / Statut", "Appareil de Mesure Utilisé", "Résultat (Conforme / NC)", "Visa Contrôleur"]
    rows = [
        ["1. Dimensionnel - Longueur Totale", "1 500 mm ± 0.2 mm", "1 500.08 mm", "Pied à coulisse num. ER-04", "Conforme", "V. Contrôleur"],
        ["2. Dimensionnel - Alésage Central", "Ø 50.00 H7 (+0.025/0)", "Ø 50.015 mm", "Tampon lisse P/NP ER-12", "Conforme", "V. Contrôleur"],
        ["3. Traitement Surface - Anodisation", "Épaisseur 15µm ± 3µm", "16.2 µm", "Mesureur d'épaisseur ER-08", "Conforme", "V. Contrôleur"],
        ["4. Aspect Visuel & Ébavurage", "Absence de bavure & rayure", "100% Net et propre", "Contrôle visuel sous loupe", "Conforme", "V. Contrôleur"],
        ["5. Dossier de Lot & Certificats 3.1", "Émargement 100% complet", "Dossier lot complet visé", "Vérification documentaire", "Conforme", "V. QSE"],
        ["[Point de contrôle]", "[Spécification]", "[Valeur mesurée]", "[Appareil utilisé]", "[Conforme / NC]", "[Visa]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[2200, 2000, 1800, 1800, 1200, 1200])
    add_next_steps_box(doc, [
        "Joindre le PV signé au Bon de Livraison.",
        "Archiver sous 03_OPERATIONS_PRODUCTION/PV_RECETTE/."
    ])
    save_doc(doc, "OUTIL_17_PV_RECETTE_LIBERATION.docx")

# 9. OUTIL 18: SIGNALETIQUE ISOLEMENT NC
def make_outil_18():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 18", "Signalétique & Fiche de Zone d'Isolement / Quarantaine NC", "Clause ISO 9001:2015 - 8.7 - Question Q18")
    add_consultant_box(doc, "Délimitez physiquement une zone d'isolement peinte en rouge au sol avec des bacs rouges identifiés 'STOP NC'. Tout produit douteux ou non conforme doit y être déposé immédiatement pour éviter tout mélange !", [
        ("1. Zone Physique Rouge Délimitée", "Emplacement verrouillé ou balisé au sol au centre de l'atelier réservé aux pièces NC."),
        ("2. Étiquette 'STOP NC' Rouge", "Fiche d'identification rouge collée sur la pièce indiquant la non-conformité et l'interdiction de toucher."),
        ("3. Registre d'Entrée / Sortie Quarantaine", "Traçabilité des pièces déposées en zone rouge et décision de la commission NC."),
        ("4. Traitement sous 48h Max", "Arbitrage obligatoire : Retouche, Rebut/Mise au mille, ou Dérogation acceptée par le client.")
    ])
    add_why_box(doc, [
        "Impossibilité physique d'expédier ou de monter une pièce défectueuse par erreur.",
        "Rangement et clarté visuelle immédiate dans l'atelier.",
        "Preuve de maîtrise des éléments non conformes exigée par l'ISO 9001 (Clause 8.7)."
    ], [
        "Montage d'une pièce défectueuse sur un ensemble prêt à livrer.",
        "Perte de temps à chercher des pièces douteuses éparpillées dans l'atelier.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 8.7)."
    ])
    add_guide_box(doc, [
        "Coller l'étiquette rouge 'STOP NC' sur la pièce dès la détection du défaut.",
        "Déposer la pièce dans le bac rouge de la zone de quarantaine.",
        "Enregistrer la pièce dans le registre d'isolement.",
        "Staturer sous 48h (Rebut / Retouche / Dérogation)."
    ])
    doc.add_page_break()
    add_section_header(doc, "REGISTRE D'ENTRÉE / SORTIE DE ZONE DE QUARANTAINE NC (ZONE ROUGE)")
    headers = ["N° Fiche NC", "Date Entrée", "Désignation Pièce / Lot", "Quantité Isolée", "Description de la Non-Conformité", "Décision Commission NC", "Date Sortie", "Visa Qualité"]
    rows = [
        ["NC-2026-12", "02/02", "Axe Inox Ø 30 L=400", "5 Pcs", "Cote Ø 29.85mm au lieu de 30.00mm (Sous-cote)", "Rebut définitif (Mise au mille)", "03/02", "V. QSE"],
        ["NC-2026-13", "05/02", "Carter Aluminium Moulé", "12 Pcs", "Bavure sur face d'appui de joint", "Retouche reprise usinage atelier", "06/02", "V. QSE"],
        ["NC-2026-14", "10/02", "Support Acier Peint", "25 Pcs", "Épaisseur peinture 60µm au lieu de 80µm", "Dérogation acceptée par client", "11/02", "V. Com / QSE"],
        ["[N° Fiche]", "[Date]", "[Désignation pièce]", "[Qté]", "[Description non-conformité]", "[Décision Retouche/Rebut]", "[Date]", "[Visa]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1100, 900, 2000, 1000, 2400, 1800, 900, 1100])
    add_next_steps_box(doc, [
        "Vider la zone de quarantaine au moins une fois par semaine.",
        "Archiver le registre sous 03_OPERATIONS_PRODUCTION/QUARANTAINE_NC/."
    ])
    save_doc(doc, "OUTIL_18_SIGNALETIQUE_ISOLEMENT_NC.docx")

# 10. OUTIL 19: FNC METHODE 5 POURQUOI
def make_outil_19():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 19", "Fiche de Non-Conformité (FNC) & Analyse des 5 Pourquoi", "Clause ISO 9001:2015 - 10.2 - Question Q19")
    add_consultant_box(doc, "Ne vous arrêtez pas à la cause superficielle ('erreur humaine') ! Utilisez la méthode des 5 Pourquoi pour remonter jusqu'à la cause racine organisationnelle et stopper définitivement la récidive.", [
        ("1. Description Factuelle du Problème", "Qui, Quoi, Où, Quand, Combien ? (Méthode QQOQCCP sans jugement de valeur)."),
        ("2. Enchaînement des 5 Pourquoi", "Questionner 'Pourquoi ?' 5 fois de suite jusqu'à identifier la faille de procédure ou de formation."),
        ("3. Plan d'Action Correctif Chiffré", "Action immédiate (sécuriser le client) + Action corrective pérenne (modifier le standard Outil 14)."),
        ("4. Vérification d'Efficacité à 30 Jours", "Vérifier sur le terrain un mois plus tard que le problème ne s'est plus jamais produit.")
    ])
    add_why_box(doc, [
        "Éradication définitive des défauts répétitifs et des coûts de retouche.",
        "Montee en compétence de l'équipe par l'analyse factuelle collective.",
        "Preuve d'amélioration continue exigée par l'ISO 9001 (Clause 10.2)."
    ], [
        "Répétition du même défaut mois après mois (gaspillage financier).",
        "Recherche de coupables au lieu de traiter le problème de fond.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 10.2)."
    ])
    add_financial_roi_box(doc,
        "Gain net : Éradication définitive de la récidive et suppression des coûts de retouche inutiles.",
        "Coût cumulé de non-qualité : Heures de retouche et pièces jetées répétitivement sans action racine."
    )
    add_interconnections_box(doc, [
        "OUTIL 18 (Quarantaine NC) : Pièces isolées physiquement à l'atelier.",
        "OUTIL 10 (Réclamations Client) : Réclamation ou litige soumis par un client."
    ], [
        "OUTIL A5 (Cycle PDCA) : Suivi du plan d'action d'amélioration continue.",
        "OUTIL 27 (Audit Interne) : Preuve d'éradication du problème pour l'auditeur."
    ])
    add_guide_box(doc, [
        "Ouvrir la FNC dès qu'une non-conformité grave ou répétitive est détectée.",
        "Reunir l'équipe de production et dérouler les 5 Pourquoi.",
        "Définir l'action corrective pérenne et désigner un responsable.",
        "Valider l'efficacité 30 jours plus tard et clôturer la FNC."
    ])
    doc.add_page_break()
    add_section_header(doc, "TRAME D'ANALYSE PAR LA MÉTHODE DES 5 POURQUOI (FICHE FNC)")
    headers = ["Étape d'Analyse", "Questionnement Révélateur", "Analyse Réelle et Cause Racine Identifiée", "Action Corrective / Préventive Déployée", "Responsable & Échéance"]
    rows = [
        ["Problème Constaté", "Quel est le défaut mesuré ?", "Défaut de cotation Ø 29.85mm sur 5 axes inox", "Sécurisation immédiate : Isolement des pièces en zone rouge", "Chef Prod / 02 Fév"],
        ["Pourquoi N°1 ?", "Pourquoi la cote est-elle hors tolérance ?", "Parce que l'outil de coupe s'est usé prématurément", "Remplacement immédiat de la plaquette d'usinage", "Opérateur / 02 Fév"],
        ["Pourquoi N°2 ?", "Pourquoi l'outil s'est-il usé si vite ?", "Parce que la vitesse de coupe programmée était trop élevée", "Correction du programme CNC sur le contrôleur", "Technicien BE / 02 Fév"],
        ["Pourquoi N°3 ?", "Pourquoi la vitesse était-elle trop élevée ?", "Parce que le programmeur a utilisé le paramètre acier doux au lieu d'inox", "Mise à jour de la bibliothèque d'outils BE", "Resp. BE / 03 Fév"],
        ["Pourquoi N°4 ?", "Pourquoi l'erreur de paramètre a-t-elle eu lieu ?", "Parce que la gamme n'indiquait pas la nuance exacte de l'inox", "Mise en place d'un champ obligatoire nuance sur l'OF", "Resp. QSE / 04 Fév"],
        ["Pourquoi N°5 (Racine)", "Pourquoi la gamme ne l'indiquait pas ?", "Absence de procédure de revue de jalon BE/Prod (Outil 15)", "Mise en œuvre obligatoire du Jalon 2 de l'Outil 15", "Dir. Prod / 10 Fév"],
        ["[Pourquoi N°]", "[Question]", "[Cause identifiée]", "[Action corrective pérenne]", "[Nom & Date]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1500, 2000, 2700, 2600, 1400])
    add_next_steps_box(doc, [
        "Vérification de l'efficacité à 30 jours sur le terrain.",
        "Archiver sous 03_OPERATIONS_PRODUCTION/FNC_5_POURQUOI/."
    ])
    save_doc(doc, "OUTIL_19_FNC_METHODE_5_POURQUOI.docx")

# RUN ALL BUILDERS FOR SEQUENCE 3
make_start_here_seq3()
make_outil_11()
make_outil_12()
make_outil_13()
make_outil_14()
make_outil_15()
make_outil_16()
make_outil_17()
make_outil_18()
make_outil_19()

print("Successfully generated all Sequence 3 Word (.docx) documents according to guidelines!")
