#!/usr/bin/env python3
"""
Générateur Maître de la Grille d'Audit SMQ & Performance (ISO 9001 x 3 Piliers Delacour)
Formations des tableaux à 6 colonnes. Suppression des parenthèses dans les titres.
Génère la version mise en forme aux normes strictes Delacour (DOCX, HTML, MD, CSV) dans l'arborescence OUTILS_QUALITE_DELACOUR.
"""

import os
import json
import csv
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
THEMES_BG    = "F4F6F4"
BORDER_GOLD  = "C5A065"
BORDER_ACCENT= "D0D7D1"

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=120, right=120):
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

# Titres nettoyés de toute parenthèse
AUDIT_SESSIONS_DATA = [
    {
        "session_title": "SESSION 1 : DIRECTION & PILOTAGE STRATÉGIQUE",
        "sub_title": "Interlocuteurs : Direction Générale, COPIL, Responsable Qualité - Focus : Vision, rentabilité & arbitrages",
        "items": [
            ["Pré (1.1)\nClause 4.3\nProcessus", "Le périmètre et l'organigramme de l'entreprise sont-ils clairs pour éviter les doublons et les zones d'ombre ?", "Relecture de l'organigramme et cartographie macro (Réf. Checklist 1.1).", "[  ]", "", "Doublons d'activités et litiges d'attributions."],
            ["Pré (1.2)\nClause 5.2\nRisques", "Votre politique qualité / vision est-elle un levier de rentabilité ou un simple affichage ?", "Relecture de la déclaration de politique/objectifs (Réf. Checklist 1.2).", "[  ]", "", "Qualité perçue comme un centre de coût."],
            ["Terrain\nClause 4.1\nRisques", "Quels sont les risques financiers et d'inflation/coûts identifiés et chiffrés pour protéger vos marges ?", "Vérifier l'analyse PESTEL/SWOT ou matrice des risques lors de l'entretien.", "[  ]", "", "Risque de choc financier imprévu."],
            ["Terrain\nClause 5.1\nData", "La direction pilote-t-elle l'entreprise par la certitude des données factuelles plutôt qu'à l'intuition ?", "Assister ou revoir la dernière revue de direction sur écran.", "[  ]", "", "Navigation à vue et décisions tardives."],
            ["Terrain\nClause 6.1\nRisques", "Avez-vous un plan d'action chiffré et attribué pour traiter les vulnérabilités les plus critiques ?", "Vérifier le registre des risques avec pilotes et délais.", "[  ]", "", "Érosion silencieuse des marges."],
            ["Terrain\nClause 6.2\nData", "Vos objectifs sont-ils mesurables, suivis et alignés sur les résultats économiques réels ?", "Comparer les KPIs avec les bilans financiers du trimestre.", "[  ]", "", "Objectifs vagues non suivis."],
            ["Terrain\nClause 9.3\nData", "La revue de direction est-elle un comité stratégique décisionnel axé sur le ROI ?", "Consulter les PV de revue et arbitrages budgétaires.", "[  ]", "", "Réunionite stérile sans arbitrage."]
        ]
    },
    {
        "session_title": "SESSION 2 : COMMERCIAL, OFFRE & APPROVISIONNEMENTS",
        "sub_title": "Interlocuteurs : Directeur Commercial, ADV, Responsable Achats - Focus : Neutralisation des contrats toxiques & fournisseurs",
        "items": [
            ["Pré (2.1)\nClause 8.2\nRisques", "Comment identifiez-vous et validez-vous la marge des devis pour refuser les 'contrats toxiques' ?", "Analyse des devis & commandes récents transmis (Réf. Checklist 2.1).", "[  ]", "", "Exécution de contrats à marge nulle ou négative."],
            ["Pré (2.2)\nClause 8.4\nRisques", "Évaluez-vous rigoureusement vos sous-traitants pour éviter qu'ils ne vous transmettent leurs risques ?", "Relecture de la liste fournisseurs / sous-traitants (Réf. Checklist 2.2).", "[  ]", "", "Non-qualité importée du sous-traitant."],
            ["Terrain\nClause 4.2\nRisques", "Connaissez-vous précisément les exigences des clients stratégiques pour éviter les pertes de compte ?", "Relever les comptes-rendus de revue de contrat sur écran.", "[  ]", "", "Perte de clients majeurs par manque d'anticipation."],
            ["Terrain\nClause 9.1.2\nData", "Mesurez-vous la satisfaction client avec des réclamations traitées sous 24-48h ?", "Tester le suivi des réclamations et le délai moyen de réponse.", "[  ]", "", "Churn client invisible et pertes de réputation."]
        ]
    },
    {
        "session_title": "SESSION 3 : OPÉRATIONS, PRODUCTION & QUALITÉ TERRAIN",
        "sub_title": "Interlocuteurs : Responsable Production, Chefs d'Atelier / Projets, Qualité Terrain - Focus : Flux, autocontrôles & zéro défaut",
        "items": [
            ["Pré (3.1)\nClause 8.1\nProcessus", "Vos méthodes d'exécution sont-elles standardisées pour éviter la variabilité de la qualité ?", "Relecture de l'exemple de gamme/consigne transmis (Réf. Checklist 3.1).", "[  ]", "", "Variabilité de la qualité selon les individus."],
            ["Pré (3.2)\nClause 8.7\nRisques", "En cas de défaut, avez-vous un suivi immédiat pour isoler le problème et stopper la perte ?", "Consultation du fichier des réclamations/NC transmis (Réf. Checklist 3.2).", "[  ]", "", "Surcoût de traitement et mélange de pièces."],
            ["Terrain\nClause 7.1\nRisques", "Vos équipements critiques sont-ils couverts par une maintenance préventive sécurisante ?", "Consulter le registre de maintenance directement sur écran.", "[  ]", "", "Pannes coûteuses et arrêt de production."],
            ["Terrain\nClause 7.5\nProcessus", "Les modes opératoires sont-ils simples, accessibles et réellement appliqués sur le terrain ?", "Observer 2 opérateurs sur leur poste de travail en atelier.", "[  ]", "", "1 à 2h perdues/jour à chercher l'information."],
            ["Terrain\nClause 8.3\nProcessus", "Le retour d'expérience (REX) est-il systématiquement réinjecté dans les nouveaux projets ?", "Vérifier le dossier de REX sur le dernier projet livré.", "[  ]", "", "Répétition des erreurs de conception."],
            ["Terrain\nClause 8.5\nProcessus", "Vos opérations sont-elles épurées pour supprimer les double-saisies et manutentions inutiles ?", "Traquer les saisies papier réenvolées dans Excel/ERP.", "[  ]", "", "Retouches chronophages et lourdeur administrative."],
            ["Terrain\nClause 8.6\nRisques", "Vos livraisons sont-elles validées par des contrôles d'autocontrôle irréprochables avant envoi ?", "Contrôler l'adéquation PV de contrôle / exigence client.", "[  ]", "", "Envoi de produits non conformes chez le client."],
            ["Terrain\nClause 10.2\nRisques", "Traitez-vous la cause RACINE des non-conformités pour qu'un problème ne se répète JAMAIS ?", "Auditer une fiche FNC et la méthode 5 Pourquoi associée.", "[  ]", "", "Résolution symptomatique et récidive."]
        ]
    },
    {
        "session_title": "SESSION 4 : RH, COMPÉTENCES & SOUVERAINETÉ DU SAVOIR",
        "sub_title": "Interlocuteurs : Responsable RH, Managers de proximité - Focus : Dépendance homme-clé, matrice RACI & polyvalence",
        "items": [
            ["Pré (4.1)\nClause 5.3\nProcessus", "Les rôles sont-ils formalisés avec des suppléants désignés pour éviter le blocage en cas d'absence ?", "Relecture des fiches de poste / RACI / compétences (Réf. Checklist 4.1).", "[  ]", "", "Chaos opérationnel lors du départ d'un cadre."],
            ["Terrain\nClause 7.2\nProcessus", "La matrice des compétences est-elle à jour pour garantir l'autonomie immédiate d'un remplaçant ?", "Vérifier le plan de polyvalence et le tutorat sur écran.", "[  ]", "", "Temps perdu et formation manuelle répétitive."],
            ["Terrain\nClause 7.3\nRisques", "Vos équipes connaissent-elles l'impact financier de leurs erreurs sur la santé de l'entreprise ?", "Interroger un opérateur sur le coût d'une panne/rebut.", "[  ]", "", "Erreurs humaines répétées par manque d'enjeu."],
            ["Terrain\nClause 7.4\nProcessus", "La communication interne s'appuie-t-elle sur des faits vérifiés plutôt que sur des rumeurs ?", "Consulter l'ordre du jour du dernier point d'équipe.", "[  ]", "", "Malentendus coûteux et dégradation du climat."]
        ]
    },
    {
        "session_title": "SESSION 5 : DATA, IT & AGILITÉ DÉCISIONNELLE",
        "sub_title": "Interlocuteurs : Responsable IT / Data, Responsable Qualité / SI - Focus : Dashboards temps réel & zéro lourdeur",
        "items": [
            ["Pré (4.2)\nClause 7.5\nProcessus", "L'organisation de vos dossiers serveur/Cloud permet-elle de trouver n'importe quel fichier en < 30s ?", "Consultation de la capture de l'arborescence GED (Réf. Checklist 4.2).", "[  ]", "", "Perte de temps (1 à 2h/jour) et doublons."],
            ["Terrain\nClause 4.4\nProcessus", "Vos flux entre logiciels/services sont-ils fluides ou nécessitent-ils des réinjections manuelles ?", "Mesurer le nombre de fichiers Excel d'interface.", "[  ]", "", "20% de perte d'efficacité opérationnelle."],
            ["Terrain\nClause 6.3\nProcessus", "Les évolutions informatiques ou organisationnelles sont-elles pilotées sans perte de données ?", "Auditer le dernier changement de logiciel/processus.", "[  ]", "", "Perte d'historique et ralentissement."],
            ["Terrain\nClause 9.1\nData", "Disposez-vous d'un tableau de bord mis à jour automatiquement sans perdre du temps en reporting ?", "Demander à voir le dashboard en direct sur écran.", "[  ]", "", "Aveuglement décisionnel et reporting lourd."],
            ["Terrain\nClause 9.2\nRisques", "Vos audits internes débusquent-ils de vraies failles d'efficacité (et non de la simple paperasse) ?", "Relire le dernier rapport d'audit interne SMQ.", "[  ]", "", "Audits de façade sans valeur ajoutée."],
            ["Terrain\nClause 10.1\nProcessus", "Les propositions d'amélioration du terrain sont-elles traitées et récompensées rapidement ?", "Vérifier le registre des suggestions et concrétisations.", "[  ]", "", "Stagnation opérationnelle et démotivation."],
            ["Terrain\nClause 10.3\nData", "Votre SMQ s'adapte-t-il avec agilité pour améliorer en continu votre rentabilité globale ?", "Demander un exemple d'évolution de processus récente.", "[  ]", "", "Système lourd, rigide et déconnecté."]
        ]
    }
]

