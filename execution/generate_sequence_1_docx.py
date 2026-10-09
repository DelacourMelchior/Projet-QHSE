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
GOLD = RGBColor(197, 160, 101)          # #C5A065
LIGHT_BG = RGBColor(249, 249, 247)      # #F9F9F7

def set_cell_background(cell, fill_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_base_document():
    doc = Document()
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
    return doc

def add_header_brand(doc, tool_code, tool_title, clause_text):
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell_left = table.cell(0, 0)
    p_left = cell_left.paragraphs[0]
    r1 = p_left.add_run("CABINET DELACOUR\n")
    r1.font.name = "Georgia"
    r1.font.size = Pt(15)
    r1.font.bold = True
    r1.font.color.rgb = DARK_GREEN
    
    r2 = p_left.add_run("Stratégie & Performance QHSE - ISO 9001")
    r2.font.name = "Calibri"
    r2.font.size = Pt(9)
    r2.font.color.rgb = GOLD
    r2.font.bold = True
    
    cell_right = table.cell(0, 1)
    p_right = cell_right.paragraphs[0]
    p_right.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r_tag = p_right.add_run(f"SÉQUENCE 1 - {tool_code}\n{clause_text}")
    r_tag.font.name = "Calibri"
    r_tag.font.size = Pt(9.5)
    r_tag.font.bold = True
    r_tag.font.color.rgb = DARK_GREEN
    
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    
    h = doc.add_heading(tool_title, level=1)
    h.paragraph_format.space_after = Pt(10)
    for run in h.runs:
        run.font.name = "Georgia"
        run.font.size = Pt(18)
        run.font.bold = True
        run.font.color.rgb = DARK_GREEN

def add_callout_box(doc, title, content_paragraphs, bg_color="F9F9F7"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(4)
    r_title = p.add_run(title + "\n")
    r_title.font.name = "Georgia"
    r_title.font.size = Pt(11.5)
    r_title.font.bold = True
    r_title.font.color.rgb = DARK_GREEN
    
    for item in content_paragraphs:
        p_item = cell.add_paragraph()
        p_item.paragraph_format.space_after = Pt(3)
        r = p_item.add_run(item)
        r.font.name = "Calibri"
        r.font.size = Pt(9.5)
        r.font.color.rgb = DARK_GREEN
        
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

def format_word_table(doc, headers, rows_data):
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    hdr_cells = tbl.rows[0].cells
    for i, h_text in enumerate(headers):
        hdr_cells[i].text = h_text
        set_cell_background(hdr_cells[i], "152822")
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=140, right=140)
        for p in hdr_cells[i].paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.name = "Calibri"
                r.font.size = Pt(9.5)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)
                
    for r_idx, row_data in enumerate(rows_data):
        row_cells = tbl.add_row().cells
        bg_hex = "F9F9F7" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            row_cells[c_idx].text = val
            set_cell_background(row_cells[c_idx], bg_hex)
            set_cell_margins(row_cells[c_idx], top=100, bottom=100, left=140, right=140)
            for p in row_cells[c_idx].paragraphs:
                for r in p.runs:
                    r.font.name = "Calibri"
                    r.font.size = Pt(9)
                    if "[Saisissez" in val or "[Votre" in val or "________" in val:
                        r.font.italic = True
                        r.font.color.rgb = GOLD
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

