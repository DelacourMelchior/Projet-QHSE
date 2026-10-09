import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

out_word_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/outils_qualite_word/sequence_4"
out_unified_docx = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_4_RH_SAVOIR_GED_IT/DOCX"

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
    r_cl = p_title.add_run(f"SÉQUENCE 4 - {tool_code} — {clause_q_text}\n")
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

# BUILDERS FOR SEQUENCE 4

# 1. START HERE SEQUENCE 4
def make_start_here_seq4():
    doc = create_base_document()
    add_header_brand(doc, "NOTICE CLIENT", "Guide de Démarrage Client Autonome (Séquence 4)", "RH, Souveraineté du Savoir & GED/IT - 5 Jours")
    add_consultant_box(doc, "Bienvenue dans votre Kit d'Outils Qualité Séquence 4. Cette séquence protège le capital humain de votre entreprise, élimine la dépendance aux hommes-clés et déploie le pilotage automatique par la data.", [
        ("1. Organigramme & Matrice RACI", "Fixer les responsabilités exactes (Responsable, Approbateur, Consulté, Informé) pour chaque processus métier."),
        ("2. Polyvalence & Transmission du Savoir", "Gérer les binômes sur les postes critiques et construire le livret d'accueil sensibilisant aux coûts de non-qualité."),
        ("3. Conduite du Changement & Rituel Flash", "Déployer le rituel de communication 5 minutes et piloter les projets de transformation sans blocage."),
        ("4. Classement GED, KPIs & Audit Interne", "Retrouver tout document en 30 secondes, automatiser les dashboards et programmer l'audit interne annuel.")
    ])
    add_why_box(doc, [
        "Souveraineté totale du savoir-faire (zéro dépendance homme-clé).",
        "Retrouvabilité instantanée de la documentation GED (< 30 sec).",
        "Amélioration continue pérenne validée par l'audit interne SMQ."
    ], [
        "Départ brutal d'un salarié clé emportant le savoir-faire sans doublon.",
        "Perte de temps massive à chercher un fichier ou une ancienne procédure.",
        "Non-conformités majeures d'audit ISO 9001 sur la gestion des compétences (Clause 7) et audits internes (Clause 9.2)."
    ])
    days_data = [
        ("JOUR 1 : ORGANIGRAMME & MATRICE RACI (30 MIN)", "Définir les rôles et attribuer les responsabilités RACI.", "Fichier : OUTIL_20_ORGANIGRAMME_RACI.docx"),
        ("JOUR 2 : CONDUITE DU CHANGEMENT & POLYVALENCE (25 MIN)", "Établir la matrice des compétences et le plan de transition.", "Fichiers : OUTIL_21 & OUTIL_22"),
        ("JOUR 3 : LIVRET ACCUEIL & RÉUNIONS FLASH 5 MIN (25 MIN)", "Sensibiliser aux coûts NC et lancer le rituel d'équipe.", "Fichiers : OUTIL_23 & OUTIL_24"),
        ("JOUR 4 : ARBORESCENCE GED & DASHBOARD KPIS (25 MIN)", "Normaliser le plan de classement et les indicateurs.", "Fichiers : OUTIL_25 & OUTIL_26"),
        ("JOUR 5 : PROGRAMME & TRAME D'AUDIT INTERNE (25 MIN)", "Planifier le programme annuel d'audit et la grille.", "Fichier : OUTIL_27_PLANNING_TRAME_AUDIT_INTERNE.docx")
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
        "Archiver les versions sous 04_RH_SAVOIR_GED_IT/."
    ])
    save_doc(doc, "START_HERE_SEQUENCE_4.docx")

