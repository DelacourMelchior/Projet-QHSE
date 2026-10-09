import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

out_word_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/outils_qualite_word/sequence_1"
os.makedirs(out_word_dir, exist_ok=True)

DARK_GREEN = RGBColor(21, 40, 34)       # #152822
LIGHT_GREEN = RGBColor(74, 108, 92)     # #4A6C5C
GOLD = RGBColor(197, 160, 101)          # #C5A065
WHITE = RGBColor(255, 255, 255)
GREEN_TEXT = RGBColor(27, 94, 32)       # #1B5E20
RED_TEXT = RGBColor(183, 28, 28)        # #B71C1C
MUTED_TEXT = RGBColor(100, 110, 105)

CREAM_BG = "F9F9F7"
WHY_BG = "FDFBF7"
THEMES_BG = "F7F9F8"

def set_cell_background(cell, fill_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_border(cell, **kwargs):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = 'w:{}'.format(edge)
            element = OxmlElement(tag)
            element.set(qn('w:val'), edge_data.get('val', 'single'))
            element.set(qn('w:sz'), str(edge_data.get('sz', 4)))
            element.set(qn('w:space'), '0')
            element.set(qn('w:color'), edge_data.get('color', 'auto'))
            tcBorders.append(element)
    tcPr.append(tcBorders)

def create_base_document():
    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(0.65)
        section.bottom_margin = Inches(0.65)
        section.left_margin = Inches(0.7)
        section.right_margin = Inches(0.7)
    return doc

def add_header_brand(doc, tool_code, tool_title, clause_q_text):
    tbl = doc.add_table(rows=1, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    c_left = tbl.cell(0, 0)
    c_left.width = Inches(4.5)
    p_left = c_left.paragraphs[0]
    p_left.paragraph_format.space_after = Pt(2)
    r1 = p_left.add_run("CABINET DELACOUR\n")
    r1.font.name = "Georgia"
    r1.font.size = Pt(16)
    r1.font.bold = True
    r1.font.color.rgb = DARK_GREEN
    
    r2 = p_left.add_run("STRATÉGIE & PERFORMANCE QHSE - ISO 9001")
    r2.font.name = "Calibri"
    r2.font.size = Pt(8.5)
    r2.font.color.rgb = GOLD
    r2.font.bold = True
    
    c_right = tbl.cell(0, 1)
    c_right.width = Inches(2.6)
    set_cell_background(c_right, "152822")
    set_cell_margins(c_right, top=100, bottom=100, left=140, right=140)
    p_right = c_right.paragraphs[0]
    p_right.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_right.paragraph_format.space_after = Pt(0)
    r_tag = p_right.add_run(f"SÉQUENCE 1 - {tool_code}\n{clause_q_text}")
    r_tag.font.name = "Calibri"
    r_tag.font.size = Pt(9.5)
    r_tag.font.bold = True
    r_tag.font.color.rgb = RGBColor(240, 234, 214)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    
    tbl_title = doc.add_table(rows=1, cols=1)
    tbl_title.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_t = tbl_title.cell(0, 0)
    c_t.width = Inches(7.1)
    set_cell_background(c_t, CREAM_BG)
    set_cell_margins(c_t, top=140, bottom=140, left=180, right=180)
    set_cell_border(c_t, left={'sz': 24, 'val': 'single', 'color': 'C5A065'},
                          top={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                          bottom={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                          right={'sz': 4, 'val': 'single', 'color': 'E2DCCC'})
    
    p_title = c_t.paragraphs[0]
    p_title.paragraph_format.space_after = Pt(2)
    r_cl = p_title.add_run(f"{clause_q_text}\n")
    r_cl.font.name = "Calibri"
    r_cl.font.size = Pt(9.5)
    r_cl.font.bold = True
    r_cl.font.color.rgb = GOLD
    
    r_main_t = p_title.add_run(tool_title)
    r_main_t.font.name = "Georgia"
    r_main_t.font.size = Pt(17)
    r_main_t.font.bold = True
    r_main_t.font.color.rgb = DARK_GREEN
    
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

def add_consultant_box(doc, advice_text, themes_tuples):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_box = tbl.cell(0, 0)
    c_box.width = Inches(7.1)
    set_cell_background(c_box, THEMES_BG)
    set_cell_margins(c_box, top=140, bottom=140, left=180, right=180)
    set_cell_border(c_box, left={'sz': 24, 'val': 'single', 'color': '152822'},
                           top={'sz': 4, 'val': 'single', 'color': '4A6C5C'},
                           bottom={'sz': 4, 'val': 'single', 'color': '4A6C5C'},
                           right={'sz': 4, 'val': 'single', 'color': '4A6C5C'})
    
    p0 = c_box.paragraphs[0]
    p0.paragraph_format.space_after = Pt(4)
    r0 = p0.add_run("🧠 CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER\n")
    r0.font.name = "Georgia"
    r0.font.size = Pt(11.5)
    r0.font.bold = True
    r0.font.color.rgb = DARK_GREEN
    
    p_adv = c_box.add_paragraph()
    p_adv.paragraph_format.space_after = Pt(8)
    r_adv_lbl = p_adv.add_run("💡 Posture & Animation : ")
    r_adv_lbl.font.bold = True
    r_adv_lbl.font.size = Pt(9)
    r_adv_lbl.font.color.rgb = DARK_GREEN
    r_adv_txt = p_adv.add_run(advice_text)
    r_adv_txt.font.italic = True
    r_adv_txt.font.size = Pt(9)
    r_adv_txt.font.color.rgb = DARK_GREEN
    
    tbl_themes = c_box.add_table(rows=2, cols=2)
    tbl_themes.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    while len(themes_tuples) < 4:
        themes_tuples.append(("", ""))
        
    t0_title, t0_text = themes_tuples[0]
    t1_title, t1_text = themes_tuples[1]
    t2_title, t2_text = themes_tuples[2]
    t3_title, t3_text = themes_tuples[3]
    
    t_data = [
        (tbl_themes.cell(0, 0), t0_title, t0_text),
        (tbl_themes.cell(0, 1), t1_title, t1_text),
        (tbl_themes.cell(1, 0), t2_title, t2_text),
        (tbl_themes.cell(1, 1), t3_title, t3_text)
    ]
    
    for cell, t_head, t_body in t_data:
        cell.width = Inches(3.35)
        set_cell_background(cell, "FFFFFF")
        set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
        set_cell_border(cell, top={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                              bottom={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                              left={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                              right={'sz': 4, 'val': 'single', 'color': 'E2DCCC'})
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(2)
        if t_head:
            r_th = p.add_run(t_head + "\n")
            r_th.font.name = "Georgia"
            r_th.font.bold = True
            r_th.font.size = Pt(8.5)
            r_th.font.color.rgb = DARK_GREEN
            r_tb = p.add_run(t_body)
            r_tb.font.name = "Calibri"
            r_tb.font.size = Pt(8)
            r_tb.font.color.rgb = DARK_GREEN

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

def add_why_box(doc, gains_list, risques_list):
    tbl = doc.add_table(rows=1, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    c1 = tbl.cell(0, 0)
    c1.width = Inches(3.45)
    set_cell_background(c1, WHY_BG)
    set_cell_margins(c1, top=120, bottom=120, left=150, right=150)
    set_cell_border(c1, top={'sz': 8, 'val': 'single', 'color': 'C5A065'},
                         bottom={'sz': 8, 'val': 'single', 'color': 'C5A065'},
                         left={'sz': 8, 'val': 'single', 'color': 'C5A065'},
                         right={'sz': 8, 'val': 'single', 'color': 'C5A065'})
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(4)
    r1 = p1.add_run("🟢 Ce que vous gagnez à l'utiliser :\n")
    r1.font.name = "Georgia"
    r1.font.bold = True
    r1.font.size = Pt(9.5)
    r1.font.color.rgb = GREEN_TEXT
    for g in gains_list:
        p = c1.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run("- " + g)
        r.font.name = "Calibri"
        r.font.size = Pt(8.5)
        
    c2 = tbl.cell(0, 1)
    c2.width = Inches(3.45)
    set_cell_background(c2, WHY_BG)
    set_cell_margins(c2, top=120, bottom=120, left=150, right=150)
    set_cell_border(c2, top={'sz': 8, 'val': 'single', 'color': 'C5A065'},
                         bottom={'sz': 8, 'val': 'single', 'color': 'C5A065'},
                         left={'sz': 8, 'val': 'single', 'color': 'C5A065'},
                         right={'sz': 8, 'val': 'single', 'color': 'C5A065'})
    p2 = c2.paragraphs[0]
    p2.paragraph_format.space_after = Pt(4)
    r2 = p2.add_run("🔴 Ce que vous risquez sans cet outil :\n")
    r2.font.name = "Georgia"
    r2.font.bold = True
    r2.font.size = Pt(9.5)
    r2.font.color.rgb = RED_TEXT
    for r_item in risques_list:
        p = c2.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run("- " + r_item)
        r.font.name = "Calibri"
        r.font.size = Pt(8.5)
        
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

def add_guide_box(doc, steps_list):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(7.1)
    set_cell_background(cell, "FFFFFF")
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
    set_cell_border(cell, left={'sz': 20, 'val': 'single', 'color': '152822'},
                          top={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                          bottom={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                          right={'sz': 4, 'val': 'single', 'color': 'E2DCCC'})
    
    p0 = cell.paragraphs[0]
    p0.paragraph_format.space_after = Pt(4)
    r0 = p0.add_run("📘 GUIDE DE REMPLISSAGE PAS À PAS (4 ÉTAPES)\n")
    r0.font.name = "Georgia"
    r0.font.size = Pt(11)
    r0.font.bold = True
    r0.font.color.rgb = DARK_GREEN
    
    for idx, step in enumerate(steps_list, 1):
        p = cell.add_paragraph()
        p.paragraph_format.space_after = Pt(3)
        r_num = p.add_run(f"Étape {idx} : ")
        r_num.font.bold = True
        r_num.font.size = Pt(9)
        r_num.font.color.rgb = DARK_GREEN
        r_txt = p.add_run(step)
        r_txt.font.name = "Calibri"
        r_txt.font.size = Pt(9)
        
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

def add_next_steps_box(doc, next_list):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(7.1)
    set_cell_background(cell, CREAM_BG)
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
    set_cell_border(cell, left={'sz': 24, 'val': 'single', 'color': '152822'},
                          top={'sz': 8, 'val': 'single', 'color': 'C5A065'},
                          bottom={'sz': 8, 'val': 'single', 'color': 'C5A065'},
                          right={'sz': 8, 'val': 'single', 'color': 'C5A065'})
    
    p0 = cell.paragraphs[0]
    p0.paragraph_format.space_after = Pt(4)
    r0 = p0.add_run("🚀 QUE FAIRE UNE FOIS CET OUTIL COMPLÉTÉ ?\n")
    r0.font.name = "Georgia"
    r0.font.size = Pt(11)
    r0.font.bold = True
    r0.font.color.rgb = DARK_GREEN
    
    for n in next_list:
        p = cell.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run("- " + n)
        r.font.name = "Calibri"
        r.font.size = Pt(9)
        r.font.color.rgb = DARK_GREEN
        
    doc.add_paragraph().paragraph_format.space_after = Pt(12)

def format_word_table(doc, headers, rows_data, col_widths=None):
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    hdr_cells = tbl.rows[0].cells
    for i, h_text in enumerate(headers):
        hdr_cells[i].text = h_text
        if col_widths and i < len(col_widths):
            hdr_cells[i].width = Inches(col_widths[i])
        set_cell_background(hdr_cells[i], "152822")
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=100, right=100)
        for p in hdr_cells[i].paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.name = "Calibri"
                r.font.size = Pt(8.5)
                r.font.bold = True
                r.font.color.rgb = WHITE
                
    for r_idx, row_data in enumerate(rows_data):
        row_cells = tbl.add_row().cells
        bg_hex = "F9F9F7" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            row_cells[c_idx].text = val
            if col_widths and c_idx < len(col_widths):
                row_cells[c_idx].width = Inches(col_widths[c_idx])
            set_cell_background(row_cells[c_idx], bg_hex)
            set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=100, right=100)
            for p in row_cells[c_idx].paragraphs:
                for r in p.runs:
                    r.font.name = "Calibri"
                    r.font.size = Pt(8)
                    if "[Votre" in val or "____" in val or "[Saisissez" in val:
                        r.font.italic = True
                        r.font.bold = True
                        r.font.color.rgb = GOLD
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

def add_document_footer(doc):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    r = p.add_run("Cabinet Delacour - Consultant Expert Stratégie & Performance QHSE - ISO 9001")
    r.font.name = "Calibri"
    r.font.size = Pt(8.5)
    r.font.italic = True
    r.font.color.rgb = MUTED_TEXT

# -----------------------------------------------------------------------------
# BUILDERS FOR ALL 9 DOCUMENTS
# -----------------------------------------------------------------------------

def make_start_here():
    doc = create_base_document()
    add_header_brand(doc, "NOTICE CLIENT", "Guide de Démarrage Client Autonome (Séquence 1)", "Parcours Guidé 5 Jours")
    
    add_consultant_box(doc, "Bienvenue dans votre Kit d'Outils Qualité Séquence 1. Ce guide vous permet d'avancer pas à pas de manière 100% autonome.", [
        ("1. Ouverture des Fichiers", "Ouvrez directement le fichier Word (.docx) sur votre ordinateur ou déposez-le dans Google Docs."),
        ("2. Saisie des Données PME", "Cliquez dans les zones soulignées [________] et les tableaux pour saisir vos données PME."),
        ("3. Enregistrement & Exportation", "Sauvegardez votre fichier et exportez en PDF une fois finalisé."),
        ("4. Relecture Cabinet Delacour", "Transmettez vos documents au consultant Cabinet Delacour avant l'audit ISO.")
    ])
    
    add_why_box(doc, [
        "Progression simple de 20 à 30 min par jour sans stress.",
        "Autonomie totale du dirigeant et des chefs de service.",
        "Chaque outil produit une preuve ISO 9001 incontestable."
    ], [
        "Vouloir tout remplir le même jour et abandonner par manque de temps.",
        "Remplir des données théoriques floues non mesurables."
    ])
    
    days_data = [
        ("📆 JOUR 1 : DIAGNOSTIC DU CONTEXTE (30 MIN)", "Renseignez les forces, faiblesses, opportunités et menaces de votre PME.", "Fichiers : OUTIL_01A_SWOT.docx & OUTIL_01B_PESTEL.docx"),
        ("📆 JOUR 2 : PARTIES PRENANTES STRATÉGIQUES (20 MIN)", "Identifiez les exigences de vos clients grands comptes, fournisseurs et banques.", "Fichier : OUTIL_02_PARTIES_PRENANTES.docx"),
        ("📆 JOUR 3 : ENGAGEMENT DE LA DIRECTION (20 MIN)", "Personnalisez la charte d'engagement 1 page et apposez la signature du DG.", "Fichier : OUTIL_04_POLITIQUE_QUALITE.docx"),
        ("📆 JOUR 4 : RISQUES AMDEC & OBJECTIFS SMART (30 MIN)", "Chiffrez la criticité de vos risques et fixez 1 objectif SMART par service.", "Fichiers : OUTIL_05_AMDEC_RISQUES.docx & OUTIL_06_OBJECTIFS_SMART.docx"),
        ("📆 JOUR 5 : DASHBOARD 5 KPIS & REVUE DIRECTION (20 MIN)", "Renseignez votre tableau de bord mensuel et remplissez le PV de Revue de Direction.", "Fichiers : OUTIL_03_DASHBOARD_DIRECTION.docx & OUTIL_07_REVUE_DIRECTION.docx")
    ]
    
    doc.add_heading("🚀 VOTRE PARCOURS AUTONOME EN 5 JOURS", level=2)
    for day_title, day_desc, day_files in days_data:
        tbl_d = doc.add_table(rows=1, cols=1)
        tbl_d.alignment = WD_TABLE_ALIGNMENT.CENTER
        c_d = tbl_d.cell(0, 0)
        c_d.width = Inches(7.1)
        set_cell_background(c_d, CREAM_BG)
        set_cell_margins(c_d, top=100, bottom=100, left=140, right=140)
        set_cell_border(c_d, left={'sz': 20, 'val': 'single', 'color': '152822'},
                             top={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                             bottom={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                             right={'sz': 4, 'val': 'single', 'color': 'E2DCCC'})
        p = c_d.paragraphs[0]
        r_dt = p.add_run(day_title + "\n")
        r_dt.font.name = "Georgia"
        r_dt.font.bold = True
        r_dt.font.size = Pt(10.5)
        r_dt.font.color.rgb = DARK_GREEN
        
        r_dd = p.add_run(day_desc + "\n")
        r_dd.font.name = "Calibri"
        r_dd.font.size = Pt(9)
        
        r_df = p.add_run(day_files)
        r_df.font.name = "Calibri"
        r_df.font.bold = True
        r_df.font.size = Pt(9)
        r_df.font.color.rgb = GOLD
        doc.add_paragraph().paragraph_format.space_after = Pt(4)
        
    add_next_steps_box(doc, [
        "Transmettre vos fichiers finalisés au Cabinet Delacour pour relecture.",
        "Archiver les versions signées dans votre dossier GED 01_DIRECTION_STRATEGIE/."
    ])
    add_document_footer(doc)
    doc.save(os.path.join(out_word_dir, "START_HERE_SEQUENCE_1.docx"))

def make_swot():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 01A", "Matrice SWOT Stratégique Prête à Remplir", "Clause ISO 9001:2015 - 4.1 - Question Q1")
    
    add_consultant_box(doc, "Le SWOT ne doit pas être un exercice littéraire théorique. Concentrez l'échange avec le dirigeant sur ce qui fait perdre des sous ou du temps au quotidien (faiblesses/menaces) et sur ce qui rapporte de la marge (forces/opportunités).", [
        ("1. Thématiques FORCES", "Savoir-faire technique rare, équipe expérimentée stable, parc machines récents, réactivité devis < 24h, certification ISO, proximité client."),
        ("2. Thématiques FAIBLESSES", "Goulot d'étranglement sur 1 personne (homme-clé), absence de GED, devis complexes signés à perte, coûts de non-qualité non suivis."),
        ("3. Thématiques OPPORTUNITÉS", "Exigence ISO 9001 chez les grands comptes régionaux, défaillance d'un concurrent direct, subventions régionales transition numérique."),
        ("4. Thématiques MENACES", "Hausse du prix des matières premières/énergie, pénurie de main d'œuvre qualifiée, durcissement des taxes sur les déchets industriels.")
    ])
    
    add_why_box(doc, [
        "Vision stratégique claire à 360° en 1h chrono.",
        "Protection des marges par l'élimination des faiblesses internes.",
        "Preuve N°1 exigée par l'auditeur ISO 9001 (Clause 4.1)."
    ], [
        "Navigation à vue sans anticipation des défaillances.",
        "Coûts cachés explosifs (retards, erreurs de devis).",
        "Non-conformité majeure d'audit ISO 9001."
    ])
    
    add_guide_box(doc, [
        "Constituer l'équipe d'atelier (1h) : Réunir DG, Responsable Commercial, Chef d'Atelier, QSE.",
        "Distinguer l'Interne (votre PME) vs l'Externe (le marché).",
        "Inscrire 3 à 5 éléments factuels chiffrés par quadrant.",
        "Croiser les axes pour définir 1 action concrète par point rouge."
    ])
    
    doc.add_heading("📝 LE MODÈLE COMPLÈTEMENT DÉTAILLÉ PRÊT À REMPLIR", level=2)
    
    tbl_swot = doc.add_table(rows=2, cols=2)
    tbl_swot.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    c_f = tbl_swot.cell(0, 0)
    c_f.width = Inches(3.45)
    set_cell_background(c_f, "FFFFFF")
    set_cell_margins(c_f, top=100, bottom=100, left=120, right=120)
    set_cell_border(c_f, top={'sz': 16, 'val': 'single', 'color': '2E7D32'},
                         left={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                         right={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                         bottom={'sz': 4, 'val': 'single', 'color': 'E2DCCC'})
    p_f = c_f.paragraphs[0]
    r_fh = p_f.add_run("🟢 1. FORCES (Atouts Internes)\n")
    r_fh.font.name = "Georgia"
    r_fh.font.bold = True
    r_fh.font.size = Pt(9.5)
    r_fh.font.color.rgb = RGBColor(46, 125, 50)
    f_items = [
        "- Savoir-faire technique reconnu & équipe stable (8 ans ancienneté)",
        "- Parc machines récent & disponible à 95%",
        "- Proximité client & devis transmis sous 24h",
        "- Taux de réclamation client < 0.8%",
        "- [Saisissez votre Force 1] : ______________________",
        "- [Saisissez votre Force 2] : ______________________"
    ]
    for fi in f_items:
        p = c_f.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(fi)
        r.font.name = "Calibri"
        r.font.size = Pt(8.5)
        if "[Saisissez" in fi: r.font.italic = True; r.font.bold = True; r.font.color.rgb = GOLD
        
    c_w = tbl_swot.cell(0, 1)
    c_w.width = Inches(3.45)
    set_cell_background(c_w, "FFFFFF")
    set_cell_margins(c_w, top=100, bottom=100, left=120, right=120)
    set_cell_border(c_w, top={'sz': 16, 'val': 'single', 'color': 'C62828'},
                         left={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                         right={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                         bottom={'sz': 4, 'val': 'single', 'color': 'E2DCCC'})
    p_w = c_w.paragraphs[0]
    r_wh = p_w.add_run("🔴 2. FAIBLESSES (Fragilités Internes)\n")
    r_wh.font.name = "Georgia"
    r_wh.font.bold = True
    r_wh.font.size = Pt(9.5)
    r_wh.font.color.rgb = RGBColor(198, 40, 40)
    w_items = [
        "- Dépendance forte envers 1 cadre homme-clé",
        "- Absence de GED (perte de 45 min/jour à chercher l'info)",
        "- Absence de suivi chiffré des coûts de non-qualité",
        "- Délais de chiffrage devis complexes > 5 jours",
        "- [Saisissez votre Faiblesse 1] : __________________",
        "- [Saisissez votre Faiblesse 2] : __________________"
    ]
    for wi in w_items:
        p = c_w.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(wi)
        r.font.name = "Calibri"
        r.font.size = Pt(8.5)
        if "[Saisissez" in wi: r.font.italic = True; r.font.bold = True; r.font.color.rgb = GOLD

    c_o = tbl_swot.cell(1, 0)
    c_o.width = Inches(3.45)
    set_cell_background(c_o, "FFFFFF")
    set_cell_margins(c_o, top=100, bottom=100, left=120, right=120)
    set_cell_border(c_o, top={'sz': 16, 'val': 'single', 'color': '0277BD'},
                         left={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                         right={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                         bottom={'sz': 4, 'val': 'single', 'color': 'E2DCCC'})
    p_o = c_o.paragraphs[0]
    r_oh = p_o.add_run("🔵 3. OPPORTUNITÉS (Marché Externe)\n")
    r_oh.font.name = "Georgia"
    r_oh.font.bold = True
    r_oh.font.size = Pt(9.5)
    r_oh.font.color.rgb = RGBColor(2, 119, 189)
    o_items = [
        "- Exigence forte de certification ISO par les grands comptes",
        "- Recul d'un concurrent direct sur le bassin régional",
        "- Subventions régionales pour la transition numérique/GED",
        "- Nouveaux besoins sur-mesure chez nos 3 gros clients",
        "- [Saisissez votre Opportunité 1] : ______________",
        "- [Saisissez votre Opportunité 2] : ______________"
    ]
    for oi in o_items:
        p = c_o.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(oi)
        r.font.name = "Calibri"
        r.font.size = Pt(8.5)
        if "[Saisissez" in oi: r.font.italic = True; r.font.bold = True; r.font.color.rgb = GOLD

    c_t = tbl_swot.cell(1, 1)
    c_t.width = Inches(3.45)
    set_cell_background(c_t, "FFFFFF")
    set_cell_margins(c_t, top=100, bottom=100, left=120, right=120)
    set_cell_border(c_t, top={'sz': 16, 'val': 'single', 'color': 'E65100'},
                         left={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                         right={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                         bottom={'sz': 4, 'val': 'single', 'color': 'E2DCCC'})
    p_t = c_t.paragraphs[0]
    r_th = p_t.add_run("🟠 4. MENACES (Menaces Externes)\n")
    r_th.font.name = "Georgia"
    r_th.font.bold = True
    r_th.font.size = Pt(9.5)
    r_th.font.color.rgb = RGBColor(230, 81, 0)
    t_items = [
        "- Hausse des prix des matières premières (+15%/an)",
        "- Pénurie de main d'œuvre technique sur le secteur",
        "- Nouvelles exigences environnementales / bilan carbone",
        "- Pression à la baisse des prix par les acheteurs",
        "- [Saisissez votre Menace 1] : ___________________",
        "- [Saisissez votre Menace 2] : ___________________"
    ]
    for ti in t_items:
        p = c_t.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(ti)
        r.font.name = "Calibri"
        r.font.size = Pt(8.5)
        if "[Saisissez" in ti: r.font.italic = True; r.font.bold = True; r.font.color.rgb = GOLD

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    doc.add_heading("🎯 MATRICE DE CROISEMENT ET PLAN D'ACTION STRATÉGIQUE", level=2)
    headers = ["Axe Stratégique", "Problème Clé Issu du SWOT", "Action Stratégique à Lancer", "Responsable", "Échéance", "Budget / ROI"]
    rows = [
        ["Sécurisation (S-W)", "Dépendance homme-clé en atelier", "Rédaction fiches poste + binômage polyvalence", "Resp. Prod", "31/03", "ROI : Évite arrêt prod"],
        ["Protection Marge (S-T)", "Hausse coûts matières premières", "Indexation automatique des devis sur cours d'achat", "Resp. Com", "Immédiat", "Évite -45k€ de perte"],
        ["Gain de Temps (W-O)", "Recherche documentaire pénible", "Déploiement de l'arborescence GED simplifiée", "Resp. IT/QSE", "30/04", "Gain : 5h/semaine/pers"],
        ["Croissance (S-O)", "Demande ISO 9001 des clients", "Obtention du certificat ISO 9001 et communication", "DG / QSE", "30/06", "+80k€ CA visé"],
        ["[Votre Axe]", "[Votre Problème]", "[Votre Action à Saisir]", "[Nom]", "[Date]", "[Budget]"]
    ]
    format_word_table(doc, headers, rows, col_widths=[1.2, 1.4, 1.8, 0.9, 0.7, 1.1])
    
    add_next_steps_box(doc, [
        "Validation officielle en Comité de Direction avec le DG.",
        "Transfert des faiblesses et menaces rouges vers le Registre AMDEC (Outil 05).",
        "Archivage sous 01_DIRECTION_STRATEGIE/SWOT_2026.pdf."
    ])
    add_document_footer(doc)
    doc.save(os.path.join(out_word_dir, "OUTIL_01A_SWOT.docx"))

def make_pestel():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 01B", "Matrice PESTEL Macro-Économique Prête à Remplir", "Clause ISO 9001:2015 - 4.1 - Question Q1")
    
    add_consultant_box(doc, "Ne traitez pas la géopolitique internationale globale. Rapprochez chaque lettre PESTEL de l'impact direct sur la facture et le carnet de commandes de votre PME.", [
        ("1. Politique & Économique", "Aides régionales Industrie 4.0, hausse du KWh gaz/élec atelier, inflation aciers/alu, hausse des frais de transport."),
        ("2. Social & Technologique", "Pyramide des âges (départs retraite sous 2 ans), turn-over jeunes, obsolescence ERP, risque cyberattaque ransomware."),
        ("3. Écologique", "Traitement des huiles/effluents, compactage des copeaux, bilan carbone réclamé par les clients grands comptes."),
        ("4. Légal & Réglementaire", "Mise à jour DUERP (Document Unique Sécurité), contrôle CE machines, règles RGPD fichiers clients/fournisseurs.")
    ])
    
    add_why_box(doc, [
        "Anticipation des chocs d'inflation et d'énergie avant perte de marge.",
        "Protection proactive des marges brutes.",
        "Captation de subventions d'aide à l'investissement PME."
    ], [
        "Marge détruite par des hausses de coûts non répercutées.",
        "Amendes ou arrêts de production pour non-respect des normes.",
        "Non-conformité majeure ISO 9001 (Clause 4.1)."
    ])
    
    add_guide_box(doc, [
        "Parcourir les 6 Piliers PESTEL.",
        "Renseigner 2 à 3 facteurs réels par pilier.",
        "Attribuer l'impact (🟢 Opportunité / 🔴 Risque Fort / 🟠 Risque Moyen / 🟢 Conforme).",
        "Programmer 1 action par risque rouge dans l'AMDEC (Outil 05)."
    ])
    
    doc.add_heading("📝 LA MATRICE PESTEL COMPLÈTE PRÊT À REMPLIR", level=2)
    headers = ["Pilier PESTEL", "Facteurs d'Influence à Examiner dans votre PME", "Impact Estimé", "Action Préventive / Opportunité", "Responsable"]
    rows = [
        ["POLITIQUE (P)", "Subventions régionales pour la transition numérique et achat de machines", "🟢 Opportunité", "Monter un dossier d'aide régionale à l'investissement PME", "DG / RAF"],
        ["ÉCONOMIQUE (E)", "Volatilité et hausse continue du prix des matières premières (acier/alu +15%)", "🔴 Risque Fort", "Inclure une clause de révision tarifaire trimestrielle sur devis", "Resp. Com"],
        ["SOCIAL (S)", "Pénurie de profils qualifiés (techniciens de maintenance, usîneurs)", "🔴 Risque Fort", "Déployer la matrice de polyvalence (Outil 22) et tutorat", "RH / Prod"],
        ["TECHNOLOGIQUE (T)", "Digitalisation des processus : nécessité d'automatiser les données atelier", "🟠 Risque Moyen", "Implémenter un ERP/GED Cloud pour supprimer le papier", "Resp. IT"],
        ["ÉCOLOGIQUE (E)", "Exigence croissante des clients grands comptes sur le bilan carbone et le tri", "🟢 Opportunité", "Structurer la filière de recyclage des chutes et communiquer", "Resp. QSE"],
        ["LÉGAL (L)", "Évolutions du code du travail (Document Unique Sécurité - DUERP)", "🟢 Conforme", "Mettre à jour le DUERP annuel et le programme de prévention", "Resp. QSE"],
        ["[Votre Pilier]", "[Saisissez votre facteur d'influence PME]", "🔴 Risque", "[Saisissez votre action préventive]", "[Nom]"]
    ]
    format_word_table(doc, headers, rows, col_widths=[1.3, 1.8, 1.1, 1.9, 1.0])
    
    add_next_steps_box(doc, [
        "Validation en Comité de Direction avec le DG.",
        "Bascule des facteurs de risques rouges vers le Registre AMDEC (Outil 05).",
        "Archivage sous 01_DIRECTION_STRATEGIE/PESTEL_2026.pdf."
    ])
    add_document_footer(doc)
    doc.save(os.path.join(out_word_dir, "OUTIL_01B_PESTEL.docx"))

def make_parties_prenantes():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 02", "Cartographie des Parties Prenantes Stratégiques", "Clause ISO 9001:2015 - 4.2 - Question Q2")
    
    add_consultant_box(doc, "Demandez au dirigeant : Qui a le pouvoir de stopper vos livraisons, bloquer votre compte bancaire ou vous faire perdre votre plus gros client si vous commettez une erreur ?", [
        ("1. Clients Grands Comptes", "Exigence de certificats matières 3.1, contrôle tridimensionnel 3D, emballages spécifiques, livraison à H+0."),
        ("2. Fournisseurs Critiques", "Transparence sur les stocks, respect des délais de livraison confirmés, réactivité sur FNC sous 48h."),
        ("3. Banques & Assurances", "Transmission des bilans certifiés au 30 avril, ratios d'EBE et fonds de roulement sains."),
        ("4. Équipes & Organismes", "DUERP Sécurité au poste, zéro accident, audit annuel ISO 9001, contrôles périodiques des ponts/extincteurs.")
    ])
    
    add_why_box(doc, [
        "Zéro litige contractuel avec vos clients stratégiques.",
        "Sécurisation de vos approvisionnements fournisseurs.",
        "Confiance renforcée avec les banques et l'organisme certificateur."
    ], [
        "Pénalités de retard d'expédition (5%/jour).",
        "Arrêt de production sur livraison de matières non conformes.",
        "Non-conformité majeure ISO 9001 (Clause 4.2)."
    ])
    
    add_guide_box(doc, [
        "Lister les 5 catégories d'acteurs de votre écosystème.",
        "Renseigner les noms exacts de vos partenaires clés.",
        "Formuler l'exigence critique non négociable.",
        "Associer le document de preuve ou le contrôle interne."
    ])
    
    doc.add_heading("📝 LE MODÈLE DÉTAILLÉ PRÊT À REMPLIR", level=2)
    headers = ["Catégorie", "Nom / Acteur Réel PME", "Exigence Critique Non Négociable", "Risque Majeur si Non Respecté", "Preuve ou Outil de Contrôle", "Responsable"]
    rows = [
        ["1. Clients Stratégiques", "Client Grand Compte ALFA", "Livraison sous 48h maxi avec certificat de conformité", "Pénalité de retard de 5%/jour + risque de déréférencement", "Bon de livraison émargé + PV de contrôle signé (Outil 17)", "Dir. Commercial"],
        ["2. Fournisseurs Critiques", "Fournisseur Métaux ACIER-X", "Matières premières 100% conformes aux spécifications", "Pièces défectueuses fabriquées + arrêt chaîne prod", "Certificat 3.1 archivé GED + Grille d'évaluation (Outil 09)", "Resp. Achats"],
        ["3. Financeurs / Banques", "Banque Régionale Z", "Transmission des comptes certifiés et ratios de trésorerie", "Refus de renouvellement de la ligne de découvert/crédit", "Tableau de bord de trésorerie mensuel + Bilan annuel", "RAF / DG"],
        ["4. Salariés & CSE", "Équipes de Production Atelier", "Respect des règles de sécurité (EPI) et paiement fixe", "Accidents du travail + démissions des cadres clés", "Document Unique (DUERP) à jour + Registre formations", "RH / QSE"],
        ["5. Organismes / État", "Organisme Certification ISO", "Réalisation de l'audit annuel ISO 9001 sans écart majeur", "Perte du certificat ISO 9001 (exigé sur les devis)", "PV de Revue de Direction (Outil 07) + Rapports d'audits", "Resp. QSE"],
        ["[Votre Catégorie]", "[Nom du Partenaire]", "[Exigence non négociable]", "[Risque identifié]", "[Document de preuve]", "[Nom]"]
    ]
    format_word_table(doc, headers, rows, col_widths=[1.2, 1.2, 1.5, 1.3, 1.1, 0.8])
    
    add_next_steps_box(doc, [
        "Diffusion aux départements Ventes, Achats, RH et Prod.",
        "Intégration des exigences dans la Grille Fournisseur (Outil 09) et Fiche Recette (Outil 17).",
        "Archivage sous 01_DIRECTION_STRATEGIE/PARTIES_PRENANTES_2026.pdf."
    ])
    add_document_footer(doc)
    doc.save(os.path.join(out_word_dir, "OUTIL_02_PARTIES_PRENANTES.docx"))

def make_dashboard():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 03", "Tableau de Bord de Pilotage Direction (5 Axes Data)", "Clauses ISO 9001:2015 - 5.1 & 9.1 - Question Q3 & Q26")
    
    add_consultant_box(doc, "Moins c'est mieux ! Limitez-vous strictement à 5 indicateurs vitaux. S'ils sont tous au vert, l'entreprise gagne de l'argent et sert ses clients sans stress.", [
        ("1. Axe Financier", "CA mensuel HT vs budget, Marge brute % globale (seuil min 35%)."),
        ("2. Axe Qualité", "Coût total de non-qualité (€) = coût des rebuts + heures de retouches."),
        ("3. Axe Client & Opérations", "Net Promoter Score (NPS), Taux de respect des délais d'expédition (OTD %)."),
        ("4. Axe RH & Sécurité", "Nombre d'accidents du travail avec ou sans arrêt (objectif zéro).")
    ])
    
    add_why_box(doc, [
        "Pilotage par des chiffres réels en 10 minutes par mois.",
        "Sauvegarde de la marge brute dès la fin du mois M.",
        "Détection immédiate des dérives de coûts de non-qualité."
    ], [
        "S'apercevoir des pertes 6 mois trop tard lors du bilan comptable.",
        "Accumulation de retards de livraison entraînant la perte de clients.",
        "Non-conformité majeure ISO 9001 (Clauses 5.1 & 9.1)."
    ])
    
    add_guide_box(doc, [
        "Rendez-vous mensuel fixe le 1er du mois (10 min chrono).",
        "Renseigner les valeurs réelles du mois M.",
        "Comparer à la Valeur Cible (🟢 Conforme / 🟠 À surveiller / 🔴 Alerte).",
        "Si ROUGE, déclencher la réunion de crise sous 48h + Fiche 5 Pourquoi (Outil 19)."
    ])
    
    doc.add_heading("📝 LE TABLEAU DE BORD DÉTAILLÉ PRÊT À REMPLIR", level=2)
    headers = ["Axe Métier", "Indicateur Clé (KPI)", "Formule Exacte de Calcul", "Valeur Cible", "Mois M-1", "Mois M (Réel)", "Statut", "Plan d'Action d'Urgence si Alerte"]
    rows = [
        ["1. Financier", "Chiffre d'Affaires Mensuel (€)", "Somme des factures émises HT", "≥ 350 k€", "340 k€", "362 k€", "🟢 Conforme", "Ras (Objectif dépassé)"],
        ["1. Financier", "Marge Brute Globale (%)", "(CA HT - Coûts direct d'achat) / CA", "≥ 38 %", "36.5 %", "34.2 %", "🔴 Alerte", "Bloquer la signature devis sous 35% de marge"],
        ["2. Qualité", "Coût de Non-Qualité (€)", "Coût pièces jetées + heures retouches", "≤ 3 000 €", "5 400 €", "4 100 €", "🟠 À surveiller", "Analyser la plus grosse FNC du mois (Outil 19)"],
        ["3. Client", "Satisfaction Client (NPS)", "Score net issu des enquêtes flash", "≥ 45", "42", "48", "🟢 Conforme", "Ras"],
        ["4. Opérations", "Taux de Service / Délais (%)", "(Livraisons à date / Livraisons tot.) x 100", "≥ 95 %", "92.0 %", "96.5 %", "🟢 Conforme", "Ras"],
        ["5. Sécurité/RH", "Accidents du travail (Taux Freq)", "Nb d'accidents avec arrêt / Heures travaillées", "0 accident", "0", "0", "🟢 Conforme", "Ras"],
        ["[Votre Axe]", "[Nom KPI]", "[Formule]", "[Cible]", "[M-1]", "[M]", "🟢/🔴", "[Action corrective]"]
    ]
    format_word_table(doc, headers, rows, col_widths=[0.9, 1.2, 1.4, 0.7, 0.6, 0.6, 0.7, 1.0])
    
    add_next_steps_box(doc, [
        "Saisie mensuelle au 1er du mois avec les pilotes de pôles.",
        "Animation du Comité de Direction avec le DG.",
        "Affichage du Taux de Service et Satisfaction en atelier.",
        "GED : Classer sous 01_DIRECTION_STRATEGIE/DASHBOARDS_2026/."
    ])
    add_document_footer(doc)
    doc.save(os.path.join(out_word_dir, "OUTIL_03_DASHBOARD_DIRECTION.docx"))

def make_politique():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 04", "Charte Complète de Politique Qualité & Performance", "Clause ISO 9001:2015 - 5.2 - Question Q4")
    
    add_consultant_box(doc, "Évitez le jargon d'audit théorique. La Politique Qualité doit se lire comme le contrat d'honneur du dirigeant envers ses salariés et ses clients.", [
        ("1. Zéro Gaspillage & Rentabilité", "Faire bien du premier coup, interdire le travail sans plan à jour, rejeter les affaires à perte."),
        ("2. Chasse aux Délais & Client", "Honorer 100% des dates de livraison promises, traiter toute alerte sous 24h."),
        ("3. Souveraineté du Savoir", "Travailler dans la sécurité et le calme, formaliser les savoirs clés pour supprimer le stress.")
    ])
    
    add_why_box(doc, [
        "Fédération de l'ensemble des équipes autour de 3 règles claires.",
        "Crédibilité commerciale renforcée auprès des grands comptes.",
        "Alignement parfait entre la vision DG et le terrain PME."
    ], [
        "Personnel désorienté sans priorités partagées.",
        "Refus de certification ISO 9001 par manque d'engagement officiel."
    ])
    
    add_guide_box(doc, [
        "Personnaliser les éléments entre crochets [Nom de l'entreprise].",
        "Revoir et valider en Comité de Direction.",
        "Apposer les signatures manuscrites originales du DG et du QSE.",
        "Imprimer et afficher en couleur dans les locaux."
    ])
    
    doc.add_heading("📝 LA CHARTE OFFICIELLE PRÊT À SIGNER", level=2)
    
    tbl_p = doc.add_table(rows=1, cols=1)
    tbl_p.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_p = tbl_p.cell(0, 0)
    c_p.width = Inches(7.1)
    set_cell_background(c_p, "FDFDFD")
    set_cell_margins(c_p, top=140, bottom=140, left=180, right=180)
    set_cell_border(c_p, left={'sz': 24, 'val': 'single', 'color': 'C5A065'},
                         top={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                         bottom={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                         right={'sz': 4, 'val': 'single', 'color': 'E2DCCC'})
    
    p = c_p.paragraphs[0]
    p.add_run("ENGAGEMENT DE LA DIRECTION : POLITIQUE QUALITÉ & PERFORMANCE\n\n").bold = True
    p.add_run("Société : ").bold = True
    p.add_run("[Cliquez et saisissez le Nom de votre Entreprise]\n")
    p.add_run("Date de mise à jour : ").bold = True
    p.add_run("[Date du jour] | Version : 1.0\n\n")
    
    p.add_run("Notre démarche Qualité a un objectif simple et pragmatique : garantir la pérennité de notre entreprise, protéger nos marges brutes et assurer la satisfaction totale de nos clients.\n\n")
    
    p.add_run("NOS 3 ENGAGEMENTS STRATÉGIQUES INVIOLABLES :\n\n").bold = True
    
    p.add_run("1. ZÉRO GASPILLAGE & RENTABILITÉ :\n").bold = True
    p.add_run("- Stopper les coûts cachés en réalisant chaque prestation conforme du premier coup.\n- Ne valider aucun devis ni contrat en dessous de notre seuil de marge brute cible (35%).\n\n")
    
    p.add_run("2. CHASSE AUX DÉLAIS & EXCELLENCE CLIENT :\n").bold = True
    p.add_run("- Respecter 100% de nos engagements de livraison envers nos clients.\n- Prendre en charge et répondre à toute réclamation client sous 24 heures maximum.\n\n")
    
    p.add_run("3. SOUVERAINETÉ DU SAVOIR & SÉRÉNITÉ DES ÉQUIPES :\n").bold = True
    p.add_run("- Clarifier les rôles de chacun (Matrice RACI) pour travailler sans stress ni dépendance.\n- Développer la polyvalence des compétences pour garantir la continuité d'activité.\n\n")
    
    p.add_run("Signatures de la Direction :\n\n").bold = True
    p.add_run("Direction Générale : ___________________________          Responsable QSE : ___________________________")
    
    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    
    add_next_steps_box(doc, [
        "Faire apposer les signatures manuscrites du DG et QSE.",
        "Afficher dans le hall, salle de réunion et atelier.",
        "Agrafer au Livret d'Accueil des nouveaux salariés (Outil 23).",
        "Publier la politique sur le site Web PME.",
        "GED : Classer sous 01_DIRECTION_STRATEGIE/POLITIQUE_QUALITE_SIGNEE.pdf."
    ])
    add_document_footer(doc)
    doc.save(os.path.join(out_word_dir, "OUTIL_04_POLITIQUE_QUALITE.docx"))

def make_amdec():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 05", "Registre des Risques & Opportunités (AMDEC Simplifiée)", "Clause ISO 9001:2015 - 6.1 - Question Q5")
    
    add_consultant_box(doc, "L'AMDEC est un outil d'arbitrage financier. Ne notez pas les risques selon les ressentis affectifs : appliquez la cotation Fréquence (1-5) x Gravité (1-5) pour stopper les querelles et investir là où c'est vital.", [
        ("1. Risques Ventes & Appro", "Devis chiffré sans marge brute suffisante, fournisseur unique sur composant critique."),
        ("2. Risques Prod & IT", "Panne de machine unique sans contrat de maintenance préventive, perte des données suite virus IT."),
        ("3. Risques Humains & Sécurité", "Départ imprévu du seul régleur sans procédure écrite, accident du travail sur carter manquant.")
    ])
    
    add_why_box(doc, [
        "Priorisation scientifique des investissements par le chiffre (ROI).",
        "Neutralisation des pannes et crises avant survenance.",
        "Tranquillité d'esprit du dirigeant PME."
    ], [
        "Dépenses à l'aveugle dans des actions secondaires.",
        "Arrêt brutal d'activité non anticipé.",
        "Non-conformité majeure ISO 9001 (Clause 6.1)."
    ])
    
    add_guide_box(doc, [
        "Noter Fréquence (F: 1 à 5) et Gravité (G: 1 à 5) pour chaque risque.",
        "Calculer le Score de Criticité (C = F x G).",
        "Si Score ≥ 10 (Zone Rouge), engager l'action préventive OBLIGATOIRE avec ROI.",
        "Attribuer 1 pilote et 1 date d'échéance par action."
    ])
    
    doc.add_heading("📝 LE REGISTRE AMDEC DÉTAILLÉ PRÊT À REMPLIR", level=2)
    headers = ["N°", "Risque / Vulnérabilité Identifiée", "Cause Racine", "Fréq (1-5)", "Grav (1-5)", "Score (FxG)", "Action Préventive à Déployer", "Budget / ROI Estimé", "Responsable", "Statut"]
    rows = [
        ["R1", "Erreur de chiffrage sur devis complexe", "Calcul de marge manuel sur Excel", "3", "4", "12 (🔴)", "Imposer une grille de validation obligatoire devis > 10k€", "ROI : Évite 20k€ d'affaires à perte", "Resp. Com", "🟢 Actif"],
        ["R2", "Rupture d'approvisionnement matière", "Fournisseur unique sur composant X", "2", "5", "10 (🔴)", "Homologuer un 2ème fournisseur de secours sous 30 jours", "Coût : 500€ d'essais", "Resp. Achats", "🟢 Actif"],
        ["R3", "Panne prolongée machine découpe Laser", "Défaut de maintenance préventive", "2", "4", "8 (🟠)", "Souscrire contrat de maintenance préventive constructeur", "Coût : 1 500€/an", "Resp. Prod", "🟢 Actif"],
        ["R4", "Départ imprévu du Chef d'Atelier", "Absences de procédures écrites au poste", "2", "4", "8 (🟠)", "Rédiger les modes opératoires et former un binôme", "Temps interne 20h", "RH / Prod", "🟢 Actif"],
        ["R5", "Pertes de données suite cyberattaque", "Sauvegardes manuelles irrégulières", "1", "5", "5 (🟡)", "Automatiser des sauvegardes Cloud quotidiennes", "Coût : 30€/mois", "Resp. IT", "🟢 Actif"],
        ["R6", "Accident du travail sur machine découpe", "Protection carter retirée par l'opérateur", "1", "5", "5 (🟡)", "Remettre le carter + consigne visuelle de sécurité", "Temps interne 2h", "Resp. QSE", "🟢 Actif"],
        ["[N°]", "[Description du risque]", "[Cause]", "[1-5]", "[1-5]", "[FxG]", "[Action préventive]", "[Budget/ROI]", "[Nom]", "🟢 Actif"]
    ]
    format_word_table(doc, headers, rows, col_widths=[0.4, 1.2, 1.0, 0.5, 0.5, 0.6, 1.2, 0.8, 0.5, 0.4])
    
    add_next_steps_box(doc, [
        "Arbitrage budgétaire DG sur les risques rouges (Score ≥ 10).",
        "Délégation des actions aux responsables de pôles.",
        "Raccordement à la Feuille de Route SMART (Outil 06).",
        "Revue trimestrielle de recalcul de criticité.",
        "GED : Enregistrer sous 01_DIRECTION_STRATEGIE/REGISTRE_AMDEC_RISQUES.xlsx."
    ])
    add_document_footer(doc)
    doc.save(os.path.join(out_word_dir, "OUTIL_05_AMDEC_RISQUES.docx"))

def make_smart():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 06", "Feuille de Route d'Objectifs SMART par Service", "Clause ISO 9001:2015 - 6.2 - Question Q6")
    
    add_consultant_box(doc, "Exigez une formule mathématique exacte. Si un indicateur ne peut pas être extrait en 2 clics de votre ERP ou d'un fichier Excel, l'objectif sera abandonné en cours d'année.", [
        ("1. Ventes", "Taux de devis transformés en commandes (%), délai moyen de transmission d'offre commercial (< 48h)."),
        ("2. Atelier", "Réduction du pourcentage de chutes d'atelier (%), taux de pièces conformes au premier contrôle (%)."),
        ("3. Achats & QSE", "Taux d'évaluation des fournisseurs clés ≥ 15/20 (%), taux de clôture des FNC sous 15 jours (%).")
    ])
    
    add_why_box(doc, [
        "Responsabilisation directe de chaque chef de service sur des chiffres.",
        "Suivi de progrès garanti aux jalons trimestriels M+3 et M+6.",
        "Preuve d'amélioration continue pour l'audit ISO 9001."
    ], [
        "Objectifs flous non mesurés se transformant en vœux pieux.",
        "Démotivation des cadres par manque de repères mesurables.",
        "Écart d'audit ISO 9001 (Clause 6.2)."
    ])
    
    add_guide_box(doc, [
        "Appliquer le filtre SMART (Spécifique, Mesurable, Atteignable, Réaliste, Temporel).",
        "Renseigner la formule de calcul exacte.",
        "Fixer la Valeur Cible et les Jalons d'avancement M+3 et M+6.",
        "Faire émarger le responsable de pôle."
    ])
    
    doc.add_heading("📝 LA FEUILLE DE ROUTE DÉTAILLÉE PRÊT À REMPLIR", level=2)
    headers = ["Service", "Objectif Amélioration SMART", "Formule Exacte de Mesure", "Valeur Cible", "Jalons M+3", "Jalons M+6", "Ressources Allocées", "Responsable", "Statut"]
    rows = [
        ["Commercial", "Réduire les devis perdus pour délai de chiffrage trop long", "(Devis perdus pour délai / Total devis) x 100", "≤ 10 %", "15 %", "8 %", "Logiciel de chiffrage express", "Dir. Commercial", "🟢 Conforme"],
        ["Production", "Diviser par deux le taux de rebuts atelier", "(Valeur pièces jetées / CA produit) x 100", "≤ 1.5 %", "2.2 %", "1.3 %", "Formation réglage + gabarits", "Chef Prod", "🟢 Conforme"],
        ["Achats", "Obtenir 100% de livraisons fournisseurs dans les délais", "(Commandes reçues à date / Total commandes) x 100", "≥ 98 %", "95 %", "98.5 %", "Grille d'évaluation (Outil 09)", "Resp. Achats", "🟢 Conforme"],
        ["Qualité / QSE", "Prise en charge des réclamations clients sous 24h", "(Réclamations traitées < 24h / Total réclamations)", "100 %", "90 %", "100 %", "Registre réclamations (Outil 10)", "Resp. QSE", "🟢 Conforme"],
        ["RH / Formations", "Former 100% des nouveaux salariés au Livret Qualité", "(Salariés formés J+7 / Total embauches) x 100", "100 %", "100 %", "100 %", "Livret d'accueil (Outil 23)", "RH", "🟢 Conforme"],
        ["[Votre Service]", "[Objectif SMART]", "[Formule mathématique]", "[Cible]", "[M+3]", "[M+6]", "[Ressources]", "[Nom]", "🟢 Conforme"]
    ]
    format_word_table(doc, headers, rows, col_widths=[0.8, 1.2, 1.3, 0.6, 0.6, 0.6, 1.0, 0.6, 0.4])
    
    add_next_steps_box(doc, [
        "Émargement individuel de chaque pilote de service.",
        "Intégration au Dashboard mensuel (Outil 03).",
        "Points d'étape trimestriels aux jalons M+3 et M+6.",
        "GED : Sauvegarder sous 01_DIRECTION_STRATEGIE/OBJECTIFS_SMART_2026.pdf."
    ])
    add_document_footer(doc)
    doc.save(os.path.join(out_word_dir, "OUTIL_06_OBJECTIFS_SMART.docx"))

def make_revue():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 07", "Procès-Verbal de Revue de Direction Complexe", "Clause ISO 9001:2015 - 9.3 - Question Q7")
    
    add_consultant_box(doc, "La Revue de Direction n'est pas une simple réunion d'information : c'est le conseil d'administration opérationnel de la Qualité. Suivez scrupuleusement les 7 points normatifs pour ressortir avec des arbitrages et des budgets votés.", [
        ("1. Équipements & Outillage", "Arbitrages d'achats de nouvelles machines, outillage de contrôle dimensionnel."),
        ("2. Ressources Humaines", "Validation des budgets de formation polyvalence, recrutements de binômes."),
        ("3. Audits & GED", "Validation du programme d'audit interne, déploiement de l'arborescence GED Cloud.")
    ])
    
    add_why_box(doc, [
        "Preuve N°1 absolue exigée par l'auditeur ISO 9001.",
        "Arbitrages budgétaires officiels du DG consignés.",
        "Pilotage stratégique annuel consolidé."
    ], [
        "Refus de certification ISO 9001 (Défaut normatif majeur).",
        "Direction déconnectée des réalités et des coûts cachés.",
        "Blocage des investissements matériels et RH."
    ])
    
    add_guide_box(doc, [
        "Préparer les données en amont (2h) : Dashboard (Outil 03), SWOT, AMDEC, Réclamations.",
        "Animer la réunion en 1h chrono en suivant les 7 points normatifs.",
        "Consigner les décisions et arbitrages budgétaires.",
        "Faire apposer toutes les signatures manuscrites."
    ])
    
    doc.add_heading("📝 MODÈLE DE PV DE REVUE DE DIRECTION PRÊT À REMPLIR", level=2)
    
    tbl_p = doc.add_table(rows=1, cols=1)
    tbl_p.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_p = tbl_p.cell(0, 0)
    c_p.width = Inches(7.1)
    set_cell_background(c_p, "FDFDFD")
    set_cell_margins(c_p, top=140, bottom=140, left=180, right=180)
    set_cell_border(c_p, left={'sz': 24, 'val': 'single', 'color': 'C5A065'},
                         top={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                         bottom={'sz': 4, 'val': 'single', 'color': 'E2DCCC'},
                         right={'sz': 4, 'val': 'single', 'color': 'E2DCCC'})
    
    p = c_p.paragraphs[0]
    p.add_run("PROCÈS-VERBAL DE REVUE DE DIRECTION COMPLÈTE\n\n").bold = True
    p.add_run("Société : ").bold = True
    p.add_run("[Nom de l'Entreprise] | Date : [Date de la réunion]\n")
    p.add_run("Présents : ").bold = True
    p.add_run("[DG, Responsable Qualité, Responsable Opérations, Responsable Commercial]\n\n")
    
    p.add_run("1. ÉTAT DES ACTIONS DE LA REVUE PRÉCÉDENTE (9.3.2.a) :\n").bold = True
    p.add_run("- Action 1 : Déploiement de l'arborescence GED 30s ──► [🟢 Finalisée et fonctionnelle]\n- Action 2 : Formation de 2 opérateurs au contrôle dimensionnel ──► [🟢 Finalisée]\n\n")
    
    p.add_run("2. ÉVOLUTION DES ENJEUX INTERNES / EXTERNES (SWOT & PESTEL - 9.3.2.b) :\n").bold = True
    p.add_run("- Hausse constatée des matières premières de +15% ──► Décision d'indexer nos devis sur le cours d'achat.\n- Pénurie locale de main d'œuvre ──► Validation du programme de polyvalence et binômage atelier.\n\n")
    
    p.add_run("3. INFORMATIONS SUR LA PERFORMANCE DU SMQ (9.3.2.c) :\n").bold = True
    p.add_run("- Satisfaction client & Réclamations : 96.5% de satisfaction (NPS 48), 4 réclamations traitées sous 24h.\n- Atteinte des objectifs SMART : 4 objectifs sur 5 atteints (Rebuts réduits à 1.3%).\n- Non-conformités et coûts cachés : Coût total de non-qualité ramené à 4 100 € sur l'année.\n- Résultats des audits internes : Audit réalisé le 15/01 (1 écart mineur corrigé sous 15 jours).\n- Performance des fournisseurs : 2 fournisseurs principaux évalués à 17/20, sous-traitant B sous réserve.\n\n")
    
    p.add_run("4. ADÉQUATION DES RESSOURCES (9.3.2.d) :\n").bold = True
    p.add_run("- Ressources humaines et compétences globalement satisfaisantes.\n- Validation de l'achat d'une imprimante d'étiquettes code-barres pour le bac quarantaine atelier.\n\n")
    
    p.add_run("5. EFFICACITÉ DES ACTIONS FACE AUX RISQUES (AMDEC - 9.3.2.e) :\n").bold = True
    p.add_run("- Le risque de rupture approvisionnement a été neutralisé par l'homologation d'un 2ème fournisseur.\n\n")
    
    p.add_run("6. OPPORTUNITÉS D'AMÉLIORATION & ROI ESTIMÉ (9.3.2.f) :\n").bold = True
    p.add_run("- Automatisation des remontées de données sur dashboard digital (Gain estimé : 5h/mois).\n\n")
    
    p.add_run("7. DÉCISIONS & ARBITRAGES BUDGETAIRES DE LA DIRECTION (9.3.3) :\n").bold = True
    p.add_run("- Décision 1 : Budget de 3 500 € validé pour la formation polyvalence et sécurité atelier.\n- Décision 2 : Validation du programme d'audit interne pour l'année 2026.\n- Décision 3 : Maintien de l'objectif de certification ISO 9001 pour le 30 Juin.\n\n")
    
    p.add_run("Signatures des Participants au Comité :\n\n").bold = True
    p.add_run("DG : ___________________________          QSE : ___________________________\n\n")
    p.add_run("Resp. Com : ____________________          Chef Prod : ______________________")
    
    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    
    add_next_steps_box(doc, [
        "Émargement manuscrit obligatoire du DG et des participants.",
        "Archivage sous 01_DIRECTION_STRATEGIE/PV_REVUE_DIRECTION_2026.pdf.",
        "Communication d'une note synthétique 1 page aux salariés."
    ])
    add_document_footer(doc)
    doc.save(os.path.join(out_word_dir, "OUTIL_07_REVUE_DIRECTION.docx"))

# RUN ALL BUILDERS
make_start_here()
make_swot()
make_pestel()
make_parties_prenantes()
make_dashboard()
make_politique()
make_amdec()
make_smart()
make_revue()

print("Successfully generated all premium Word (.docx) documents with perfect layout & widths!")