# -----------------------------------------------------------------------------
# 0. START_HERE_SEQUENCE_1.docx
# -----------------------------------------------------------------------------
def make_start_here():
    doc = create_base_document()
    add_header_brand(doc, "NOTICE CLIENT", "Guide de Démarrage Client Autonome (Séquence 1)", "Parcours Guidé 5 Jours")
    
    add_callout_box(doc, "💡 BIENVENUE DANS VOTRE KIT D'OUTILS QUALITÉ PME", [
        "Ce dossier contient l'ensemble de vos 8 documents de gouvernance sous format Microsoft Word (.docx).",
        "Vous pouvez les ouvrir directement dans Microsoft Word ou les importer en 1 clic dans Google Docs.",
        "Remplissez simplement les zones soulignées [________] et les cases éditables avec les données réelles de votre entreprise."
    ])
    
    doc.add_heading("📅 VOTRE PLANNING DE REMPLISSAGE GUIDÉ EN 5 JOURS", level=2)
    
    p = doc.add_paragraph()
    p.add_run("- LUNDI (30 min) : ").bold = True
    p.add_run("Diagnostic du Contexte (SWOT - OUTIL_01A & PESTEL - OUTIL_01B)\n")
    p.add_run("- MARDI (20 min) : ").bold = True
    p.add_run("Cartographie des Parties Prenantes (OUTIL_02)\n")
    p.add_run("- MERCREDI (20 min) : ").bold = True
    p.add_run("Politique Qualité & Charte d'Engagement Direction (OUTIL_04)\n")
    p.add_run("- JEUDI (30 min) : ").bold = True
    p.add_run("Registre AMDEC Risques & Objectifs SMART (OUTIL_05 & OUTIL_06)\n")
    p.add_run("- VENDREDI (20 min) : ").bold = True
    p.add_run("Tableau de Bord 5 KPIs & PV Revue de Direction (OUTIL_03 & OUTIL_07)")
    
    doc.save(os.path.join(out_word_dir, "START_HERE_SEQUENCE_1.docx"))

# -----------------------------------------------------------------------------
# 1. OUTIL_01A_SWOT.docx
# -----------------------------------------------------------------------------
def make_swot():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 01A", "Matrice SWOT Stratégique Prête à Remplir", "Clause ISO 9001:2015 - 4.1")
    
    add_callout_box(doc, "🧠 CONSEILS CONSULTANT & BANQUE DE THÉMATIQUES", [
        "💡 Posture : Concentrez l'échange sur ce qui fait perdre du temps ou des sous (faiblesses/menaces) et sur ce qui apporte de la marge (forces/opportunités).",
        "- FORCES : Savoir-faire rare, équipe stable, parc machines récents, réactivité devis < 24h, certification ISO.",
        "- FAIBLESSES : Homme-clé unique, absence de GED, devis complexes à perte, coûts non-qualité non suivis.",
        "- OPPORTUNITÉS : Exigence ISO 9001 grands comptes, défaillance concurrent local, subventions transition numérique.",
        "- MENACES : Hausse prix matières métalliques, pénurie de main d'œuvre qualifiée, taxes tri déchets."
    ])
    
    doc.add_heading("🟢 1. FORCES (Atouts Internes)", level=2)
    doc.add_paragraph("- Savoir-faire technique reconnu et équipe stable (ancienneté moyenne 8 ans)")
    doc.add_paragraph("- Parc machines récent, entretenu en préventif avec taux de disponibilité 95%")
    doc.add_paragraph("- Proximité client et ultra-réactivité commerciale (Devis < 24h)")
    doc.add_paragraph("- [Saisissez votre Force 1] : ____________________________________________________")
    doc.add_paragraph("- [Saisissez votre Force 2] : ____________________________________________________")
    
    doc.add_heading("🔴 2. FAIBLESSES (Fragilités Internes)", level=2)
    doc.add_paragraph("- Dépendance forte envers 1 cadre homme-clé en atelier")
    doc.add_paragraph("- Absence de GED (perte de temps estimée à 45 min/jour/salarié)")
    doc.add_paragraph("- Absence de suivi chiffré des coûts de non-qualité (rebuts non chiffrés)")
    doc.add_paragraph("- [Saisissez votre Faiblesse 1] : ________________________________________________")
    doc.add_paragraph("- [Saisissez votre Faiblesse 2] : ________________________________________________")

    doc.add_heading("🔵 3. OPPORTUNITÉS (Marché Externe)", level=2)
    doc.add_paragraph("- Exigence croissante de la certification ISO 9001 par les donneurs d'ordres régionaix")
    doc.add_paragraph("- Défaillance d'un concurrent local permettant de récupérer des parts de marché")
    doc.add_paragraph("- Subventions régionales pour l'investissement numérique et GED")
    doc.add_paragraph("- [Saisissez votre Opportunité 1] : ____________________________________________")
    doc.add_paragraph("- [Saisissez votre Opportunité 2] : ____________________________________________")

    doc.add_heading("🟠 4. MENACES (Risques Externes)", level=2)
    doc.add_paragraph("- Augmentation brutale des prix des matières premières et de l'énergie (+15%)")
    doc.add_paragraph("- Pénurie de main d'œuvre qualifiée sur le bassin d'emploi")
    doc.add_paragraph("- Durcissement des normes environnementales et de recyclage des déchets")
    doc.add_paragraph("- [Saisissez votre Menace 1] : __________________________________________________")
    doc.add_paragraph("- [Saisissez votre Menace 2] : __________________________________________________")

    doc.add_heading("🎯 MATRICE DE CROISEMENT ET PLAN D'ACTION STRATÉGIQUE", level=2)
    headers = ["Axe Stratégique", "Problème Clé Issu du SWOT", "Action Stratégique à Lancer", "Responsable", "Échéance", "Budget / ROI"]
    rows = [
        ["Sécurisation", "Dépendance homme-clé atelier", "Fiches de poste + binômage polyvalence", "Resp. Prod", "31/03", "ROI : Évite arrêt prod"],
        ["Marge Brute", "Hausse coûts matières premières", "Indexation devis sur cours d'achat", "Resp. Com", "Immédiat", "Évite -45k€ de perte"],
        ["Gain Temps", "Recherche documentaire pénible", "Déploiement arborescence GED 30s", "Resp. IT/QSE", "30/04", "Gain 5h/sem/pers"],
        ["Croissance", "Demande ISO 9001 des clients", "Obtention certification ISO 9001", "DG / QSE", "30/06", "+80k€ CA visé"],
        ["[Votre Axe]", "[Votre Problème]", "[Votre Action à Saisir]", "[Nom]", "[Date]", "[Budget]"]
    ]
    format_word_table(doc, headers, rows)
    
    doc.save(os.path.join(out_word_dir, "OUTIL_01A_SWOT.docx"))

