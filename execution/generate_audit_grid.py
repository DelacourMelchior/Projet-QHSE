# -*- coding: utf-8 -*-
import os
import sys
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

sys.path.insert(0, os.path.dirname(__file__))
from commando_style import (
    BASE_DIR, create_base_document, add_header_brand, add_section_header,
    add_cash_counter_box, add_metadata_box, format_word_table,
    add_validation_signoff_box, add_next_steps_box,
    BRAND_GREEN, GOLD, WHITE, GREEN_TEXT, RED_TEXT, MUTED_TEXT,
    CREAM_BG, CASH_BG, WHY_BG, BORDER_ACCENT, HEADER_BG, SUBHDR_BG,
    set_cell_background, set_cell_margins, set_cell_border, set_explicit_cell_width
)

AUDIT_DIR = os.path.join(BASE_DIR, "00_AUDIT_ROBUSTESSE_ET_RENTABILITE")
os.makedirs(AUDIT_DIR, exist_ok=True)

def generate_audit_grid_docx():
    doc = create_base_document()
    add_header_brand(doc, "AUDIT STRATEGIQUE", "GRILLE D'AUDIT ROBUSTESSE & RENTABILITE PME", "ENTRETIEN CONVERSATIONNEL 100% VISIO")
    
    add_cash_counter_box(
        doc,
        "Audit Flash Distanciel : 21 questions ouvertes pour reveler les fuites de marge invisibles",
        "Evaluation personnalisee selon les donnees reelles de l'entreprise",
        "Score de Robustesse (/63) et calcul de l'Impot Invisible reel constate sur ecran"
    )
    
    add_section_header(doc, "1. PROTOCOLE CONVERSATIONNEL & FICHE DE CADRAGE")
    meta = {
        "Raison Sociale de l'Entreprise :" : "[ Nom de l'entreprise client ]",
        "Secteur d'Activite (Tous secteurs) :" : "[ Industrie, Services B2B, BTP, Negoce, Logistique, Ingenierie ]",
        "Format & Calendrier Visio :" : "2 Sessions de 2h00 (Session 1 : Marge & Cash / Session 2 : Organisation & RH)",
        "Auditeur Consultant :" : "Cabinet Delacour (contact@cabinetdelacour.com)",
        "Dirigeant & Interlocuteurs Cles :" : "[ Nom du Dirigeant, Resp. Operations, Resp. Administratif/Financier ]",
        "Chiffre d'Affaires & Marge Nette :" : "[ CA declare : ______ EUR - Marge Nette estimee : ____ % ]",
        "Impot Invisible Evalue (Diag Web) :" : "[ Estimation : ______ EUR / an (soit _____ EUR / jour d'inaction) ]"
    }
    add_metadata_box(doc, meta)
    
    add_section_header(doc, "2. BAREME D'EVALUATION CASH DELACOUR (0 A 3)")
    headers_sc = ["NOTE", "STATUT DU CONSTAT", "NIVEAU RISQUE", "DIAGNOSTIC FINANCIER & IMPACT BUSINESS", "ACTION PRESCRITE"]
    col_w_sc = [800, 2400, 1600, 3600, 1800]
    rows_sc = [
        ["0", "Fuite de Cash Majeure", "ALERTE ROUGE", "Pratique non maitrisee, perte financiere active recurrente, risque fort", "Outil Commando sous 48h"],
        ["1", "Friction Operationnelle", "ZONE ORANGE", "Pratique informelle, transmission orale, dependance homme-cle, retards", "Outil Commando sous 15j"],
        ["2", "Pratique Robuste", "ZONE VERTE", "Regle appliquee, seuils verrouilles, trace ecrite visible sur ecran", "Controle semestriel"],
        ["3", "Excellence Rentabilite", "ZONE OR", "Verrouillage systemique, tableau de bord temps reel, zero friction", "Standard de reference"]
    ]
    format_word_table(doc, headers_sc, rows_sc, col_widths_dxa=col_w_sc, center_cols=[0, 2, 4])
    
    # MODULE 1
    add_section_header(doc, "3. MODULE 1 : VENTES, CHIFFRAGE & PROTECTION DE LA MARGE")
    headers_m1 = ["REF", "QUESTION OUVERTE DE CONVERSATION (SCRIPT VISIO)", "RELANCES CASH & PREUVES SUR ECRAN", "NOTE", "RISQUE METIER & METHODE DU COUT REEL", "OUTIL"]
    col_w_m1 = [600, 3300, 2700, 650, 1750, 1200]
    rows_m1 = [
        [
            "1.1",
            "\"Comment construisez-vous vos devis aujourd'hui, et comment vous assurez-vous que vos couts de revient reels (charges, temps effectif, inflation) sont a jour ?\"",
            "Relance : date du dernier recalcul des taux horaires. Ecran : ouvrir grille tarifaire / outil chiffrage dernier devis.",
            "[ ]",
            "Risque : Vente a perte main-d'oeuvre.\nCalcul : Ecart taux horaire x Heures facturées",
            "OUTIL 01"
        ],
        [
            "1.2",
            "\"Quand un commercial ou vous-meme negociez une affaire difficile, comment se decide le niveau de remise, et quelle est la limite infranchissable ?\"",
            "Relance : blocage technique du logiciel sous marge plancher ? Ecran : examiner 3 devis recents comportant des remises.",
            "[ ]",
            "Risque : Destruction de marge.\nCalcul : Total des remises accordees sur 12 mois",
            "OUTIL 01"
        ],
        [
            "1.3",
            "\"En cours de mission ou d'execution, quand un client demande un ajustement ou un extra : comment ca se passe pour chiffrer et faire signer cet avenant ?\"",
            "Relance : combien d'heures ou d'extras offerts sans facture ? Ecran : comparer temps reel passe vs chiffrage initial.",
            "[ ]",
            "Risque : Prestations gratuites.\nCalcul : Heures d'extras non facturees x Taux horaire",
            "OUTIL 01"
        ],
        [
            "1.4",
            "\"Quelle est votre regle sur le versement de l'acompte avant d'engager du temps, des achats ou des ressources sur un contrat ?\"",
            "Relance : demarrage avant reception bancaire effective ? Ecran : verifier sur le dernier dossier acompte vs lancement.",
            "[ ]",
            "Risque : Avance BFR client.\nCalcul : Frais financiers et agios bancaires d'exploitation",
            "OUTIL 01"
        ]
    ]
    format_word_table(doc, headers_m1, rows_m1, col_widths_dxa=col_w_m1, center_cols=[0, 3, 5])
    
    # MODULE 2
    add_section_header(doc, "4. MODULE 2 : LIVRAISON, FACTURATION & GESTION DES LITIGES")
    headers_m2 = ["REF", "QUESTION OUVERTE DE CONVERSATION (SCRIPT VISIO)", "RELANCES CASH & PREUVES SUR ECRAN", "NOTE", "RISQUE METIER & METHODE DU COUT REEL", "OUTIL"]
    col_w_m2 = [600, 3300, 2700, 650, 1750, 1200]
    rows_m2 = [
        [
            "2.1",
            "\"Racontez-moi comment se passe la fin d'une prestation ou livraison : a quel moment et sous quelle forme le client valide-t-il formellement son acceptation ?\"",
            "Relance : PV ou bon signe et tamponne le jour meme ? Ecran : ouvrir 3 dossiers clients recents dans la GED.",
            "[ ]",
            "Risque : Defaut de preuve d'achevement.\nCalcul : Creances bloquees sans PV signe",
            "OUTIL 02"
        ],
        [
            "2.2",
            "\"Entre le moment ou une mission est terminee et le moment ou la facture finale part chez le client : quel est le circuit et combien de jours s'ecoulent ?\"",
            "Relance : facture sous 24h chrono ou attente fin de mois ? Ecran : liste des factures du mois precedent et delais.",
            "[ ]",
            "Risque : Tresorerie dormante.\nCalcul : (Jours retard facturation / 365) x CA annuel",
            "OUTIL 02"
        ],
        [
            "2.3",
            "\"Quand un client emet une reserve ou conteste un point de detail : comment reagit-il sur le reglement, et comment gerez-vous ce blocage ?\"",
            "Relance : blocage de 100% de la facture ? Regle des 95% ? Ecran : examiner balance agee des creances impayees.",
            "[ ]",
            "Risque : Retenue abusive de cash.\nCalcul : Montants bloques sur reserves futiles",
            "OUTIL 02"
        ],
        [
            "2.4",
            "\"Quand une reclamation client arrive : comment se prend la decision d'accorder un avoir ou geste commercial, et qui a le pouvoir de le signer ?\"",
            "Relance : seuil strict exigeant l'accord DG ? Ecran : ouvrir grand livre compte 709 (avoirs/remises) sur 12 mois.",
            "[ ]",
            "Risque : Fuite directe de resultat net.\nCalcul : Total annuel avoirs accordes (compte 709)",
            "OUTIL 03"
        ],
        [
            "2.5",
            "\"Quand un retard ou defaut provient d'un partenaire exterieur (transporteur, sous-traitant) : comment faites-vous pour lui imputer le prejudice ?\"",
            "Relance : note de debit et reclamation ecrite sous 48h ? Ecran : examiner traitement du dernier litige tiers.",
            "[ ]",
            "Risque : Non-recours tiers.\nCalcul : Montant annuel litiges partenaires absorbes",
            "OUTIL 03"
        ]
    ]
    format_word_table(doc, headers_m2, rows_m2, col_widths_dxa=col_w_m2, center_cols=[0, 3, 5])
    
    # MODULE 3
    add_section_header(doc, "5. MODULE 3 : ORGANISATION, GESTION DE L'INFORMATION & OUTILS STRATEGIQUES")
    headers_m3 = ["REF", "QUESTION OUVERTE DE CONVERSATION (SCRIPT VISIO)", "RELANCES CASH & PREUVES SUR ECRAN", "NOTE", "RISQUE METIER & METHODE DU COUT REEL", "OUTIL"]
    col_w_m3 = [600, 3300, 2700, 650, 1750, 1200]
    rows_m3 = [
        [
            "3.1",
            "\"Si un collaborateur a besoin d'un document type, d'une procedure, d'un fichier ou d'un outil : combien de temps met-il pour mettre la main dessus au quotidien ?\"",
            "Relance : ou perd-on le plus de temps a chercher ? Ecran : test chronometre, ouvrir un document cle precis (< 30s).",
            "[ ]",
            "Risque : Heures payees a chercher.\nCalcul : (Min perdues/j / 60) x Salaires charges x 220j",
            "OUTIL 04"
        ],
        [
            "3.2",
            "\"Comment sont structures vos repertoires partages (Cloud, GED), et comment vous assurez-vous qu'on ne travaille jamais sur une ancienne version d'un fichier ?\"",
            "Relance : fichiers disperses sur bureaux de PC ? Ecran : parcourir l'arborescence d'un projet client type.",
            "[ ]",
            "Risque : Travail sur doc obsolete.\nCalcul : Cout complet reprise (temps passe + achats)",
            "OUTIL 04"
        ],
        [
            "3.3",
            "\"Dans votre chaine de valeur, quel est l'outil, le logiciel ou la machine qui cadence toute l'activite et dont la defaillance mettrait tout le monde a l'arret ?\"",
            "Relance : entretien preventif pour eviter la casse ? Ecran/Visio : protocole de controle ou contrat de maintenance.",
            "[ ]",
            "Risque : Interruption d'activite.\nCalcul : Heures de blocage x Cout horaire interruption",
            "OUTIL 06"
        ],
        [
            "3.4",
            "\"Si cet outil ou logiciel strategique tombe en panne cet apres-midi : quel est votre plan de secours, et combien de temps faut-il pour redemarrer normalement ?\"",
            "Relance : composants sous cle ou bascule sous 24h ? Ecran/Visio : verifier sauvegarde testee ou procedure secours.",
            "[ ]",
            "Risque : Rupture de continuite.\nCalcul : Penalites retard + Surcouts sous-traitance",
            "OUTIL 06"
        ]
    ]
    format_word_table(doc, headers_m3, rows_m3, col_widths_dxa=col_w_m3, center_cols=[0, 3, 5])
    
    # MODULE 4
    add_section_header(doc, "6. MODULE 4 : QUALITE D'EXECUTION, ERREURS RECURRENTES & STANDARDS")
    headers_m4 = ["REF", "QUESTION OUVERTE DE CONVERSATION (SCRIPT VISIO)", "RELANCES CASH & PREUVES SUR ECRAN", "NOTE", "RISQUE METIER & METHODE DU COUT REEL", "OUTIL"]
    col_w_m4 = [600, 3300, 2700, 650, 1750, 1200]
    rows_m4 = [
        [
            "4.1",
            "\"Pour les taches complexes ou les etapes ou une erreur coute cher : sous quelle forme les bonnes pratiques et points de vigilance sont-ils formalises ?\"",
            "Relance : supports visuels simples (check-lists, photos) ? Ecran : faire afficher une consigne ou trame de poste.",
            "[ ]",
            "Risque : Variabilite de qualite.\nCalcul : Cout retouches liees aux consignes orales",
            "OUTIL 05"
        ],
        [
            "4.2",
            "\"Quand un nouveau collaborateur ou sous-traitant commence : comment se passe son integration et a quel moment validez-vous qu'il est autonome ?\"",
            "Relance : delai avant zero erreur ? Entretien visio : criteres de validation d'autonomie de la derniere recrue.",
            "[ ]",
            "Risque : Erreurs d'apprentissage.\nCalcul : Heures a corriger le travail des recrues",
            "OUTIL 05"
        ],
        [
            "4.3",
            "\"Quand un livrable est rate, qu'une mission doit etre refaite ou un produit mis au rebut : comment mesurez-vous et chiffrez-vous ce que cette erreur coute ?\"",
            "Relance : suivi financier du temps et de la matiere perdus ? Ecran : ouvrir tableau de suivi des non-qualites.",
            "[ ]",
            "Risque : Non-qualite ignoree.\nCalcul : Cout financier des rebuts / reprises sur 12 mois",
            "OUTIL 07"
        ],
        [
            "4.4",
            "\"Lorsqu'un probleme ou litige se produit pour la deuxieme fois : comment reagissez-vous pour qu'il soit techniquement impossible que cela se reproduise ?\"",
            "Relance : simple rappel oral ou etape bloquante ? Ecran : examiner action corrective du dernier incident marquant.",
            "[ ]",
            "Risque : Recidive chronique du defaut.\nCalcul : Frequence annuelle x Cout unitaire incident",
            "OUTIL 07"
        ]
    ]
    format_word_table(doc, headers_m4, rows_m4, col_widths_dxa=col_w_m4, center_cols=[0, 3, 5])
    
    # MODULE 5
    add_section_header(doc, "7. MODULE 5 : MANAGEMENT, COMPETENCES CLES & PILOTAGE DU CASH")
    headers_m5 = ["REF", "QUESTION OUVERTE DE CONVERSATION (SCRIPT VISIO)", "RELANCES CASH & PREUVES SUR ECRAN", "NOTE", "RISQUE METIER & METHODE DU COUT REEL", "OUTIL"]
    col_w_m5 = [600, 3300, 2700, 650, 1750, 1200]
    rows_m5 = [
        [
            "5.1",
            "\"Comment sont organises vos points de synchronisation avec vos equipes : a quel rythme, combien de temps, et comment evitez-vous les debordements ?\"",
            "Relance : 1 probleme = 1 pilote = 1 echeance journee ? Ecran/Debrief : visualiser le rituel d'animation.",
            "[ ]",
            "Risque : Reunionite et dispersion.\nCalcul : Heures superflues x Cout horaire participants",
            "OUTIL 08"
        ],
        [
            "5.2",
            "\"Si votre bras droit operationnel ou collaborateur le plus pointu doit s'absenter 1 mois a compter de demain : comment tourne l'entreprise sans lui ?\"",
            "Relance : activites sans aucune doublure formee ? Ecran : examiner organigramme ou matrice des competences.",
            "[ ]",
            "Risque : Paralysie par homme-cle.\nCalcul : Perte d'exploitation journaliere si absence",
            "OUTIL 09"
        ],
        [
            "5.3",
            "\"En tant que dirigeant, quels sont les 4 ou 5 chiffres cles que vous regardez chaque debut de semaine pour savoir precisement ou en est votre rentabilite ?\"",
            "Relance : cockpit unique consulte en 15 min le lundi ? Ecran : partager tableau de bord hebdomadaire DG.",
            "[ ]",
            "Risque : Pilotage dans retroviseur.\nCalcul : Ecarts de marge constates trop tard pour agir",
            "OUTIL 10"
        ],
        [
            "5.4",
            "\"Comment anticipez-vous vos flux de tresorerie a 4-6 semaines : comment comparez-vous encaissements fermes et decaissements obligatoires ?\"",
            "Relance : previ glissant le vendredi ou solde au feeling ? Ecran : afficher fichier previsionnel de tresorerie.",
            "[ ]",
            "Risque : Impasse de tresorerie imprevue.\nCalcul : Agios bancaires et surcouts achats urgence",
            "OUTIL 10"
        ]
    ]
    format_word_table(doc, headers_m5, rows_m5, col_widths_dxa=col_w_m5, center_cols=[0, 3, 5])
    
    # SYNTHESE DES SCORES
    add_section_header(doc, "8. SYNTHESE DES SCORES & INDICE GLOBAL DE ROBUSTESSE")
    headers_syn = ["MODULE D'INVESTIGATION", "NB QUESTIONS", "NOTE MAX", "SCORE OBTENU", "POURCENTAGE", "STATUT DOMINANT"]
    col_w_syn = [3200, 1100, 1100, 1400, 1400, 2000]
    rows_syn = [
        ["Module 1 : Ventes & Marges", "4", "12 pts", "[  ] / 12", "[   %]", "[ Rouge / Orange / Vert ]"],
        ["Module 2 : Facturation & Litiges", "5", "15 pts", "[  ] / 15", "[   %]", "[ Rouge / Orange / Vert ]"],
        ["Module 3 : Organisation & Outils", "4", "12 pts", "[  ] / 12", "[   %]", "[ Rouge / Orange / Vert ]"],
        ["Module 4 : Qualite & Standards", "4", "12 pts", "[  ] / 12", "[   %]", "[ Rouge / Orange / Vert ]"],
        ["Module 5 : Management & Cash", "4", "12 pts", "[  ] / 12", "[   %]", "[ Rouge / Orange / Vert ]"],
        ["TOTAL GENERAL DE L'AUDIT", "21", "63 pts", "[  ] / 63", "[   %]", "INDICE DE ROBUSTESSE"]
    ]
    format_word_table(doc, headers_syn, rows_syn, col_widths_dxa=col_w_syn, center_cols=[1, 2, 3, 4, 5])
    
    # FEUILLE DE ROUTE
    add_section_header(doc, "9. PLAN DE DEPLOIEMENT COMMANDO 30 JOURS (PRESCRIPTION DES OUTILS)")
    headers_pl = ["PRIORITE", "VULNERABILITE IDENTIFIEE SUR ECRAN", "OUTIL COMMANDO PRESCRIT", "PILOTE", "ECHEANCE", "OBJECTIF MESURABLE DE RECUPERATION"]
    col_w_pl = [1200, 3200, 2200, 1200, 900, 1500]
    rows_pl = [
        ["URGENCE 1", "Devis sans marge plancher & extras realises sans avenant signe", "OUTIL 01 (Cadrage Devis)", "[Nom]", "J+2", "100% devis cadres & avenants factures"],
        ["URGENCE 1", "Facturation retardee sans preuve d'acceptation formelle / PV", "OUTIL 02 (PV Recette)", "[Nom]", "J+2", "Facture < 24h & 100% PV signes"],
        ["URGENCE 2", "Avoirs accordes sans visa directionnel ni refacturation des tiers", "OUTIL 03 (Chasse aux Avoirs)", "[Nom]", "J+7", "Plafond delegation & 0 avoir sans DG"],
        ["URGENCE 2", "Temps excessif perdu a chercher des fichiers, modeles ou outils", "OUTIL 04 (5S Organisation)", "[Nom]", "J+7", "Temps d'acces < 30 sec chrono"],
        ["URGENCE 2", "Outil/logiciel strategique sans suivi preventif ni plan de secours", "OUTIL 06 (Maintenance Goulet)", "[Nom]", "J+7", "0 panne bloquante & stock secours"],
        ["URGENCE 3", "Reprises frequentes de travail sans analyse financiere d'erreurs", "OUTIL 07 (Fiche Anti-Erreurs)", "[Nom]", "J+15", "Valorisation € & 0 recidive par 5P"],
        ["URGENCE 3", "Dependance critique a une personne cle sans doublure autonome", "OUTIL 09 (Polyvalence)", "[Nom]", "J+15", "100% postes critiques doubles"],
        ["PILOTAGE", "Pilotage a vue sans cockpit hebdomadaire ni previ de tresorerie", "OUTIL 10 (Tableau 5 KPIs)", "[Nom]", "Lundi 08h30", "Cockpit 15 min & previ 4 semaines"]
    ]
    format_word_table(doc, headers_pl, rows_pl, col_widths_dxa=col_w_pl, center_cols=[0, 3, 4])
    
    # VALIDATION
    add_section_header(doc, "10. VALIDATION CONTRADICTOIRE DE L'AUDIT DISTANCIEL")
    signoff = ["AUDITEUR CABINET DELACOUR", "DIRIGEANT DE L'ENTREPRISE AUDITEE"]
    add_validation_signoff_box(doc, signoff)
    
    add_next_steps_box(doc, [
        "Restitution en visio de 30 minutes a J+1 avec presentation du score et de la feuille de route.",
        "Signature du bon pour accord de deploiement des Outils Commando retenus en Priorite 1.",
        "Planification de la premiere intervention d'accompagnement (ex: Outil 01 et Outil 02 sous 48h).",
        "Archivage securise de la grille et des captures d'ecran dans l'espace client Cabinet Delacour."
    ])
    
    out_docx = os.path.join(AUDIT_DIR, "GRILLE_AUDIT_ROBUSTESSE_ET_RENTABILITE_DELACOUR.docx")
    doc.save(out_docx)
    print(f"Universal audit grid Word document generated (ZERO arbitrary figures): {out_docx}")

if __name__ == "__main__":
    generate_audit_grid_docx()