NOTATION_SCALE_ROWS = [
    ["0", "Écart Majeur", "🔴 Zone Rouge", "Absence totale de processus/maîtrise. Risque fort d'érosion des marges."],
    ["1", "Écart Mineur", "🟠 Zone Orange", "Exécution informelle ou partielle. Dépendance forte aux individus."],
    ["2", "Conforme", "🟢 Zone Verte", "Exigence ISO respectée, processus formalisé et instrumenté."],
    ["3", "Excellence", "🟡 Zone Or", "Pratique exemplaire, automatisée et pilotée par la Data."]
]

PRIORITIZATION_MATRIX_ROWS = [
    ["Impact ROI Élevé / Difficulté Faible\nQuick Wins - Priorité 1", "Impact ROI Élevé / Difficulté Haute\nProjets de Fond - Priorité 2"],
    ["Impact ROI Faible / Difficulté Faible\nAméliorations Secondaires", "Impact ROI Faible / Difficulté Haute\nFausses Bonnes Idées - À Éviter"]
]

def generate_docx(output_path):
    doc = docx.Document()
    
    # Page setup
    for section in doc.sections:
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.7)
        section.right_margin = Inches(0.7)
        
        # Header with Logo Banner
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        
        header_img_path = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/.tmp/header_brand_unified_hd.png"
        if os.path.exists(header_img_path):
            hrun = hp.add_run()
            hrun.add_picture(header_img_path, width=Inches(7.1))
            
        # Footer
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        frun = fp.add_run("Cabinet Delacour - delacour.melchior@cabinetdelacour.com\t\tPage ")
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

        frun2 = fp.add_run(" / ")
        frun2.font.name = FONT_SANS
        frun2.font.size = Pt(8.5)
        frun2.font.color.rgb = MUTED_GRAY

        f_xml5 = parse_xml(r'<w:r %s><w:fldChar w:fldCharType="begin"/></w:r>' % nsdecls('w'))
        fp._p.append(f_xml5)
        f_xml6 = parse_xml(r'<w:r %s><w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r>' % nsdecls('w'))
        fp._p.append(f_xml6)
        f_xml7 = parse_xml(r'<w:r %s><w:fldChar w:fldCharType="separate"/></w:r>' % nsdecls('w'))
        fp._p.append(f_xml7)
        f_xml8 = parse_xml(r'<w:r %s><w:fldChar w:fldCharType="end"/></w:r>' % nsdecls('w'))
        fp._p.append(f_xml8)
        
        tab_xml = parse_xml(r'<w:tabs %s><w:tab w:val="right" w:pos="10512"/></w:tabs>' % nsdecls('w'))
        fp._p.get_or_add_pPr().append(tab_xml)

    # Document Title (SANS PARENTHÈSES)
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_after = Pt(2)
    r_t = p_title.add_run("GRILLE D'AUDIT SMQ & PERFORMANCE")
    r_t.font.name = FONT_SERIF
    r_t.font.size = Pt(17)
    r_t.font.bold = True
    r_t.font.color.rgb = BRAND_GREEN

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(12)
    r_s = p_sub.add_run("ISO 9001:2015 × Méthode Cabinet Delacour — Format Terrain avec Zone de Constat & Preuves Observées")
    r_s.font.name = FONT_SANS
    r_s.font.size = Pt(10.5)
    r_s.font.italic = True
    r_s.font.color.rgb = ACCENT_GOLD

    # Identity Block Box
    tbl_id = doc.add_table(rows=2, cols=2)
    tbl_id.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_id.autofit = False
    
    id_data = [
        ["Société Client : [Nom de votre entreprise]", "Date d'audit : [DD/MM/YYYY]"],
        ["Dirigeant / Décideur : [Nom / Fonction]", "Auditeur référent : Cabinet Delacour"]
    ]
    for r_i, row in enumerate(id_data):
        for c_i, val in enumerate(row):
            cell = tbl_id.cell(r_i, c_i)
            cell.text = val
            set_explicit_cell_width(cell, 5100)
            set_cell_background(cell, CREAM_BG)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            set_cell_border(cell, top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                  bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                  left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                  right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.name = FONT_SANS
                    r.font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Section: Découpage Temporel & Rappel des 3 Piliers (SANS PARENTHÈSES)
    p_pil = doc.add_paragraph()
    p_pil.paragraph_format.space_after = Pt(4)
    r_p = p_pil.add_run("SÉQUENÇAGE & PILIERS DELACOUR")
    r_p.font.name = FONT_SERIF
    r_p.font.size = Pt(12.5)
    r_p.font.bold = True
    r_p.font.color.rgb = BRAND_GREEN

    pil_box = doc.add_table(rows=1, cols=1)
    pil_box.alignment = WD_TABLE_ALIGNMENT.CENTER
    pb_cell = pil_box.cell(0, 0)
    set_explicit_cell_width(pb_cell, 10200)
    set_cell_background(pb_cell, CREAM_BG)
    set_cell_margins(pb_cell, top=100, bottom=100, left=140, right=140)
    set_cell_border(pb_cell, left={'sz': 24, 'val': 'single', 'color': '1B4D3E'},
                             top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                             bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                             right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    p_pbt = pb_cell.paragraphs[0]
    p_pbt.paragraph_format.space_after = Pt(4)
    
    pil_desc = (
        "SÉQUENÇAGE ET CORRESPONDANCE :\n"
        "1. Phase 1 : Pré-Audit Hors-Site - Relecture préalable des 8 documents transmis par le client.\n"
        "2. Phase 2 : Entretiens Terrain Sur-Site - Focus 100% sur la preuve de vie et l'observation directe sur écran.\n\n"
        "PILIER 1 : RISQUES | PILIER 2 : PROCESSUS & SOUVERAINETÉ DU SAVOIR | PILIER 3 : DATA & AGILITÉ DÉCISIONNELLE"
    )
    r_pd = p_pbt.add_run(pil_desc)
    r_pd.font.name = FONT_SANS
    r_pd.font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Section: Barème d'évaluation (SANS PARENTHÈSES)
    p_bar = doc.add_paragraph()
    p_bar.paragraph_format.space_after = Pt(4)
    r_b = p_bar.add_run("BARÈME D'ÉVALUATION")
    r_b.font.name = FONT_SERIF
    r_b.font.size = Pt(12.5)
    r_b.font.bold = True
    r_b.font.color.rgb = BRAND_GREEN

    headers_not = ["Note", "État ISO 9001", "Niveau Delacour", "Description & Conséquence Business"]
    tbl_not = doc.add_table(rows=1, cols=len(headers_not))
    tbl_not.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_not.autofit = False
    col_w_not = [700, 1800, 2500, 5200]
    for i, h in enumerate(headers_not):
        tbl_not.rows[0].cells[i].text = h
        set_explicit_cell_width(tbl_not.rows[0].cells[i], col_w_not[i])
        set_cell_background(tbl_not.rows[0].cells[i], HEADER_BG)
        set_cell_margins(tbl_not.rows[0].cells[i], top=50, bottom=50, left=60, right=60)
        p = tbl_not.rows[0].cells[i].paragraphs[0]
        for r in p.runs:
            r.font.name = FONT_SANS
            r.font.size = Pt(8)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    for r_idx, row in enumerate(NOTATION_SCALE_ROWS):
        row_cells = tbl_not.add_row().cells
        bg_hex = "F9F9F7" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row):
            row_cells[c_idx].text = val
            set_explicit_cell_width(row_cells[c_idx], col_w_not[c_idx])
            set_cell_background(row_cells[c_idx], bg_hex)
            set_cell_margins(row_cells[c_idx], top=40, bottom=40, left=60, right=60)
            set_cell_border(row_cells[c_idx], top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                               bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                               left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                               right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
            for p in row_cells[c_idx].paragraphs:
                for r in p.runs:
                    r.font.name = FONT_SANS
                    r.font.size = Pt(8)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Section: Grille d'Audit par Sessions Métiers (SANS PARENTHÈSES DANS TITRES)
    p_grd = doc.add_paragraph()
    p_grd.paragraph_format.space_after = Pt(4)
    r_g = p_grd.add_run("GRILLE D'AUDIT DÉTAILLÉE")
    r_g.font.name = FONT_SERIF
    r_g.font.size = Pt(13)
    r_g.font.bold = True
    r_g.font.color.rgb = BRAND_GREEN

    headers = ["Réf & ISO", "Question d'Audit & Points de Contrôle", "Méthodes & Preuves à Vérifier", "Constat & Preuves Observées", "Note", "Vulnérabilité & Impact ROI"]
    col_widths = [1300, 2400, 2100, 2400, 500, 1500]

    for session in AUDIT_SESSIONS_DATA:
        p_c = doc.add_paragraph()
        p_c.paragraph_format.space_after = Pt(2)
        r_cl = p_c.add_run(session["session_title"])
        r_cl.font.name = FONT_SERIF
        r_cl.font.size = Pt(11)
        r_cl.font.bold = True
        r_cl.font.color.rgb = BRAND_GREEN

        p_sub = doc.add_paragraph()
        p_sub.paragraph_format.space_after = Pt(4)
        r_cs = p_sub.add_run(session["sub_title"])
        r_cs.font.name = FONT_SANS
        r_cs.font.size = Pt(8)
        r_cs.font.italic = True
        r_cs.font.color.rgb = MUTED_GRAY

        tbl = doc.add_table(rows=1, cols=len(headers))
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False

        hdr_cells = tbl.rows[0].cells
        for i, h in enumerate(headers):
            hdr_cells[i].text = h
            set_explicit_cell_width(hdr_cells[i], col_widths[i])
            set_cell_background(hdr_cells[i], HEADER_BG)
            set_cell_margins(hdr_cells[i], top=50, bottom=50, left=30, right=30)
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.name = FONT_SANS
                r.font.size = Pt(7)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

        for r_idx, row in enumerate(session["items"]):
            row_cells = tbl.add_row().cells
            bg_hex = "F9F9F7" if r_idx % 2 == 1 else "FFFFFF"
            for c_idx, val in enumerate(row):
                row_cells[c_idx].text = val
                set_explicit_cell_width(row_cells[c_idx], col_widths[c_idx])
                set_cell_background(row_cells[c_idx], bg_hex)
                set_cell_margins(row_cells[c_idx], top=40, bottom=40, left=30, right=30)
                set_cell_border(row_cells[c_idx], top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                                  bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                                  left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                                  right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
                for p in row_cells[c_idx].paragraphs:
                    for r in p.runs:
                        r.font.name = FONT_SANS
                        r.font.size = Pt(6.5)

        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Section: Matrice de Priorisation (SANS PARENTHÈSES)
    p_mat = doc.add_paragraph()
    p_mat.paragraph_format.space_after = Pt(4)
    r_m = p_mat.add_run("MATRICE DE PRIORISATION")
    r_m.font.name = FONT_SERIF
    r_m.font.size = Pt(12.5)
    r_m.font.bold = True
    r_m.font.color.rgb = BRAND_GREEN

    tbl_m = doc.add_table(rows=2, cols=2)
    tbl_m.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_m.autofit = False

    for r_i, row in enumerate(PRIORITIZATION_MATRIX_ROWS):
        for c_i, val in enumerate(row):
            cell = tbl_m.cell(r_i, c_i)
            cell.text = val
            set_explicit_cell_width(cell, 5100)
            bg_h = "E8F0EC" if r_i==0 and c_i==0 else ("F4F6F4" if (r_i==0 or c_i==0) else "F9F9F7")
            set_cell_background(cell, bg_h)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            set_cell_border(cell, top={'sz': 6, 'val': 'single', 'color': BORDER_GOLD},
                                  bottom={'sz': 6, 'val': 'single', 'color': BORDER_GOLD},
                                  left={'sz': 6, 'val': 'single', 'color': BORDER_GOLD},
                                  right={'sz': 6, 'val': 'single', 'color': BORDER_GOLD})
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.name = FONT_SANS
                    r.font.size = Pt(8.5)
                    r.font.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Section: Registre des Vulnérabilités Majeures (SANS PARENTHÈSES)
    p_reg = doc.add_paragraph()
    p_reg.paragraph_format.space_after = Pt(4)
    r_rg = p_reg.add_run("REGISTRE DES VULNÉRABILITÉS MAJEURES")
    r_rg.font.name = FONT_SERIF
    r_rg.font.size = Pt(12.5)
    r_rg.font.bold = True
    r_rg.font.color.rgb = BRAND_GREEN

    headers_reg = ["Risque Identifié", "Priorité", "Action Corrective Immédiate Recommandée", "Pilote & Délais"]
    tbl_reg = doc.add_table(rows=1, cols=len(headers_reg))
    tbl_reg.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_reg.autofit = False

    col_w_reg = [3500, 1500, 3700, 1500]
    for i, h in enumerate(headers_reg):
        tbl_reg.rows[0].cells[i].text = h
        set_explicit_cell_width(tbl_reg.rows[0].cells[i], col_w_reg[i])
        set_cell_background(tbl_reg.rows[0].cells[i], HEADER_BG)
        set_cell_margins(tbl_reg.rows[0].cells[i], top=60, bottom=60, left=60, right=60)
        p = tbl_reg.rows[0].cells[i].paragraphs[0]
        for r in p.runs:
            r.font.name = FONT_SANS
            r.font.size = Pt(8)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    dummy_reg_rows = [
        ["[Ex: Exécution de devis sans revue de marge préalable]", "🔴 Haute 48h", "[Seuil de validation de marge obligatoire avant signature]", "[Nom / 48h]"],
        ["[Ex: Dépendance exclusive envers le responsable prod]", "🔴 Haute 48h", "[Rédaction du mode opératoire de secours + binômage]", "[Nom / 1 sem]"],
        ["[Saisissez votre risque]", "[Niveau]", "[Action corrective recommandée]", "[Nom / Délai]"]
    ]
    for r_idx, row in enumerate(dummy_reg_rows):
        row_cells = tbl_reg.add_row().cells
        bg_hex = "F9F9F7" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row):
            row_cells[c_idx].text = val
            set_explicit_cell_width(row_cells[c_idx], col_w_reg[c_idx])
            set_cell_background(row_cells[c_idx], bg_hex)
            set_cell_margins(row_cells[c_idx], top=50, bottom=50, left=60, right=60)
            set_cell_border(row_cells[c_idx], top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})

    doc.save(output_path)

def generate_csv(output_path):
    with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f, delimiter=';')
        writer.writerow(["GRILLE D'AUDIT SMQ & PERFORMANCE"])
        writer.writerow([])
        writer.writerow(["Session Métier", "Réf & ISO", "Question d'Audit & Points de Contrôle", "Méthode & Preuves", "Constat & Preuves Observées", "Note", "Vulnérabilité & Impact ROI"])
        for session in AUDIT_SESSIONS_DATA:
            writer.writerow([session["session_title"]])
            for row in session["items"]:
                writer.writerow([session["session_title"].split(":")[1].strip() if ":" in session["session_title"] else session["session_title"]] + row)
            writer.writerow([])