# -----------------------------------------------------------------------------
# 2. OUTIL_01B_PESTEL.docx
# -----------------------------------------------------------------------------
def make_pestel():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 01B", "Matrice PESTEL Macro-Économique Prête à Remplir", "Clause ISO 9001:2015 - 4.1")
    
    add_callout_box(doc, "🧠 CONSEILS CONSULTANT & THÉMATIQUES PESTEL PME", [
        "💡 Rapprochez chaque lettre PESTEL de l'impact direct sur la facture et le carnet de commandes PME.",
        "- POLITIQUE : Aides régionales Industrie 4.0, subventions décarbonation.",
        "- ÉCONOMIQUE : Inflation aciers/alu, coût de l'énergie KWh atelier, hausse transports.",
        "- SOCIAL : Pyramide des âges (départs retraite sous 2 ans), turn-over des jeunes.",
        "- TECHNOLOGIQUE : Cyberattaque ransomware, obsolescence de l'ERP/GPAO.",
        "- ÉCOLOGIQUE : Traitement des huiles/effluents, bilan carbone réclamé par les clients.",
        "- LÉGAL : Mise à jour DUERP Sécurité, contrôles CE des machines."
    ])
    
    headers = ["Pilier PESTEL", "Facteurs d'Influence à Examiner dans votre PME", "Impact", "Action Préventive / Opportunité", "Responsable"]
    rows = [
        ["POLITIQUE (P)", "Subventions régionales pour transition numérique et machines", "Opportunité", "Monter un dossier d'aide régionale à l'investissement", "DG / RAF"],
        ["ÉCONOMIQUE (E)", "Volatilité et hausse continue du prix des matières (+15%)", "Risque Fort", "Clause de révision tarifaire trimestrielle sur devis", "Resp. Com"],
        ["SOCIAL (S)", "Pénurie de profils qualifiés (techniciens maintenance, usîneurs)", "Risque Fort", "Déployer la matrice de polyvalence (Outil 22) et tutorat", "RH / Prod"],
        ["TECHNOLOGIQUE (T)", "Digitalisation : nécessité d'automatiser les données atelier", "Risque Moyen", "Implémenter un ERP/GED Cloud pour supprimer le papier", "Resp. IT"],
        ["ÉCOLOGIQUE (E)", "Exigence croissante des clients sur bilan carbone et tri", "Opportunité", "Structurer la filière de recyclage des chutes et communiquer", "Resp. QSE"],
        ["LÉGAL (L)", "Évolutions du code du travail (Document Unique - DUERP)", "Conforme", "Mettre à jour le DUERP annuel et plan de prévention", "Resp. QSE"],
        ["[Votre Pilier]", "[Saisissez votre facteur PME]", "Risque", "[Saisissez votre action préventive]", "[Nom]"]
    ]
    format_word_table(doc, headers, rows)
    doc.save(os.path.join(out_word_dir, "OUTIL_01B_PESTEL.docx"))

