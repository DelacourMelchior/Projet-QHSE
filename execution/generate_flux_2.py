# -*- coding: utf-8 -*-
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from commando_style import (
    BASE_DIR, TEMPLATES_DIR, GUIDES_DIR,
    create_base_document, add_header_brand, add_section_header,
    add_cash_counter_box, add_metadata_box, format_word_table,
    add_validation_signoff_box, add_next_steps_box,
    add_why_box, add_consultant_box, add_guide_box,
    add_case_study_box, add_audit_checklist_box
)

# ==============================================================================
# OUTIL 04 : 5S FLASH ATELIER & GED (REGLE DES 30 SECONDES)
# ==============================================================================
def generate_tool_04_template():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 04", "5S FLASH ATELIER & GED (REGLE DES 30 SECONDES)", "TEMPLATE OPERATIONNEL")
    
    add_cash_counter_box(
        doc,
        "Suppression des temps de recherche d'outils ou documents par la regle des 30 secondes",
        "Temps moyen d'acces a l'information / outillage & Taux de conformite des rangements",
        "Gain de temps utile = (Minutes quotidiennes gagnees / 60) x Effectif x Cout horaire moyen x 220 jours"
    )
    
    add_section_header(doc, "1. IDENTIFICATION DU PERIMETRE AUDITE")
    meta = {
        "Zone Atelier / Poste / Repertoire GED :" : "[ Ex: Ligne Soudure T3 / Serveur /03_PLANS_TECH ]",
        "Responsable de Zone / Pilote 5S :" : "[ Nom du Chef d'Atelier / Pilote ]",
        "Date de l'Intervention Flash (4h chrono) :" : "[ Date d'intervention ]",
        "Effectif Concerne sur la Zone :" : "[ Ex: 6 compagnons ]",
        "Temps Moyen d'Acces Actuel a un Outil / Plan :" : "[ Ex: 4 a 7 minutes (Constat initial) ]",
        "Objectif d'Acces Chronometre :" : "MOINS DE 30 SECONDES"
    }
    add_metadata_box(doc, meta)
    
    add_section_header(doc, "2. DIAGNOSTIC FLASH DES GASPILLAGES DE TEMPS & DEPLACEMENT")
    headers_gasp = ["OBJET / PLAN / DOCUMENT CHERCHE", "ZONE DE RECHERCHE", "TEMPS PERDU PAR JOUR", "COUT ANNUEL ESTIME"]
    col_w_gasp = [3600, 2400, 2000, 2200]
    rows_gasp = [
        ["Cle dynamometrique et douilles de 17", "Eparpillees entre postes 2 et 4", "15 minutes / jour", "2 475 EUR / an"],
        ["Derniere version du plan de fabrication DWG/PDF", "Serveur sans nommage clair", "20 minutes / jour", "3 300 EUR / an"],
        ["Meules et disques a tronconner", "Reserve generale fond d'atelier", "12 minutes / jour", "1 980 EUR / an"],
        ["[Objet ou fichier informatique recherche]", "[ Zone actuelle ]", "[ __ min / jour ]", "[ __ EUR / an ]"],
        ["[Objet ou fichier informatique recherche]", "[ Zone actuelle ]", "[ __ min / jour ]", "[ __ EUR / an ]"]
    ]
    format_word_table(doc, headers_gasp, rows_gasp, col_widths_dxa=col_w_gasp, center_cols=[2, 3])
    
    add_section_header(doc, "3. MATRICE DE TRI & RANGEMENT COMMANDO (REGLE DES 30 SECONDES)")
    headers_tri = ["ELEMENT CONCERNE", "FREQUENCE D'USAGE", "DECISION D'EMPLACEMENT", "REGLE DU STANDARD (< 30s)"]
    col_w_tri = [3200, 2000, 2600, 2400]
    rows_tri = [
        ["Outils de serrage quotidien", "Plusieurs fois par heure", "Accroches au panneau ombre du poste", "Prehension immediate < 5s"],
        ["Outillage special de reglage", "1 a 2 fois par semaine", "Armoire fermee de la ligne", "Rangement sous etiquette < 20s"],
        ["Outillage hors d'usage / double inutile", "Jamais utilise depuis 6 mois", "Zone rouge / Evacuation benne", "Elimine de l'espace de travail"],
        ["Plans de fabrication clients actifs", "Quotidien", "Dossier GED /PROJETS_EN_COURS/", "Nommage AAAAMMJJ_Projet_V1"],
        ["[Element ou groupe d'outils]", "[ Frequence ]", "[ Emplacement assigne ]", "[ Temps cible respecte ]"]
    ]
    format_word_table(doc, headers_tri, rows_tri, col_widths_dxa=col_w_tri, center_cols=[1])
    
    add_section_header(doc, "4. STANDARD VISUEL HEBDOMADAIRE DE MAINTIEN (RITUEL 5 MINUTES VENDREDI 16H30)")
    headers_rit = ["POINT DE CONTROLE 5 MINUTES", "CRITERE DU STANDARD", "ETAT OBSERVE", "RESPONSABLE"]
    col_w_rit = [3600, 3200, 1600, 1800]
    rows_rit = [
        ["Panneau des ombres d'outils", "Zero outil manquant au tableau", "CONFORME", "Operateur poste"],
        ["Allegees et sols d'atelier", "Aucun copeau, chute ou piece au sol", "CONFORME", "Equipe de zone"],
        ["Poubelles et bennes de tri", "Vides et remises a zero pour lundi", "CONFORME", "Chef d'equipe"],
        ["Serveur informatique GED", "Fichiers de la semaine reclasses", "CONFORME", "Bureau d'etudes / Admin"],
        ["Stock de consommables au poste", "Niveau suffisant pour 3 jours d'avance", "[ OUI / NON ]", "Magasinier"]
    ]
    format_word_table(doc, headers_rit, rows_rit, col_widths_dxa=col_w_rit, center_cols=[2, 3])
    
    add_section_header(doc, "5. VALIDATION DU STANDARD DE ZONE")
    signoff = ["OPERATEUR REFERENT DE POSTE", "CHEF D'ATELIER / PILOTE 5S", "DIRECTION TECHNIQUE"]
    add_validation_signoff_box(doc, signoff)
    
    add_next_steps_box(doc, [
        "Tracer les ombres sur les panneaux au marqueur ou mousse predecoupee.",
        "Etiqueter chaque tiroir, bac et classeur avec son nom explicite.",
        "Bloquer 5 minutes non negociables chaque vendredi a 16h30 pour le rituel.",
        "Audit flash inopine de 2 minutes par le chef d'atelier une fois par quinzaine."
    ])
    
    out_path = os.path.join(TEMPLATES_DIR, "OUTIL_04_5S_FLASH_ATELIER_ET_GED_TEMPLATE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

def generate_tool_04_guide():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 04", "5S FLASH ATELIER & GED (REGLE DES 30 SECONDES)", "GUIDE METHODOLOGIQUE")
    
    add_why_box(
        doc,
        [
            "Gain immediat de 30 a 45 minutes de travail effectif par jour et par compagnon.",
            "Suppression des rachats inutiles d'outils perdus que l'on finit par racheter en triple.",
            "Securite accrue : division par 3 des chutes et blessures liees aux obstacles au sol.",
            "Impact psychologique majeur sur les clients visitant un atelier millimetre et propre."
        ],
        [
            "Gaspillage silencieux de dizaines de milliers d'euros par an en temps de recherche erratique.",
            "Agacement et perte de concentration des salaries avant meme de commencer l'usinage ou le montage.",
            "Utilisation d'anciennes versions de plans non a jour entrainant la refabrication totale de pieces.",
            "Deterioration du materiel stocke en vrac au milieu de la poussiere et des copeaux."
        ]
    )
    
    add_consultant_box(
        doc,
        "Bannir le 5S academique qui produit des classeurs d'audits illisibles pendant 6 mois sans ranger un seul tournevis.",
        [
            ("L'operation commando du vendredi", "Mobiliser l'equipe pendant 4 heures chrono un vendredi apres-midi. Louer une benne et jeter sans regret."),
            ("La regle des 30 secondes", "N'importe quel salarie ou remplacant doit pouvoir poser la main sur n'importe quel outil ou document en moins de 30 secondes."),
            ("Le panneau des ombres", "Dessiner au marqueur noir la silhouette de chaque outil sur le panneau : un outil manquant saute aux yeux a 10 metres."),
            ("Transposer a la GED", "Un serveur d'entreprise est un atelier numerique : 4 dossiers racines maximum, nommage normé `AAAAMMJJ_Projet_Vxx`.")
        ]
    )
    
    add_guide_box(
        doc,
        [
            "Definir une zone pilote reduite (ex : 1 poste de travail ou 1 ligne de montage critique).",
            "Prendre des photos 'Avant' sans prevenir pour marquer les esprits.",
            "Appliquer les 3 premiers S en 4 heures : Trier (jeter), Ranger (assigner une place unique), Nettoyer.",
            "Prendre la photo 'Apres', afficher le standard visuel et celebrer le succes avec l'equipe.",
            "Consacrer 5 minutes chaque vendredi pour maintenir le standard sans relachement."
        ]
    )
    
    add_case_study_box(
        doc,
        "PME Serrurerie & Chaudronnerie Industrielle (12 ouvriers - CA : 2,2 M EUR)",
        "Les ouvriers perdaient en moyenne 38 minutes par jour a chercher les meuleuses, les serre-joints et les plans imprimes. L'entreprise rachetait pour 4 800 EUR d'outils a main par an qui finissaient enterres sous la ferraille.",
        "Operation 5S commando sur 1 journee : nettoyage integral, marquage au sol, fabrication de servantes mobiles individualisees et reorganisation du serveur reseau en 4 dossiers.",
        "35 minutes regagnees par jour et par ouvrier, soit 1 540 heures de fabrication additionnelles par an (+53 900 EUR de valeur produite). Rachat d'outils divise par 4 des la premiere annee."
    )
    
    add_section_header(doc, "GRILLE D'AUTO-EVALUATION DU STANDARD 5S")
    criteria = [
        ("Temps d'acces moyen a un outil ou fichier mesure par test inopine", "<= 30 secondes", "Revoir l'emplacement ou l'etiquetage"),
        ("Rituel de 5 minutes du vendredi tenu a 100% sans exception", "100 % des semaines", "Rappel direct du chef d'atelier"),
        ("Sol d'atelier degage sans obstacle ni stockage sauvage", "Zero objet au sol", "Zone de debordement interdite"),
        ("Repertoire GED propre sans fichiers temporaires sur les bureaux PC", "Zero fichier sans adresse", "Purge mensuelle automatique")
    ]
    add_audit_checklist_box(doc, criteria)
    
    out_path = os.path.join(GUIDES_DIR, "OUTIL_04_5S_FLASH_ATELIER_ET_GED_GUIDE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

# ==============================================================================
# OUTIL 05 : INSTRUCTIONS VISUELLES AU POSTE (FICHES REFLEXES MONO-PAGE)
# ==============================================================================
def generate_tool_05_template():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 05", "INSTRUCTIONS VISUELLES AU POSTE (FICHES REFLEXES)", "TEMPLATE OPERATIONNEL")
    
    add_cash_counter_box(
        doc,
        "Standardisation visuelle des postes a risque et validation objective de l'autonomie des recrues",
        "Delai moyen pour atteindre l'autonomie a 100% & Taux de retouches lors des premieres semaines",
        "Economie de non-qualite = Heures de retouches evitees + Reduction du temps de tutorat improductif"
    )
    
    add_section_header(doc, "1. IDENTIFICATION DU POSTE & DE L'OPERATION CRITIQUE")
    meta = {
        "Poste de Travail / Machine :" : "[ Ex: Poste Assemblage Bloc Hydraulique H2 ]",
        "Designation de l'Operation :" : "[ Montage & Serrage au Couple des Raccords Haute Pression ]",
        "Redacteur (Operateur Expert) :" : "[ Nom de l'expert metier atelier ]",
        "Validateur Technique :" : "[ Nom du Chef d'Atelier / Resp. Methode ]",
        "Date de Mise a Jour / Version :" : "[ Ex: 10/09/2026 - Version V1.0 ]",
        "Temps Standard Alloue pour l'Operation :" : "[ Ex: 6 minutes 30 secondes ]"
    }
    add_metadata_box(doc, meta)
    
    add_section_header(doc, "2. DECOMPOSITION EN 4 GESTES METIER CRITIQUES")
    headers_gestes = ["ETAPE N°", "ACTION METIER PRECISE", "PARAMETRE / TOLERANCE MESURABLE", "POINT DE CONTROLE VITAL"]
    col_w_gestes = [1000, 3600, 2800, 2800]
    rows_gestes = [
        ["G1", "Depoussierage et degraissage des portees de joint", "Chiffon microfibre non pelucheux", "Proprete visuelle absolue sans particule"],
        ["G2", "Mise en place du joint torique lubrifie", "Graisse silicone homologuee Ref G4", "Joint non vrille, assis dans sa gorge"],
        ["G3", "Serrage en croix des 4 vis de fixation", "Cle dynamometrique reglee a 24 N.m", "Clic audible sur chaque vis"],
        ["G4", "Controle d'etancheite sous pression d'air", "Maintien a 6 bars pendant 30 secondes", "Zero bulle au detecteur moussant"]
    ]
    format_word_table(doc, headers_gestes, rows_gestes, col_widths_dxa=col_w_gestes, center_cols=[0, 2])
    
    add_section_header(doc, "3. MATRICE VISUELLE : LE BON GESTE VS LE PIEGE / REBUT")
    headers_vis = ["POINT CRITIQUE", "LE BON GESTE (CONFORME)", "LE MAUVAIS GESTE (A BANNIR)", "CONSEQUENCE DU DEFAUT"]
    col_w_vis = [2200, 3000, 3000, 2000]
    rows_vis = [
        ["Position du Joint", "[PHOTO] Joint parfaitement centre a plat", "[PHOTO] Joint pince ou decale sur le bord", "Fuite d'huile sous charge (Rebut garanti)"],
        ["Ordre de Serrage", "[PHOTO] Serrage progressif en croix 1-3-2-4", "[PHOTO] Serrage circulaire a fond d'un seul cote", "Deformation bride + casse carter (800 EUR)"],
        ["Sens de Montage", "[PHOTO] Fleche de debit vers le raccord droit", "[PHOTO] Raccord inverse a 180 degres", "Blocage du circuit hydraulique chez client"]
    ]
    format_word_table(doc, headers_vis, rows_vis, col_widths_dxa=col_w_vis, center_cols=[0])
    
    add_section_header(doc, "4. OUTILLAGE & EQUIPEMENTS STRICTEMENT REQUIS AU POSTE")
    headers_out = ["DESIGNATION OUTIL / EPI", "REFERENCE INTERNE", "EMPLACEMENT EXACT", "ETAT EXIGE"]
    col_w_out = [3400, 2200, 2600, 2000]
    rows_out = [
        ["Cle dynamometrique 10-50 N.m", "REF-OUT-042", "Servante poste case 2", "Etalonnage a jour (< 12 mois)"],
        ["Embout 6 pans 5mm de qualite atelier", "REF-OUT-089", "Panneau mural support 4", "Aretes vives non usees"],
        ["Gants nitrile anti-solvant", "EPI-GANT-M", "Distributeur mural poste", "Propres, sans dechirure"]
    ]
    format_word_table(doc, headers_out, rows_out, col_widths_dxa=col_w_out, center_cols=[1, 3])
    
    add_section_header(doc, "5. TEST FLASH D'AUTONOMIE OPERATEUR (3 QUESTIONS)")
    headers_tst = ["QUESTION VESTIAIRE / REGLAGE", "REPONSE EXIGEE DE L'OPERATEUR", "VALIDE ?"]
    col_w_tst = [4800, 4000, 1400]
    rows_tst = [
        ["1. Quel est le couple de serrage exact et l'ordre des vis ?", "24 N.m applique en croix 1-3-2-4 au clic", "[ OUI / NON ]"],
        ["2. Que faites-vous si un joint presente une amorce de coupure ?", "Remplacement immediat du joint, mise au rebut", "[ OUI / NON ]"],
        ["3. Comment verifier l'absence de fuite apres montage ?", "Test d'air a 6 bars pendant 30s avec liquide moussant", "[ OUI / NON ]"]
    ]
    format_word_table(doc, headers_tst, rows_tst, col_widths_dxa=col_w_tst, center_cols=[2])
    
    add_section_header(doc, "6. VALIDATION DE L'INSTRUCTION AU POSTE")
    signoff = ["OPERATEUR EXPERT REDACTEUR", "CHEF D'ATELIER", "RESPONSABLE QUALITE / METHODE"]
    add_validation_signoff_box(doc, signoff)
    
    add_next_steps_box(doc, [
        "Imprimer la fiche en couleur et la plastifier pour resister aux graisses et huiles.",
        "Fixer la fiche au poste de travail a hauteur des yeux de l'operateur.",
        "Utiliser la fiche pour former et tester tout interimaire des son arrivee.",
        "Mettre a jour la fiche des qu'une amelioration ou un defaut nouveau apparait."
    ])
    
    out_path = os.path.join(TEMPLATES_DIR, "OUTIL_05_INSTRUCTIONS_VISUELLES_POSTE_TEMPLATE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

def generate_tool_05_guide():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 05", "INSTRUCTIONS VISUELLES AU POSTE (FICHES REFLEXES)", "GUIDE METHODOLOGIQUE")
    
    add_why_box(
        doc,
        [
            "Autonomie operationnelle d'un nouvel arrivant ou interimaire en moins d'une heure.",
            "Standardisation absolue des gestes : qualite uniforme quel que soit l'operateur ou l'equipe.",
            "Sauvegarde du savoir-faire artisanal de l'entreprise face aux departs en retraite.",
            "Suppression des erreurs de serie provoquees par des approximations de reglages."
        ],
        [
            "Classeurs de procedures de 40 pages enfermés dans des armoires que personne ne lit jamais.",
            "Chaque operateur 'bricole' sa propre methode avec des tolerances divergentes.",
            "Temps considerable perdu par le chef d'atelier a repeter 10 fois par jour les memes consignes.",
            "Pieces assemblees a l'envers ou mal serrees livrees directement chez le client."
        ]
    )
    
    add_consultant_box(
        doc,
        "La valeur d'une instruction reside dans son format : 1 seule page, 80% de photos explicites, scotchée sur la machine.",
        [
            ("Faire rediger par l'expert de terrain", "Ne jamais rediger la fiche depuis un bureau d'etudes. Aller a l'atelier avec un smartphone et interviewer le meilleur operateur."),
            ("Mettre en evidence le piege", "Ce qui compte n'est pas seulement d'expliquer ce qu'il faut faire, mais de montrer en GROS ROUGE l'erreur classique qui detruit la piece."),
            ("Le test des 3 questions", "Ne jamais laisser un interimaire seul sans lui avoir pose les 3 questions cles et verifie qu'il execute le bon geste une fois devant vous."),
            ("La rendre vivante", "Si un nouveau type de rebus apparait, ajouter la photo de la piece loupee sur la fiche dans la journee.")
        ]
    )
    
    add_guide_box(
        doc,
        [
            "Selectionner les 3 postes de travail de l'atelier qui enregistrent le plus d'erreurs ou de rebuts.",
            "Prendre 4 photos nettes au smartphone : les gestes cles et les points de vigilance.",
            "Remplir le template mono-page en utilisant des verbes d'action et des valeurs chiffrees (pas de 'serrer fort', mais '24 N.m').",
            "Faire valider par le chef d'atelier, plastifier sous film rigide et coller au poste de travail."
        ]
    )
    
    add_case_study_box(
        doc,
        "PME Injection Plastique & Sous-Ensembles (28 salaries - CA : 3,8 M EUR)",
        "Taux de rebus de 5,4% sur les postes d'assemblage en 2x8. L'equipe du soir obtenait regulierement des defauts d'etancheite car chaque monteur serrait les embouts avec une force differente selon sa sensibilite.",
        "Creation de 4 fiches visuelles mono-page plastifiees au poste avec indication du couple de serrage et photos des joints mal positionnes.",
        "Le taux de rebut est tombe a 0,3% des le premier mois. Economie directe de 22 400 EUR de composants detruits et suppression totale des retours SAV clients."
    )
    
    add_section_header(doc, "GRILLE D'AUTO-EVALUATION DES INSTRUCTIONS VISUELLES")
    criteria = [
        ("100% des postes a risque possedent leur fiche visuelle plastifiee fixee a vue", "100 % des postes", "Creation immediate de la fiche"),
        ("Taux d'illustration visuelle de la fiche (Photos / Schemas)", ">= 70 % de la surface", "Remplacer le texte par des images"),
        ("Tout nouvel interimaire passe le test des 3 questions avant demarrage", "100 % des nouveaux", "Obligation formelle chef d'equipe"),
        ("Taux de defauts de montage constates sur les postes equipes", "<= 0,5 %", "Mettre a jour le point critique")
    ]
    add_audit_checklist_box(doc, criteria)
    
    out_path = os.path.join(GUIDES_DIR, "OUTIL_05_INSTRUCTIONS_VISUELLES_POSTE_GUIDE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

# ==============================================================================
# OUTIL 06 : MAINTENANCE PREVENTIVE 1ER NIVEAU & SECURISATION GOULETS
# ==============================================================================
def generate_tool_06_template():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 06", "MAINTENANCE PREVENTIVE 1ER NIVEAU (SECURISATION GOULET)", "TEMPLATE OPERATIONNEL")
    
    add_cash_counter_box(
        doc,
        "Surveillance sensorielle preventive de l'outil cle et garantie de continuite d'activite sous 24h",
        "Taux de disponibilite operationnelle de l'equipement & Zero rupture sur les 3 composants critiques",
        "Pertes d'arret evitees = Heures d'indisponibilite evitees x Cout horaire de blocage d'activite"
    )
    
    add_section_header(doc, "1. IDENTIFICATION DE LA MACHINE GOULET CRITIQUE")
    meta = {
        "Nom & Repere Machine :" : "[ Ex: Centre d'Usinage 5 Axes DMG MORI - CNC-01 ]",
        "Statut Goulet de l'Atelier :" : "OUI - MACHINE CADENÇANTE ABSOLUE DE L'USINE",
        "Cout Estime par Heure d'Arret Non Planifie :" : "[ Ex: 850,00 EUR / heure d'arret ]",
        "Operateur Referent Machine :" : "[ Nom de l'operateur titulaire ]",
        "Technicien Maintenance Referent :" : "[ Nom du responsable maintenance ]",
        "Frequence d'Inspection Niveau 1 :" : "10 MINUTES CHRONO CHAQUE LUNDI MATIN A 08H00"
    }
    add_metadata_box(doc, meta)
    
    add_section_header(doc, "2. CHECKLIST HEBDOMADAIRE 10 MINUTES (CONTROLES SENSORIELS NIVEAU 1)")
    headers_mnt = ["ORGANE / FLUIDE", "METHODE DE CONTROLE", "STANDARD NOMINAL", "ETAT CONSTATE", "ACTION IMMEDIATE"]
    col_w_mnt = [2400, 2400, 2400, 1400, 1600]
    rows_mnt = [
        ["Niveau Huile de Glissiere", "Visuel sur voyant en verre", "Niveau entre repere mini et maxi", "CONFORME", "Appoint immediat si bas"],
        ["Lubrifiant de Coupe (Huile)", "Refractometre de poche", "Concentration entre 7% et 9%", "CONFORME", "Reajustement eau/huile"],
        ["Pression Air Comprime", "Manometre d'entree generale", "Pression stable a 6,5 bars +/- 0,5", "CONFORME", "Purgeur condensats vide"],
        ["Filtres de Ventilation Armoire", "Visuel face avant armoire", "Toile filtrante propre, zero colmatage", "CONFORME", "Remplacement filtre"],
        ["Bruits & Vibrations Broche", "Ecoute attentive a vide a 4000 tr", "Bruit fluide sans sifflement ni choc", "CONFORME", "Alerte maintenance si bruit"],
        ["Evacuation des Copeaux", "Visuel bac et vis d'extraction", "Tapis sans bourrage, bac vide", "CONFORME", "Nettoyage avant cycle"]
    ]
    format_word_table(doc, headers_mnt, rows_mnt, col_widths_dxa=col_w_mnt, center_cols=[3])
    
    add_section_header(doc, "3. REGISTRE DES SIGNAUX FAIBLES & ANOMALIES PRECURSEURS")
    headers_sig = ["DATE/HEURE", "SIGNAL FAIBLE DETECTE", "RISQUE DE PANNE", "ACTION CORRECTIVE SOUS 24H", "VISA MNT"]
    col_w_sig = [1400, 3200, 2400, 2200, 1000]
    rows_sig = [
        ["12/03 08:15", "Leger sifflement roulement moteur axe Y", "Blocage broche en plein usinage", "Graissage effectue, roulement commande", "OK MNT"],
        ["24/03 08:10", "Gouttelette d'huile sous flexible hydraulique", "Rupture de pression et arret machine", "Resserrage raccord et changement joint", "OK MNT"],
        ["[ Date ]", "[ Decrire le bruit, fuite ou echauffement ]", "[ Risque associe ]", "[ Action preventive engagee ]", "[ Visa ]"],
        ["[ Date ]", "[ Decrire le bruit, fuite ou echauffement ]", "[ Risque associe ]", "[ Action preventive engagee ]", "[ Visa ]"]
    ]
    format_word_table(doc, headers_sig, rows_sig, col_widths_dxa=col_w_sig, center_cols=[0, 4])
    
    add_section_header(doc, "4. STOCK CRITIQUE D'URGENCE (PIECES DE RECHANGE SOUS CLE)")
    headers_stk = ["DESIGNATION PIECE CRITIQUE", "REFERENCE FOURNISSEUR", "EMPLACEMENT ARMOIRE", "STOCK MINI", "DELAI FOURNISSEUR"]
    col_w_stk = [3200, 2200, 2200, 1200, 1400]
    rows_stk = [
        ["Courroie crantee d'entrainement axe Z", "REF-DMG-CR480", "Armoire Urgence Etagere 1", "1 unite", "3 semaines (Critique)"],
        ["Electrovanne pneumatique 24V", "REF-FESTO-EV24", "Armoire Urgence Etagere 2", "2 unites", "48 heures"],
        ["Capteur inductif fin de course", "REF-TELEM-CAP08", "Armoire Urgence Etagere 2", "2 unites", "72 heures"]
    ]
    format_word_table(doc, headers_stk, rows_stk, col_widths_dxa=col_w_stk, center_cols=[3, 4])
    
    add_section_header(doc, "5. VALIDATION DE L'INSPECTION HEBDOMADAIRE")
    signoff = ["OPERATEUR TITULAIRE MACHINE", "RESPONSABLE MAINTENANCE", "RESPONSABLE DE PRODUCTION"]
    add_validation_signoff_box(doc, signoff)
    
    add_next_steps_box(doc, [
        "Plastifier et accrocher le carnet d'inspection directement sur le pupitre de commande.",
        "Effectuer le controle les yeux ouverts chaque lundi a 8h00 pile avant de lancer la fabrication.",
        "Toute fuite ou bruit anormal doit faire l'objet d'une intervention du technicien sous 24h.",
        "Si une piece du stock critique est utilisee, emettre le bon de commande de reapprovisionnement le jour meme."
    ])
    
    out_path = os.path.join(TEMPLATES_DIR, "OUTIL_06_MAINTENANCE_PREVENTIVE_1ER_NIVEAU_TEMPLATE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

def generate_tool_06_guide():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 06", "MAINTENANCE PREVENTIVE 1ER NIVEAU (SECURISATION GOULET)", "GUIDE METHODOLOGIQUE")
    
    add_why_box(
        doc,
        [
            "Securisation totale de la machine goulet dont depend 100% de la facturation de l'atelier.",
            "Elimination de 80% des pannes electriques et mecaniques par la detection des signaux faibles.",
            "Prolongation de la duree de vie d'equipements industriels valant souvent plusieurs centaines de milliers d'euros.",
            "Suppression des surcouts de reparation d'urgence en taxi colis et techniciens externes a 150 EUR/h."
        ],
        [
            "Panne catastrophique imprevue bloquant 10 a 25 personnes pendant 3 a 5 jours d'affilee.",
            "Penalites de retard clients destructrices de marge et perte definitive de contrats majeurs.",
            "Usure prematuree des broches et des guidages par simple manque de graissage a 20 EUR.",
            "Chantiers de sous-traitance d'urgence engages a perte pour honorer les delais."
        ]
    )
    
    add_consultant_box(
        doc,
        "La theorie des goulets appliquee a la PME : '1 heure perdue sur la machine goulet est 1 heure definitivement perdue pour toute l'entreprise'.",
        [
            ("Nettoyer, c'est inspecter", "La maintenance de premier niveau ne demande pas d'etre mecanicien. Il s'agit de voir les fuites, ecouter les claquements et sentir les echauffements."),
            ("Responsabiliser l'operateur", "Le conducteur machine passe 7 heures par jour devant son outil : il est le seul a entendre les premieres micro-derives sonores."),
            ("L'armoire de survie", "Aucune machine goulet ne doit tourner sans un stock d'urgence contenant les 3 pieces d'usure dont la rupture arrete le moteur."),
            ("Le rituel non negociable du lundi", "10 minutes consacrees le lundi matin avant de lancer le programme d'usinage preservent toute la semaine de travail.")
        ]
    )
    
    add_guide_box(
        doc,
        [
            "Identifier sans complaisance la seule machine dont la cadence limite le chiffre d'affaires sortant.",
            "Remplir la checklist des 6 points sensoriels (huile, air, filtres, copeaux, bruits, temperature).",
            "Constituer physiquement l'armoire des pieces critiques sous cle et verifier l'inventaire chaque mois.",
            "Instaurer la regle d'or : signal faible note le matin = technicien passe l'apres-midi."
        ]
    )
    
    add_case_study_box(
        doc,
        "PME Usinage Mecanique de Precision (16 salaries - CA : 2,6 M EUR)",
        "Le centre d'usinage principal (achete 340 000 EUR) tombait en panne en moyenne 4 fois par an, generant 18 jours d'arret cumules et plus de 62 000 EUR de pertes directes de marge et frais de sous-traitance d'urgence.",
        "Deploiement de l'Outil 06 : mise en place de l'inspection hebdomadaire de 10 min par les conducteurs et creation d'un stock critique sous armoire contenant joints, courroies et electrovannes.",
        "Zéro panne majeure en 14 mois. Une amorce de grippage de pompe a lubrifiant detectee au son le lundi matin a ete resolue pour 120 EUR de joint, evitant la destruction de la broche (cout evite : 32 000 EUR)."
    )
    
    add_section_header(doc, "GRILLE D'AUTO-EVALUATION DE LA MAINTENANCE PREVENTIVE")
    criteria = [
        ("Taux d'execution de la checklist du lundi matin sur la machine goulet", "100 % des lundis", "Controle inopine chef d'atelier"),
        ("Taux d'arret non planifie de la machine goulet", "<= 2 % du temps d'ouverture", "Audit des causes racines"),
        ("Stock de pieces critiques complet a 100% dans l'armoire de securite", "Zero rupture de stock critique", "Reapprovisionnement immediat"),
        ("Delai de traitement des anomalies consignees dans le carnet", "<= 24 heures", "Ordre d'intervention maintenance")
    ]
    add_audit_checklist_box(doc, criteria)
    
    out_path = os.path.join(GUIDES_DIR, "OUTIL_06_MAINTENANCE_PREVENTIVE_1ER_NIVEAU_GUIDE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

# ==============================================================================
# OUTIL 07 : FICHE ANTI-REBUTS & RESOLUTION DE PROBLEMES 5 POURQUOI
# ==============================================================================
def generate_tool_07_template():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 07", "FICHE ANTI-REBUTS & RESOLUTION 5 POURQUOI", "TEMPLATE OPERATIONNEL")
    
    add_cash_counter_box(
        doc,
        "Chiffrage financier immediat des erreurs et eradication des recidives par resolution 5 Pourquoi",
        "Cout financier mensuel de non-qualite (temps + matieres) & Nombre de detrompeurs poses",
        "Economie directe = Reduction de la valeur des rebuts et pieces reprises par rapport a l'historique"
    )
    
    add_section_header(doc, "1. IDENTIFICATION DU REBUT & DECLENCHEMENT ALERTE")
    meta = {
        "Numero de Fiche Rebut :" : "[ Ex: REB-2026-029 ]",
        "Date & Heure de Detection :" : "[ Date et heure exacte du constat ]",
        "Poste de Fabrication / Equipe :" : "[ Ex: Ligne Decoupe Laser - Equipe Matin ]",
        "Reference Piece / Dossier Affaire :" : "[ Ex: Support Inox REF-8824 - Affaire 2026-084 ]",
        "Quantite Totale du Lot Fabrique :" : "[ Ex: 250 pieces ]",
        "Quantite de Pieces Defectueuses / Rebut :" : "[ Ex: 38 pieces hors cotes ]"
    }
    add_metadata_box(doc, meta)
    
    add_section_header(doc, "2. CHIFFRAGE FINANCIER IMMEDIAT DE LA NON-QUALITE")
    headers_cout = ["POSTE DE DEPENSE GACHEE", "DETAIL DU CALCUL", "MONTANT EN EUROS HT"]
    col_w_cout = [3800, 4400, 2000]
    rows_cout = [
        ["1. Cout Matiere Premiere Detruite", "38 pieces inox x 4,2 kg x 4,80 EUR/kg", "766,08 EUR HT"],
        ["2. Heures Main-d'Œuvre Perdues", "3,5 heures passees x 52,00 EUR / h atelier", "182,00 EUR HT"],
        ["3. Cout de Refabrication / Reprise", "Heures supplementaires machine pour refaire le lot", "350,00 EUR HT"],
        ["4. Frais de Transport Express ou Retard", "Course speciale express chez client pour eviter penalite", "145,00 EUR HT"],
        ["COUT TOTAL DIRECT DE CE REBUT", "Somme des postes de gaspillages directs ci-dessus", "1 443,08 EUR HT"]
    ]
    format_word_table(doc, headers_cout, rows_cout, col_widths_dxa=col_w_cout, center_cols=[2])
    
    add_section_header(doc, "3. MESURES DE CONFINEMENT IMMEDIAT (EN MOINS DE 15 MINUTES)")
    headers_conf = ["ACTION COMMANDO DE CONFINEMENT", "CRITERE DE VERIFICATION", "REALISE ?", "VISA RESPONSABLE"]
    col_w_conf = [4000, 3200, 1400, 1600]
    rows_conf = [
        ["Arret immediat de la machine / du poste", "Zero piece supplementaire fabriquee avec le defaut", "REALISE", "Operateur"],
        ["Isolement physique et etiquetage rouge", "Bac identifie avec banderole rouge 'NON-CONFORME'", "REALISE", "Chef d'equipe"],
        ["Controle du lot amont et aval", "Verification des 50 dernieres pieces livrees ou en stock", "REALISE", "Controleur"],
        ["Alerte immediate du responsable production", "Information en face-a-face sous 15 minutes", "REALISE", "Operateur"]
    ]
    format_word_table(doc, headers_conf, rows_conf, col_widths_dxa=col_w_conf, center_cols=[2, 3])
    
    add_section_header(doc, "4. RESOLUTION DE PROBLEME PAR LA METHODE DES 5 POURQUOI")
    headers_5p = ["NIVEAU", "QUESTION / REPONSE DU GROUPE DE TRAVAIL (DEBOUT SUR LE TERRAIN)", "NATURE DE LA CAUSE"]
    col_w_5p = [1400, 6400, 2400]
    rows_5p = [
        ["Pourquoi 1 ?", "Pourquoi la cote de pliage est-elle hors tolerance de 4mm ? -> Parce que la butee arriere s'est decalee pendant la serie.", "Cause mecanique immediate"],
        ["Pourquoi 2 ?", "Pourquoi la butee arriere s'est-elle decalee ? -> Parce que la vis de blocage etait desserree.", "Cause materielle"],
        ["Pourquoi 3 ?", "Pourquoi la vis etait-elle desserree ? -> Parce qu'elle n'a pas ete bloquee a la cle dynamometrique lors du reglage.", "Cause methode reglage"],
        ["Pourquoi 4 ?", "Pourquoi n'a-t-elle pas ete serree a la cle ? -> Parce que la cle dynamometrique etait introuvable a ce poste.", "Gaspillage 5S / Outillage"],
        ["Pourquoi 5 ?", "Pourquoi etait-elle introuvable ? -> Parce qu'il n'y a pas de support dedie ni de standard de serrage au reglage.", "CAUSE RACINE SYSTEMIQUE"]
    ]
    format_word_table(doc, headers_5p, rows_5p, col_widths_dxa=col_w_5p, center_cols=[0])
    
    add_section_header(doc, "5. PLAN DE VERROUILLAGE DEFINITIF (ANTI-RECIDIVE)")
    headers_act = ["ACTION DE VERROUILLAGE (DETROMPEUR / STANDARD)", "PILOTE UNIQUE", "DELAI J+7", "CONTROLE EFFICACITE J+30"]
    col_w_act = [4200, 2200, 1800, 2000]
    rows_act = [
        ["Fabrication d'une butee fixe indexee avec goupille (Poka-Yoke)", "M. Dupont (Methode)", "18/03 (J+7)", "Zero defaut sur 30 jours"],
        ["Mise a disposition d'une cle dynamometrique au poste sous ombre", "P. Martin (Atelier)", "14/03 (J+3)", "Controle audit 5S"],
        ["Mise a jour de l'instruction visuelle de pliage au poste", "S. Blanc (Qualite)", "16/03 (J+5)", "Operateurs formes"]
    ]
    format_word_table(doc, headers_act, rows_act, col_widths_dxa=col_w_act, center_cols=[1, 2, 3])
    
    add_section_header(doc, "6. CLÔTURE ET VALIDATION DE L'EFFICACITE")
    signoff = ["OPERATEUR CONCERNE", "CHEF D'ATELIER", "DIRECTION / RESPONSABLE QUALITE"]
    add_validation_signoff_box(doc, signoff)
    
    add_next_steps_box(doc, [
        "Afficher le montant chiffre du rebut sur le panneau de communication atelier.",
        "Mettre en œuvre les actions anti-recidive sous 7 jours maximum.",
        "Reexaminer le dossier a J+30 : si aucune recidive n'est constatee, archiver la fiche.",
        "Classement : Serveur GED / QUALITE_PRODUCTION / REBUTS_2026 / [NUM_FICHE]."
    ])
    
    out_path = os.path.join(TEMPLATES_DIR, "OUTIL_07_FICHE_ANTI_REBUTS_ET_5_POURQUOI_TEMPLATE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

def generate_tool_07_guide():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 07", "FICHE ANTI-REBUTS & RESOLUTION 5 POURQUOI", "GUIDE METHODOLOGIQUE")
    
    add_why_box(
        doc,
        [
            "Eradication definitive des causes racines des defauts : resolution a la source en zero recidive.",
            "Prise de conscience immediate du cout financier par les equipes (l'impact en EUR parle plus que les %).",
            "Suppression des disputes et de la recherche d'un coupable pour se focaliser sur les solutions techniques.",
            "Economies directes de plusieurs milliers d'euros de matieres premieres et heures perdues par mois."
        ],
        [
            "Pieces ratees jetees discretement dans les bennes pour masquer les erreurs sans jamais les resoudre.",
            "Reapparition reguliere du meme defaut technique chaque mois, consommant la rentabilite.",
            "Accusation sterile de 'l'erreur humaine' qui ne resout rien et demotive les salaries.",
            "Risque majeur de livrer un lot defectueux chez un client determinant et de perdre son compte."
        ]
    )
    
    add_consultant_box(
        doc,
        "Le consultant doit chasser l'erreur humaine comme explication : si un salarie s'est trompe, c'est que le systeme le permettait.",
        [
            ("Chiffrer chaque rebut en euros réels", "Ne jamais annoncer 'nous avons 3,2% de rebuts'. Annoncer : 'Nous avons jete 3 400 EUR de matiere a la poubelle cette semaine'."),
            ("La reunion des 5 Pourquoi en 10 minutes", "Ne pas organiser de reunion en salle de reunion. Se reunir debout autour de la piece ratee avec l'operateur et le chef d'atelier."),
            ("Viser le Poka-Yoke (Detrompeur)", "La meilleure solution n'est pas de dire 'faites attention', mais d'installer un detrompeur mecanique ou informatique rendant l'erreur physiquement impossible."),
            ("Le controle d'efficacite a J+30", "Une action corrective n'est validee que si le defaut ne s'est pas reproduit au cours des 30 jours suivants.")
        ]
    )
    
    add_guide_box(
        doc,
        [
            "Des l'apparition d'un rebut : declencher le confinement immediat et isoler le lot au bac rouge.",
            "Chiffrer le cout total net du rebut (matiere + temps passe + cout de reprise).",
            "Reunir l'operateur, le chef d'atelier et le responsable methode pour derouler les 5 Pourquoi.",
            "Mettre en place une modification physique, outillage ou procedure sous 7 jours.",
            "Auditer a J+30 pour verifier la non-recidive et feliciter l'equipe."
        ]
    )
    
    add_case_study_box(
        doc,
        "PME Chaudronnerie & Decoupe Laser (22 salaries - CA : 3,4 M EUR)",
        "Un probleme repetitif de trou oblong inverse sur une gamme de carters inox generait 2 800 EUR de toles gachees par mois. La direction repetait aux plieurs de faire plus attention aux plans, sans aucun effet.",
        "Application de l'Outil 07 : calcul du cout annuel (33 600 EUR) et analyse 5 Pourquoi debout devant la plieuse. Decouverte que la tole pouvait etre inseree dans les deux sens sans butee de securite. Fabrication d'une cale asymetrique a 60 EUR.",
        "Zero erreur en 18 mois. Economie directe mesuree : 42 000 EUR de toles inox et heures machines preservees."
    )
    
    add_section_header(doc, "GRILLE D'AUTO-EVALUATION DE L'ELIMINATION DES REBUTS")
    criteria = [
        ("100% des rebuts > 200 EUR font l'objet d'un chiffrage financier et d'un 5 Pourquoi", "100 % obligatoire", "Blocage cloture OF de production"),
        ("Delai moyen de mise en place de l'action corrective", "<= 7 jours calendaires", "Revue hebdo plan d'action"),
        ("Taux de non-recidive a J+30 sur les causes racines traitees", ">= 90 % sans recidive", "Reouverture fiche et reprise analyse"),
        ("Evolution mensuelle du cout global de rebut de l'usine", "Baisse continue de 30% a 50%", "Affichage courbe des couts atelier")
    ]
    add_audit_checklist_box(doc, criteria)
    
    out_path = os.path.join(GUIDES_DIR, "OUTIL_07_FICHE_ANTI_REBUTS_ET_5_POURQUOI_GUIDE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

if __name__ == "__main__":
    print("Generating FLUX 2 Tools...")
    generate_tool_04_template()
    generate_tool_04_guide()
    generate_tool_05_template()
    generate_tool_05_guide()
    generate_tool_06_template()
    generate_tool_06_guide()
    generate_tool_07_template()
    generate_tool_07_guide()
    print("FLUX 2 generated successfully.")