def main():
    dest_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE"
    os.makedirs(os.path.join(dest_dir, "DOCX"), exist_ok=True)
    os.makedirs(os.path.join(dest_dir, "HTML"), exist_ok=True)
    os.makedirs(os.path.join(dest_dir, "MD"), exist_ok=True)
    os.makedirs(os.path.join(dest_dir, "EXCEL_CSV"), exist_ok=True)

    docx_path = os.path.join(dest_dir, "DOCX", "GRILLE_D_AUDIT_SMQ_DELACOUR.docx")
    csv_path = os.path.join(dest_dir, "EXCEL_CSV", "GRILLE_D_AUDIT_SMQ_DELACOUR.csv")

    generate_docx(docx_path)
    generate_csv(csv_path)

    sub_site_docx = os.path.join(dest_dir, "03_INTERVENTION_SUR_SITE_JOUR_J", "GRILLE_D_AUDIT_SMQ_DELACOUR.docx")
    root_docx = os.path.join(dest_dir, "GRILLE_D_AUDIT_SMQ_DELACOUR.docx")
    
    generate_docx(sub_site_docx)
    generate_docx(root_docx)

    print("✅ Grille d'audit DOCX sans parenthèses dans les titres régénérée avec succès !")

if __name__ == "__main__":
    main()