# -----------------------------------------------------------------------------
# 3. OUTIL_02_PARTIES_PRENANTES.docx
# -----------------------------------------------------------------------------
def make_parties_prenantes():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 02", "Cartographie des Parties Prenantes Stratégiques", "Clause ISO 9001:2015 - 4.2")
    
    add_callout_box(doc, "🧠 CONSEILS CONSULTANT & EXIGENCES CLÉS", [
        "💡 Demandez au dirigeant : Qui a le pouvoir de stopper vos livraisons, bloquer votre compte bancaire ou vous faire perdre votre plus gros client ?",
        "- Clients Grands Comptes : Certificats matières 3.1, contrôle 3D, emballages spécifiques, livraison à H+0.",
        "- Fournisseurs Critiques : Transparence stocks, respect délais confirmés, réactivité FNC sous 48h.",
        "- Banques & Assurances : Transmission des bilans certifiés au 30 avril, ratios EBE sains.",
        "- Équipes & Organismes : DUERP Sécurité au poste, zéro accident, audit annuel ISO 9001."
    ])
    
    headers = ["Catégorie", "Nom / Acteur Réel PME", "Exigence Critique Non Négociable", "Risque Majeur", "Preuve de Contrôle", "Responsable"]
    rows = [
        ["1. Clients Stratégiques", "Client Grand Compte ALFA", "Livraison sous 48h maxi avec certificat de conformité", "Pénalité retard 5%/jour + risque déréférencement", "BL émargé + PV contrôle signé (Outil 17)", "Dir. Com"],
        ["2. Fournisseurs Critiques", "Fournisseur Métaux ACIER-X", "Matières 100% conformes aux spécifications", "Pièces défectueuses + arrêt chaîne prod", "Certificat 3.1 archivé GED + Grille (Outil 09)", "Resp. Achats"],
        ["3. Financeurs / Banques", "Banque Régionale Z", "Transmission des comptes certifiés et ratios trésorerie", "Refus de renouvellement de la ligne découvert", "Tableau trésorerie mensuel + Bilan annuel", "RAF / DG"],
        ["4. Salariés & CSE", "Équipes Production Atelier", "Respect des règles de sécurité (EPI) et paiement fixe", "Accidents du travail + démissions cadres clés", "DUERP à jour + Registre formations", "RH / QSE"],
        ["5. Organismes / État", "Organisme Certification ISO", "Réalisation audit annuel ISO 9001 sans écart majeur", "Perte du certificat ISO 9001 exigé sur devis", "PV Revue Direction (Outil 07) + Audits", "Resp. QSE"],
        ["[Votre Catégorie]", "[Saisissez le Nom]", "[Saisissez l'exigence non négociable]", "[Risque]", "[Preuve de contrôle]", "[Nom]"]
    ]
    format_word_table(doc, headers, rows)
    doc.save(os.path.join(out_word_dir, "OUTIL_02_PARTIES_PRENANTES.docx"))