# 2. OUTIL 20: ORGANIGRAMME & RACI
def make_outil_20():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 20", "Organigramme Fonctionnel & Matrice RACI Globale", "Clause ISO 9001:2015 - 5.3 - Question Q20")
    add_consultant_box(doc, "Supprimez les zones d'ombre sur la responsabilité des tâches métiers ! Utilisez la matrice RACI (Responsible, Accountable, Consulted, Informed) pour désigner un Approbateur unique (A) par tâche.", [
        ("1. R = Réalisateur (Responsible)", "La personne qui réalise concrètement le travail ou l'action."),
        ("2. A = Approbateur Unique (Accountable)", "Le seul responsable final qui répond du résultat et valide le travail."),
        ("3. C = Consulté (Consulted)", "L'expert dont l'avis technique est sollicité avant la prise de décision."),
        ("4. I = Informé (Informed)", "Les collaborateurs tenus informés de l'avancement ou des décisions prises.")
    ])
    add_why_box(doc, [
        "Clarté absolue des responsabilités pour chaque collaborateur.",
        "Suppression des doublons d'effort et des tâches abandonnées.",
        "Preuve de définition des rôles exigée par l'ISO 9001 (Clause 5.3)."
    ], [
        "Confusion sur l'approbateur final en cas d'erreur de fabrication.",
        "Lenteur décisionnelle liée à trop de personnes consultées sans décideur.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 5.3)."
    ])
    add_interconnections_box(doc, [
        "OUTIL 11 (Cartographie Processus) : Découpage des processus et pilotes.",
        "OUTIL 04 (Politique Qualité) : Organisation de la Direction."
    ], [
        "OUTIL 22 (Polyvalence) : Identification des titulaires par poste.",
        "OUTIL A9 (Onboarding RH) : Attribution du tuteur et du validateur."
    ])
    add_guide_box(doc, [
        "Lister les processus et tâches clés de votre entreprise.",
        "Positionner les rôles des collaborateurs en colonnes.",
        "Attribuer les lettres R, A, C, I en veillant à avoir UN SEUL 'A' par ligne.",
        "Valider et diffuser la matrice lors de la réunion de rentrée."
    ])
    doc.add_page_break()
    add_section_header(doc, "MATRICE RACI GLOBALE DES PROCESSUS MÉTIRS")
    headers = ["Tâche Métier / Processus", "Directeur Général (DG)", "Responsable Commercial", "Responsable BE", "Responsable Achats", "Responsable Prod", "Responsable QSE"]
    rows = [
        ["1. Revue & Signature Devis > 10k€", "A", "R", "C", "I", "C", "I"],
        ["2. Validation Plans 3D & Jalons BE", "I", "I", "A / R", "C", "C", "C"],
        ["3. Évaluation & Agrément Fournisseurs", "I", "I", "I", "A / R", "C", "C"],
        ["4. Lancement Fabrication & Suivi OF", "I", "I", "I", "I", "A / R", "I"],
        ["5. Libération Produit & PV Recette", "I", "I", "I", "I", "R", "A"],
        ["6. Traitement Réclamation & FNC", "I", "C", "C", "C", "R", "A"],
        ["7. Revue de Direction & Objectifs", "A / R", "C", "C", "C", "C", "R"],
        ["[Votre Tâche]", "[R/A/C/I]", "[R/A/C/I]", "[R/A/C/I]", "[R/A/C/I]", "[R/A/C/I]", "[R/A/C/I]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[2700, 1250, 1250, 1250, 1250, 1250, 1250])
    add_next_steps_box(doc, [
        "Afficher la matrice RACI dans l'intranet.",
        "Archiver sous 04_RH_SAVOIR_GED_IT/ORGANIGRAMME_RACI.pdf."
    ])
    save_doc(doc, "OUTIL_20_ORGANIGRAMME_RACI.docx")

# 3. OUTIL 21: CONDUITE DU CHANGEMENT
def make_outil_21():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 21", "Plan de Conduite du Changement & Projets de Transition", "Clause ISO 9001:2015 - 6.3 - Question Q21")
    add_consultant_box(doc, "Anticipez les risques humains, techniques et organisationnels lors des évolutions d'outils ERP, réorganisations d'ateliers ou déménagements. Ne laissez pas l'inquiétude freiner l'efficacité !", [
        ("1. Analyse d'Impact du Changement", "Évaluer les conséquences du projet sur les équipes, les processus et les outils actuels."),
        ("2. Plan de Communication & Écoute", "Expliquer le 'Pourquoi' du changement et organiser des ateliers d'échange récurrents."),
        ("3. Plan de Formation & Accompagnement", "Accompagner individuellement chaque utilisateur sur son nouveau poste ou outil."),
        ("4. Suivi des Indicateurs d'Adhésion", "Mesurer le taux d'adoption du nouvel outil et ajuster l'accompagnement.")
    ])
    add_why_box(doc, [
        "Adhésion rapide des équipes aux nouvelles méthodes de travail.",
        "Élimination des périodes de baisse de productivité lors des transitions.",
        "Preuve de planification des modifications exigeée par l'ISO 9001 (Clause 6.3)."
    ], [
        "Rejet massif par le personnel d'un nouvel ERP coûtant 100k€.",
        "Baisse durable de la qualité pendant la phase de transition.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 6.3)."
    ])
    add_guide_box(doc, [
        "Identifier l'évolution stratégique ou organisationnelle à venir.",
        "Compléter la grille d'impact et de risques associés.",
        "Définir le plan d'action de communication et de formation.",
        "Piloter l'avancement lors des points hebdomadaires de projet."
    ])
    doc.add_page_break()
    add_section_header(doc, "GRILLE DE PILOTAGE DU PLAN DE CONDUITE DU CHANGEMENT")
    headers = ["Axe de Changement", "Description de l'Évolution", "Risque Identifié / Frein Humain", "Action d'Accompagnement & Formation", "Responsable", "Échéance", "Statut Adoption"]
    rows = [
        ["Outil IT", "Déploiement du nouvel ERP Gestion Prod", "Peur de la complexité de saisie en atelier", "Formation 4h par opérateur + Tuteur dédié", "Resp. IT / Prod", "15/03/2026", "En cours"],
        ["Organisation", "Passage au rituel Réunion Flash 5 min", "Perception de perte de temps de travail", "Animation par exemple DG + Fiche réflexe", "Resp. QSE", "01/02/2026", "Validé"],
        ["Atelier", "Mise en place de la zone Quarantaine NC", "Refus d'avouer les pièces défectueuses", "Sensibilisation zéro punition + Prime qualité", "Chef Prod", "10/02/2026", "Validé"],
        ["[Axe]", "[Description évolution]", "[Risque / Frein]", "[Action d'accompagnement]", "[Nom]", "[Date]", "[Statut]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1400, 2200, 2200, 2400, 1000, 1000, 1000])
    add_next_steps_box(doc, [
        "Présenter le plan aux représentants du personnel.",
        "Archiver sous 04_RH_SAVOIR_GED_IT/PROJETS_CHANGEMENT/."
    ])
    save_doc(doc, "OUTIL_21_CONDUITE_DU_CHANGEMENT.docx")

# 4. OUTIL 22: MATRICE COMPETENCES & POLYVALENCE
def make_outil_22():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 22", "Matrice des Compétences & Polyvalence (Gestion Binômes)", "Clause ISO 9001:2015 - 7.2 - Question Q22")
    add_consultant_box(doc, "Supprimez définitivement la vulnérabilité liée à l'homme-clé ! Évaluez la polyvalence sur chaque poste stratégique et organisez des binômes formés capables d'assurer la relève en 24h.", [
        ("1. Échelle de Maîtrise (4 Niveaux)", "1 = Néophyte / 2 = Autonome sous contrôle / 3 = Parfaitement Autonome / 4 = Expert Formateur."),
        ("2. Identification des Hommes-Clés", "Détection des postes où un seul salarié détient le niveau 3 ou 4."),
        ("3. Plan de Polyvalence & Binômes", "Organisation de formations croisées pour avoir au moins 2 personnes au niveau 3 par poste."),
        ("4. Entretien Annuel & Besoins RH", "Mise à jour annuelle des compétences et du plan de formation.")
    ])
    add_why_box(doc, [
        "Continuité parfaite de l'activité en cas de maladie ou de départ soudain.",
        "Souveraineté du savoir-faire intégrée dans l'entreprise.",
        "Preuve de maîtrise des compétences exigée par l'ISO 9001 (Clause 7.2)."
    ], [
        "Arrêt complet d'un poste critique pendant 2 semaines pour absence de l'expert unique.",
        "Perte irréparable du savoir-faire suite au départ en retraite d'un cadre historique.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 7.2)."
    ])
    add_guide_box(doc, [
        "Lister les postes de travail et compétences techniques en colonnes.",
        "Evaluer chaque salarié de 1 à 4.",
        "Repérer les lignes comportant un seul niveau 3/4.",
        "Planifier les formations en binômes pour sécuriser le poste."
    ])
    doc.add_page_break()
    add_section_header(doc, "MATRICE CROISÉE DE POLYVALENCE ET GESTION DES BINÔMES HOMMES-CLÉS")
    headers = ["Nom du Salarié", "Poste Principal", "Usinage CNC 5 Axes", "Soudure TIG Inox", "Programmation BE", "Contrôle 3D Final", "Binôme Référent Désigné"]
    rows = [
        ["M. DUPONT Jean", "Opérateur Usinage", "Niveau 4 (Expert)", "Niveau 1", "Niveau 2", "Niveau 3 (Autonome)", "Binôme avec J. MARTIN"],
        ["J. MARTIN Paul", "Opérateur Usinage", "Niveau 3 (Autonome)", "Niveau 1", "Niveau 1", "Niveau 2", "Binôme avec M. DUPONT"],
        ["R. QSE Pierre", "Resp. Qualité", "Niveau 1", "Niveau 1", "Niveau 2", "Niveau 4 (Expert)", "Binôme avec M. DUPONT"],
        ["L. SOUDURE Marc", "Soudeur TIG", "Niveau 1", "Niveau 4 (Expert)", "Niveau 1", "Niveau 2", "FORMATION REQUISE (Homme-Clé)"],
        ["[Nom Salarié]", "[Poste]", "[Niveau 1-4]", "[Niveau 1-4]", "[Niveau 1-4]", "[Niveau 1-4]", "[Nom du binôme]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1800, 1600, 1400, 1400, 1400, 1400, 1200])
    add_next_steps_box(doc, [
        "Revue semestrielle du taux de polyvalence.",
        "Archiver sous 04_RH_SAVOIR_GED_IT/MATRICE_POLYVALENCE.pdf."
    ])
    save_doc(doc, "OUTIL_22_MATRICE_COMPETENCES_POLYVALENCE.docx")

# 5. OUTIL 23: LIVRET ACCUEIL & SENSIBILISATION NC
def make_outil_23():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 23", "Livret d'Accueil Salarié & Sensibilisation aux Coûts NC", "Clause ISO 9001:2015 - 7.3 - Question Q23")
    add_consultant_box(doc, "Sensibilisez immédiatement chaque nouveau collaborateur dès son premier jour ! Expliquez-lui l'impact financier direct des erreurs et du gaspillage sur la santé de l'entreprise.", [
        ("1. Présentation de la Charte Qualité", "Expliquer l'engagement zéro gaspillage et la recherche d'excellence."),
        ("2. Impact Financier de la Non-Qualité", "Démontrer qu'une pièce jetée coûte 10 fois plus cher que la correction au poste."),
        ("3. Règles de Sécurité & Environnement", "Port obligatoire des EPI, tri des déchets d'atelier et propreté du poste."),
        ("4. Émargement du Livret d'Accueil", "Fiche de confirmation de remise du livret signée par le salarié et le tuteur.")
    ])
    add_why_box(doc, [
        "Intégration rapide et prise de conscience immédiate de l'importance de la qualité.",
        "Réduction des erreurs de débutants et des coûts de non-qualité.",
        "Preuve de sensibilisation du personnel exigée par l'ISO 9001 (Clause 7.3)."
    ], [
        "Défauts majeurs générés lors de la première semaine d'un intérimaire.",
        "Méconnaissance des consignes de sécurité entraînant un risque d'accident.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 7.3)."
    ])
    add_guide_box(doc, [
        "Remettre le livret d'accueil à tout nouvel arrivant.",
        "Réaliser l'entretien de sensibilisation de 30 minutes avec le tuteur.",
        "Présenter les règles d'isolement des non-conformités (Outil 18).",
        "Faire émarger l'attestation de remise et classer au dossier RH."
    ])
    doc.add_page_break()
    add_section_header(doc, "ATTESTATION DE REMISE DU LIVRET ET CAUSERIE DE SENSIBILISATION NC")
    headers = ["Nom du Salarié", "Poste Occupé", "Date d'Arrivée", "Tuteur Désigné", "Causerie Coûts NC Validée", "Consignes Sécurité Présentées", "Visa Salarié", "Visa Tuteur"]
    rows = [
        ["M. NOUVEAU Thomas", "Opérateur Usinage CNC", "01/02/2026", "M. DUPONT Jean", "Oui (Causerie 30 min)", "Oui (EPI remis)", "V. Salarié", "V. Tuteur"],
        ["J. INTERIM Lucas", "Agent d'Expédition", "10/02/2026", "P. LEROY", "Oui (Causerie 30 min)", "Oui (EPI remis)", "V. Salarié", "V. Tuteur"],
        ["[Nom du Salarié]", "[Poste]", "[Date]", "[Nom Tuteur]", "[Oui/Non]", "[Oui/Non]", "[Visa]", "[Visa]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1800, 1600, 1100, 1500, 1400, 1400, 700, 700])
    add_next_steps_box(doc, [
        "Émargement obligatoire le jour de l'embauche.",
        "Archiver sous 04_RH_SAVOIR_GED_IT/DOSSIERS_RH/LIVRETS_ACCUEIL/."
    ])
    save_doc(doc, "OUTIL_23_LIVRET_ACCUEIL_SENSIBILISATION_NC.docx")

# 6. OUTIL 24: REUNION FLASH COMMUNICATION
def make_outil_24():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 24", "Trame de Réunion Flash (5 min) & Communication Interne", "Clause ISO 9001:2015 - 7.4 - Question Q24")
    add_consultant_box(doc, "Instaurez le rituel de la Réunion Flash de 5 minutes debout chaque lundi matin ! Transmettez l'information essentielle sans perdre de temps et supprimez les bruits de couloir.", [
        ("1. Rituel Court (5 minutes max)", "Réunion debout au tableau d'affichage de l'atelier à heure fixe."),
        ("2. Ordre du Jour Structuré (3 Points)", "Point Sécurité / Point Qualité & Réclamations de la semaine / Objectifs de prod."),
        ("3. Parole aux Équipes (1 min)", "Remontée rapide des blocages matériels ou des idées d'amélioration."),
        ("4. Relevé de Décisions Flash", "Noter immédiatement l'action retenue avec le nom du responsable sur le tableau.")
    ])
    add_why_box(doc, [
        "Alignement parfait des équipes sur les priorités de la semaine.",
        "Détection précoce des problèmes avant blocage de production.",
        "Preuve de communication interne active exigée par l'ISO 9001 (Clause 7.4)."
    ], [
        "Bruits de couloir et désinformation sur les objectifs.",
        "Réunions fleuves de 2 heures inutiles et répétitives.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 7.4)."
    ])
    add_interconnections_box(doc, [
        "OUTIL 18 (Quarantaine NC) : Incidents et écarts récents sur le terrain.",
        "OUTIL A7 (Eisenhower) : Priorités de la semaine."
    ], [
        "OUTIL A2B (Réunion Interne) : Remontées d'arbitrages vers le CODIR.",
        "OUTIL A10 (Presque-Accidents) : Signalement des risques sécurité."
    ])
    add_guide_box(doc, [
        "Se réunir chaque lundi à 8h00 debout devant le tableau.",
        "Passer en revue les 3 points en 5 minutes chrono.",
        "Noter les 2 actions prioritaires sur le tableau.",
        "Effacer et mettre à jour le tableau chaque semaine."
    ])
    doc.add_page_break()
    add_section_header(doc, "COMPTE-RENDU FLASH ET RELEVÉ DE DÉCISIONS HEBDOMADAIRE")
    headers = ["Date Réunion", "Animateur", "Point Sécurité abordé", "Point Qualité & Réclamations", "Objectifs Prod Semaine", "Action Retenue", "Responsable", "Échéance"]
    rows = [
        ["02/02/2026", "Chef Prod", "Port des lunettes lors du meulage", "RC-2026-01 bavures : vigilance ébavurage", "120 Pcs à expédier vendredi", "Ajout loupe au poste ébavurage", "Resp. QSE", "03/02"],
        ["09/02/2026", "Chef Prod", "Rangement des câbles au sol", "0 Réclamation cette semaine", "150 Pcs affaire ALFA", "Nettoyage bac arrosage MAC-02", "J. MARTIN", "10/02"],
        ["[Date]", "[Animateur]", "[Sécurité]", "[Qualité]", "[Production]", "[Action retenue]", "[Nom]", "[Date]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1100, 1200, 1800, 2000, 1600, 1500, 1000, 1000])
    add_next_steps_box(doc, [
        "Afficher le compte-rendu au tableau atelier.",
        "Archiver sous 04_RH_SAVOIR_GED_IT/FLASH_INFO/."
    ])
    save_doc(doc, "OUTIL_24_REUNION_FLASH_COMMUNICATION.docx")

# 7. OUTIL 25: ARBORESCENCE GED SIMPLIFIEE
def make_outil_25():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 25", "Plan de Classement & Arborescence GED Simplifiée", "Clause ISO 9001:2015 - 7.5 - Question Q25")
    add_consultant_box(doc, "Normalisez le classement de vos fichiers sur votre serveur ou Cloud ! Tout document (plan, procédure, PV) doit pouvoir être retrouvé par n'importe quel collaborateur en moins de 30 secondes.", [
        ("1. Structure en 4 Dossiers Clés", "01_DIRECTION_STRATEGIE / 02_VENTES_MARGES_ACHATS / 03_OPERATIONS_PRODUCTION / 04_RH_SAVOIR_GED_IT."),
        ("2. Règle de Nommage Standard", "CodeOutil_NomDocument_YYYYMMDD_vX.ext (ex: `OUTIL_01A_SWOT_20260215_v2.docx`)."),
        ("3. Droits d'Accès & Gestion des Indices", "Seul le pilote du processus a le droit de modifier les modèles Indice Officiel."),
        ("4. Archivage Automatique des Versions", "Déplacement des anciennes versions sous le sous-dossier `_ARCHIVES/` pour éviter toute confusion.")
    ])
    add_why_box(doc, [
        "Gain de temps considérable (< 30 secondes pour retrouver tout fichier).",
        "Suppression définitive du risque d'utiliser une version obsolète.",
        "Preuve de maîtrise des informations documentées exigée par l'ISO 9001 (Clause 7.5)."
    ], [
        "Utilisation d'un plan de fabrication périmé entraînant la mise au rebut du lot.",
        "Fichiers éparpillés sur les bureaux d'ordinateurs individuels.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 7.5)."
    ])
    add_interconnections_box(doc, [
        "Directives Cabinet Delacour : Structure en 4 répertoires standard."
    ], [
        "OUTIL A4 (5S Numérique) : Propreté des dossiers et temps de recherche < 30s.",
        "OUTIL 26 (Dashboard KPIs) : Centralisation sécurisée des données."
    ])
    add_guide_box(doc, [
        "Créer les 4 dossiers racines sur le serveur partagé.",
        "Diffuser la règle de nommage standard à tout le personnel.",
        "Purger les anciens doublons et les classer sous `_ARCHIVES/`.",
        "Vérifier la retrouvabilité lors des audits internes."
    ])
    doc.add_page_break()
    add_section_header(doc, "PLAN DE CLASSEMENT STANDARD DE L'ARBORESCENCE GED")
    headers = ["Dossier Racine GED", "Sous-Dossier Thématique", "Contenu & Fichiers Autorisés", "Pilote Responsable du Dossier", "Règles de Nommage", "Droits d'Accès"]
    rows = [
        ["01_DIRECTION_STRATEGIE/", "POLITIQUE_ET_OBJECTIFS/", "SWOT, PESTEL, Politique, PV Revue", "Directeur Général", "OUTIL_XX_Description_Date.ext", "Lecture Tous / Modif DG"],
        ["02_VENTES_MARGES_ACHATS/", "DEVIS_ET_FOURNISSEURS/", "Revue Devis, Registre Fournisseurs, NPS", "Resp. Commercial / Achats", "OUTIL_XX_Description_Date.ext", "Lecture Tous / Modif Com"],
        ["03_OPERATIONS_PRODUCTION/", "ATELIER_ET_QUALITE/", "Plans 3D, Gammes, Traçabilité, PV, FNC", "Resp. Prod / QSE", "OUTIL_XX_Description_Date.ext", "Lecture Tous / Modif Prod"],
        ["04_RH_SAVOIR_GED_IT/", "RH_ET_SYSTEME/", "Organigramme, RACI, Compétences, Audits", "Resp. RH / QSE", "OUTIL_XX_Description_Date.ext", "Lecture Tous / Modif RH"],
        ["[Dossier Racine]", "[Sous-Dossier]", "[Contenu autorisé]", "[Pilote]", "[Règle de nommage]", "[Droits]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[2000, 2000, 2400, 1400, 1400, 1000])
    add_next_steps_box(doc, [
        "Appliquer le plan sur le serveur d'entreprise.",
        "Archiver la charte sous 04_RH_SAVOIR_GED_IT/CHARTE_GED.pdf."
    ])
    save_doc(doc, "OUTIL_25_ARBORESCENCE_GED_SIMPLIFIEE.docx")

# 8. OUTIL 26: DASHBOARD KPIS AUTOMATISE
def make_outil_26():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 26", "Spécifications & Trame de Dashboard KPIs Automatisé", "Clause ISO 9001:2015 - 9.1.3 - Question Q26")
    add_consultant_box(doc, "Supprimez la saisie manuelle fastidieuse des tableaux de bord ! Connectez vos KPIs directement aux données d'origine (Excel dynamique, PowerBI ou ERP) pour un pilotage factuel automatisé.", [
        ("1. Automatisation des Flux de Données", "Liaison directe avec l'ERP ou la base de données sans resaisie manuelle."),
        ("2. Les 5 KPIs Incontournables", "CA & Marge Brute / Taux de Service OTD / Taux de pièces conformes / Score NPS / Taux de résolutions FNC."),
        ("3. Alertes Visuelles Automatiques", "Code couleur dynamique (Vert = Objectif atteint / Orange = Vigilance / Rouge = Action requise)."),
        ("4. Agilité Décisionnelle", "Dashboard accessible en un clic pour arbitrage en Revue de Direction.")
    ])
    add_why_box(doc, [
        "Gain de temps précieux (zéro heure perdue à construire des tableaux Excel manuels).",
        "Fiabilité totale des chiffres présentés à la direction.",
        "Preuve d'analyse et d'évaluation automatisées exigée par l'ISO 9001 (Clause 9.1.3)."
    ], [
        "Erreurs de saisie manuelle faussant l'analyse de la marge réelle.",
        "Tableaux de bord jamais mis à jour faute de temps.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 9.1.3)."
    ])
    add_interconnections_box(doc, [
        "OUTIL 03, 08, 09, 10, 17, 19 : Extraction automatique des données d'origine."
    ], [
        "OUTIL 07 (Revue Direction) : Consolidation du bilan de performance.",
        "OUTIL A2B (CODIR) : Arbitrages hebdomadaires basés sur des données réelles."
    ])
    add_guide_box(doc, [
        "Définir les 5 KPIs stratégiques et leur source de données d'origine.",
        "Configurer les requêtes d'extraction automatique (Excel / PowerBI).",
        "Paramétrer les seuils d'alerte couleur Vert / Orange / Rouge.",
        "Revoir le dashboard lors du Comité de Direction mensuel."
    ])
    doc.add_page_break()
    add_section_header(doc, "TRAME ET SPÉCIFICATIONS DES KPIS AUTOMATISÉS DU DASHBOARD")
    headers = ["Nom de l'Indicateur (KPI)", "Processus Rattaché", "Source de Donnée Automatique", "Formule de Calcul Exacte", "Fréquence MÀJ", "Seuil Vert", "Seuil Rouge", "Responsable"]
    rows = [
        ["1. Marge Brute Globale (%)", "Pilotage / Direction", "Export ERP Ventes vs Coûts", "(CA HT - Coûts Directs) / CA HT", "Mensuelle", "≥ 35 %", "< 30 %", "RAF / DG"],
        ["2. Taux de Service OTD (%)", "Commercial & Logistics", "Système de Suivi Livraisons", "(Nb livraisons à date / Total) x 100", "Hebdo", "≥ 95 %", "< 90 %", "Resp. Logistique"],
        ["3. Conformité Produit (%)", "Fabrication & Atelier", "Registre d'Autocontrôle Outil 17", "(Nb pièces OK 1er coup / Total) x 100", "Hebdo", "≥ 98 %", "< 95 %", "Chef Prod"],
        ["4. NPS Satisfaction Client", "Commercial / Qualité", "Baromètre NPS Outil 10", "% Promoteurs - % Détracteurs", "Trimestrielle", "≥ +50", "< +20", "Resp. Commercial"],
        ["5. Taux Résolution FNC < 30j", "Qualité & Amélioration", "Registre FNC Outil 19", "(Nb FNC closes < 30j / Total) x 100", "Mensuelle", "≥ 90 %", "< 75 %", "Resp. QSE"],
        ["[Nom KPI]", "[Processus]", "[Source Données]", "[Formule de calcul]", "[Fréquence]", "[Vert]", "[Rouge]", "[Nom]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1800, 1400, 1600, 2000, 1000, 800, 800, 800])
    add_next_steps_box(doc, [
        "Diffuser le tableau de bord automatisé au Comité de Direction.",
        "Archiver les captures sous 04_RH_SAVOIR_GED_IT/DASHBOARD_KPIS/."
    ])
    save_doc(doc, "OUTIL_26_DASHBOARD_KPIS_AUTOMATISE.docx")

# 9. OUTIL 27: PLANNING & TRAME AUDIT INTERNE
def make_outil_27():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 27", "Programme Annuel & Trame d'Audit Interne SMQ", "Clause ISO 9001:2015 - 9.2 - Question Q27")
    add_consultant_box(doc, "Réalisez un audit interne rigoureux une fois par an pour vérifier la robustesse de votre organisation avant l'audit de certification ISO 9001. L'audit interne est votre meilleur outil de détection d'opportunités d'amélioration !", [
        ("1. Programme Annuel d'Audit", "Planning d'intervention couvrant l'ensemble des clauses ISO 9001 et des processus métiers."),
        ("2. Équipe d'Auditeurs Indépendants", "Auditeurs internes formés et indépendants du processus audité pour garantir l'impartialité."),
        ("3. Trame de Rapport d'Audit", "Constats factuels classés en Points Forts, Pistes de Progrès, Non-Conformités Mineures et Majeures."),
        ("4. Plan d'Action d'Audit Interne", "Actions correctives associées à chaque écart constaté avec suivi d'efficacité.")
    ])
    add_why_box(doc, [
        "Garantie de réussite à 100% de l'audit de certification ISO 9001.",
        "Détection et correction des failles avant qu'elles n'impactent les clients.",
        "Exigence légitime et obligatoire de l'ISO 9001 (Clause 9.2)."
    ], [
        "Refus de certification ISO 9001 pour absence d'audits internes.",
        "Surprise désagréable lors de l'audit officiel découvrant des défaillances majeures.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 9.2)."
    ])
    add_interconnections_box(doc, [
        "OUTIL 01A à 26 : L'ensemble du SMQ et des procédures de l'entreprise."
    ], [
        "OUTIL A5 (Cycle PDCA) : Suivi des plans d'actions correctives.",
        "OUTIL A3 (Grille Pareto 80/20) : Priorisation des chantiers d'amélioration."
    ])
    add_guide_box(doc, [
        "Se réunir chaque lundi à 8h00 debout devant le tableau.",
        "Passer en revue les 3 points en 5 minutes chrono.",
        "Noter les 2 actions prioritaires sur le tableau.",
        "Effacer et mettre à jour le tableau chaque semaine."
    ])
    doc.add_page_break()
    add_section_header(doc, "COMPTE-RENDU FLASH ET RELEVÉ DE DÉCISIONS HEBDOMADAIRE")
    headers = ["Date Réunion", "Animateur", "Point Sécurité abordé", "Point Qualité & Réclamations", "Objectifs Prod Semaine", "Action Retenue", "Responsable", "Échéance"]
    rows = [
        ["02/02/2026", "Chef Prod", "Port des lunettes lors du meulage", "RC-2026-01 bavures : vigilance ébavurage", "120 Pcs à expédier vendredi", "Ajout loupe au poste ébavurage", "Resp. QSE", "03/02"],
        ["09/02/2026", "Chef Prod", "Rangement des câbles au sol", "0 Réclamation cette semaine", "150 Pcs affaire ALFA", "Nettoyage bac arrosage MAC-02", "J. MARTIN", "10/02"],
        ["[Date]", "[Animateur]", "[Sécurité]", "[Qualité]", "[Production]", "[Action retenue]", "[Nom]", "[Date]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1100, 1200, 1800, 2000, 1600, 1500, 1000, 1000])
    add_next_steps_box(doc, [
        "Afficher le compte-rendu au tableau atelier.",
        "Archiver sous 04_RH_SAVOIR_GED_IT/FLASH_INFO/."
    ])
    save_doc(doc, "OUTIL_24_REUNION_FLASH_COMMUNICATION.docx")

# 7. OUTIL 25: ARBORESCENCE GED SIMPLIFIEE
def make_outil_25():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 25", "Plan de Classement & Arborescence GED Simplifiée", "Clause ISO 9001:2015 - 7.5 - Question Q25")
    add_consultant_box(doc, "Normalisez le classement de vos fichiers sur votre serveur ou Cloud ! Tout document (plan, procédure, PV) doit pouvoir être retrouvé par n'importe quel collaborateur en moins de 30 secondes.", [
        ("1. Structure en 4 Dossiers Clés", "01_DIRECTION_STRATEGIE / 02_VENTES_MARGES_ACHATS / 03_OPERATIONS_PRODUCTION / 04_RH_SAVOIR_GED_IT."),
        ("2. Règle de Nommage Standard", "CodeOutil_NomDocument_YYYYMMDD_vX.ext (ex: `OUTIL_01A_SWOT_20260215_v2.docx`)."),
        ("3. Droits d'Accès & Gestion des Indices", "Seul le pilote du processus a le droit de modifier les modèles Indice Officiel."),
        ("4. Archivage Automatique des Versions", "Déplacement des anciennes versions sous le sous-dossier `_ARCHIVES/` pour éviter toute confusion.")
    ])
    add_why_box(doc, [
        "Gain de temps considérable (< 30 secondes pour retrouver tout fichier).",
        "Suppression définitive du risque d'utiliser une version obsolète.",
        "Preuve de maîtrise des informations documentées exigée par l'ISO 9001 (Clause 7.5)."
    ], [
        "Utilisation d'un plan de fabrication périmé entraînant la mise au rebut du lot.",
        "Fichiers éparpillés sur les bureaux d'ordinateurs individuels.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 7.5)."
    ])
    add_guide_box(doc, [
        "Créer les 4 dossiers racines sur le serveur partagé.",
        "Diffuser la règle de nommage standard à tout le personnel.",
        "Purger les anciens doublons et les classer sous `_ARCHIVES/`.",
        "Vérifier la retrouvabilité lors des audits internes."
    ])
    doc.add_page_break()
    add_section_header(doc, "PLAN DE CLASSEMENT STANDARD DE L'ARBORESCENCE GED")
    headers = ["Dossier Racine GED", "Sous-Dossier Thématique", "Contenu & Fichiers Autorisés", "Pilote Responsable du Dossier", "Règles de Nommage", "Droits d'Accès"]
    rows = [
        ["01_DIRECTION_STRATEGIE/", "POLITIQUE_ET_OBJECTIFS/", "SWOT, PESTEL, Politique, PV Revue", "Directeur Général", "OUTIL_XX_Description_Date.ext", "Lecture Tous / Modif DG"],
        ["02_VENTES_MARGES_ACHATS/", "DEVIS_ET_FOURNISSEURS/", "Revue Devis, Registre Fournisseurs, NPS", "Resp. Commercial / Achats", "OUTIL_XX_Description_Date.ext", "Lecture Tous / Modif Com"],
        ["03_OPERATIONS_PRODUCTION/", "ATELIER_ET_QUALITE/", "Plans 3D, Gammes, Traçabilité, PV, FNC", "Resp. Prod / QSE", "OUTIL_XX_Description_Date.ext", "Lecture Tous / Modif Prod"],
        ["04_RH_SAVOIR_GED_IT/", "RH_ET_SYSTEME/", "Organigramme, RACI, Compétences, Audits", "Resp. RH / QSE", "OUTIL_XX_Description_Date.ext", "Lecture Tous / Modif RH"],
        ["[Dossier Racine]", "[Sous-Dossier]", "[Contenu autorisé]", "[Pilote]", "[Règle de nommage]", "[Droits]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[2000, 2000, 2400, 1400, 1400, 1000])
    add_next_steps_box(doc, [
        "Appliquer le plan sur le serveur d'entreprise.",
        "Archiver la charte sous 04_RH_SAVOIR_GED_IT/CHARTE_GED.pdf."
    ])
    save_doc(doc, "OUTIL_25_ARBORESCENCE_GED_SIMPLIFIEE.docx")

# 8. OUTIL 26: DASHBOARD KPIS AUTOMATISE
def make_outil_26():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 26", "Spécifications & Trame de Dashboard KPIs Automatisé", "Clause ISO 9001:2015 - 9.1.3 - Question Q26")
    add_consultant_box(doc, "Supprimez la saisie manuelle fastidieuse des tableaux de bord ! Connectez vos KPIs directement aux données d'origine (Excel dynamique, PowerBI ou ERP) pour un pilotage factuel automatisé.", [
        ("1. Automatisation des Flux de Données", "Liaison directe avec l'ERP ou la base de données sans resaisie manuelle."),
        ("2. Les 5 KPIs Incontournables", "CA & Marge Brute / Taux de Service OTD / Taux de pièces conformes / Score NPS / Taux de résolutions FNC."),
        ("3. Alertes Visuelles Automatiques", "Code couleur dynamique (Vert = Objectif atteint / Orange = Vigilance / Rouge = Action requise)."),
        ("4. Agilité Décisionnelle", "Dashboard accessible en un clic pour arbitrage en Revue de Direction.")
    ])
    add_why_box(doc, [
        "Gain de temps précieux (zéro heure perdue à construire des tableaux Excel manuels).",
        "Fiabilité totale des chiffres présentés à la direction.",
        "Preuve d'analyse et d'évaluation automatisées exigée par l'ISO 9001 (Clause 9.1.3)."
    ], [
        "Erreurs de saisie manuelle faussant l'analyse de la marge réelle.",
        "Tableaux de bord jamais mis à jour faute de temps.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 9.1.3)."
    ])
    add_financial_roi_box(doc,
        "Gain net : Économie de temps de saisie administrative et détection immédiate des baisses de performance.",
        "Pertes financières liées au manque de réactivité face aux écarts d'exploitation."
    )
    add_interconnections_box(doc, [
        "OUTIL 03, 08, 09, 10, 17, 19 : Consolidation automatique de l'ensemble des données SMQ."
    ], [
        "OUTIL 07 (Revue Direction) : Bilan consolidé de performance.",
        "OUTIL A2B (CODIR) : Prise de décision hebdomadaire basée sur la data."
    ])
    add_guide_box(doc, [
        "Définir les 5 KPIs stratégiques et leur source de données d'origine.",
        "Configurer les requêtes d'extraction automatique (Excel / PowerBI).",
        "Paramétrer les seuils d'alerte couleur Vert / Orange / Rouge.",
        "Revoir le dashboard lors du Comité de Direction mensuel."
    ])
    doc.add_page_break()
    add_section_header(doc, "TRAME ET SPÉCIFICATIONS DES KPIS AUTOMATISÉS DU DASHBOARD")
    headers = ["Nom de l'Indicateur (KPI)", "Processus Rattaché", "Source de Donnée Automatique", "Formule de Calcul Exacte", "Fréquence MÀJ", "Seuil Vert", "Seuil Rouge", "Responsable"]
    rows = [
        ["1. Marge Brute Globale (%)", "Pilotage / Direction", "Export ERP Ventes vs Coûts", "(CA HT - Coûts Directs) / CA HT", "Mensuelle", "≥ Seuil Cible", "< Seuil Alerte", "RAF / DG"],
        ["2. Taux de Service OTD (%)", "Commercial & Logistics", "Système de Suivi Livraisons", "(Nb livraisons à date / Total) x 100", "Hebdo", "≥ 95 %", "< 90 %", "Resp. Logistique"],
        ["3. Conformité Produit (%)", "Fabrication & Atelier", "Registre d'Autocontrôle Outil 17", "(Nb pièces OK 1er coup / Total) x 100", "Hebdo", "≥ 98 %", "< 95 %", "Chef Prod"],
        ["4. NPS Satisfaction Client", "Commercial / Qualité", "Baromètre NPS Outil 10", "% Promoteurs - % Détracteurs", "Trimestrielle", "≥ Cible NPS", "< Alerte NPS", "Resp. Commercial"],
        ["5. Taux Résolution FNC < 30j", "Qualité & Amélioration", "Registre FNC Outil 19", "(Nb FNC closes < 30j / Total) x 100", "Mensuelle", "≥ 90 %", "< 75 %", "Resp. QSE"],
        ["[Nom KPI]", "[Processus]", "[Source Données]", "[Formule de calcul]", "[Fréquence]", "[Vert]", "[Rouge]", "[Nom]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1800, 1400, 1600, 2000, 1000, 800, 800, 800])
    add_next_steps_box(doc, [
        "Diffuser le tableau de bord automatisé au Comité de Direction.",
        "Archiver les captures sous 04_RH_SAVOIR_GED_IT/DASHBOARD_KPIS/."
    ])
    save_doc(doc, "OUTIL_26_DASHBOARD_KPIS_AUTOMATISE.docx")

# 9. OUTIL 27: PLANNING & TRAME AUDIT INTERNE
def make_outil_27():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 27", "Programme Annuel & Trame d'Audit Interne SMQ", "Clause ISO 9001:2015 - 9.2 - Question Q27")
    add_consultant_box(doc, "Réalisez un audit interne rigoureux une fois par an pour vérifier la robustesse de votre organisation avant l'audit de certification ISO 9001. L'audit interne est votre meilleur outil de détection d'opportunités d'amélioration !", [
        ("1. Programme Annuel d'Audit", "Planning d'intervention couvrant l'ensemble des clauses ISO 9001 et des processus métiers."),
        ("2. Équipe d'Auditeurs Indépendants", "Auditeurs internes formés et indépendants du processus audité pour garantir l'impartialité."),
        ("3. Trame de Rapport d'Audit", "Constats factuels classés en Points Forts, Pistes de Progrès, Non-Conformités Mineures et Majeures."),
        ("4. Plan d'Action d'Audit Interne", "Actions correctives associées à chaque écart constaté avec suivi d'efficacité.")
    ])
    add_why_box(doc, [
        "Garantie de réussite à 100% de l'audit de certification ISO 9001.",
        "Détection et correction des failles avant qu'elles n'impactent les clients.",
        "Exigence légitime et obligatoire de l'ISO 9001 (Clause 9.2)."
    ], [
        "Refus de certification ISO 9001 pour absence d'audits internes.",
        "Surprise désagréable lors de l'audit officiel découvrant des défaillances majeures.",
        "Non-conformité majeure d'audit ISO 9001 (Clause 9.2)."
    ])
    add_financial_roi_box(doc,
        "Protection du certificat ISO 9001 conditionnant le Chiffre d'Affaires Grands Comptes.",
        "Évite le coût financier de sur-audit de rattrapage en cas d'échec."
    )
    add_interconnections_box(doc, [
        "OUTIL 01A à 26 : L'ensemble du SMQ et des procédures de l'entreprise."
    ], [
        "OUTIL A5 (Cycle PDCA) : Suivi des plans d'actions correctives.",
        "OUTIL A3 (Grille Pareto 80/20) : Priorisation des chantiers d'amélioration."
    ])
    add_guide_box(doc, [
        "Établir le programme annuel d'audit interne.",
        "Rédiger le plan d'audit et la grille de questionnement.",
        "Mener les entretiens et rédiger le rapport d'audit.",
        "Présenter les conclusions en Revue de Direction."
    ])
    doc.add_page_break()
    add_section_header(doc, "PROGRAMME ANNUEL ET REGISTRE DES AUDITS INTERNES DU SMQ")
    headers = ["N° Audit", "Processus / Clause Audité", "Période Planifiée", "Auditeur Désigné", "Points Forts Décelés", "Écarts / Non-Conformités", "Plan d'Action Correctif", "Statut Audit"]
    rows = [
        ["AUD-2026-01", "Processus Direction & Management (4.1 à 6.2)", "Mars 2026", "Auditeur Externe / QSE", "Engagements clairs, Objectifs SMART chiffrés", "0 NC Majeure / 1 Piste de progrès", "Optimiser le rituel Réunion Flash", "Planifié"],
        ["AUD-2026-02", "Processus Ventes & Achats (8.2 & 8.4)", "Mai 2026", "Auditeur Interne Formé", "Revue devis Outil 08 rigoureuse", "1 NC Mineure (Fournisseur non noté)", "Renseigner l'Outil 09 sous 15j", "Planifié"],
        ["AUD-2026-03", "Processus Production & Qualité (8.5 & 8.7)", "Septembre 2026", "Auditeur Externe / QSE", "Traçabilité 3.1 parfaite sur dossiers lots", "1 NC Mineure (Zone rouge encombrée)", "Vider zone quarantaine hebdo", "Planifié"],
        ["[N° Audit]", "[Processus / Clause]", "[Période]", "[Auditeur]", "[Points Forts]", "[Écarts / NC]", "[Plan d'action]", "[Statut]"]
    ]
    format_word_table(doc, headers, rows, col_widths_dxa=[1100, 2000, 1100, 1400, 1800, 1800, 1000, 1000])
    add_next_steps_box(doc, [
        "Présenter le rapport d'audit en Revue de Direction.",
        "Archiver sous 04_RH_SAVOIR_GED_IT/RAPPORT_AUDIT_INTERNE_2026.pdf."
    ])
    save_doc(doc, "OUTIL_27_PLANNING_TRAME_AUDIT_INTERNE.docx")

# RUN ALL BUILDERS FOR SEQUENCE 4
make_start_here_seq4()
make_outil_20()
make_outil_21()
make_outil_22()
make_outil_23()
make_outil_24()
make_outil_25()
make_outil_26()
make_outil_27()

print("Successfully generated all Sequence 4 Word (.docx) documents according to guidelines!")
