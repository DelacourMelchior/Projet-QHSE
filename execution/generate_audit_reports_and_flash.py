#!/usr/bin/env python3
"""
Générateur Maître du Rapport d'Audit SMQ — Section Top 3 Visuelle & Cartes Exécutives (Cabinet Delacour) :
1. SUPPORT_RESTITUTION_FLASH_DELACOUR (DOCX, HTML, MD)
2. RAPPORT_AUDIT_SMQ_ET_PLAN_D_ACTION_DELACOUR (DOCX, HTML, MD)

Caractéristiques de la Section Top 3 Améliorée :
- Présentation sous forme de 3 Cartes Exécutives Visuelles (Cash, Terrain, Souveraineté).
- Badges de priorité et ronds de couleur (🔴 15 jours).
- Séparation nette : Problème ➔ Solution Outil Delacour ➔ Bénéfice ROI.
- Zéro bureaucratie et lisibilité instantanée pour le Dirigeant PME.
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

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
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
# DONNÉES DU TOP 3 VISUEL POUR PME
# ==============================================================================

TOP_3_CARDS_DATA = [
    {
        "num": "PRIORITÉ 1",
        "badge": "COMMERCIAL & MARGES",
        "title": "Secourisme de Marge : Validation Obligatoire des Devis",
        "problem": "Devis transmis et signés sans grille de calcul de marge brute préalable (Risque de perte de marge brute de 5% à 15% par contrat).",
        "solution": "Déploiement de l'Outil 08 Delacour (Grille de validation des devis avec seuil de rentabilité obligatoire avant signature).",
        "benefit": "🔴 Horizon : 15 jours  |  Bénéfice ROI : Stop immédiat aux ventes à perte et protection des marges."
    },
    {
        "num": "PRIORITÉ 2",
        "badge": "QUALITÉ TERRAIN & ATELIER",
        "title": "Standardisation d'Exécution : Gammes Visuelles d'Atelier",
        "problem": "Consignes d'exécution orales créant une variabilité forte et des retouches coûteuses sur les produits/prestations.",
        "solution": "Formalisation de l'Outil 14 Delacour (Gammes opératoires visuelles simplifiées sur 1 page affichées au poste).",
        "benefit": "🔴 Horizon : 15 jours  |  Bénéfice ROI : Élimination des retouches et gain de sérénité pour les équipes."
    },
    {
        "num": "PRIORITÉ 3",
        "badge": "SOUVERAINETÉ & HOMMES-CLÉS",
        "title": "Sécurisation du Savoir : Matrice RACI & Plan de Polyvalence",
        "problem": "Dépendance exclusive envers 3 hommes-clés sans suppléance définie (Vulnérabilité d'arrêt d'activité en cas d'absence).",
        "solution": "Mise en place de l'Outil 20 Delacour (Matrice RACI des responsabilités et plan de polyvalence des compétences).",
        "benefit": "🔴 Horizon : 15 jours  |  Bénéfice ROI : Suppression de la dépendance aux hommes-clés et continuité de service."
    }
]

ALL_29_AUDIT_ITEMS_PME = [
    # SESSION 1 : DIRECTION & PILOTAGE STRATÉGIQUE (5 items)
    {"type": "section_header", "title": "SESSION 1 : DIRECTION & PILOTAGE STRATÉGIQUE"},
    {"type": "row", "data": ["Réf 1.1\nAnalyse Contexte", "Absence d'analyse formalisée du marché, du contexte et des risques concurrentiels.", "📉 Perte d'opportunités et vulnérabilité face aux évolutions du marché.", "Réflexion orale informelle du Dirigeant", "Déployer la Matrice SWOT & Enjeux Stratégiques (Outil 01 Delacour).", "🔴 Haute (15j)"]},
    {"type": "row", "data": ["Réf 1.2\nPolitique Qualité", "Absence de Politique Qualité et d'engagement stratégique écrit de la Direction.", "⚠️ Flou stratégique et manque de vision partagée par les équipes.", "Aucun document écrit ni affiché", "Formaliser la Charte d'Engagement Direction (Outil 02 Delacour).", "🟠 Moyenne (Mois 2)"]},
    {"type": "row", "data": ["Réf 1.3\nObjectifs Métiers", "Aucun objectif qualité mesurable décliné au niveau des services opérationnels.", "🔴 Pilotage de l'entreprise au jour le jour sans indicateurs de résultat.", "Objectifs oraux non chiffrés", "Instaurer la Grille d'Objectifs Qualité SMQ (Outil 03 Delacour).", "🔴 Haute (15j)"]},
    {"type": "row", "data": ["Réf 1.4\nMatrice des Risques", "Aucune cartographie ni registre formalisé des risques majeurs de la PME.", "🔴 Vulnérabilité aux urgences opérationnelles, financières et RH.", "Gestion réactive des crises au coup par coup", "Établir le Registre des Risques & Opportunités (Outil 04 Delacour).", "🔴 Haute (15j)"]},
    {"type": "row", "data": ["Réf 1.5\nBilan Stratégique", "Aucune revue de direction annuelle ni bilan formalisé du système d'organisation.", "⚠️ Absence d'arbitrage annuel sur les investissements et ressources.", "Échanges oraux en fin d'année non consignés", "Formaliser la Trame de Revue de Direction (Outil 05 Delacour).", "🟢 Consolidation (Mois 4)"]},

    # SESSION 2 : COMMERCIAL, OFFRE & APPROVISIONNEMENTS (6 items)
    {"type": "section_header", "title": "SESSION 2 : COMMERCIAL, OFFRE & APPROVISIONNEMENTS"},
    {"type": "row", "data": ["Réf 2.1\nÉcoute Client", "Absence de mesure de la satisfaction client et d'écoute structurée.", "📉 Risque d'érosion silencieuse du portefeuille client sans alerte.", "Retours oraux non archivés", "Déployer le Baromètre de Satisfaction Client (Outil 06 Delacour).", "🟠 Moyenne (Mois 2)"]},
    {"type": "row", "data": ["Réf 2.2\nContrôle des Devis", "Devis transmis et signés sans grille de calcul de marge brute obligatoire.", "📉 Pertes de marge brute récurrentes estimées à 5% à 15% par dossier.", "Grilles Excel individuelles non standardisées", "Mettre en place la Grille de Validation des Devis (Outil 08 Delacour).", "🔴 Haute (15j)"]},
    {"type": "row", "data": ["Réf 2.3\nAvenants Clients", "Modifications de commandes clients gérées à l'oral sans avenant contractuel.", "⚠️ Litiges de facturation et prestations complémentaires non facturées.", "Emails épars non centralisés", "Formaliser la Procédure d'Avenant Commandes (Outil 07 Delacour).", "🔴 Haute (15j)"]},
    {"type": "row", "data": ["Réf 2.4\nSous-Traitance", "Aucune grille d'évaluation initiale des sous-traitants et intervenants externes.", "🔴 Risque de défaillance qualité et retards sur les chantiers clients.", "Sélection informelle sur affinité", "Instaurer la Grille d'Évaluation Sous-Traitants (Outil 09 Delacour).", "🔴 Haute (15j)"]},
    {"type": "row", "data": ["Réf 2.5\nSuivi Fournisseurs", "Aucun suivi annuel des performances fournisseurs (délais, tarifs, conformité).", "📉 Surcoûts d'approvisionnement et retards d'approvisionnement.", "Aucun tableau de suivi", "Déployer le Dashboard de Suivi Fournisseurs (Outil 10 Delacour).", "🟠 Moyenne (Mois 3)"]},
    {"type": "row", "data": ["Réf 2.6\nRéception Achats", "Aucune vérification formalisée à la réception des marchandises et composants.", "⚠️ Intégration de pièces défectueuses en production sans recours.", "Contrôle visuel rapide non tracé", "Instaurer le Procès-Verbal de Réception Achats (Outil 11 Delacour).", "🔴 Haute (15j)"]},

    # SESSION 3 : OPÉRATIONS, PRODUCTION & QUALITÉ TERRAIN (8 items)
    {"type": "section_header", "title": "SESSION 3 : OPÉRATIONS, PRODUCTION & QUALITÉ TERRAIN"},
    {"type": "row", "data": ["Réf 3.1\nGammes Visuelles", "Opérations exécutées selon les habitudes sans gamme opératoire visuelle.", "⚠️ Variabilité forte de la qualité et défauts récurrents d'assemblage.", "Transmission orale du savoir-faire", "Formaliser les Gammes Opératoires Visuelles (Outil 14 Delacour).", "🔴 Haute (15j)"]},
    {"type": "row", "data": ["Réf 3.2\nTraçabilité Lots", "Perte de traçabilité des lots et des matières en cours de fabrication.", "🔴 Incapacité à isoler un lot défectueux en cas de réclamation client.", "Marquage manuel partiel non archivé", "Déployer la Fiche de Suivi et Traçabilité Lot (Outil 12 Delacour).", "🔴 Haute (15j)"]},
    {"type": "row", "data": ["Réf 3.3\nBiens Confies", "Aucun registre des équipements et matériel confiés par les clients.", "⚠️ Risque de détérioration ou perte de biens clients.", "Prise en charge informelle sans inventaire", "Instaurer le Registre de Préservation Biens Client (Outil 13 Delacour).", "🟠 Moyenne (Mois 3)"]},
    {"type": "row", "data": ["Réf 3.4\nStockage Stocks", "Conditions de stockage non sécurisées et risque d'endommagement.", "📉 Pertes financières directes par casse et dégradation du stock.", "Stockage en vrac non identifié", "Mettre en place le Guide de Stockage & Manutention (Outil 15 Delacour).", "🟠 Moyenne (Mois 3)"]},
    {"type": "row", "data": ["Réf 3.5\nSuivi SAV", "Aucun suivi structuré des interventions sous garantie et demandes SAV.", "📉 Non-facturation des prestations hors garantie et insatisfaction client.", "Carnet de notes individuel non partagé", "Déployer la Fiche de Suivi SAV & Interventions (Outil 16 Delacour).", "🟠 Moyenne (Mois 3)"]},
    {"type": "row", "data": ["Réf 3.6\nLibération Produit", "Produits et chantiers livrés sans fiche de contrôle final validée.", "🔴 Risque majeur de livraison de travaux non conformes chez le client.", "Autocontrôle oral non consigné", "Formaliser l'Attestation de Libération Produit (Outil 17 Delacour).", "🔴 Haute (15j)"]},
    {"type": "row", "data": ["Réf 3.7\nZone Rebuts", "Éléments non conformes non isolés physiquement ni étiquetés.", "⚠️ Mélange accidentel de pièces défectueuses avec les bonnes pièces.", "Zone de rebuts non délimitée", "Délimiter la Zone Rebuts & Fiche Identité NC (Outil 18 Delacour).", "🔴 Haute (15j)"]},
    {"type": "row", "data": ["Réf 3.8\nAnalyse Problèmes", "Non-conformités traitées en surface sans recherche des causes racines.", "📉 Répétition chronique des mêmes erreurs et coûts cachés récurrents.", "Correction immédiate sans analyse 5P", "Imposer la Méthode 5 Pourquoi & Plan Action (Outil 19 Delacour).", "🔴 Haute (15j)"]},

    # SESSION 4 : RH, COMPÉTENCES & SOUVERAINETÉ DU SAVOIR (5 items)
    {"type": "section_header", "title": "SESSION 4 : RH, COMPÉTENCES & SOUVERAINETÉ DU SAVOIR"},
    {"type": "row", "data": ["Réf 4.1\nRôles RACI", "Absence de fiches de poste et de matrice de responsabilités RACI.", "⚠️ Flou organisationnel, doublons et rejet de responsabilité.", "Descriptifs de poste obsolètes", "Déployer la Matrice RACI & Fiches de Poste (Outil 20 Delacour).", "🔴 Haute (15j)"]},
    {"type": "row", "data": ["Réf 4.2\nHommes-Clés", "Dépendance exclusive envers 3 hommes-clés sans suppléance définie.", "🔴 Risque d'arrêt complet d'un pôle en cas d'absence d'un expert.", "Souveraineté du savoir uniquement orale", "Établir le Plan de Polyvalence & Suppléance (Outil 21 Delacour).", "🔴 Haute (15j)"]},
    {"type": "row", "data": ["Réf 4.3\nHabilitations", "Aucun plan de formation ni suivi des habilitations réglementaires.", "⚠️ Risque juridique majeur et stagnation des compétences.", "Formations décidées sans suivi formel", "Instaurer la Matrice Compétences & Habilitations (Outil 22 Delacour).", "🟠 Moyenne (Mois 2)"]},
    {"type": "row", "data": ["Réf 4.4\nSensibilisation", "Personnel non sensibilisé à l'impact de son travail sur la qualité et le ROI.", "📉 Désengagement des opérateurs et variabilité du soin apporté.", "Aucune communication qualité dédiée", "Déployer le Support de Sensibilisation Qualité (Outil 23 Delacour).", "🟠 Moyenne (Mois 3)"]},
    {"type": "row", "data": ["Réf 4.5\nMémoire Entreprise", "Perte d'historique et de savoir-faire lors du départ des collaborateurs.", "🔴 Fuite irrémédiable du capital intellectuel de la PME.", "Aucun guide ni transmission écrite", "Implémenter le Guide de Capitalisation du Savoir (Outil 24 Delacour).", "🟢 Consolidation (Mois 5)"]},

    # SESSION 5 : DATA, IT & AGILITÉ DÉCISIONNELLE (5 items)
    {"type": "section_header", "title": "SESSION 5 : DATA, IT & AGILITÉ DÉCISIONNELLE"},
    {"type": "row", "data": ["Réf 5.1\nSécurité IT", "Absence de charte informatique et de sauvegarde automatique sécurisée.", "🔴 Risque majeur de perte définitive de données ou de cyberattaque.", "Sauvegardes manuelles éparses", "Formaliser la Charte IT & Plan Sauvegardes (Outil 25 Delacour).", "🔴 Haute (15j)"]},
    {"type": "row", "data": ["Réf 5.2\nÉtalonnage Appareils", "Aucun suivi de l'étalonnage et du réglage des appareils de mesure.", "⚠️ Risque de mesures de fabrication erronées et pièces hors cotes.", "Instruments non répertoriés", "Instaurer le Registre d'Étalonnage Appareils (Outil 26 Delacour).", "🟠 Moyenne (Mois 3)"]},
    {"type": "row", "data": ["Réf 5.3\nOrganisation GED", "Arborescence serveur désorganisée et perte de temps en recherche document.", "📉 Perte de temps estimée à 4h/semaine par collaborateur.", "Fichiers stockés localement sur PC", "Structurer l'Arborescence GED Standard (Outil 27 Delacour).", "🔴 Haute (15j)"]},
    {"type": "row", "data": ["Réf 5.4\nDashboard KPIs", "Aucun tableau de bord KPIs temps réel pour piloter les processus.", "🔴 Management réactif a posteriori au lieu d'un pilotage proactif.", "Extractions Excel mensuelles manuelles", "Déployer le Dashboard KPIs Temps Réel (Annexes A1-A5).", "🟠 Moyenne (Mois 3)"]},
    {"type": "row", "data": ["Réf 5.5\nAudits Internes", "Aucun programme d'audit interne ni auto-évaluation périodique.", "⚠️ Impossibilité de détecter les dérives avant l'apparition des crises.", "Aucun audit interne réalisé", "Instaurer le Planning & Trame d'Audit Interne (Annexes A6-A10).", "🟢 Consolidation (Mois 6)"]}
]



# ==============================================================================
# 1. RESTITUTION FLASH (DOCUMENT 1 GENERIQUE & ADAPTABLE)
# ==============================================================================

def generate_restitution_flash_docx(output_path):
    doc = docx.Document()
    
    for section in doc.sections:
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.7)
        section.right_margin = Inches(0.7)
        
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        
        header_img_path = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/.tmp/header_brand_unified_hd.png"
        if os.path.exists(header_img_path):
            hrun = hp.add_run()
            hrun.add_picture(header_img_path, width=Inches(7.1))
            
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        frun = fp.add_run("Cabinet Delacour - Support de Restitution Flash d'Audit SMQ\t\tPage ")
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

    # Title
    p_t = doc.add_paragraph()
    p_t.paragraph_format.space_after = Pt(2)
    r_t = p_t.add_run("SYNTHÈSE ET RESTITUTION FLASH DE DIRECTION")
    r_t.font.name = FONT_SERIF
    r_t.font.size = Pt(16)
    r_t.font.bold = True
    r_t.font.color.rgb = BRAND_GREEN

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(12)
    r_s = p_sub.add_run("Audit SMQ & Performance - Diagnostic Flash à Chaud & Top 3 Priorités Immédiates")
    r_s.font.name = FONT_SANS
    r_s.font.size = Pt(10.5)
    r_s.font.italic = True
    r_s.font.color.rgb = ACCENT_GOLD

    # Identity Box
    tbl_id = doc.add_table(rows=2, cols=2)
    tbl_id.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_id.autofit = False
    id_data = [
        ["Entreprise auditée : Société DÉMONSTRATION SAS (25 salariés)", "Date d'audit : 25/08/2026"],
        ["Dirigeant / Décideur : Direction Générale", "Auditeur référent : Cabinet Delacour"]
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

    # 1. Score de Maturité par Pilier (0/87)
    p_sc = doc.add_paragraph()
    p_sc.paragraph_format.space_after = Pt(4)
    r_sc = p_sc.add_run("1. SCORE GLOBAL DE MATURITÉ SMQ DELACOUR")
    r_sc.font.name = FONT_SERIF
    r_sc.font.size = Pt(12.5)
    r_sc.font.bold = True
    r_sc.font.color.rgb = BRAND_GREEN

    headers_sc = ["Pilier d'Évaluation", "Exigences Audités", "Score Max", "Score Obtenu", "Taux de Maturité", "Niveau Constaté"]
    tbl_sc = doc.add_table(rows=1, cols=len(headers_sc))
    tbl_sc.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_sc.autofit = False

    col_w_sc = [2800, 1400, 1300, 1400, 1500, 1800]
    for i, h in enumerate(headers_sc):
        tbl_sc.rows[0].cells[i].text = h
        set_explicit_cell_width(tbl_sc.rows[0].cells[i], col_w_sc[i])
        set_cell_background(tbl_sc.rows[0].cells[i], HEADER_BG)
        set_cell_margins(tbl_sc.rows[0].cells[i], top=50, bottom=50, left=40, right=40)
        p = tbl_sc.rows[0].cells[i].paragraphs[0]
        for r in p.runs:
            r.font.name = FONT_SANS
            r.font.size = Pt(8)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    dummy_sc = [
        ["Pilier 1 : Maîtrise des Risques & Pertes", "11 Clauses", "33 Points", "0 / 33", "0.0 %", "🔴 Zone Rouge"],
        ["Pilier 2 : Processus & Souveraineté Savoir", "12 Clauses", "36 Points", "0 / 36", "0.0 %", "🔴 Zone Rouge"],
        ["Pilier 3 : Pilotage Data & Agilité", "6 Clauses", "18 Points", "0 / 18", "0.0 %", "🔴 Zone Rouge"],
        ["SCORE GLOBAL SMQ DELACOUR", "29 Clauses", "87 Points", "0 / 87", "0.0 %", "🔴 Zone Rouge"]
    ]
    for r_idx, row in enumerate(dummy_sc):
        row_cells = tbl_sc.add_row().cells
        bg_hex = "F4F6F4" if r_idx == 3 else ("F9F9F7" if r_idx % 2 == 1 else "FFFFFF")
        for c_idx, val in enumerate(row):
            row_cells[c_idx].text = val
            set_explicit_cell_width(row_cells[c_idx], col_w_sc[c_idx])
            set_cell_background(row_cells[c_idx], bg_hex)
            set_cell_margins(row_cells[c_idx], top=40, bottom=40, left=40, right=40)
            set_cell_border(row_cells[c_idx], top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
            for p in row_cells[c_idx].paragraphs:
                for r in p.runs:
                    r.font.name = FONT_SANS
                    r.font.size = Pt(7.5)
                    if r_idx == 3:
                        r.font.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # 2. Cartes Visuelles des Top 3 Priorités
    p_pr = doc.add_paragraph()
    p_pr.paragraph_format.space_after = Pt(4)
    r_pr = p_pr.add_run("2. TOP 3 PRIORITÉS IMMÉDIATES CETTE SEMAINE (QUICK WINS 15J)")
    r_pr.font.name = FONT_SERIF
    r_pr.font.size = Pt(12.5)
    r_pr.font.bold = True
    r_pr.font.color.rgb = BRAND_GREEN

    # Insertion des 3 Cartes Visuelles
    for card in TOP_3_CARDS_DATA:
        box_card = doc.add_table(rows=1, cols=1)
        box_card.alignment = WD_TABLE_ALIGNMENT.CENTER
        c_card = box_card.cell(0, 0)
        set_explicit_cell_width(c_card, 10200)
        set_cell_background(c_card, CREAM_BG)
        set_cell_margins(c_card, top=100, bottom=100, left=140, right=140)
        set_cell_border(c_card, left={'sz': 24, 'val': 'single', 'color': '1B4D3E'},
                                top={'sz': 4, 'val': 'single', 'color': BORDER_GOLD},
                                bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
        cp_card = c_card.paragraphs[0]
        cp_card.paragraph_format.space_after = Pt(2)
        
        # Line 1: Header Badge
        r_num = cp_card.add_run(f"[{card['num']} - {card['badge']}]  ")
        r_num.font.name = FONT_SANS
        r_num.font.bold = True
        r_num.font.size = Pt(8.5)
        r_num.font.color.rgb = ACCENT_GOLD
        
        r_tit = cp_card.add_run(f"{card['title']}\n")
        r_tit.font.name = FONT_SERIF
        r_tit.font.bold = True
        r_tit.font.size = Pt(10)
        r_tit.font.color.rgb = BRAND_GREEN

        # Line 2: Problem & Solution
        r_body = cp_card.add_run(
            f"- Constat & Risque : {card['problem']}\n"
            f"- Action & Outil : {card['solution']}\n"
            f"- {card['benefit']}"
        )
        r_body.font.name = FONT_SANS
        r_body.font.size = Pt(8)

        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # 3. Orientations et Prochaines étapes
    p_qw = doc.add_paragraph()
    p_qw.paragraph_format.space_after = Pt(4)
    r_qw = p_qw.add_run("3. ORIENTATIONS DU PLAN D'ACTION ET ENGAGEMENT PRAGMATISME")
    r_qw.font.name = FONT_SERIF
    r_qw.font.size = Pt(12)
    r_qw.font.bold = True
    r_qw.font.color.rgb = BRAND_GREEN

    box = doc.add_table(rows=1, cols=1)
    box.alignment = WD_TABLE_ALIGNMENT.CENTER
    b_cell = box.cell(0, 0)
    set_explicit_cell_width(b_cell, 10200)
    set_cell_background(b_cell, CREAM_BG)
    set_cell_margins(b_cell, top=100, bottom=100, left=140, right=140)
    set_cell_border(b_cell, left={'sz': 24, 'val': 'single', 'color': BORDER_GOLD},
                            top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                            bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                            right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    cp = b_cell.paragraphs[0]
    cp.paragraph_format.space_after = Pt(4)
    
    txt_qw = (
        "ENGAGEMENT PRAGMATISME & ZÉRO BUREAUCRATIE DELACOUR :\n"
        "- Chaque outil déployé tient sur 1 page maximum et demande moins de 3 minutes de saisie par jour.\n"
        "- Intégration directe sur les outils déjà utilisés par vos équipes (papier, Excel, smartphone/tablette).\n"
        "- Seules les actions apportant un ROI mesurable sont conservées.\n\n"
        "ENGAGEMENT DE LIVRAISON DU RAPPORT COMPLET (SOUS 5 JOURS OUVRÉS) :\n"
        "1. Remise du Rapport d'Audit détaillé formalisant l'évaluation des 29 exigences.\n"
        "2. Feuille de Route à 3 Horizons (15j, 3m, 6m) adaptée à la taille et aux ressources de votre PME.\n"
        "3. Présentation des 2 Modalités d'Exécution : Autonomie par la PME ou Accompagnement Guidé par le Cabinet Delacour."
    )
    r_qwt = cp.add_run(txt_qw)
    r_qwt.font.name = FONT_SANS
    r_qwt.font.size = Pt(8.5)

    doc.save(output_path)

def generate_restitution_flash_html(output_path):
    html = """<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Restitution Flash d'Audit SMQ — Cabinet Delacour</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 30px; background-color: #fcfcfc; color: #222; }
        h1 { font-family: Georgia, serif; color: #1B4D3E; margin-bottom: 5px; }
        h2 { font-family: Georgia, serif; color: #1B4D3E; border-bottom: 2px solid #C5A065; padding-bottom: 5px; margin-top: 25px; }
        .subtitle { font-style: italic; color: #C5A065; margin-bottom: 20px; }
        .card-top3 { background-color: #F9F9F7; border-left: 5px solid #1B4D3E; border: 1px solid #D0D7D1; border-left-width: 5px; border-left-color: #1B4D3E; padding: 12px; margin-bottom: 12px; border-radius: 4px; }
        .badge { background-color: #1B4D3E; color: white; padding: 3px 8px; font-size: 11px; font-weight: bold; border-radius: 3px; }
        .badge-gold { background-color: #C5A065; color: white; padding: 3px 8px; font-size: 11px; font-weight: bold; border-radius: 3px; }
        .card-title { font-family: Georgia, serif; color: #1B4D3E; font-size: 15px; font-weight: bold; margin-top: 5px; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        th { background-color: #1B4D3E; color: white; padding: 10px; text-align: left; }
        td { padding: 8px; border: 1px solid #D0D7D1; }
        tr:nth-child(even) { background-color: #F9F9F7; }
    </style>
</head>
<body>
    <h1>SYNTHÈSE ET RESTITUTION FLASH DE DIRECTION</h1>
    <div class="subtitle">Diagnostic Flash à Chaud - Top 3 Priorités Visuelles PME (10-50 salariés)</div>
    
    <h2>1. SCORE GLOBAL DE MATURITÉ SMQ DELACOUR</h2>
    <table>
        <thead>
            <tr><th>Pilier d'Évaluation</th><th>Exigences</th><th>Score Max</th><th>Score Obtenu</th><th>Maturité (%)</th><th>Niveau Constaté</th></tr>
        </thead>
        <tbody>
            <tr><td>Pilier 1 : Maîtrise des Risques & Pertes</td><td>11 Clauses</td><td>33 Points</td><td>0 / 33</td><td>0.0 %</td><td>🔴 Zone Rouge</td></tr>
            <tr><td>Pilier 2 : Structuration & Souveraineté du Savoir</td><td>12 Clauses</td><td>36 Points</td><td>0 / 36</td><td>0.0 %</td><td>🔴 Zone Rouge</td></tr>
            <tr><td>Pilier 3 : Pilotage Data & Agilité</td><td>6 Clauses</td><td>18 Points</td><td>0 / 18</td><td>0.0 %</td><td>🔴 Zone Rouge</td></tr>
            <tr style="background-color:#F4F6F4; font-weight:bold; color:#1B4D3E;">
                <td>SCORE GLOBAL SMQ DELACOUR</td><td>29 Clauses</td><td>87 Points</td><td>0 / 87</td><td>0.0 %</td><td>🔴 Zone Rouge</td>
            </tr>
        </tbody>
    </table>

    <h2>2. TOP 3 PRIORITÉS IMMÉDIATES CETTE SEMAINE (QUICK WINS 15J)</h2>
"""
    for card in TOP_3_CARDS_DATA:
        html += f"""    <div class="card-top3">
        <div><span class="badge-gold">{card['num']}</span> <span class="badge">{card['badge']}</span></div>
        <div class="card-title">{card['title']}</div>
        <div style="font-size:13px; color:#333;">
            - <strong>Constat & Risque</strong> : {card['problem']}<br>
            - <strong>Action & Outil</strong> : {card['solution']}<br>
            - <strong>Horizon & Bénéfice</strong> : {card['benefit']}
        </div>
    </div>\n"""

    html += """
    <div class="card-top3" style="background-color:#F4F6F4; border-left-color:#C5A065;">
        <strong>3. ENGAGEMENT PRAGMATISME & ZÉRO BUREAUCRATIE</strong><br>
        - Des outils simples d'une page maximum, intégrés sur vos supports existants.<br>
        - Remise du Rapport Complet et de la Feuille de Route d'Exécution adaptée à la taille de votre PME.
    </div>
</body>
</html>
"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

def generate_restitution_flash_md(output_path):
    md = """# SYNTHÈSE ET RESTITUTION FLASH DE DIRECTION
> **Cabinet Delacour - Diagnostic Spécial PME (10-50 salariés)**

---

## 1. SCORE GLOBAL DE MATURITÉ SMQ DELACOUR

| Pilier d'Évaluation | Exigences | Score Max | Score Obtenu | Taux de Maturité (%) | Niveau Constaté |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Pilier 1 : Maîtrise des Risques & Pertes** | 11 Clauses | 33 Points | `0 / 33` | `0.0 %` | `🔴 Zone Rouge` |
| **Pilier 2 : Structuration & Souveraineté Savoir** | 12 Clauses | 36 Points | `0 / 36` | `0.0 %` | `🔴 Zone Rouge` |
| **Pilier 3 : Pilotage Data & Agilité** | 6 Clauses | 18 Points | `0 / 18` | `0.0 %` | `🔴 Zone Rouge` |
| **SCORE GLOBAL SMQ DELACOUR** | **29 Clauses** | **87 Points** | `0 / 87` | `0.0 %` | `🔴 Zone Rouge` |

---

## 2. TOP 3 PRIORITÉS IMMÉDIATES CETTE SEMAINE (QUICK WINS 15J)
"""
    for card in TOP_3_CARDS_DATA:
        md += f"""
> ### [{card['num']} - {card['badge']}] {card['title']}
> - **Constat & Risque** : {card['problem']}
> - **Action & Outil** : {card['solution']}
> - **Horizon & Bénéfice** : {card['benefit']}
"""

    md += """
---

## 3. PROCHAINES ÉTAPES

1. **Remise du Rapport d'Audit Complet** et diagnostic détaillé des 29 exigences.
2. **Feuille de Route d'Exécution sur-mesure** et présentation des 2 options d'accompagnement.
"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(md)


# ==============================================================================
# 2. RAPPORT COMPLET AVEC CARTES VISUELLES TOP 3 (DOCUMENT 2 EN 4 SECTIONS)
# ==============================================================================

def generate_rapport_complet_docx(output_path):
    doc = docx.Document()
    
    for section in doc.sections:
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.7)
        section.right_margin = Inches(0.7)
        
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        
        header_img_path = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/.tmp/header_brand_unified_hd.png"
        if os.path.exists(header_img_path):
            hrun = hp.add_run()
            hrun.add_picture(header_img_path, width=Inches(7.1))
            
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        frun = fp.add_run("Cabinet Delacour - Rapport d'Audit SMQ & Feuille de Route Stratégique PME\t\tPage ")
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

    # Title
    p_t = doc.add_paragraph()
    p_t.paragraph_format.space_after = Pt(2)
    r_t = p_t.add_run("RAPPORT D'AUDIT SMQ ET FEUILLE DE ROUTE STRATÉGIQUE PME")
    r_t.font.name = FONT_SERIF
    r_t.font.size = Pt(17)
    r_t.font.bold = True
    r_t.font.color.rgb = BRAND_GREEN

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(12)
    r_s = p_sub.add_run("Diagnostic d'Organisation PME (10-50 salariés), Valorisation de l'Existant & Plan Pragmatisme Zéro Bureaucratie")
    r_s.font.name = FONT_SANS
    r_s.font.size = Pt(11)
    r_s.font.italic = True
    r_s.font.color.rgb = ACCENT_GOLD

    # Identity Table
    tbl_id = doc.add_table(rows=2, cols=2)
    tbl_id.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_id.autofit = False
    id_data = [
        ["Entreprise auditée : Société DÉMONSTRATION SAS (25 salariés)", "Date d'émission : 25/08/2026"],
        ["Dirigeant / Décideur d'entreprise : Direction Générale", "Auditeur & Cabinet : Melchior Delacour - Cabinet Delacour"]
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

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ==========================================================================
    # SECTION 1 : SYNTHÈSE EXÉCUTIVE PME & CARTES VISUELLES TOP 3
    # ==========================================================================
    p_ch1 = doc.add_paragraph()
    p_ch1.paragraph_format.space_after = Pt(4)
    r_c1 = p_ch1.add_run("1. SYNTHÈSE EXÉCUTIVE ET SCORE GLOBAL DE MATURITÉ PME")
    r_c1.font.name = FONT_SERIF
    r_c1.font.size = Pt(13)
    r_c1.font.bold = True
    r_c1.font.color.rgb = BRAND_GREEN

    b1 = doc.add_table(rows=1, cols=1)
    b1.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell1 = b1.cell(0, 0)
    set_explicit_cell_width(cell1, 10200)
    set_cell_background(cell1, CREAM_BG)
    set_cell_margins(cell1, top=100, bottom=100, left=140, right=140)
    set_cell_border(cell1, left={'sz': 24, 'val': 'single', 'color': '1B4D3E'},
                           top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                           bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                           right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    cp1 = cell1.paragraphs[0]
    cp1.paragraph_format.space_after = Pt(4)
    txt_c1 = (
        "OBJECTIFS DE LA MISSION AUDIT SMQ DELACOUR :\n"
        "1. Évaluer objectivement l'organisation de votre PME face aux 29 exigences de la grille SMQ Delacour & ISO 9001:2015.\n"
        "2. Éliminer les pertes de marge, sécuriser le savoir-faire et libérer du temps pour vos managers.\n"
        "3. Co-construire un plan d'action d'une simplicité absolue, garanti 'Zéro Bureaucratie'.\n\n"
        "- Score de Maturité Global : 0 / 87 points (Taux de maturité : 0.0 % - 🔴 Zone Rouge).\n"
        "- Estimation des Gains Potentiels : ~12 à 15 heures / semaine de travail administratif libérées pour vos managers.\n"
        "- Engagement Pragmatisme : Chaque outil déployé tient sur 1 page maximum et s'intègre directement à votre quotidien."
    )
    r_t1 = cp1.add_run(txt_c1)
    r_t1.font.name = FONT_SANS
    r_t1.font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Cartes Visuelles des Top 3 Priorités Immédiates
    p_t3_hdr = doc.add_paragraph()
    p_t3_hdr.paragraph_format.space_after = Pt(4)
    r_t3h = p_t3_hdr.add_run("TOP 3 DES ACTIONS IMMÉDIATES CETTE SEMAINE (QUICK WINS 15J)")
    r_t3h.font.name = FONT_SERIF
    r_t3h.font.size = Pt(11)
    r_t3h.font.bold = True
    r_t3h.font.color.rgb = BRAND_GREEN

    for card in TOP_3_CARDS_DATA:
        box_card = doc.add_table(rows=1, cols=1)
        box_card.alignment = WD_TABLE_ALIGNMENT.CENTER
        c_card = box_card.cell(0, 0)
        set_explicit_cell_width(c_card, 10200)
        set_cell_background(c_card, CREAM_BG)
        set_cell_margins(c_card, top=100, bottom=100, left=140, right=140)
        set_cell_border(c_card, left={'sz': 24, 'val': 'single', 'color': '1B4D3E'},
                                top={'sz': 4, 'val': 'single', 'color': BORDER_GOLD},
                                bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
        cp_card = c_card.paragraphs[0]
        cp_card.paragraph_format.space_after = Pt(2)
        
        # Line 1: Header Badge
        r_num = cp_card.add_run(f"[{card['num']} - {card['badge']}]  ")
        r_num.font.name = FONT_SANS
        r_num.font.bold = True
        r_num.font.size = Pt(8.5)
        r_num.font.color.rgb = ACCENT_GOLD
        
        r_tit = cp_card.add_run(f"{card['title']}\n")
        r_tit.font.name = FONT_SERIF
        r_tit.font.bold = True
        r_tit.font.size = Pt(10)
        r_tit.font.color.rgb = BRAND_GREEN

        # Line 2: Problem & Solution
        r_body = cp_card.add_run(
            f"- Constat & Risque : {card['problem']}\n"
            f"- Action & Outil : {card['solution']}\n"
            f"- {card['benefit']}"
        )
        r_body.font.name = FONT_SANS
        r_body.font.size = Pt(8)

        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # Tableau Synthétique des Piliers
    headers_sc = ["Pilier d'Évaluation", "Exigences Audités", "Score Max", "Score Obtenu", "Taux de Maturité", "Niveau Constaté"]
    tbl_sc = doc.add_table(rows=1, cols=len(headers_sc))
    tbl_sc.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_sc.autofit = False

    col_w_sc = [2800, 1400, 1300, 1400, 1500, 1800]
    for i, h in enumerate(headers_sc):
        tbl_sc.rows[0].cells[i].text = h
        set_explicit_cell_width(tbl_sc.rows[0].cells[i], col_w_sc[i])
        set_cell_background(tbl_sc.rows[0].cells[i], HEADER_BG)
        set_cell_margins(tbl_sc.rows[0].cells[i], top=50, bottom=50, left=40, right=40)
        p = tbl_sc.rows[0].cells[i].paragraphs[0]
        for r in p.runs:
            r.font.name = FONT_SANS
            r.font.size = Pt(8)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    dummy_sc_rep = [
        ["Pilier 1 : Maîtrise des Risques & Pertes", "11 Clauses", "33 Points", "0 / 33", "0.0 %", "🔴 Zone Rouge"],
        ["Pilier 2 : Processus & Souveraineté Savoir", "12 Clauses", "36 Points", "0 / 36", "0.0 %", "🔴 Zone Rouge"],
        ["Pilier 3 : Pilotage Data & Agilité", "6 Clauses", "18 Points", "0 / 18", "0.0 %", "🔴 Zone Rouge"],
        ["SCORE GLOBAL SMQ DELACOUR", "29 Clauses", "87 Points", "0 / 87", "0.0 %", "🔴 Zone Rouge"]
    ]
    for r_idx, row in enumerate(dummy_sc_rep):
        row_cells = tbl_sc.add_row().cells
        bg_hex = "F4F6F4" if r_idx == 3 else ("F9F9F7" if r_idx % 2 == 1 else "FFFFFF")
        for c_idx, val in enumerate(row):
            row_cells[c_idx].text = val
            set_explicit_cell_width(row_cells[c_idx], col_w_sc[c_idx])
            set_cell_background(row_cells[c_idx], bg_hex)
            set_cell_margins(row_cells[c_idx], top=40, bottom=40, left=40, right=40)
            set_cell_border(row_cells[c_idx], top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
            for p in row_cells[c_idx].paragraphs:
                for r in p.runs:
                    r.font.name = FONT_SANS
                    r.font.size = Pt(7.5)
                    if r_idx == 3:
                        r.font.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ==========================================================================
    # SECTION 2 : DIAGNOSTIC UNIFIÉ EN LANGAGE BUSINESS PME (29 ITEMS)
    # ==========================================================================
    p_ch2 = doc.add_paragraph()
    p_ch2.paragraph_format.space_after = Pt(4)
    r_c2 = p_ch2.add_run("2. DIAGNOSTIC UNIFIÉ ET PLAN D'ACTION SUR-MESURE (29 ITEMS)")
    r_c2.font.name = FONT_SERIF
    r_c2.font.size = Pt(13)
    r_c2.font.bold = True
    r_c2.font.color.rgb = BRAND_GREEN

    p_sub2 = doc.add_paragraph()
    p_sub2.paragraph_format.space_after = Pt(4)
    r_sb2 = p_sub2.add_run("Ce tableau détaille le diagnostic des 29 sujets d'organisation. Les intitulés sont traduits en langage métier PME direct pour garantir une compréhension immédiate sans jargon normatif.")
    r_sb2.font.name = FONT_SANS
    r_sb2.font.size = Pt(8.5)
    r_sb2.font.italic = True

    headers_uni = ["Ref & Intitulé Métier", "Constat Factuel (Terrain)", "Impact ROI / Risque Identifié", "Dispositif Client Existant", "Solution Recommandée (Kit Delacour)", "Priorité & Horizon"]
    tbl_uni = doc.add_table(rows=1, cols=len(headers_uni))
    tbl_uni.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_uni.autofit = False

    col_w_uni = [1400, 2400, 1800, 1800, 1800, 1000]
    for i, h in enumerate(headers_uni):
        tbl_uni.rows[0].cells[i].text = h
        set_explicit_cell_width(tbl_uni.rows[0].cells[i], col_w_uni[i])
        set_cell_background(tbl_uni.rows[0].cells[i], HEADER_BG)
        set_cell_margins(tbl_uni.rows[0].cells[i], top=60, bottom=60, left=40, right=40)
        p = tbl_uni.rows[0].cells[i].paragraphs[0]
        for r in p.runs:
            r.font.name = FONT_SANS
            r.font.size = Pt(8)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    for item in ALL_29_AUDIT_ITEMS_PME:
        if item["type"] == "section_header":
            row_cells = tbl_uni.add_row().cells
            a_cell = row_cells[0]
            for c in row_cells[1:]:
                a_cell.merge(c)
            set_explicit_cell_width(a_cell, 10200)
            set_cell_background(a_cell, SUBHEADER_BG)
            set_cell_margins(a_cell, top=60, bottom=60, left=60, right=60)
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
            row_cells = tbl_uni.add_row().cells
            row_data = item["data"]
            for c_idx, val in enumerate(row_data):
                row_cells[c_idx].text = val
                set_explicit_cell_width(row_cells[c_idx], col_w_uni[c_idx])
                set_cell_background(row_cells[c_idx], "FFFFFF")
                set_cell_margins(row_cells[c_idx], top=50, bottom=50, left=40, right=40)
                set_cell_border(row_cells[c_idx], top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                                  bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                                  left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                                  right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
                for p in row_cells[c_idx].paragraphs:
                    for r in p.runs:
                        r.font.name = FONT_SANS
                        r.font.size = Pt(7.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ==========================================================================
    # SECTION 3 : FEUILLE DE ROUTE & CONDUITE DU CHANGEMENT PME
    # ==========================================================================
    p_ch3 = doc.add_paragraph()
    p_ch3.paragraph_format.space_after = Pt(4)
    r_c3 = p_ch3.add_run("3. FEUILLE DE ROUTE ET MODALITÉS D'ACCOMPAGNEMENT PME")
    r_c3.font.name = FONT_SERIF
    r_c3.font.size = Pt(13)
    r_c3.font.bold = True
    r_c3.font.color.rgb = BRAND_GREEN

    # Box Explicative des 2 Options d'Exécution
    b_opt = doc.add_table(rows=1, cols=1)
    b_opt.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell_opt = b_opt.cell(0, 0)
    set_explicit_cell_width(cell_opt, 10200)
    set_cell_background(cell_opt, CREAM_BG)
    set_cell_margins(cell_opt, top=100, bottom=100, left=140, right=140)
    set_cell_border(cell_opt, left={'sz': 24, 'val': 'single', 'color': BORDER_GOLD},
                              top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                              bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                              right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    cp_opt = cell_opt.paragraphs[0]
    cp_opt.paragraph_format.space_after = Pt(4)
    txt_opt = (
        "MODALITÉS DE MISE EN ŒUVRE DU PLAN D'ACTION :\n\n"
        "- OPTION A : DÉPLOIEMENT EN AUTONOMIE PAR LA PME\n"
        "La PME cliente reçoit le Rapport d'Audit Complet et le Pack des Outils Qualité Delacour. "
        "Les équipes internes assurent l'implémentation et le suivi des actions en toute autonomie.\n\n"
        "- OPTION B (RECOMMANDÉE) : PRESTATION D'ACCOMPAGNEMENT À L'EXÉCUTION (CABINET DELACOUR)\n"
        "Afin d'éviter que le plan d'action ne soit freiné par la charge de travail quotidienne de vos équipes, "
        "le Cabinet Delacour propose une formule d'accompagnement opérationnel sur 3 à 6 mois comprenant :\n"
        "  - 1 Comité de Pilotage bimensuel (COPIL 1h) pour suivre l'avancement et lever les verrous.\n"
        "  - Ateliers de travail terrain (2 demi-journées / mois) pour déployer et formaliser les outils directement avec les managers.\n"
        "  - Hotline & Support direct pour vos équipes afin de garantir un ancrage fluide et 'zéro bureaucratie'.\n\n"
        "💡 MINI-GUIDE CONDUITE DU CHANGEMENT POUR VOS ÉQUIPES :\n"
        "1. Présenter la démarche non comme un contrôle, mais comme un moyen de leur simplifier le travail quotidien.\n"
        "2. Valoriser les pratiques et outils déjà existants pour éviter tout sentiment de rejet.\n"
        "3. Les impliquer directement dans la rédaction des gammes opératoires pour qu'ils soient acteurs du changement."
    )
    r_opt = cp_opt.add_run(txt_opt)
    r_opt.font.name = FONT_SANS
    r_opt.font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Tableau de Gouvernance à 3 Horizons
    headers_gov = ["Jalon Temporel", "Objectifs d'Exécution Adaptés", "Livrables / Actions Retenues", "Option A (Autonomie)", "Option B (Accompagné)"]
    tbl_gov = doc.add_table(rows=1, cols=len(headers_gov))
    tbl_gov.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_gov.autofit = False
    col_w_gov = [1600, 3000, 3000, 1300, 1300]
    for i, h in enumerate(headers_gov):
        tbl_gov.rows[0].cells[i].text = h
        set_explicit_cell_width(tbl_gov.rows[0].cells[i], col_w_gov[i])
        set_cell_background(tbl_gov.rows[0].cells[i], HEADER_BG)
        set_cell_margins(tbl_gov.rows[0].cells[i], top=60, bottom=60, left=40, right=40)
        p = tbl_gov.rows[0].cells[i].paragraphs[0]
        for r in p.runs:
            r.font.name = FONT_SANS
            r.font.size = Pt(7.5)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    gov_rows = [
        ["Phase 1\n(Mois 1)", "Traiter les urgences critiques et sécuriser les marges (Quick Wins 15j).", "Revue des devis (Outil 08), Matrice RACI (Outil 20), Gammes visuelles (Outil 14) & Sauvegardes IT (Outil 25).", "Interne Client", "Binôme Delacour"],
        ["Phase 2\n(Mois 2-3)", "Standardiser l'exécution, piloter les sous-traitants et former les équipes.", "Évaluation sous-traitants (Outil 09), 5 Pourquoi (Outil 19), Matrice compétences (Outil 22).", "Interne Client", "Ateliers Delacour"],
        ["Phase 3\n(Mois 4-6)", "Automatiser le pilotage Data, la capitalisation du savoir et préparer la certification.", "Dashboard KPIs temps réel (A1-A5), Revue de Direction (Outil 05) & Audit Blanc (A6-A10).", "Interne Client", "Co-Pilotage Delacour"]
    ]
    for r_idx, row in enumerate(gov_rows):
        row_cells = tbl_gov.add_row().cells
        bg_hex = "F9F9F7" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row):
            row_cells[c_idx].text = val
            set_explicit_cell_width(row_cells[c_idx], col_w_gov[c_idx])
            set_cell_background(row_cells[c_idx], bg_hex)
            set_cell_margins(row_cells[c_idx], top=50, bottom=50, left=40, right=40)
            set_cell_border(row_cells[c_idx], top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                                              right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
            for p in row_cells[c_idx].paragraphs:
                for r in p.runs:
                    r.font.name = FONT_SANS
                    r.font.size = Pt(7.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ==========================================================================
    # SECTION 4 : PROCÈS-VERBAL DE CLÔTURE ET SIGNATURES
    # ==========================================================================
    p_pv = doc.add_paragraph()
    p_pv.paragraph_format.space_after = Pt(4)
    r_pv = p_pv.add_run("4. PROCÈS-VERBAL DE CLÔTURE ET SIGNATURES")
    r_pv.font.name = FONT_SERIF
    r_pv.font.size = Pt(13)
    r_pv.font.bold = True
    r_pv.font.color.rgb = BRAND_GREEN

    pv_box = doc.add_table(rows=1, cols=2)
    pv_box.alignment = WD_TABLE_ALIGNMENT.CENTER
    pv_box.autofit = False
    
    cell_l = pv_box.cell(0, 0)
    cell_r = pv_box.cell(0, 1)
    set_explicit_cell_width(cell_l, 5100)
    set_explicit_cell_width(cell_r, 5100)
    set_cell_background(cell_l, CREAM_BG)
    set_cell_background(cell_r, CREAM_BG)
    set_cell_margins(cell_l, top=100, bottom=100, left=100, right=100)
    set_cell_margins(cell_r, top=100, bottom=100, left=100, right=100)
    set_cell_border(cell_l, top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                            bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                            left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                            right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    set_cell_border(cell_r, top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                            bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                            left={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                            right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})

    pl = cell_l.paragraphs[0]
    pl.paragraph_format.space_after = Pt(2)
    r_pl = pl.add_run("POUR L'ENTREPRISE CLIENTE :\nFait à : Paris Le : 25/08/2026\n\nChoix retenu : [  ] Option A (Autonomie)   [ X ] Option B (Accompagné)\n\nSignature & Cachet du Dirigeant :")
    r_pl.font.name = FONT_SANS
    r_pl.font.size = Pt(8.5)

    pr = cell_r.paragraphs[0]
    pr.paragraph_format.space_after = Pt(2)
    r_pr = pr.add_run("POUR LE CABINET DELACOUR :\nFait à : Paris Le : 25/08/2026\n\nMelchior Delacour (Auditeur référent) :")
    r_pr.font.name = FONT_SANS
    r_pr.font.size = Pt(8.5)

    doc.save(output_path)

def generate_rapport_complet_html(output_path):
    html = """<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport d'Audit SMQ Adapté PME — Cabinet Delacour</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 30px; background-color: #fcfcfc; color: #222; line-height: 1.6; }
        h1 { font-family: Georgia, serif; color: #1B4D3E; margin-bottom: 5px; }
        h2 { font-family: Georgia, serif; color: #1B4D3E; border-bottom: 2px solid #C5A065; padding-bottom: 5px; margin-top: 25px; }
        .subtitle { font-style: italic; color: #C5A065; margin-bottom: 20px; }
        .box { background-color: #F9F9F7; border-left: 4px solid #1B4D3E; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
        .card-top3 { background-color: #F9F9F7; border-left: 5px solid #1B4D3E; border: 1px solid #D0D7D1; border-left-width: 5px; border-left-color: #1B4D3E; padding: 12px; margin-bottom: 12px; border-radius: 4px; }
        .badge { background-color: #1B4D3E; color: white; padding: 3px 8px; font-size: 11px; font-weight: bold; border-radius: 3px; }
        .badge-gold { background-color: #C5A065; color: white; padding: 3px 8px; font-size: 11px; font-weight: bold; border-radius: 3px; }
        .card-title { font-family: Georgia, serif; color: #1B4D3E; font-size: 15px; font-weight: bold; margin-top: 5px; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        th { background-color: #1B4D3E; color: white; padding: 10px; text-align: left; }
        td { padding: 8px; border: 1px solid #D0D7D1; }
        tr.section-hdr { background-color: #EBEFEA; font-weight: bold; color: #1B4D3E; }
        tr:nth-child(even):not(.section-hdr) { background-color: #F9F9F7; }
    </style>
</head>
<body>
    <h1>RAPPORT D'AUDIT SMQ ET FEUILLE DE ROUTE STRATÉGIQUE PME</h1>
    <div class="subtitle">Diagnostic d'Organisation PME (10-50 salariés) - Spécial Cartes Visuelles & Zéro Bureaucratie</div>
    
    <h2>1. SYNTHÈSE EXÉCUTIVE ET SCORE GLOBAL DE MATURITÉ PME</h2>
    <div class="box">
        <strong>SCORE GLOBAL DE MATURITÉ : 0 / 87 points (0.0 % - 🔴 Zone Rouge)</strong><br><br>
        - <strong>Gain de temps potentiel estimé</strong> : ~12 à 15 heures / semaine de travail administratif libérées pour vos managers.<br>
        - <strong>Engagement Pragmatisme</strong> : Des outils simples d'une page maximum, intégrés directement à vos habitudes terrain.
    </div>

    <h2>TOP 3 DES ACTIONS IMMÉDIATES CETTE SEMAINE (QUICK WINS 15J)</h2>
"""
    for card in TOP_3_CARDS_DATA:
        html += f"""    <div class="card-top3">
        <div><span class="badge-gold">{card['num']}</span> <span class="badge">{card['badge']}</span></div>
        <div class="card-title">{card['title']}</div>
        <div style="font-size:13px; color:#333;">
            - <strong>Constat & Risque</strong> : {card['problem']}<br>
            - <strong>Action & Outil</strong> : {card['solution']}<br>
            - <strong>Horizon & Bénéfice</strong> : {card['benefit']}
        </div>
    </div>\n"""

    html += """
    <h2>2. DIAGNOSTIC UNIFIÉ EN LANGAGE BUSINESS PME (29 ITEMS)</h2>
    <table>
        <thead>
            <tr><th>Ref & Intitulé Métier</th><th>Constat Factuel (Terrain)</th><th>Impact ROI / Risque Identifié</th><th>Dispositif Client Existant</th><th>Solution Recommandée (Kit Delacour)</th><th>Priorité</th></tr>
        </thead>
        <tbody>
"""
    for item in ALL_29_AUDIT_ITEMS_PME:
        if item["type"] == "section_header":
            html += f'            <tr class="section-hdr"><td colspan="6">{item["title"]}</td></tr>\n'
        else:
            d = item["data"]
            html += f'            <tr><td><strong>{d[0].replace(chr(10), "<br>")}</strong></td><td>{d[1]}</td><td>{d[2]}</td><td>{d[3]}</td><td>{d[4]}</td><td>{d[5]}</td></tr>\n'

    html += """        </tbody>
    </table>

    <h2>3. FEUILLE DE ROUTE & CONDUITE DU CHANGEMENT PME</h2>
    <div class="box">
        <strong>MODALITÉS DE MISE EN ŒUVRE :</strong><br>
        - <strong>OPTION A : DÉPLOIEMENT EN AUTONOMIE</strong>.<br>
        - <strong>OPTION B (RECOMMANDÉE) : PRESTATION D'ACCOMPAGNEMENT À L'EXÉCUTION</strong> (COPIL bimensuel, ateliers terrain et support direct par le Cabinet Delacour).<br><br>
        💡 <strong>Mini-Guide Conduite du Changement</strong> : Impliquer les équipes dès le départ et valoriser l'existant pour éviter toute réticence.
    </div>

    <table>
        <thead>
            <tr><th>Jalon Temporel</th><th>Objectifs d'Exécution Adaptés</th><th>Livrables / Actions Retenues</th><th>Option A (Autonomie)</th><th>Option B (Accompagné)</th></tr>
        </thead>
        <tbody>
            <tr><td>Phase 1 (Mois 1)</td><td>Urgences critiques & Quick Wins 15j</td><td>Revue devis (08), RACI (20), Gammes (14), Charte IT (25).</td><td>Interne Client</td><td>Binôme Delacour</td></tr>
            <tr><td>Phase 2 (Mois 2-3)</td><td>Standardisation & Sous-traitance</td><td>Évaluation sous-traitants (09), 5 Pourquoi (19), Compétences (22).</td><td>Interne Client</td><td>Ateliers Delacour</td></tr>
            <tr><td>Phase 3 (Mois 4-6)</td><td>Pilotage Data & Certification</td><td>Dashboard KPIs (A1-A5), Revue de Direction (05), Audit Blanc (A6-A10).</td><td>Interne Client</td><td>Co-Pilotage Delacour</td></tr>
        </tbody>
    </table>

    <h2>4. PROCÈS-VERBAL DE CLÔTURE ET SIGNATURES</h2>
    <p>Choix retenu : [  ] Option A (Autonomie) &nbsp;&nbsp;&nbsp; <strong>[ X ] Option B (Accompagné par le Cabinet Delacour)</strong></p>
</body>
</html>
"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

def generate_rapport_complet_md(output_path):
    md = """# RAPPORT D'AUDIT SMQ ET FEUILLE DE ROUTE STRATÉGIQUE PME
> **Diagnostic d'Organisation PME (10-50 salariés) - Spécial Cartes Visuelles & Zéro Bureaucratie**

---

## 1. SYNTHÈSE EXÉCUTIVE ET SCORE GLOBAL DE MATURITÉ PME
- **Score Global de Maturité** : `0 / 87 points` (`0.0 %` - `🔴 Zone Rouge`)
- **Gain de Temps Potentiel Estimé** : `~12 à 15 heures / semaine` de travail administratif libérées pour vos managers.
- **Engagement Pragmatisme** : Des outils simples d'une page maximum, intégrés directement à vos habitudes terrain.

### 🎯 TOP 3 DES ACTIONS IMMÉDIATES CETTE SEMAINE (QUICK WINS 15J) :
"""
    for card in TOP_3_CARDS_DATA:
        md += f"""
> #### [{card['num']} - {card['badge']}] {card['title']}
> - **Constat & Risque** : {card['problem']}
> - **Action & Outil** : {card['solution']}
> - **Horizon & Bénéfice** : {card['benefit']}
"""

    md += """
---

## 2. DIAGNOSTIC UNIFIÉ EN LANGAGE BUSINESS PME (29 ITEMS)

| Ref & Intitulé Métier | Constat Factuel (Terrain) | Impact ROI / Risque Identifié | Dispositif Client Existant | Solution Recommandée (Kit Delacour) | Priorité & Horizon |
| :--- | :--- | :--- | :--- | :--- | :---: |
"""
    for item in ALL_29_AUDIT_ITEMS_PME:
        if item["type"] == "section_header":
            md += f"| **{item['title']}** | | | | | |\n"
        else:
            d = item["data"]
            ref_clean = d[0].replace("\n", " ")
            md += f"| **{ref_clean}** | {d[1]} | {d[2]} | {d[3]} | {d[4]} | `{d[5]}` |\n"

    md += """
---

## 3. FEUILLE DE ROUTE & CONDUITE DU CHANGEMENT PME

### MODALITÉS DE MISE EN ŒUVRE :
- **OPTION A : DÉPLOIEMENT EN AUTONOMIE PAR LA PME**
- **OPTION B (RECOMMANDÉE) : PRESTATION D'ACCOMPAGNEMENT À L'EXÉCUTION (CABINET DELACOUR)**

| Jalon Temporel | Objectifs d'Exécution Adaptés | Livrables / Actions Retenues | Option A (Autonomie) | Option B (Accompagné) |
| :--- | :--- | :--- | :---: | :---: |
| **Phase 1 (Mois 1)** | Urgences critiques & Quick Wins 15j | Revue devis (08), RACI (20), Gammes (14), Charte IT (25). | Interne Client | Binôme Delacour |
| **Phase 2 (Mois 2-3)** | Standardisation & Sous-traitance | Fournisseurs (09), 5 Pourquoi (19), Compétences (22). | Interne Client | Ateliers Delacour |
| **Phase 3 (Mois 4-6)** | Pilotage Data & Certification | Dashboard KPIs (A1-A5), Revue Direction (05), Audit Blanc (A6-A10). | Interne Client | Co-Pilotage Delacour |

---

## 4. PROCÈS-VERBAL DE CLÔTURE ET SIGNATURES
Choix de mise en œuvre retenu par l'entreprise : `[  ] Option A (Autonomie)`  /  `[ X ] Option B (Accompagné par le Cabinet Delacour)`
"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(md)

def main():
    dest_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE"
    os.makedirs(os.path.join(dest_dir, "DOCX"), exist_ok=True)
    os.makedirs(os.path.join(dest_dir, "HTML"), exist_ok=True)
    os.makedirs(os.path.join(dest_dir, "MD"), exist_ok=True)

    # Document 1 : Restitution Flash
    generate_restitution_flash_docx(os.path.join(dest_dir, "DOCX", "SUPPORT_RESTITUTION_FLASH_DELACOUR.docx"))
    generate_restitution_flash_html(os.path.join(dest_dir, "HTML", "SUPPORT_RESTITUTION_FLASH_DELACOUR.html"))
    generate_restitution_flash_md(os.path.join(dest_dir, "MD", "SUPPORT_RESTITUTION_FLASH_DELACOUR.md"))

    generate_restitution_flash_docx(os.path.join(dest_dir, "03_INTERVENTION_SUR_SITE_JOUR_J", "SUPPORT_RESTITUTION_FLASH_DELACOUR.docx"))
    generate_restitution_flash_html(os.path.join(dest_dir, "SUPPORT_RESTITUTION_FLASH_DELACOUR.html"))
    generate_restitution_flash_md(os.path.join(dest_dir, "SUPPORT_RESTITUTION_FLASH_DELACOUR.md"))

    # Document 2 : Rapport Complet Spécial Cartes Visuelles Top 3 (4 Sections)
    generate_rapport_complet_docx(os.path.join(dest_dir, "DOCX", "RAPPORT_AUDIT_SMQ_ET_PLAN_D_ACTION_DELACOUR.docx"))
    generate_rapport_complet_html(os.path.join(dest_dir, "HTML", "RAPPORT_AUDIT_SMQ_ET_PLAN_D_ACTION_DELACOUR.html"))
    generate_rapport_complet_md(os.path.join(dest_dir, "MD", "RAPPORT_AUDIT_SMQ_ET_PLAN_D_ACTION_DELACOUR.md"))

    generate_rapport_complet_docx(os.path.join(dest_dir, "04_RESTITUTION_ET_GOUVERNANCE", "RAPPORT_AUDIT_SMQ_ET_PLAN_D_ACTION_DELACOUR.docx"))
    generate_rapport_complet_html(os.path.join(dest_dir, "RAPPORT_AUDIT_SMQ_ET_PLAN_D_ACTION_DELACOUR.html"))
    generate_rapport_complet_md(os.path.join(dest_dir, "RAPPORT_AUDIT_SMQ_ET_PLAN_D_ACTION_DELACOUR.md"))

    print("✅ Rapport d'Audit avec Cartes Visuelles Exécutives pour le Top 3 généré avec succès !")

if __name__ == "__main__":
    main()