# -----------------------------------------------------------------------------
# 4. OUTIL_03_DASHBOARD_DIRECTION.docx
# -----------------------------------------------------------------------------
def make_dashboard():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 03", "Tableau de Bord de Pilotage Direction (5 Axes Data)", "Clauses ISO 9001:2015 - 5.1 & 9.1")
    
    add_callout_box(doc, "🧠 CONSEILS CONSULTANT & CHOIX DES KPIS", [
        "💡 Moins c'est mieux ! Limitez-vous strictement à 5 indicateurs vitaux. S'ils sont tous au vert, l'entreprise gagne de l'argent.",
        "1. Financier : CA mensuel HT vs budget, Marge brute % globale (min 35%).",
        "2. Qualité : Coût total de non-qualité (€) = rebuts + heures retouches.",
        "3. Client & Opérations : Net Promoter Score (NPS), Taux de respect des délais (OTD %).",
        "4. RH & Sécurité : Nombre d'accidents du travail (objectif zéro)."
    ])
    
    headers = ["Axe Métier", "Indicateur Clé (KPI)", "Formule Exacte de Calcul", "Cible", "Mois M-1", "Mois M (Réel)", "Statut", "Action d'Urgence si Alerte"]
    rows = [
        ["1. Financier", "Chiffre d'Affaires Mensuel (€)", "Somme des factures émises HT", "≥ 350 k€", "340 k€", "362 k€", "Conforme", "Ras (Objectif dépassé)"],
        ["1. Financier", "Marge Brute Globale (%)", "(CA HT - Coûts direct d'achat) / CA", "≥ 38 %", "36.5 %", "34.2 %", "Alerte", "Bloquer signature devis sous 35% marge"],
        ["2. Qualité", "Coût de Non-Qualité (€)", "Coût pièces jetées + heures retouches", "≤ 3 000 €", "5 400 €", "4 100 €", "À surveiller", "Analyser plus grosse FNC du mois (Outil 19)"],
        ["3. Client", "Satisfaction Client (NPS)", "Score net issu des enquêtes flash", "≥ 45", "42", "48", "Conforme", "Ras"],
        ["4. Opérations", "Taux de Service / Délais (%)", "(Livraisons à date / Livraisons tot.) x 100", "≥ 95 %", "92.0 %", "96.5 %", "Conforme", "Ras"],
        ["5. Sécurité/RH", "Accidents du travail", "Nb accidents avec arrêt / Heures trav.", "0 accident", "0", "0", "Conforme", "Ras"],
        ["[Axe]", "[Saisissez votre KPI]", "[Formule]", "[Cible]", "[M-1]", "[M]", "Statut", "[Saisissez votre action d'urgence]"]
    ]
    format_word_table(doc, headers, rows)
    doc.save(os.path.join(out_word_dir, "OUTIL_03_DASHBOARD_DIRECTION.docx"))

# -----------------------------------------------------------------------------
# 5. OUTIL_04_POLITIQUE_QUALITE.docx
# -----------------------------------------------------------------------------
def make_politique():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 04", "Charte de Politique Qualité & Performance Prête à Signer", "Clause ISO 9001:2015 - 5.2")
    
    add_callout_box(doc, "🧠 CONSEILS CONSULTANT & ENGAGEMENTS", [
        "💡 Évitez le jargon d'audit. La Politique Qualité doit se lire comme le contrat d'honneur du dirigeant envers ses salariés et ses clients.",
        "- Zéro Gaspillage : Faire bien du premier coup, interdire le travail sans plan à jour, rejeter les affaires à perte.",
        "- Excellence Délais Client : Honorer 100% des dates de livraison promises, traiter toute alerte sous 24h.",
        "- Souveraineté du Savoir : Travailler dans la sécurité et le calme, formaliser les savoirs clés."
    ])
    
    doc.add_heading("ENGAGEMENT DE LA DIRECTION : POLITIQUE QUALITÉ & PERFORMANCE", level=2)
    
    p = doc.add_paragraph()
    p.add_run("Société : ").bold = True
    p.add_run("[Cliquez ici et saisissez le Nom de votre Entreprise]\n")
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
    
    p.add_run("Signatures officielles :\n\n").bold = True
    p.add_run("Direction Générale : ___________________________          Responsable QSE : ___________________________")
    
    doc.save(os.path.join(out_word_dir, "OUTIL_04_POLITIQUE_QUALITE.docx"))

