# -*- coding: utf-8 -*-
"""
CABINET DELACOUR - LES 10 OUTILS COMMANDO CASH & RENTABILITE PME
Livrables opérationnels réels alignés 1 pour 1 sur la Grille d'Audit de Robustesse (21 questions).
Chaque document est un gabarit professionnel complet (2 pages : Recto Template / Verso Protocole & Scripts).
"""

import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

sys.path.insert(0, "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/execution")
from commando_style import (
    create_base_document, set_cell_background, set_cell_margins,
    set_cell_border, set_explicit_cell_width, format_word_table,
    BRAND_GREEN, DARK_GREEN, LIGHT_GREEN, GOLD, WHITE, GREEN_TEXT, RED_TEXT, MUTED_TEXT,
    CREAM_BG, WHY_BG, CASH_BG, HEADER_BG, SUBHDR_BG, BORDER_ACCENT,
    FONT_SERIF, FONT_SANS, HEADER_IMG_PATH
)

OUTPUT_DIR = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_RENTABILITE_DELACOUR/01_LES_10_OUTILS_COMMANDO"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def add_tool_header(doc, tool_code, tool_name, audit_ref, subtitle):
    if os.path.exists(HEADER_IMG_PATH):
        p_img = doc.add_paragraph()
        p_img.paragraph_format.space_before = Pt(0)
        p_img.paragraph_format.space_after = Pt(2)
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_img = p_img.add_run()
        run_img.add_picture(HEADER_IMG_PATH, width=Inches(7.35))
    
    tbl_title = doc.add_table(rows=1, cols=1)
    tbl_title.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_title.autofit = False
    c_title = tbl_title.cell(0, 0)
    set_explicit_cell_width(c_title, 10200)
    set_cell_background(c_title, CREAM_BG)
    set_cell_margins(c_title, top=50, bottom=50, left=100, right=100)
    set_cell_border(c_title, left={'sz': 24, 'val': 'single', 'color': 'C5A065'},
                             top={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT},
                             bottom={'sz': 12, 'val': 'single', 'color': '1B4D3E'},
                             right={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
    
    p = c_title.paragraphs[0]
    p.paragraph_format.space_after = Pt(1)
    r_num = p.add_run(f"OUTIL {tool_code}  •  ")
    r_num.font.name = FONT_SERIF
    r_num.font.size = Pt(11)
    r_num.font.bold = True
    r_num.font.color.rgb = GOLD
    
    r_tit = p.add_run(tool_name.upper())
    r_tit.font.name = FONT_SERIF
    r_tit.font.size = Pt(12)
    r_tit.font.bold = True
    r_tit.font.color.rgb = BRAND_GREEN
    
    r_ref = p.add_run(f"   [{audit_ref}]")
    r_ref.font.name = FONT_SANS
    r_ref.font.size = Pt(8.5)
    r_ref.font.bold = True
    r_ref.font.color.rgb = MUTED_TEXT
    
    p_sub = c_title.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(0)
    r_sub = p_sub.add_run(f"« {subtitle} »")
    r_sub.font.name = FONT_SANS
    r_sub.font.size = Pt(9)
    r_sub.font.italic = True
    r_sub.font.color.rgb = DARK_GREEN

def add_section_title(doc, title_text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(title_text.upper())
    r.font.name = FONT_SERIF
    r.font.size = Pt(9)
    r.font.bold = True
    r.font.color.rgb = BRAND_GREEN

def add_meta_table(doc, meta_dict):
    tbl = doc.add_table(rows=len(meta_dict), cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    col_w = [3400, 6800]
    for i, (k, v) in enumerate(meta_dict.items()):
        c0, c1 = tbl.cell(i, 0), tbl.cell(i, 1)
        set_explicit_cell_width(c0, col_w[0])
        set_explicit_cell_width(c1, col_w[1])
        set_cell_background(c0, SUBHDR_BG)
        set_cell_background(c1, "FFFFFF" if i%2==0 else CREAM_BG)
        set_cell_margins(c0, 25, 25, 60, 60)
        set_cell_margins(c1, 25, 25, 70, 70)
        set_cell_border(c0, bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
        set_cell_border(c1, bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
        
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(0)
        r0 = p0.add_run(k)
        r0.font.name = FONT_SANS
        r0.font.size = Pt(8)
        r0.font.bold = True
        r0.font.color.rgb = DARK_GREEN
        
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(v)
        r1.font.name = FONT_SANS
        r1.font.size = Pt(8)
        r1.font.color.rgb = MUTED_TEXT

def add_verso_protocol(doc, regle_dor, protocol_steps, magic_scripts, boss_test):
    doc.add_page_break()
    p_top = doc.add_paragraph()
    p_top.paragraph_format.space_before = Pt(0)
    p_top.paragraph_format.space_after = Pt(4)
    r_top = p_top.add_run("CABINET DELACOUR  •  PROTOCOLE D'EXPLOITATION & SCRIPTS TERRAIN (PAGE 2 / 2)")
    r_top.font.name = FONT_SANS
    r_top.font.size = Pt(8)
    r_top.font.bold = True
    r_top.font.color.rgb = GOLD
    
    # 1. Règle d'or
    tbl_r = doc.add_table(rows=1, cols=1)
    tbl_r.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_r.autofit = False
    cr = tbl_r.cell(0, 0)
    set_explicit_cell_width(cr, 10200)
    set_cell_background(cr, HEADER_BG)
    set_cell_margins(cr, 50, 50, 100, 100)
    set_cell_border(cr, left={'sz': 24, 'val': 'single', 'color': 'C5A065'})
    pr0 = cr.paragraphs[0]
    pr0.paragraph_format.space_after = Pt(1)
    rr0 = pr0.add_run("1. LA RÈGLE D'OR ABSOLUE DU DIRIGEANT")
    rr0.font.name = FONT_SERIF
    rr0.font.size = Pt(8.5)
    rr0.font.bold = True
    rr0.font.color.rgb = GOLD
    
    pr1 = cr.add_paragraph()
    pr1.paragraph_format.space_after = Pt(0)
    rr1 = pr1.add_run(f"« {regle_dor} »")
    rr1.font.name = FONT_SERIF
    rr1.font.size = Pt(9.5)
    rr1.font.bold = True
    rr1.font.color.rgb = WHITE
    
    # 2. Protocole opérationnel pas-à-pas
    add_section_title(doc, "2. PROTOCOLE D'APPLICATION EN 3 ÉTAPES (QUI ? QUAND ? COMMENT ?)")
    tbl_p = doc.add_table(rows=len(protocol_steps), cols=2)
    tbl_p.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_p.autofit = False
    col_wp = [2200, 8000]
    for i, (step_lbl, step_desc) in enumerate(protocol_steps):
        cp0, cp1 = tbl_p.cell(i, 0), tbl_p.cell(i, 1)
        set_explicit_cell_width(cp0, col_wp[0])
        set_explicit_cell_width(cp1, col_wp[1])
        set_cell_background(cp0, SUBHDR_BG)
        set_cell_background(cp1, "FFFFFF" if i%2==0 else CREAM_BG)
        set_cell_margins(cp0, 25, 25, 60, 60)
        set_cell_margins(cp1, 25, 25, 70, 70)
        set_cell_border(cp0, bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
        set_cell_border(cp1, bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
        
        pp0 = cp0.paragraphs[0]
        pp0.paragraph_format.space_after = Pt(0)
        rp0 = pp0.add_run(step_lbl)
        rp0.font.name = FONT_SANS
        rp0.font.size = Pt(8)
        rp0.font.bold = True
        rp0.font.color.rgb = BRAND_GREEN
        
        pp1 = cp1.paragraphs[0]
        pp1.paragraph_format.space_after = Pt(0)
        rp1 = pp1.add_run(step_desc)
        rp1.font.name = FONT_SANS
        rp1.font.size = Pt(8)
        rp1.font.color.rgb = DARK_GREEN
        
    # 3. Scripts mot-à-mot
    add_section_title(doc, "3. LES PHRASES MAGIQUES MOT-À-MOT (DÉSAMORCER LES CONFLITS)")
    tbl_s = doc.add_table(rows=len(magic_scripts), cols=1)
    tbl_s.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_s.autofit = False
    for i, (sit, quote) in enumerate(magic_scripts):
        cs = tbl_s.cell(i, 0)
        set_explicit_cell_width(cs, 10200)
        set_cell_background(cs, CREAM_BG if i%2==0 else "FFFFFF")
        set_cell_margins(cs, 25, 25, 70, 70)
        set_cell_border(cs, left={'sz': 16, 'val': 'single', 'color': 'C5A065'},
                            bottom={'sz': 4, 'val': 'single', 'color': BORDER_ACCENT})
        ps0 = cs.paragraphs[0]
        ps0.paragraph_format.space_after = Pt(1)
        rs0 = ps0.add_run(f"SITUATION : {sit}")
        rs0.font.name = FONT_SANS
        rs0.font.size = Pt(7.8)
        rs0.font.bold = True
        rs0.font.color.rgb = BRAND_GREEN
        
        ps1 = cs.add_paragraph()
        ps1.paragraph_format.space_after = Pt(0)
        rs1 = ps1.add_run(f"👉 DITES EXACTEMENT : « {quote} »")
        rs1.font.name = FONT_SANS
        rs1.font.size = Pt(8)
        rs1.font.italic = True
        rs1.font.color.rgb = DARK_GREEN
        
    # 4. Test 30s du dirigeant
    add_section_title(doc, "4. LE TEST FLASH DU DIRIGEANT (30 SECONDES CHRONO)")
    tbl_t = doc.add_table(rows=1, cols=1)
    tbl_t.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_t.autofit = False
    ct = tbl_t.cell(0, 0)
    set_explicit_cell_width(ct, 10200)
    set_cell_background(ct, CASH_BG)
    set_cell_margins(ct, 30, 30, 70, 70)
    set_cell_border(ct, left={'sz': 16, 'val': 'single', 'color': '1B4D3E'})
    pt = ct.paragraphs[0]
    pt.paragraph_format.space_after = Pt(0)
    rt = pt.add_run(f"🔍 TEST IMMÉDIAT : {boss_test}")
    rt.font.name = FONT_SANS
    rt.font.size = Pt(8)
    rt.font.bold = True
    rt.font.color.rgb = BRAND_GREEN

# ==============================================================================
# LES 10 OUTILS ALIGNÉS 1:1 SUR L'AUDIT
# ==============================================================================

def generate_tool_01():
    doc = create_base_document()
    add_tool_header(doc, "01", "CADRAGE DES DEVIS & REGISTRE DES AVENANTS", "RÉPONSE AUDIT 1.1 À 1.4", "Verrouillage de la marge plancher et facturation à 100% des travaux supplémentaires")
    
    # 1. Paramètres
    add_section_title(doc, "1. PARAMÈTRES FINANCIERS DE L'AFFAIRE & SEUILS DE SÉCURITÉ")
    meta = {
        "N° de Devis / Affaire :" : "[ Ex: DEV-2026-084 ]",
        "Client / Raison Sociale :" : "[ Nom du Client ]",
        "Taux Horaire MO Retenu :" : "[ Ex: 55,00 EUR / h chargé ]",
        "Marge Brute Plancher Obligatoire :" : "[ Ex: Minimum 35,00 % (Bloquant si inférieur) ]",
        "Acompte Exigé à la Commande :" : "30% DU MONTANT TOTAL HT (Condition suspensive de démarrage)"
    }
    add_meta_table(doc, meta)
    
    # 2. Checklist 5 verrous
    add_section_title(doc, "2. CONTRÔLE AVANT ENVOI DU DEVIS (5 VERROUS ÉLIMINATOIRES)")
    headers_ck = ["POINT DE CONTRÔLE ÉLIMINATOIRE", "CONFORME ?", "COMMENTAIRES & AJUSTEMENTS"]
    col_w_ck = [5000, 1800, 3400]
    rows_ck = [
        ["1. Prix d'achats matières et sous-traitance actualisés (< 15j)", "[ OUI / NON ]", "[ Devis fournisseurs fermes vérifiés ]"],
        ["2. Heures de fabrication et d'installation validées terrain", "[ OUI / NON ]", "[ Temps validé par le responsable technique ]"],
        ["3. Temps de trajet, transport et aléas expressément chiffrés", "[ OUI / NON ]", "[ Déplacements comptés au vrai coût ]"],
        ["4. Marge brute calculée égale ou supérieure au seuil plancher", "[ OUI / NON ]", "[ Si NON : Visa Direction obligatoire ]"],
        ["5. Acompte 30% et clause de réserve de propriété incluses", "[ OUI / NON ]", "[ CGV jointes au devis avec case à cocher ]"]
    ]
    format_word_table(doc, headers_ck, rows_ck, col_widths_dxa=col_w_ck, center_cols=[1])
    
    # 3. Registre des Avenants
    add_section_title(doc, "3. REGISTRE DES TRAVAUX SUPPLÉMENTAIRES (BON FLASH D'AVENANT TERRAIN)")
    headers_av = ["N°", "DESCRIPTION DE L'EXTRA DEMANDÉ SUR PLACE", "HEURES", "ACHATS", "MONTANT HT", "ACCORD CLIENT", "STATUT FACTURE"]
    col_w_av = [600, 3600, 1000, 1100, 1300, 1300, 1300]
    rows_av = [
        ["AV1", "Rallongement câblage et support mural inox", "3,5 h", "120 €", "450 € HT", "SIGNÉ LE 12/03", "Facturé n°102"],
        ["AV2", "Prestation supplémentaire hors devis initial", "2,0 h", "0 €", "220 € HT", "SIGNÉ LE 15/03", "À facturer"],
        ["AV3", "[ Inscrire le travail supplémentaire demandé... ]", "[  h ]", "[  € ]", "[  € HT ]", "[ Signature ]", "[ À intégrer ]"]
    ]
    format_word_table(doc, headers_av, rows_av, col_widths_dxa=col_w_av, center_cols=[0, 2, 5, 6])
    
    # 4. Signatures & Dérogation
    add_section_title(doc, "4. VISA COMMERCIAL & DÉROGATION DIRECTION SI MARGE < PLANCHER")
    tbl_sig = doc.add_table(rows=1, cols=2)
    tbl_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_sig.autofit = False
    cs0, cs1 = tbl_sig.cell(0, 0), tbl_sig.cell(0, 1)
    set_explicit_cell_width(cs0, 5100)
    set_explicit_cell_width(cs1, 5100)
    set_cell_background(cs0, CASH_BG)
    set_cell_background(cs1, WHY_BG)
    set_cell_margins(cs0, 30, 30, 60, 60)
    set_cell_margins(cs1, 30, 30, 60, 60)
    set_cell_border(cs0, left={'sz': 16, 'val': 'single', 'color': '1B4D3E'})
    set_cell_border(cs1, left={'sz': 16, 'val': 'single', 'color': '8A2BE2'})
    
    p0 = cs0.paragraphs[0]
    p0.paragraph_format.space_after = Pt(1)
    p0.add_run("CHARGÉ D'AFFAIRES / CHIFFREUR :\nDate & Visa : __________________\n« Certifie les 5 verrous vérifiés »").font.size = Pt(7.8)
    
    p1 = cs1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(1)
    p1.add_run("DIRECTION GÉNÉRALE (SI DÉROGATION MARGE) :\nAccord exceptionnel : [  ] OUI  [  ] NON\nMotif : ________________________").font.size = Pt(7.8)

    # VERSO
    regle = "AUCUN COMPAGNON NE COMMENCE UN TRAVAIL SUPPLÉMENTAIRE SANS ACCORD ÉCRIT ET CHIFFRÉ DU CLIENT."
    steps = [
        ("Étape 1 (Avant envoi devis)", "Le chiffreur vérifie les 5 verrous en 60 secondes. Si la marge est sous le plancher, le devis est bloqué pour arbitrage Direction."),
        ("Étape 2 (Pendant l'affaire)", "Dès qu'un client demande un extra sur le terrain, remplir la ligne du tableau Avenant et faire signer le client avant démarrage."),
        ("Étape 3 (Facturation)", "La facture de solde intègre d'office 100% des avenants signés joints en annexe.")
    ]
    scripts = [
        ("Quand le client demande un extra oral : 'Tu peux me rajouter ça ?'",
         "Avec grand plaisir Monsieur Dupont ! Je vous note le montant sur le bon flash, vous me signez la ligne et les gars vous font ça tout de suite."),
        ("Si le client conteste le principe de payer l'extra :",
         "Je comprends tout à fait. Si vous préférez, on s'en tient strictement au devis initial validé ensemble sans toucher à cette partie.")
    ]
    test = "Ouvrez le dossier de la dernière affaire livrée. Comparez les heures passées vs devis initial. S'il y a des heures en plus non facturées, l'Outil 01 n'est pas appliqué."
    add_verso_protocol(doc, regle, steps, scripts, test)
    doc.save(os.path.join(OUTPUT_DIR, "OUTIL_01_LE_VERROU_MARGE.docx"))
    print("Generated 01")

def generate_tool_02():
    doc = create_base_document()
    add_tool_header(doc, "02", "PROCÈS-VERBAL DE RÉCEPTION & ACCORD 95/5", "RÉPONSE AUDIT 2.1 À 2.3", "Validation contradictoire d'achèvement, plafonnement des réserves à 5% et facturation sous 24h")
    
    add_section_title(doc, "1. IDENTIFICATION CONTRACTUELLE DE L'OUVRAGE LIVRÉ")
    meta = {
        "N° de PV / Réf Affaire :" : "[ Ex: PV-2026-112 ]",
        "Client / Chantier / Lieu :" : "[ Nom du Client - Adresse du site ]",
        "Date d'Achèvement des Travaux :" : "[ Date effective de remise ]",
        "Montant Total Contrat HT :" : "[ Montant du marché initial ]",
        "Montant Exigible Immédiat (95%) :" : "[ 95% du montant total HT (Paiement sans délai) ]",
        "Retenue Maximale Réserves (5%) :" : "[ Plafonné à 5% max - Levée garantie sous 7 jours ]"
    }
    add_meta_table(doc, meta)
    
    add_section_title(doc, "2. CONSTAT CONTRADICTOIRE D'ACHÈVEMENT (4 POINTS DE CONTRÔLE)")
    headers_ct = ["ÉLÉMENT VÉRIFIÉ EN PRÉSENCE DU CLIENT", "CRITÈRE DE CONFORMITÉ", "CONFORME ?", "OBSERVATION"]
    col_w_ct = [4000, 2800, 1400, 2000]
    rows_ct = [
        ["1. Achèvement des travaux contractuels", "Prestation exécutée selon devis", "CONFORME", "Ouvrage complet"],
        ["2. Essais de fonctionnement et sécurité", "Mise en service réussie sans dysfonctionnement", "CONFORME", "Tests opérationnels"],
        ["3. Nettoyage du site et repli", "Lieux propres, déchets évacués", "CONFORME", "Zone propre"],
        ["4. Remise des notices et documents", "Fiches techniques et notices remises", "[ OUI / NON ]", "Remise le jour même"]
    ]
    format_word_table(doc, headers_ct, rows_ct, col_widths_dxa=col_w_ct, center_cols=[2])
    
    add_section_title(doc, "3. TRAITEMENT DES RÉSERVES MINEURES (PLAFONNÉES À 5% - LEVÉE SOUS 7 JOURS)")
    headers_res = ["N°", "DESCRIPTION PRÉCISE DE LA RETOUCHE", "RETENUE MAX (5%)", "DATE LIMITE LEVÉE", "VISA LEVÉE"]
    col_w_res = [600, 4400, 2000, 1800, 1400]
    rows_res = [
        ["R1", "Ajustement cosmétique ou joint de finition", "Max 5% facture", "Sous 7 jours max", "[ OUI / NON ]"],
        ["R2", "[ Inscrire toute réserve constatée... ]", "[ Montant retenu ]", "[ Date limite ]", "[   ]"]
    ]
    format_word_table(doc, headers_res, rows_res, col_widths_dxa=col_w_res, center_cols=[0, 4])
    
    add_section_title(doc, "4. SIGNATURES CONTRADICTOIRES OPPOSABLES (ACCORD DE PAIEMENT DES 95%)")
    tbl_sig = doc.add_table(rows=1, cols=2)
    tbl_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_sig.autofit = False
    cs0, cs1 = tbl_sig.cell(0, 0), tbl_sig.cell(0, 1)
    set_explicit_cell_width(cs0, 5100)
    set_explicit_cell_width(cs1, 5100)
    set_cell_background(cs0, CASH_BG)
    set_cell_background(cs1, SUBHDR_BG)
    set_cell_margins(cs0, 30, 30, 60, 60)
    set_cell_margins(cs1, 30, 30, 60, 60)
    set_cell_border(cs0, left={'sz': 16, 'val': 'single', 'color': '1B4D3E'})
    set_cell_border(cs1, left={'sz': 16, 'val': 'single', 'color': 'C5A065'})
    
    p0 = cs0.paragraphs[0]
    p0.paragraph_format.space_after = Pt(1)
    p0.add_run("POUR LE CLIENT (BON POUR RÉCEPTION & ACCORD 95%) :\nSignature & Tampon : ________________________\n« Autorise la mise en paiement immédiate des 95% »").font.size = Pt(7.8)
    
    p1 = cs1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(1)
    p1.add_run("POUR L'ENTREPRISE (ENGAGEMENT DE LEVÉE 7 JOURS) :\nSignature : ________________________\n« S'engage à lever les réserves ci-dessus sous 7 jours »").font.size = Pt(7.8)

    # VERSO
    regle = "ON NE QUITTE JAMAIS UN SITE SANS LE PV SIGNÉ. UNE LIVRAISON SANS SIGNATURE = 60 JOURS DE RETARD DE PAIEMENT."
    steps = [
        ("Étape 1 (Fin de chantier)", "Faire le tour de l'ouvrage avec le client. Cocher les 4 points de conformité et lister les retouches éventuelles (plafonnées à 5%)."),
        ("Étape 2 (Signature sur place)", "Faire signer et tamponner le PV immédiatement avant le départ de l'équipe."),
        ("Étape 3 (Facturation 24h)", "Photo du PV transmise par mail ou WhatsApp à la comptabilité avant 17h00. Émission de la facture sous 24h chrono.")
    ]
    scripts = [
        ("Quand le client veut bloquer 100% du paiement pour un détail :",
         "Monsieur Dupont, 95% de l'ouvrage fonctionne parfaitement. La règle équitable consiste à réserver 5% le temps de poser le cache sous 7 jours, et à régler les 95% à échéance sans blocage."),
        ("Quand le client dit : 'Laissez le bon là, je signerai plus tard' :",
         "Mon patron m'interdit formellement de quitter le site sans votre visa pour activer votre garantie légale. On vérifie les 4 cases en 60 secondes et je vous libère.")
    ]
    test = "Vérifiez combien de dossiers achevés le mois dernier attendent encore leur PV de réception signé. Si > 0, l'Outil 02 n'est pas appliqué."
    add_verso_protocol(doc, regle, steps, scripts, test)
    doc.save(os.path.join(OUTPUT_DIR, "OUTIL_02_LA_REGLE_95_5.docx"))
    print("Generated 02")

def generate_tool_03():
    doc = create_base_document()
    add_tool_header(doc, "03", "GESTION DES LITIGES & RECOURS FOURNISSEURS", "RÉPONSE AUDIT 2.4 & 2.5", "Encadrement strict des avoirs clients et répercussion systématique des préjudices sur les tiers sous 48h")
    
    add_section_title(doc, "1. IDENTIFICATION DU LITIGE & IMPUTABILITÉ")
    meta = {
        "N° de Litige :" : "[ Ex: LIT-2026-031 ]",
        "Client Réclamant / Affaire :" : "[ Nom Client & N° Commande ]",
        "Tiers Présumé Responsable :" : "[ Nom du Fournisseur, Transporteur ou Sous-traitant ]",
        "Origine Prouvée du Défaut :" : "[ Ex: Pièce défectueuse livrée / Retard transport / Casse externe ]",
        "Imputabilité Établie :" : "[  ] 100% Tiers défaillant   [  ] Partagée   [  ] Erreur interne"
    }
    add_meta_table(doc, meta)
    
    add_section_title(doc, "2. DÉCOMPTE DU PRÉJUDICE FINANCIER SUBI PAR L'ENTREPRISE")
    headers_pj = ["POSTE DE COÛT DIRECT", "QUANTITÉ / DURÉE", "TAUX / PRIX UNITAIRE", "COÛT HT SUBI"]
    col_w_pj = [4200, 2000, 2000, 2000]
    rows_pj = [
        ["Matières premières ou composants gâchés", "[ Quantité ]", "[ Prix unitaire ]", "[  € HT ]"],
        ["Heures d'équipes perdues / temps de retouche", "[ Heures MO ]", "[ Taux horaire chargé ]", "[  € HT ]"],
        ["Frais de déplacement / transport supplémentaire", "[ Frais réels ]", "[ Facture transport ]", "[  € HT ]"],
        ["COÛT TOTAL DU PRÉJUDICE FINANCIER DIRECT", "-", "-", "[ TOTAL € HT ]"]
    ]
    format_word_table(doc, headers_pj, rows_pj, col_widths_dxa=col_w_pj, center_cols=[1, 2, 3])
    
    add_section_title(doc, "3. PROCÉDURE DE RECOURS & NOTE DE DÉBIT TIERS (SOUS 48H CHRONO)")
    headers_rc = ["ACTION DE RECOURS TIERS", "PREUVES JOINTES", "MONTANT DÉBITÉ", "STATUT RÉCUPÉRATION"]
    col_w_rc = [3400, 2600, 2200, 2000]
    rows_rc = [
        ["Déduction sur prochaine facture fournisseur", "Photos défaut + BL émargé", "[ Montant déduit ]", "DÉBIT APPLIQUÉ"],
        ["Réclamation formelle transporteur sous 48h", "Réserves précises sur récépissé", "[ Montant litige ]", "DOSSIER TRANSMIS"],
        ["Recours garantie sous-traitant", "Constat contradictoire sur site", "[ Coût reprise ]", "REPRISE EN COURS"]
    ]
    format_word_table(doc, headers_rc, rows_rc, col_widths_dxa=col_w_rc, center_cols=[2, 3])
    
    add_section_title(doc, "4. ENCADREMENT DE L'AVOIR COMMERCIAL CLIENT (VISA DG OBLIGATOIRE > 150 €)")
    tbl_av = doc.add_table(rows=1, cols=2)
    tbl_av.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_av.autofit = False
    ca0, ca1 = tbl_av.cell(0, 0), tbl_av.cell(0, 1)
    set_explicit_cell_width(ca0, 5100)
    set_explicit_cell_width(ca1, 5100)
    set_cell_background(ca0, CASH_BG)
    set_cell_background(ca1, WHY_BG)
    set_cell_margins(ca0, 30, 30, 60, 60)
    set_cell_margins(ca1, 30, 30, 60, 60)
    set_cell_border(ca0, left={'sz': 16, 'val': 'single', 'color': '1B4D3E'})
    set_cell_border(ca1, left={'sz': 16, 'val': 'single', 'color': 'B71C1C'})
    
    p0 = ca0.paragraphs[0]
    p0.paragraph_format.space_after = Pt(1)
    p0.add_run("TRAITEMENT COMMERCIAL CLIENT :\nSolution technique de correction prioritaire proposée : [ OUI ]\nAvoir financier proposé : [ ________ € HT ]").font.size = Pt(7.8)
    
    p1 = ca1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(1)
    p1.add_run("VISA DIRECTION GÉNÉRALE (OBLIGATOIRE SI > 150 €) :\nAccord émission avoir : [  ] ACCORDÉ  [  ] REFUSÉ\nSignature Dirigeant : ________________________").font.size = Pt(7.8)

    # VERSO
    regle = "INTERDICTION ABSOLUE D'ACCORDER UN AVOIR CLIENT SANS AVOIR DÉBITÉ LE TIERS RESPONSABLE SOUS 48H."
    steps = [
        ("Étape 1 (Réclamation)", "Ne jamais promettre d'avoir financier au téléphone. Proposer immédiatement la correction technique de la prestation."),
        ("Étape 2 (Constat du préjudice)", "Prendre photos, réunir les bons de livraison et calculer le coût réel direct (matière + heures d'équipes)."),
        ("Étape 3 (Recours tiers)", "Envoyer la note de débit au fournisseur ou transporteur sous 48h chrono et imputer la retenue sur leur prochain règlement.")
    ]
    scripts = [
        ("Au fournisseur dont le composant a causé le litige :",
         "Votre défaut nous a bloqué un chantier complet. Voici les photos et le relevé des heures d'équipes perdues. Nous déduisons ce montant direct de votre prochaine facture."),
        ("Au client qui exige un avoir immédiat :",
         "Nous assumons à 100% notre travail : notre équipe vient rectifier le défaut dès demain matin pour que tout soit parfait. En revanche, nous ne bradons pas nos prix par facilité.")
    ]
    test = "Consultez le compte comptable 709 (avoirs accordés) des 6 derniers mois. Combien d'euros ont été récupérés auprès des vrais responsables ? Si < 80%, l'Outil 03 est urgent."
    add_verso_protocol(doc, regle, steps, scripts, test)
    doc.save(os.path.join(OUTPUT_DIR, "OUTIL_03_LE_BOUCLIER_LITIGES.docx"))
    print("Generated 03")

def generate_tool_04():
    doc = create_base_document()
    add_tool_header(doc, "04", "STANDARD 5S D'ATELIER & PLAN DE CLASSEMENT GED", "RÉPONSE AUDIT 3.1 & 3.2", "Règle des 30 secondes : retrouver tout outil physique ou fichier numérique immédiatement")
    
    add_section_title(doc, "1. PÉRIMÈTRE AUDITÉ & OBJECTIF DE TEMPS D'ACCÈS")
    meta = {
        "Zone Atelier / Poste ou Répertoire Serveur :" : "[ Ex: Atelier Mécanique / Serveur GED /AFFAIRES ]",
        "Responsable de Zone Désigné :" : "[ Nom du Chef d'Équipe / Référent ]",
        "Temps Moyen d'Accès Initial Constaté :" : "[ Ex: 5 à 8 minutes de recherche quotidienne ]",
        "Standard Visé Obligatoire :" : "MOINS DE 30 SECONDES CHRONO (Physique et Numérique)"
    }
    add_meta_table(doc, meta)
    
    add_section_title(doc, "2. GRILLE D'APPLICATION DU STANDARD 5S OPÉRATIONNEL")
    headers_5s = ["ÉTAPE 5S", "STANDARD OPÉRATIONNEL EXIGÉ", "CONFORME ?", "ACTION CORRECTIVE"]
    col_w_5s = [2400, 4600, 1400, 1800]
    rows_5s = [
        ["1. TRIER (Seiri)", "Tout objet/fichier inutilisé depuis > 30j jeté ou archivé", "[ OUI / NON ]", "Évacuation benne / Archive"],
        ["2. RANGER (Seiton)", "1 place marquée par outil (panneaux ombres / scotch sol)", "[ OUI / NON ]", "Traçage des repères"],
        ["3. NETTOYER (Seiso)", "Postes et écrans propres, débarrassés de tout déchet", "[ OUI / NON ]", "Nettoyage quotidien"],
        ["4. STANDARDISER (Seiketsu)", "Charte de nommage unique affichée et appliquée", "[ OUI / NON ]", "Nommage strict des dossiers"],
        ["5. RESPECTER (Shitsuke)", "Rituel 3 minutes le soir avant de quitter le poste", "[ OUI / NON ]", "Discipline partagée"]
    ]
    format_word_table(doc, headers_5s, rows_5s, col_widths_dxa=col_w_5s, center_cols=[2])
    
    add_section_title(doc, "3. CHARTE DE NOMMAGE NUMÉRIQUE GED (ZÉRO FICHIER SUR LE BUREAU DU PC)")
    headers_ged = ["TYPE DE DOCUMENT", "STRUCTURE DE NOMMAGE OBLIGATOIRE", "DOSSIER SERVEUR ASSIGNÉ"]
    col_w_ged = [3000, 4400, 2800]
    rows_ged = [
        ["Devis & Proposition commerciale", "[CLIENT]_[NUM_DEVIS]_[DATE_AAAAMMJJ].pdf", "/01_DEVIS_OFFRES/"],
        ["Plan technique d'exécution validé", "[NUM_AFFAIRE]_[TITRE_PLAN]_INDICE-[A,B,C].dwg", "/02_PLANS_TECHNIQUES/"],
        ["PV de réception client signé", "[CLIENT]_[NUM_AFFAIRE]_PV-SIGNE_[AAAAMMJJ].pdf", "/03_RECEPTIONS_PV/"],
        ["Facture fournisseur validée", "[FOURNISSEUR]_[NUM_FACTURE]_[AAAAMMJJ].pdf", "/04_ACHATS_FACTURES/"]
    ]
    format_word_table(doc, headers_ged, rows_ged, col_widths_dxa=col_w_ged)
    
    add_section_title(doc, "4. TEST CHRONOMÉTRÉ DES 30 SECONDES (3 CONTRÔLES EN DIRECT SUR SITE)")
    headers_ch = ["ÉLÉMENT TESTÉ SUR LE TERRAIN", "COLLABORATEUR TESTÉ", "TEMPS CHRONO", "CONFORME (< 30s) ?"]
    col_w_ch = [3800, 2800, 1800, 1800]
    rows_ch = [
        ["Dernier plan validé de la commande en cours", "Technicien BE / Dessinateur", "[  sec ]", "[ OUI / NON ]"],
        ["Gabarit de réglage ou outil critique", "Compagnon / Opérateur atelier", "[  sec ]", "[ OUI / NON ]"],
        ["Dernier PV de réception client signé", "Responsable administratif / ADV", "[  sec ]", "[ OUI / NON ]"]
    ]
    format_word_table(doc, headers_ch, rows_ch, col_widths_dxa=col_w_ch, center_cols=[2, 3])

    # VERSO
    regle = "3 MINUTES AVANT DE PARTIR LE SOIR : POSTE RANGÉ, BUREAU DU PC VIDE, OUTILS À LEUR PLACE."
    steps = [
        ("Étape 1 (Opération Commando 4h)", "Un vendredi après-midi, l'équipe trie et jette tout ce qui est inutile. Les emplacements restants sont tracés au scotch ou panneaux d'ombres."),
        ("Étape 2 (Standard Numérique)", "Purger les bureaux des ordinateurs. Aucun fichier n'est stocké en local : tout vit sur le serveur selon la charte de nommage."),
        ("Étape 3 (Rituel Quotidien)", "Chaque soir à moins 3 minutes du départ, chacun remet ses outils à leur place assignée.")
    ]
    scripts = [
        ("À un collaborateur qui dit : 'Moi je m'y retrouve très bien dans mon bazar' :",
         "Si tu es absent demain, l'équipe doit pouvoir trouver ton fichier ou ton outil en 30 secondes sans t'appeler. On range pour que la boîte tourne sereinement."),
        ("Pour motiver l'équipe sans passer pour un adjudant :",
         "Quand vous perdez 15 minutes par jour à chercher un outil, vous êtes des magasiniers mal payés. On standardise pour que le matin vous attaquiez direct sans vous énerver.")
    ]
    test = "Demandez à l'improviste à un salarié : 'Ouvre-moi le dernier plan validé du chantier X'. Déclenchez le chrono du téléphone. Si > 30s, le rangement n'est pas fait."
    add_verso_protocol(doc, regle, steps, scripts, test)
    doc.save(os.path.join(OUTPUT_DIR, "OUTIL_04_LA_REGLE_30_SEC.docx"))
    print("Generated 04")

def generate_tool_05():
    doc = create_base_document()
    add_tool_header(doc, "05", "FICHE D'INSTRUCTION VISUELLE AU POSTE", "RÉPONSE AUDIT 4.1 & 4.2", "Standardisation mono-page (80% visuel) et grille d'habilitation rapide des nouvelles recrues")
    
    add_section_title(doc, "1. IDENTIFICATION DU POSTE & RISQUE MÉTIER")
    meta = {
        "Poste de Travail / Machine / Logiciel :" : "[ Ex: Poste Assemblage Bloc Hydraulique / Découpe ]",
        "Opération Critique Concernée :" : "[ Ex: Réglage des butées et serrage au couple ]",
        "Rédacteur & Tuteur Référent :" : "[ Nom de l'Expert Référent ]",
        "Format du Document :" : "1 SEULE FEUILLE A4 PLASTIFIÉE AFFICHÉE DIRECTEMENT AU POSTE"
    }
    add_meta_table(doc, meta)
    
    add_section_title(doc, "2. LES 3 GESTES CLÉS DU STANDARD (DÉCOMPOSITION VISUELLE)")
    headers_g = ["ÉTAPE", "GESTION VISUELLE DU GESTE", "POINT CRITIQUE DE VIGILANCE"]
    col_w_g = [1600, 4800, 3800]
    rows_g = [
        ["ÉTAPE 1", "[ INSÉRER PHOTO N°1 : Préparation & Réglage initial ]", "Vérifier le zéro machine et le positionnement"],
        ["ÉTAPE 2", "[ INSÉRER PHOTO N°2 : Exécution du travail ]", "Respecter le sens d'engagement de la pièce"],
        ["ÉTAPE 3", "[ INSÉRER PHOTO N°3 : Finition et contrôle ]", "Ébavurer et nettoyer avant passage au poste suivant"]
    ]
    format_word_table(doc, headers_g, rows_g, col_widths_dxa=col_w_g, center_cols=[0])
    
    add_section_title(doc, "3. LE PIÈGE MORTEL & CRITÈRE VISUEL IMMÉDIAT (BON / MAUVAIS)")
    tbl_piege = doc.add_table(rows=1, cols=2)
    tbl_piege.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_piege.autofit = False
    cp0, cp1 = tbl_piege.cell(0, 0), tbl_piege.cell(0, 1)
    set_explicit_cell_width(cp0, 5100)
    set_explicit_cell_width(cp1, 5100)
    set_cell_background(cp0, CASH_BG)
    set_cell_background(cp1, "FFF5F5")
    set_cell_margins(cp0, 25, 25, 50, 50)
    set_cell_margins(cp1, 25, 25, 50, 50)
    set_cell_border(cp0, left={'sz': 16, 'val': 'single', 'color': '1B4D3E'})
    set_cell_border(cp1, left={'sz': 16, 'val': 'single', 'color': 'B71C1C'})
    
    p0 = cp0.paragraphs[0]
    p0.add_run("🟢 CRITÈRE PIÈCE CONFORME (BON) :\n[ INSÉRER PHOTO DU RÉSULTAT VALIDE ]\nSurface lisse, chanfrein propre, cote respectée.").font.size = Pt(7.8)
    
    p1 = cp1.paragraphs[0]
    p1.add_run("🔴 PIÈGE MORTEL INTERDIT (REBUT) :\n[ INSÉRER PHOTO DE L'ERREUR CLASSIQUE ]\nInterdiction absolue de forcer l'engagement.").font.size = Pt(7.8)
    
    add_section_title(doc, "4. VALIDATION FORMELLE D'AUTONOMIE DE LA RECRUE (GRILLE D'HABILITATION)")
    headers_hab = ["COLLABORATEUR TESTÉ", "DATE D'ARRIVÉE", "TEST SUR 3 CAS RÉELS", "RÉSULTAT", "VISA TUTEUR"]
    col_w_hab = [2600, 1800, 2600, 1600, 1600]
    rows_hab = [
        ["[ Nom de la recrue ]", "[ Date ]", "3 pièces produites sans aide", "[ 3/3 CONFORME ]", "[ HABILITÉ ]"],
        ["[ Nom de la recrue ]", "[ Date ]", "3 dossiers saisis sans erreur", "[ 3/3 CONFORME ]", "[ HABILITÉ ]"]
    ]
    format_word_table(doc, headers_hab, rows_hab, col_widths_dxa=col_w_hab, center_cols=[1, 3, 4])

    # VERSO
    regle = "SI UNE CONSIGNE A BESOIN DE PLUS D'UNE PAGE POUR ÊTRE EXPLIQUÉE, ELLE NE SERA JAMAIS LUE."
    steps = [
        ("Étape 1 (Création)", "Prendre 3 photos avec son smartphone au poste : geste 1, geste 2 et la photo en rouge de l'erreur la plus coûteuse."),
        ("Étape 2 (Affichage)", "Imprimer la feuille en couleur, la plastifier et la fixer exactement là où l'opérateur a les yeux en travaillant."),
        ("Étape 3 (Habilitation)", "Tester la nouvelle recrue sur 3 cas concrets. Le tuteur signe l'habilitation dès que les 3 cas sont réussis sans assistance.")
    ]
    scripts = [
        ("Quand un salarié pose pour la 3ème fois la même question basique :",
         "Regarde la photo n°2 sur la fiche au-dessus de toi, la réponse y est. Si ce n'est pas clair, on refait la photo ensemble dans 5 minutes pour l'améliorer."),
        ("Quand une recrue fait une erreur :",
         "Ne l'engueulez pas. Demandez : 'Le piège était-il photographié sur la fiche ?' Si non, c'est l'entreprise qui est en faute. Ajoutez la photo aujourd'hui.")
    ]
    test = "Prenez un intérimaire arrivé ce matin. Mettez-le devant la fiche. Est-il capable de sortir un premier livrable conforme sans poser de question ?"
    add_verso_protocol(doc, regle, steps, scripts, test)
    doc.save(os.path.join(OUTPUT_DIR, "OUTIL_05_LES_FICHES_REFLEXES.docx"))
    print("Generated 05")

def generate_tool_06():
    doc = create_base_document()
    add_tool_header(doc, "06", "MAINTENANCE PRÉVENTIVE 1ER NIVEAU & SÉCURISATION GOULET", "RÉPONSE AUDIT 3.3 & 3.4", "Inspection sensorielle de 10 min chaque lundi et armoire des 3 pièces de survie sous clé")
    
    add_section_title(doc, "1. IDENTIFICATION DE L'ÉQUIPEMENT GOULET CRITIQUE")
    meta = {
        "Machine Clé / Outil Goulet :" : "[ Ex: Centre d'Usinage 5 Axes / Serveur de Production ]",
        "Opérateur Référent Assigné :" : "[ Nom de l'Opérateur Titulaire ]",
        "Conséquence d'un Arrêt Inopiné :" : "[ Ex: Arrêt complet de 8 personnes + Pénalités de retard ]",
        "Rythme Obligatoire du Contrôle :" : "CHAQUE LUNDI MATIN DE 08H00 À 08H10 (10 MINUTES CHRONO)"
    }
    add_meta_table(doc, meta)
    
    add_section_title(doc, "2. CHECKLIST D'INSPECTION SENSORIELLE HEBDOMADAIRE (LES 4 SENS)")
    headers_sp = ["SENS", "POINT D'INSPECTION CONTRÔLÉ", "VALEUR DE RÉFÉRENCE", "CONFORME ?"]
    col_w_sp = [1600, 4400, 2600, 1600]
    rows_sp = [
        ["VISUEL", "Absence de fuite d'huile, fissures, câbles effilochés", "Sol sec, flexibles propres", "[ CONFORME / ALERTE ]"],
        ["AUDITIF", "Bruit au démarrage à vide pendant 30 secondes", "Absence de claquement / sifflement", "[ CONFORME / ALERTE ]"],
        ["TACTILE", "Niveaux de fluides et graissage des glissières", "Repère jauge entre Min et Max", "[ CONFORME / ALERTE ]"],
        ["SÉCURITÉ", "Arrêts d'urgence et capteurs de fermeture", "Coupure nette immédiate", "[ CONFORME / ALERTE ]"]
    ]
    format_word_table(doc, headers_sp, rows_sp, col_widths_dxa=col_w_sp, center_cols=[0, 3])
    
    add_section_title(doc, "3. L'ARMOIRE DES 3 PIÈCES DE SURVIE (SOUS CLÉ DANS L'ATELIER)")
    headers_srv = ["N°", "DÉSIGNATION DE LA PIÈCE VITALE", "RÉFÉRENCE CONSTRUCTEUR", "STOCK MINI", "PRÉSENTE SOUS CLÉ ?"]
    col_w_srv = [600, 3800, 2800, 1400, 1600]
    rows_srv = [
        ["P1", "Courroie d'entraînement principal", "Réf: CR-884-HT", "1 unité", "[ OUI / NON ]"],
        ["P2", "Électrovanne de commande pneumatique", "Réf: EV-24V-ISO", "1 unité", "[ OUI / NON ]"],
        ["P3", "Jeu de fusibles rapides et relais puissance", "Réf: FUS-32A-URG", "2 jeux", "[ OUI / NON ]"]
    ]
    format_word_table(doc, headers_srv, rows_srv, col_widths_dxa=col_w_srv, center_cols=[0, 3, 4])
    
    add_section_title(doc, "4. REGISTRE DE SUIVI MENSUEL & VISA OPÉRATEUR")
    headers_rg = ["SEMAINE", "DATE CONTRÔLE", "HEURE", "ANOMALIE SIGNALÉE", "VISA OPÉRATEUR"]
    col_w_rg = [1800, 2000, 1600, 3200, 1600]
    rows_rg = [
        ["Semaine 1", "[ Date lundi ]", "08h10", "Aucune anomalie constatée", "[ Visa ]"],
        ["Semaine 2", "[ Date lundi ]", "08h10", "[ Noter fuite ou bruit suspect ]", "[ Visa ]"],
        ["Semaine 3", "[ Date lundi ]", "08h10", "[ Constat ]", "[ Visa ]"],
        ["Semaine 4", "[ Date lundi ]", "08h10", "[ Constat ]", "[ Visa ]"]
    ]
    format_word_table(doc, headers_rg, rows_rg, col_widths_dxa=col_w_rg, center_cols=[0, 1, 2, 4])

    # VERSO
    regle = "10 MINUTES LE LUNDI MATIN VOUS FONT ÉCONOMISER 10 000 € D'ARRÊT LE JEUDI APRÈS-MIDI."
    steps = [
        ("Étape 1 (Inspection 8h00)", "Chaque lundi avant de lancer la production, l'opérateur consacre 10 min à inspecter visuellement, écouter et vérifier les niveaux."),
        ("Étape 2 (Stock de Survie)", "Les 3 pièces d'usure dont la rupture arrêterait la machine sont enfermées sous clé dans l'atelier, étiquetées et intouchables."),
        ("Étape 3 (Alerte Immédiate)", "Dès qu'une anomalie ou fuite est repérée, alerte maintenance avant 9h00. Si une pièce de survie est utilisée, recommander avant midi.")
    ]
    scripts = [
        ("À l'opérateur qui dit : 'J'ai pas le temps d'inspecter, j'ai de la prod urgente' :",
         "Si ta machine serre à 14h, ce n'est pas 10 minutes que tu perdras, c'est toute ta semaine de boulot. L'inspection passe avant tout."),
        ("Au dirigeant qui hésite à acheter les 3 pièces critiques de rechange d'avance :",
         "300 € de pièces en stock sous clé, c'est l'assurance-vie de votre chiffre d'affaires. Sans elles, le moindre roulement cassé vous coûte 4 jours de chômage technique.")
    ]
    test = "Allez ouvrir l'armoire de maintenance de votre outil goulet. Les 3 pièces critiques de rechange sont-elles présentes sous leur étiquette ? Si non, l'entreprise est en danger."
    add_verso_protocol(doc, regle, steps, scripts, test)
    doc.save(os.path.join(OUTPUT_DIR, "OUTIL_06_LUNDI_10_MIN.docx"))
    print("Generated 06")

def generate_tool_07():
    doc = create_base_document()
    add_tool_header(doc, "07", "TRAITEMENT DES NON-CONFORMITÉS & ANALYSE 5 POURQUOI", "RÉPONSE AUDIT 4.3 & 4.4", "Chiffrage financier direct des rebuts et verrouillage anti-récidive définitif sous 7 jours")
    
    add_section_title(doc, "1. DÉCLARATION DE L'INCIDENT & CHIFFRAGE DIRECT EN EUROS")
    meta = {
        "N° de Fiche Non-Conformité :" : "[ Ex: NC-2026-042 ]",
        "Affaire / Commande / Poste :" : "[ Nom Client & Poste concerné ]",
        "Nature du Défaut Constaté :" : "[ Ex: Erreur de cote usinage / Mauvaise couleur peinture ]",
        "Coût Matière Première Perdue :" : "[ Ex: 185,00 EUR HT ]",
        "Heures Passées en Reprise / Retouche :" : "[ Ex: 3,5 h à 50 €/h = 175,00 EUR HT ]",
        "COÛT FINANCIER TOTAL DU REBUT :" : "[ TOTAL DIRECT : 360,00 EUR HT (Inscrit sur le Bac Rouge) ]"
    }
    add_meta_table(doc, meta)
    
    add_section_title(doc, "2. ANALYSE DE LA CAUSE RACINE PAR LES 5 POURQUOI")
    headers_5p = ["NIVEAU", "QUESTIONNEMENT SUR LE TERRAIN", "RÉPONSE FACTUELLE CONSTATÉE"]
    col_w_5p = [1800, 3600, 4800]
    rows_5p = [
        ["Pourquoi 1", "Pourquoi la pièce est-elle non-conforme ?", "Le perçage a été fait à 12 mm au lieu de 10 mm."],
        ["Pourquoi 2", "Pourquoi ce diamètre incorrect a été choisi ?", "L'opérateur a pris le mauvais foret dans le tiroir."],
        ["Pourquoi 3", "Pourquoi le mauvais foret était-il dans ce tiroir ?", "Les forets de 10 et 12 mm sont mélangés dans le même bac."],
        ["Pourquoi 4", "Pourquoi les bacs ne sont-ils pas séparés ?", "Aucun séparateur ni étiquette de repérage visuel n'a été posé."],
        ["Pourquoi 5 (RACINE)", "Pourquoi n'a-t-on pas standardisé les bacs ?", "LA CAUSE RACINE : Défaut d'organisation physique au poste (Standard 5S absent)."]
    ]
    format_word_table(doc, headers_5p, rows_5p, col_widths_dxa=col_w_5p)
    
    add_section_title(doc, "3. PLAN D'ACTION ANTI-RÉCIDIVE DÉFINITIF (SOUS 7 JOURS CHRONO)")
    headers_act = ["ACTION CORRECTIVE BLOQUANTE", "TYPE DE SOLUTION", "RESPONSABLE UNIQUE", "DÉLAI STRICT", "STATUT"]
    col_w_act = [3600, 2400, 1600, 1400, 1200]
    rows_act = [
        ["Installer un panneau d'ombres avec détrompeur", "Physique bloquant", "Chef d'atelier", "J+3", "FAIT"],
        ["Mettre à jour la Fiche Réflexe avec photo du piège", "Standard visuel", "Tuteur poste", "J+4", "FAIT"],
        ["[ Action bloquante définitive ]", "[ Détrompeur ]", "[ 1 Nom ]", "[ Date ]", "[ À FAIRE ]"]
    ]
    format_word_table(doc, headers_act, rows_act, col_widths_dxa=col_w_act, center_cols=[1, 2, 3, 4])
    
    add_section_title(doc, "4. CONTRÔLE D'EFFICACITÉ À 30 JOURS & CLÔTURE")
    tbl_cl = doc.add_table(rows=1, cols=2)
    tbl_cl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_cl.autofit = False
    cc0, cc1 = tbl_cl.cell(0, 0), tbl_cl.cell(0, 1)
    set_explicit_cell_width(cc0, 5100)
    set_explicit_cell_width(cc1, 5100)
    set_cell_background(cc0, CASH_BG)
    set_cell_background(cc1, SUBHDR_BG)
    set_cell_margins(cc0, 25, 25, 50, 50)
    set_cell_margins(cc1, 25, 25, 50, 50)
    set_cell_border(cc0, left={'sz': 16, 'val': 'single', 'color': '1B4D3E'})
    set_cell_border(cc1, left={'sz': 16, 'val': 'single', 'color': 'C5A065'})
    
    p0 = cc0.paragraphs[0]
    p0.add_run("VÉRIFICATION RÉCIDIVE À J+30 :\nLe problème s'est-il reproduit ? : [ NON - SUCCÈS ]\nÉconomie nette estimée : [ __________ € / an ]").font.size = Pt(7.8)
    
    p1 = cc1.paragraphs[0]
    p1.add_run("CLÔTURE FORMELLE PAR LA DIRECTION :\nDate & Signature : ________________________\n« Solution validée comme nouveau standard »").font.size = Pt(7.8)

    # VERSO
    regle = "'FAIRE PLUS ATTENTION' N'EST PAS UNE SOLUTION. UNE VRAIE SOLUTION REND L'ERREUR PHYSIQUEMENT IMPOSSIBLE."
    steps = [
        ("Étape 1 (Isolement Bac Rouge)", "Toute pièce ratée est immédiatement posée dans le Bac Rouge avec son étiquette indiquant le montant financier en euros perdus."),
        ("Étape 2 (5 Pourquoi sur place)", "Le chef d'équipe et l'opérateur analysent la cause racine en 5 min devant la pièce, sans chercher de coupable."),
        ("Étape 3 (Solution Bloquante 7j)", "Mettre en place un détrompeur physique, une butée mécanique ou une fiche réflexe sous 7 jours max.")
    ]
    scripts = [
        ("Pour faire parler le collaborateur sans qu'il se braque :",
         "Je ne cherche pas un coupable, je cherche le piège dans notre organisation qui t'a fait faire cette erreur. Dis-moi exactement où ça a coincé pour qu'on règle le problème pour tout le monde."),
        ("Quand quelqu'un propose 'il faudra être plus vigilant' :",
         "La vigilance baisse avec la fatigue. Trouve-moi un repère visuel, une butée mécanique ou une règle bloquante qui rend cette erreur impossible même si on a la tête ailleurs.")
    ]
    test = "Regardez les 3 derniers litiges ou rebuts d'atelier. Combien étaient déjà arrivés il y a 6 mois ? Si > 0, l'Outil 07 n'est pas appliqué."
    add_verso_protocol(doc, regle, steps, scripts, test)
    doc.save(os.path.join(OUTPUT_DIR, "OUTIL_07_ZERO_RECIDIVE.docx"))
    print("Generated 07")

def generate_tool_08():
    doc = create_base_document()
    add_tool_header(doc, "08", "TRAME DU STAND-UP QUOTIDIEN (5 MINUTES CHRONO)", "RÉPONSE AUDIT 5.1", "Rituel debout devant tableau visuel : 1 problème = 1 responsable = 1 délai ferme")
    
    add_section_title(doc, "1. IDENTIFICATION DU RITUEL & GESTION DU TEMPS")
    meta = {
        "Département / Équipe Concernée :" : "[ Ex: Équipe Atelier & Pose / Équipe Projet ]",
        "Animateur / Maître du Temps :" : "[ Nom de l'Animateur Désigné ]",
        "Horaire Strict :" : "08H30 PILE À 08H35 PILE (5 MINUTES CHRONO - FIN FERME)",
        "Posture Obligatoire :" : "TOUT LE MONDE DEBOUT DEVANT LE TABLEAU (ZÉRO CHAISE, ZÉRO PC)"
    }
    add_meta_table(doc, meta)
    
    add_section_title(doc, "2. LES 3 QUESTIONS SACRÉES DU STAND-UP (45 SECONDES PAR PERSONNE)")
    headers_q = ["QUESTION SACRÉE", "OBJECTIF OPÉRATIONNEL", "TEMPS MAX", "PIÈGE À PROSCRIRE"]
    col_w_q = [2600, 3400, 1800, 2400]
    rows_q = [
        ["1. Qu'as-tu terminé hier ?", "Pointer les livrables concrets achevés", "30 sec / pers", "Raconter sa journée en détail"],
        ["2. Ton engagement n°1 du jour ?", "Fixer la priorité absolue de la journée", "30 sec / pers", "Lister 10 micro-tâches secondaires"],
        ["3. Où est ton point de blocage ?", "Identifier ce qui freine ('Le Caillou')", "45 sec / pers", "Débattre de la solution technique"]
    ]
    format_word_table(doc, headers_q, rows_q, col_widths_dxa=col_w_q, center_cols=[2])
    
    add_section_title(doc, "3. RELEVÉ DES DÉCISIONS FLASH (1 PROBLÈME = 1 RESPONSABLE = 1 DÉLAI)")
    headers_dec = ["N°", "POINT DE BLOCAGE SOULÈVE ('LE CAILLOU')", "DÉCISION TRANCHÉE EN SÉANCE", "1 SEUL PILOTE", "ÉCHÉANCE AUJOURD'HUI", "STATUT"]
    col_w_dec = [600, 3200, 2600, 1600, 1200, 1000]
    rows_dec = [
        ["D1", "Plan client non coté sur arase supérieure", "Appel direct de l'architecte pour arbitrage", "P. Martin", "10h00", "CLOS"],
        ["D2", "Rupture visserie inox pour chantier B4", "Achat d'urgence au comptoir pro", "L. Petit", "11h30", "EN COURS"],
        ["D3", "[ Point de blocage soulevé ]", "[ Décision immédiate ]", "[ 1 Nom ]", "[ Heure ]", "[ EN COURS ]"]
    ]
    format_word_table(doc, headers_dec, rows_dec, col_widths_dxa=col_w_dec, center_cols=[0, 3, 4, 5])
    
    add_section_title(doc, "4. SUIVI DES ENGAGEMENTS DE LA VEILLE & CLÔTURE À 8H35")
    tbl_st = doc.add_table(rows=1, cols=2)
    tbl_st.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_st.autofit = False
    c0, c1 = tbl_st.cell(0, 0), tbl_st.cell(0, 1)
    set_explicit_cell_width(c0, 5100)
    set_explicit_cell_width(c1, 5100)
    set_cell_background(c0, CASH_BG)
    set_cell_background(c1, SUBHDR_BG)
    set_cell_margins(c0, 25, 25, 50, 50)
    set_cell_margins(c1, 25, 25, 50, 50)
    set_cell_border(c0, left={'sz': 16, 'val': 'single', 'color': '1B4D3E'})
    set_cell_border(c1, left={'sz': 16, 'val': 'single', 'color': 'C5A065'})
    
    p0 = c0.paragraphs[0]
    p0.add_run("TAUX DE RESPECT DES ENGAGEMENTS D'HIER :\nEngagements tenus : [  ] / [  ] soit [ ____ % ]\nClôture séance à 8h35 : [ RESPECTÉE ]").font.size = Pt(7.8)
    
    p1 = c1.paragraphs[0]
    p1.add_run("VISA ANIMATEUR DU STAND-UP :\nDate : ____ / ____ / 2026\nSignature : ________________________").font.size = Pt(7.8)

    # VERSO
    regle = "ON NE RÉSOUT PAS LES PROBLÈMES TECHNIQUES PENDANT LE STAND-UP. ON DÉSIGNE LE DUO QUI VA LES RÉGLER HORS RÉUNION."
    steps = [
        ("Étape 1 (Posture Debout)", "Tout le monde debout en cercle devant le tableau. Pas de chaise, pas d'ordinateur. Le confort assis allonge la réunion de 30 minutes."),
        ("Étape 2 (Tour de parole chrono)", "Chaque personne répond aux 3 questions en 45 secondes chrono. L'animateur coupe net toute dérive."),
        ("Étape 3 (Clôture à 8h35)", "À la 5ème minute, le point s'arrête. Les responsables des blocages partent régler leur sujet en duo.")
    ]
    scripts = [
        ("Quand deux personnes commencent un débat technique :",
         "Stop. On ne résout pas ça ici à 8 personnes. Pierre et Marc, vous prenez 10 minutes après le point, vous réglez ça ensemble et vous me donnez la réponse à 9h30."),
        ("Quand un collaborateur commence à raconter sa vie ou se justifier :",
         "Pas de justifications, juste les faits : de quoi tu as besoin aujourd'hui pour livrer ta tâche ?")
    ]
    test = "À 9h00, allez voir un collaborateur : 'Quelle est ta mission n°1 aujourd'hui ?'. S'il hésite ou liste 8 trucs vagues, le stand-up n'a pas fonctionné."
    add_verso_protocol(doc, regle, steps, scripts, test)
    doc.save(os.path.join(OUTPUT_DIR, "OUTIL_08_STAND_UP_5_MIN.docx"))
    print("Generated 08")

def generate_tool_09():
    doc = create_base_document()
    add_tool_header(doc, "09", "MATRICE DE POLYVALENCE & SÉCURISATION DES POSTES CLÉS", "RÉPONSE AUDIT 5.2", "Suppression du risque d'homme-clé : doublage systématique de 100% des compétences critiques")
    
    add_section_title(doc, "1. ÉCHELLE D'ÉVALUATION DES COMPÉTENCES (0 À 3)")
    headers_ech = ["NIVEAU", "DÉFINITION OPÉRATIONNELLE", "STATUT D'EXPLOITATION"]
    col_w_ech = [1800, 5600, 2800]
    rows_ech = [
        ["Niveau 0", "Ne sait pas faire / N'a jamais pratiqué", "Non qualifié sur le poste"],
        ["Niveau 1", "Sait exécuter avec la Fiche Réflexe sous surveillance d'un tuteur", "En cours d'apprentissage"],
        ["Niveau 2", "Parfaitement autonome seul en cadence et qualité normale", "AUTONOME (DOUBLURE VALIDÉE)"],
        ["Niveau 3", "Expert capable de régler les pannes et de former un autre salarié", "RÉFÉRENT / FORMATEUR"]
    ]
    format_word_table(doc, headers_ech, rows_ech, col_widths_dxa=col_w_ech, center_cols=[0])
    
    add_section_title(doc, "2. MATRICE DE COUVERTURE : POSTES CRITIQUES × COLLABORATEURS")
    headers_mat = ["COLLABORATEURS", "DEVIS & CHIFFRAGE", "PROGRAMMATION", "RÉGLAGE MACHINE", "SOUDURE QUALIFIÉE", "LIVRAISON & PV"]
    col_w_mat = [2200, 1600, 1600, 1600, 1600, 1600]
    rows_mat = [
        ["Jean D. (Expert)", "Niv 3 (Expert)", "Niv 3 (Expert)", "Niv 1", "Niv 0", "Niv 2"],
        ["Thomas B. (Polyvalent)", "Niv 2 (Doublure)", "Niv 1 (En cours)", "Niv 3 (Expert)", "Niv 2", "Niv 3"],
        ["Marc L. (Opérateur)", "Niv 0", "Niv 0", "Niv 2 (Doublure)", "Niv 3 (Expert)", "Niv 1"],
        ["Sarah V. (ADV)", "Niv 2 (Doublure)", "Niv 0", "Niv 0", "Niv 0", "Niv 3 (Expert)"],
        ["DIAGNOSTIC RISQUE", "🟢 COUVERT", "🔴 DANGER (1 seul)", "🟢 COUVERT", "🟢 COUVERT", "🟢 COUVERT"]
    ]
    format_word_table(doc, headers_mat, rows_mat, col_widths_dxa=col_w_mat, center_cols=[1, 2, 3, 4, 5])
    
    add_section_title(doc, "3. PLAN DE DOUBLAGE DES POSTES EN ALERTE ROUGE (FORMATION CROISÉE)")
    headers_pd = ["POSTE EN ALERTE", "EXPERT TUTEUR", "BINÔME À FORMER", "RITUEL HEBDO", "ÉCHÉANCE NIVEAU 2"]
    col_w_pd = [2600, 2000, 2000, 2000, 1600]
    rows_pd = [
        ["Programmation FAO", "Jean D.", "Thomas B.", "2h chaque vendredi 14h-16h", "30 jours"],
        ["[ Poste à sécuriser ]", "[ Expert ]", "[ Binôme ]", "[ 2h / semaine ]", "[ Date ]"]
    ]
    format_word_table(doc, headers_pd, rows_pd, col_widths_dxa=col_w_pd, center_cols=[1, 2, 3, 4])
    
    add_section_title(doc, "4. ENGAGEMENT DE SÉCURISATION DE LA DIRECTION")
    tbl_sec = doc.add_table(rows=1, cols=2)
    tbl_sec.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_sec.autofit = False
    cs0, cs1 = tbl_sec.cell(0, 0), tbl_sec.cell(0, 1)
    set_explicit_cell_width(cs0, 5100)
    set_explicit_cell_width(cs1, 5100)
    set_cell_background(cs0, CASH_BG)
    set_cell_background(cs1, SUBHDR_BG)
    set_cell_margins(cs0, 25, 25, 50, 50)
    set_cell_margins(cs1, 25, 25, 50, 50)
    set_cell_border(cs0, left={'sz': 16, 'val': 'single', 'color': '1B4D3E'})
    set_cell_border(cs1, left={'sz': 16, 'val': 'single', 'color': 'C5A065'})
    
    p0 = cs0.paragraphs[0]
    p0.add_run("OBJECTIF SÉCURITÉ EXPLOITATION :\n100% des postes vitaux couverts par au moins 2 salariés de niveau >= 2.").font.size = Pt(7.8)
    
    p1 = cs1.paragraphs[0]
    p1.add_run("VISA DIRECTION DES OPÉRATIONS :\nDate : ____ / ____ / 2026\nSignature : ________________________").font.size = Pt(7.8)

    # VERSO
    regle = "SI UN SAVOIR-FAIRE CRITIQUE NE TIENT QUE DANS LA TÊTE D'UNE SEULE PERSONNE, L'ENTREPRISE EST EN SURSIS."
    steps = [
        ("Étape 1 (Cartographie)", "Lister les 5 activités où l'absence imprévue du titulaire paralyserait la production. Repérer les cases rouges (1 seul expert)."),
        ("Étape 2 (Rituel du Vendredi)", "Bloquer 2 heures obligatoires chaque vendredi après-midi : l'expert laisse les commandes au binôme et le regarde faire sans toucher à la machine."),
        ("Étape 3 (Test d'Autonomie)", "Au bout de 30 jours, l'expert prend 1 journée de congé test. Si la production sort conforme sans lui, le poste est sécurisé.")
    ]
    scripts = [
        ("À l'expert qui garde ses secrets par peur de perdre sa valeur :",
         "Michel, plus tu es indispensable sur ce poste, moins je peux te promouvoir ou te laisser partir en vacances tranquille. Former ton binôme, c'est la condition de ton évolution."),
        ("Au salarié qui dit 'J'ai pas le temps de former le collègue' :",
         "Prendre 2h aujourd'hui pour le former va te libérer 10h par semaine le mois prochain. C'est l'investissement le plus rentable de ta semaine.")
    ]
    test = "Annoncez demain matin : 'L'expert X est absent 15 jours'. Si la réaction est la panique générale, l'Outil 09 est une urgence vitale."
    add_verso_protocol(doc, regle, steps, scripts, test)
    doc.save(os.path.join(OUTPUT_DIR, "OUTIL_09_PROTECTION_HOMME_CLE.docx"))
    print("Generated 09")

def generate_tool_10():
    doc = create_base_document()
    add_tool_header(doc, "10", "COCKPIT HEBDOMADAIRE DE DIRECTION (5 KPIS CASH)", "RÉPONSE AUDIT 5.3 & 5.4", "Pilotage du lundi 8h15 en 15 min chrono : 5 chiffres froids, trésorerie glissante et décision tactique")
    
    add_section_title(doc, "1. LES 5 CHIFFRES FROIDS DU LUNDI MATIN (08H15 CHRONO)")
    meta = {
        "1. TRÉSORERIE DISPONIBLE CE MATIN EN BANQUE :" : "[ Ex: 48 500,00 EUR (Seuil alerte rouge : 20 000 EUR) ]",
        "2. DEVIS EN ATTENTE DE RELANCE :" : "[ Ex: 142 000,00 EUR HT (Dont 4 devis chauds à closer) ]",
        "3. CHIFFRE D'AFFAIRES LIVRÉ LA SEMAINE PASSÉE :" : "[ Ex: 31 200,00 EUR HT (Objectif hebdo : 30 000 EUR) ]",
        "4. FACTURES ÉCHUES EN RETARD DE RÈGLEMENT :" : "[ Ex: 24 500,00 EUR HT (Dont 8 000 EUR > 30 jours) ]",
        "5. COÛT DES NON-QUALITÉS / REBUTS DU MOIS :" : "[ Ex: 1 450,00 EUR HT (Objectif : Moins de 500 EUR) ]"
    }
    add_meta_table(doc, meta)
    
    add_section_title(doc, "2. SUIVI COMPARATIF SUR 4 SEMAINES GLISSANTES")
    headers_cp = ["INDICATEUR CLÉ", "SEMAINE S-3", "SEMAINE S-2", "SEMAINE S-1", "SEMAINE S (ACTUELLE)", "TENDANCE"]
    col_w_cp = [3200, 1400, 1400, 1400, 1400, 1400]
    rows_cp = [
        ["Trésorerie bancaire disponible", "[ € ]", "[ € ]", "[ € ]", "[ € ]", "🟢 STABLE"],
        ["Devis en attente de signature", "[ € ]", "[ € ]", "[ € ]", "[ € ]", "📈 EN HAUSSE"],
        ["Factures clients en retard", "[ € ]", "[ € ]", "[ € ]", "[ € ]", "🔴 ALERTE"],
        ["Coût des rebuts & reprises", "[ € ]", "[ € ]", "[ € ]", "[ € ]", "🟢 EN BAISSE"]
    ]
    format_word_table(doc, headers_cp, rows_cp, col_widths_dxa=col_w_cp, center_cols=[1, 2, 3, 4, 5])
    
    add_section_title(doc, "3. PRÉVISIONNEL DE TRÉSORERIE GLISSANT À 4 SEMAINES")
    headers_tr = ["FLUX DE TRÉSORERIE", "SEMAINE S+1", "SEMAINE S+2", "SEMAINE S+3", "SEMAINE S+4"]
    col_w_tr = [3400, 1700, 1700, 1700, 1700]
    rows_tr = [
        ["Encaissements fermes attendus (+)", "[ € ]", "[ € ]", "[ € ]", "[ € ]"],
        ["Décaissements obligatoires (-) (Salaires, Fournisseurs)", "[ € ]", "[ € ]", "[ € ]", "[ € ]"],
        ["SOLDE PRÉVISIONNEL DE FIN DE SEMAINE", "[ € ]", "[ € ]", "[ € ]", "[ € ]"]
    ]
    format_word_table(doc, headers_tr, rows_tr, col_widths_dxa=col_w_tr, center_cols=[1, 2, 3, 4])
    
    add_section_title(doc, "4. LA DÉCISION TACTIQUE HEBDOMADAIRE (ARBITRAGE DU DIRIGEANT)")
    tbl_dec = doc.add_table(rows=1, cols=2)
    tbl_dec.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_dec.autofit = False
    cd0, cd1 = tbl_dec.cell(0, 0), tbl_dec.cell(0, 1)
    set_explicit_cell_width(cd0, 5100)
    set_explicit_cell_width(cd1, 5100)
    set_cell_background(cd0, CASH_BG)
    set_cell_background(cd1, WHY_BG)
    set_cell_margins(cd0, 25, 25, 50, 50)
    set_cell_margins(cd1, 25, 25, 50, 50)
    set_cell_border(cd0, left={'sz': 16, 'val': 'single', 'color': '1B4D3E'})
    set_cell_border(cd1, left={'sz': 16, 'val': 'single', 'color': 'B71C1C'})
    
    p0 = cd0.paragraphs[0]
    p0.add_run("LE CLIGNOTANT ROUGE N°1 DE LA SEMAINE :\n[ Identifier la dérive prioritaire à traiter d'ici vendredi ]").font.size = Pt(7.8)
    
    p1 = cd1.paragraphs[0]
    p1.add_run("ACTION COMMANDO IMMÉDIATE & PILOTE :\nAction : ___________________________________\nPilote unique : [ Nom ] - Échéance : Vendredi 17h").font.size = Pt(7.8)

    # VERSO
    regle = "ON NE PILOTE PAS UNE PME AVEC 50 GRAPHIQUES. 5 CHIFFRES FROIDS CHAQUE LUNDI SUFFISENT POUR PROTÉGER LA MARGE."
    steps = [
        ("Étape 1 (Lundi 8h15)", "Le dirigeant ouvre son cockpit en 15 minutes chrono. Il reporte les 5 chiffres bruts du matin sans chercher à débattre."),
        ("Étape 2 (Choix du Feu Rouge)", "Identifier l'unique chiffre qui s'écarte de la trajectoire. Décider 1 seule action commando à mener d'ici vendredi 17h."),
        ("Étape 3 (Lancement Stand-Up)", "À 8h30, le dirigeant lance le stand-up avec les équipes en ayant une vision froide et lucide de la semaine.")
    ]
    scripts = [
        ("Du dirigeant à ses responsables lors du point de rentabilité :",
         "Donnez-moi les chiffres bruts, pas des excuses. Si un indicateur est dans le rouge, on ne cherche pas un coupable : qu'est-ce qu'on fait concrètement d'ici ce soir pour inverser la tendance ?"),
        ("À un client débiteur en retard important (> 15 jours) :",
         "Bonjour Monsieur Martin, notre prestation a été livrée et validée il y a 3 semaines. Mon prévisionnel de trésorerie exige que cette facture soit soldée avant jeudi midi. Pouvez-vous me confirmer le virement aujourd'hui ?")
    ]
    test = "Demandez au dirigeant : 'Combien as-tu en banque là tout de suite, et combien de cash est dehors en retard ?'. S'il ne peut pas répondre en 10 secondes, le Cockpit est obligatoire."
    add_verso_protocol(doc, regle, steps, scripts, test)
    doc.save(os.path.join(OUTPUT_DIR, "OUTIL_10_COCKPIT_LUNDI_8H30.docx"))
    print("Generated 10")

def main():
    print("===============================================================")
    print("CABINET DELACOUR - GENERATION DES 10 LIVRABLES AUDIT REELS")
    print("===============================================================")
    generate_tool_01()
    generate_tool_02()
    generate_tool_03()
    generate_tool_04()
    generate_tool_05()
    generate_tool_06()
    generate_tool_07()
    generate_tool_08()
    generate_tool_09()
    generate_tool_10()
    print(">>> LES 10 LIVRABLES ALIGNES SUR L'AUDIT ONT ETE GENERES DANS :")
    print(OUTPUT_DIR)

if __name__ == "__main__":
    main()