# -----------------------------------------------------------------------------
# 6. OUTIL_05_AMDEC_RISQUES.docx
# -----------------------------------------------------------------------------
def make_amdec():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 05", "Registre des Risques & Opportunités (AMDEC Simplifiée)", "Clause ISO 9001:2015 - 6.1")
    
    add_callout_box(doc, "🧠 CONSEILS CONSULTANT & REGISTRE AMDEC", [
        "💡 Ne notez pas les risques selon les ressentis affectifs : appliquez la cotation Fréquence (1-5) x Gravité (1-5).",
        "- Tout score ≥ 10 (Zone Rouge) déclenche OBLIGATOIREMENT une action préventive avec calcul de ROI."
    ])
    
    headers = ["N°", "Risque / Vulnérabilité Identifiée", "Cause Racine", "Fréq (1-5)", "Grav (1-5)", "Score (FxG)", "Action Préventive à Déployer", "Budget / ROI", "Responsable", "Statut"]
    rows = [
        ["R1", "Erreur de chiffrage sur devis complexe", "Calcul de marge manuel sur Excel", "3", "4", "12 (Rouge)", "Grille de validation obligatoire devis > 10k€", "ROI : Évite 20k€ pertes", "Resp. Com", "Actif"],
        ["R2", "Rupture d'approvisionnement matière", "Fournisseur unique sur composant X", "2", "5", "10 (Rouge)", "Homologuer un 2ème fournisseur de secours", "Coût : 500€ d'essais", "Resp. Achats", "Actif"],
        ["R3", "Panne prolongée machine découpe Laser", "Défaut de maintenance préventive", "2", "4", "8 (Orange)", "Souscrire contrat maintenance préventive", "Coût : 1 500€/an", "Resp. Prod", "Actif"],
        ["R4", "Départ imprévu du Chef d'Atelier", "Absence de procédures écrites poste", "2", "4", "8 (Orange)", "Rédiger les modes opératoires + binôme", "Temps interne 20h", "RH / Prod", "Actif"],
        ["R5", "Pertes de données suite cyberattaque", "Sauvegardes manuelles irrégulières", "1", "5", "5 (Jaune)", "Automatiser des sauvegardes Cloud quotidiennes", "Coût : 30€/mois", "Resp. IT", "Actif"],
        ["[N°]", "[Saisissez votre risque]", "[Cause]", "[1-5]", "[1-5]", "[FxG]", "[Saisissez votre action préventive]", "[Budget]", "[Nom]", "Actif"]
    ]
    format_word_table(doc, headers, rows)
    doc.save(os.path.join(out_word_dir, "OUTIL_05_AMDEC_RISQUES.docx"))

# -----------------------------------------------------------------------------
# 7. OUTIL_06_OBJECTIFS_SMART.docx
# -----------------------------------------------------------------------------
def make_smart():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 06", "Feuille de Route d'Objectifs SMART par Service", "Clause ISO 9001:2015 - 6.2")
    
    add_callout_box(doc, "🧠 CONSEILS CONSULTANT & FORMULES MATHÉMATIQUES", [
        "💡 Exigez une formule mathématique exacte. Si un indicateur ne peut pas être extrait en 2 clics de votre ERP ou d'Excel, l'objectif sera abandonné."
    ])
    
    headers = ["Service", "Objectif Amélioration SMART", "Formule Exacte de Mesure", "Cible", "Jalons M+3", "Jalons M+6", "Ressources Allouées", "Responsable", "Statut"]
    rows = [
        ["Commercial", "Réduire devis perdus pour délai de chiffrage", "(Devis perdus pour délai / Total devis) x 100", "≤ 10 %", "15 %", "8 %", "Logiciel chiffrage express", "Dir. Com", "Conforme"],
        ["Production", "Diviser par deux le taux de rebuts atelier", "(Valeur pièces jetées / CA produit) x 100", "≤ 1.5 %", "2.2 %", "1.3 %", "Formation réglage + gabarits", "Chef Prod", "Conforme"],
        ["Achats", "Obtenir 100% de livraisons fournisseurs à date", "(Commandes reçues à date / Total commandes) x 100", "≥ 98 %", "95 %", "98.5 %", "Grille d'évaluation (Outil 09)", "Resp. Achats", "Conforme"],
        ["Qualité", "Prise en charge réclamations clients sous 24h", "(Réclamations traitées < 24h / Total réclamations)", "100 %", "90 %", "100 %", "Registre réclamations (Outil 10)", "Resp. QSE", "Conforme"],
        ["[Service]", "[Saisissez l'objectif SMART]", "[Formule mathématique]", "[Cible]", "[M+3]", "[M+6]", "[Ressources]", "[Nom]", "Conforme"]
    ]
    format_word_table(doc, headers, rows)
    doc.save(os.path.join(out_word_dir, "OUTIL_06_OBJECTIFS_SMART.docx"))

# -----------------------------------------------------------------------------
# 8. OUTIL_07_REVUE_DIRECTION.docx
# -----------------------------------------------------------------------------
def make_revue():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 07", "PV de Revue de Direction Complexe (7 Points ISO)", "Clause ISO 9001:2015 - 9.3")
    
    add_callout_box(doc, "🧠 CONSEILS CONSULTANT & ARBITRAGES REVUE DIRECTION", [
        "💡 La Revue de Direction est le conseil d'administration opérationnel de la Qualité. Suivez scrupuleusement les 7 points normatifs pour ressortir avec des arbitrages et des budgets votés."
    ])
    
    doc.add_heading("PROCÈS-VERBAL DE REVUE DE DIRECTION COMPLÈTE", level=2)
    
    p = doc.add_paragraph()
    p.add_run("Société : ").bold = True
    p.add_run("[Cliquez ici et saisissez le Nom de votre Entreprise] | Date : [Date de réunion]\n")
    p.add_run("Présents : ").bold = True
    p.add_run("[DG, Responsable Qualité, Responsable Opérations, Responsable Commercial]\n\n")
    
    p.add_run("1. ÉTAT DES ACTIONS DE LA REVUE PRÉCÉDENTE (9.3.2.a) :\n").bold = True
    p.add_run("- Action 1 : Déploiement arborescence GED 30s ──► [🟢 Finalisée]\n- Action 2 : Formation de 2 opérateurs au contrôle dimensionnel ──► [🟢 Finalisée]\n\n")
    
    p.add_run("2. ÉVOLUTION DES ENJEUX INTERNES / EXTERNES (SWOT & PESTEL - 9.3.2.b) :\n").bold = True
    p.add_run("- Hausse des matières premières de +15% ──► Décision d'indexer nos devis sur le cours d'achat.\n- Pénurie locale de main d'œuvre ──► Validation du programme de polyvalence et binômage atelier.\n\n")
    
    p.add_run("3. INFORMATIONS SUR LA PERFORMANCE DU SMQ (9.3.2.c) :\n").bold = True
    p.add_run("- Satisfaction client : 96.5% de satisfaction (NPS 48), 4 réclamations traitées sous 24h.\n- Atteinte des objectifs SMART : 4 objectifs sur 5 atteints (Rebuts réduits à 1.3%).\n- Non-conformités et coûts cachés : Coût total de non-qualité ramené à 4 100 € sur l'année.\n- Audits internes : Audit réalisé le 15/01 (1 écart mineur corrigé sous 15 jours).\n- Fournisseurs : 2 fournisseurs principaux évalués à 17/20, sous-traitant B sous réserve.\n\n")
    
    p.add_run("4. ADÉQUATION DES RESSOURCES (9.3.2.d) :\n").bold = True
    p.add_run("- Validation de l'achat d'une imprimante d'étiquettes code-barres pour bac quarantaine.\n\n")
    
    p.add_run("5. EFFICACITÉ DES ACTIONS FACE AUX RISQUES (AMDEC - 9.3.2.e) :\n").bold = True
    p.add_run("- Risque rupture approvisionnement neutralisé par homologation d'un 2ème fournisseur.\n\n")
    
    p.add_run("6. OPPORTUNITÉS D'AMÉLIORATION & ROI ESTIMÉ (9.3.2.f) :\n").bold = True
    p.add_run("- Automatisation des remontées de données sur dashboard digital (Gain estimé : 5h/mois).\n\n")
    
    p.add_run("7. DÉCISIONS & ARBITRAGES BUDGÉTAIRES DE LA DIRECTION (9.3.3) :\n").bold = True
    p.add_run("- Décision 1 : Budget de 3 500 € validé pour la formation polyvalence et sécurité atelier.\n- Décision 2 : Validation du programme d'audit interne pour l'année 2026.\n- Décision 3 : Maintien de l'objectif de certification ISO 9001 pour le 30 Juin.\n\n")
    
    p.add_run("Signatures des Participants au Comité :\n\n").bold = True
    p.add_run("DG : ___________________________          QSE : ___________________________\n\n")
    p.add_run("Resp. Com : ____________________          Chef Prod : ______________________")
    
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

print("Successfully generated all 9 Microsoft Word (.docx) documents for Sequence 1!")
