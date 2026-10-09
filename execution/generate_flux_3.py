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
# OUTIL 08 : RITUEL DES REUNIONS EFFICACES (STAND-UP 5 MIN & FLASH DECISION)
# ==============================================================================
def generate_tool_08_template():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 08", "RITUEL DES REUNIONS EFFICACES (STAND-UP 5 MIN)", "TEMPLATE OPERATIONNEL")
    
    add_cash_counter_box(
        doc,
        "Eradication de la reunionite par des rituels debout de 5 a 7 min (1 probleme = 1 pilote = 1 echeance)",
        "Total d'heures passees en reunion par semaine & Taux de resolution immediate des blocages",
        "Temps utile libere = Heures de reunion supprimees x Cout horaire moyen des participants"
    )
    
    add_section_header(doc, "1. IDENTIFICATION DU RITUEL & PARTICIPANTS")
    meta = {
        "Type de Rituel :" : "STAND-UP QUOTIDIEN 5 MINUTES / FLASH DECISION HEBDO 15 MIN",
        "Departement / Equipe Concernee :" : "[ Ex: Equipe Production & Logistique / Bureau d'Etudes ]",
        "Animateur / Maitre du Temps (Timekeeper) :" : "[ Nom de l'animateur designe ]",
        "Heure Pile de Debut / Fin :" : "[ Ex: 08h30 pile a 08h35 pile (5 minutes chrono) ]",
        "Lieu du Rituel :" : "DEBOUT DEVANT LE TABLEAU VISUEL DE MANAGEMENT D'ATELIER"
    }
    add_metadata_box(doc, meta)
    
    add_section_header(doc, "2. TRAME DES 3 QUESTIONS DU STAND-UP QUOTIDIEN (TOUR DE TABLE 45s / PERS)")
    headers_trm = ["QUESTION SACREE", "OBJECTIF OPERATIONNEL", "REGLE DU TEMPS DE PAROLE", "A PROSCRIRE ABSOLUMENT"]
    col_w_trm = [2600, 3200, 2200, 2200]
    rows_trm = [
        ["1. Qu'as-tu termine hier ?", "Pointer les livrables concrets acheves", "Max 30 secondes par personne", "Raconter sa journee en detail"],
        ["2. Quel est ton engagement du jour ?", "Fixer la priorite N°1 de la journee", "Max 30 secondes par personne", "Lister 15 micro-taches secondaires"],
        ["3. Quels sont tes points bloquants ?", "Identifier ce qui freine et qui peut aider", "Max 45 secondes par personne", "Ouvrir un debat technique a 6 personnes"]
    ]
    format_word_table(doc, headers_trm, rows_trm, col_widths_dxa=col_w_trm, center_cols=[2])
    
    add_section_header(doc, "3. RELEVE DES DECISIONS FLASH (REGLE : 1 PROBLEME = 1 RESPONSABLE = 1 DELAI)")
    headers_dec = ["N°", "SUJET / POINT BLOQUANT", "DECISION TRANCHEE EN SEANCE", "1 SEUL RESPONSABLE", "ECHEANCE DATE & HEURE", "STATUT"]
    col_w_dec = [500, 3200, 2700, 1500, 1300, 1000]
    rows_dec = [
        ["D1", "Rupture approvisionnement visserie inox pour chantier B4", "Achat d'urgence au comptoir local pour 150 EUR", "P. Martin (Achat)", "Aujourd'hui 11h00", "CLOS"],
        ["D2", "Plan client non cote sur l'arase superieure", "Appel telephonique direct a l'architecte pour arbitrage", "L. Petit (BE)", "Aujourd'hui 09h30", "EN COURS"],
        ["D3", "[ Decrire le point bloquant ]", "[ Decision operationnelle immediate ]", "[ Nom unique ]", "[ Date / Heure ]", "[ A FAIRE ]"],
        ["D4", "[ Decrire le point bloquant ]", "[ Decision operationnelle immediate ]", "[ Nom unique ]", "[ Date / Heure ]", "[ A FAIRE ]"]
    ]
    format_word_table(doc, headers_dec, rows_dec, col_widths_dxa=col_w_dec, center_cols=[0, 3, 4, 5])
    
    add_section_header(doc, "4. CHARTE ANTI-REUNIONITE (LES 4 LOIS COMMANDO)")
    headers_chr = ["LOI COMMANDO", "REGLE STRICTE", "CONSEQUENCES EN CAS DE DERIVE"]
    col_w_chr = [2800, 4800, 2600]
    rows_chr = [
        ["1. Zero Chaise (Debout)", "Tous les participants restent debout pendant toute la duree.", "Fin naturelle de la reunion en < 7 minutes"],
        ["2. Zero Ecran / Telephone", "Smartphones et PC portables interdits en main pendant le point.", "Attention et ecoute mutuelle a 100%"],
        ["3. Ponctualite Militaire", "La reunion commence a l'heure pile meme si quelqu'un est en retard.", "Les retardataires n'interrompent pas le flux"],
        ["4. Regle des 2 Personnes", "Si un sujet exige un debat technique, fixer un point a 2 hors stand-up.", "Pas d'accaparement du temps collectif"]
    ]
    format_word_table(doc, headers_chr, rows_chr, col_widths_dxa=col_w_chr, center_cols=[0])
    
    add_section_header(doc, "5. VALIDATION DU RITUEL")
    signoff = ["ANIMATEUR DU RITUEL", "CHEF DE SERVICE", "DIRECTION GENERALE"]
    add_validation_signoff_box(doc, signoff)
    
    add_next_steps_box(doc, [
        "L'animateur envoie un e-mail de 3 lignes de synthese dans les 15 minutes.",
        "Afficher le tableau des decisions au mur pour visibilite totale.",
        "A chaque reunion suivante : verifier d'abord que les decisions de la veille sont fermees.",
        "Si une decision n'est pas tenue sans justification : arbitrage direct du chef de service."
    ])
    
    out_path = os.path.join(TEMPLATES_DIR, "OUTIL_08_RITUEL_REUNIONS_EFFICACES_TEMPLATE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

def generate_tool_08_guide():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 08", "RITUEL DES REUNIONS EFFICACES (STAND-UP 5 MIN)", "GUIDE METHODOLOGIQUE")
    
    add_why_box(
        doc,
        [
            "Recuperation de plusieurs heures productives par semaine pour chaque cadre et chef d'equipe.",
            "Resolution ultra-rapide des blocages avant qu'ils ne paralysent les chantiers ou l'atelier.",
            "Alignement parfait des equipes : chacun sait exactement sur quoi travaillent ses collegues.",
            "Responsabilisation individuelle totale : 1 action = 1 nom unique, fin des responsabilites diluees."
        ],
        [
            "Reunionite aigue : des reunions de 2 heures le lundi matin qui tournent en rond sans decisions.",
            "Blocages operationnels caches pendant plusieurs jours jusqu'au constat du retard de livraison.",
            "Perte de temps en debats d'ego et justifications steriles au lieu d'avancer.",
            "Redaction de comptes-rendus de 6 pages qui demandent 2 heures de redaction et ne sont jamais lus."
        ]
    )
    
    add_consultant_box(
        doc,
        "Retirer les chaises est l'intervention la plus rentable de l'histoire du management d'entreprise.",
        [
            ("Rester debout physiquement", "Le confort d'une chaise incite a s'installer, bavarder et disserter. La position debout cree une tension naturelle positive vers l'action."),
            ("Le timekeeper impitoyable", "Nommer un gardien du temps muni d'un chronometre qui coupe la parole a 5 minutes pile sans exception."),
            ("Bannir les comptes-rendus Word", "Remplacer les longs comptes-rendus par un e-mail commando de 3 puces envoye en marchant dans le couloir."),
            ("La responsabilite unique", "Ne jamais noter 'Responsable : Équipe Commerciale'. Mettre toujours : 'Jean-Marc, avant 16h00'.")
        ]
    )
    
    add_guide_box(
        doc,
        [
            "Choisir l'emplacement physique : debout devant un tableau blanc dans l'atelier ou l'open-space.",
            "Fixer l'horaire immuable (ex : 08h30 a 08h35 chaque matin du lundi au vendredi).",
            "Derouler le tour de table des 3 questions en interdisant toute interruption.",
            "Noter au marqueur sur le tableau les 2 ou 3 decisions cles avec responsable et heure butoir.",
            "Disperser l'equipe a 08h35 pile pour lancer la journee sur une dynamique concrete."
        ]
    )
    
    add_case_study_box(
        doc,
        "PME Ingenierie & Agencement Tertiaire (15 salaries - CA : 2,7 M EUR)",
        "L'equipe d'encadrement (6 personnes) passait 4h30 chaque lundi matin en reunion hebdomadaire de coordination. Les sujets techniques debordaient, les decisions etaient floues et les affaires prenaient 2 semaines de retard regulier.",
        "Suppression de la grande reunion du lundi. Deploiement de l'Outil 08 : rituel quotidien debout de 6 minutes chrono a 08h30 et revue de planning de 20 minutes le vendredi soir.",
        "Baisse de 78% du temps passe en reunion. Gain cumule : 28 heures de travail de cadres recuperees par semaine (valeur annuelle estimee a 65 500 EUR). Les retards de dossiers clients ont chute de 60%."
    )
    
    add_section_header(doc, "GRILLE D'AUTO-EVALUATION DES REUNIONS EFFICACES")
    criteria = [
        ("Duree reelle du stand-up quotidien mesuree par chronometre", "<= 7 minutes", "Rappel a l'ordre du timekeeper"),
        ("100% des participants restent debout sans telephone portable", "100 % respecte", "Exclusion des appareils de la zone"),
        ("Taux de decisions ayant 1 seul responsable nominatif et 1 echeance", "100 % des decisions", "Refus formel d'action anonyme"),
        ("Taux de realisation des actions sous le delai imparti", ">= 85 % a l'heure", "Arbitrage des priorites par le chef")
    ]
    add_audit_checklist_box(doc, criteria)
    
    out_path = os.path.join(GUIDES_DIR, "OUTIL_08_RITUEL_REUNIONS_EFFICACES_GUIDE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

# ==============================================================================
# OUTIL 09 : MATRICE DE POLYVALENCE & SECURISATION DES COMPETENCES CLES
# ==============================================================================
def generate_tool_09_template():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 09", "POLYVALENCE & SECURISATION COMPETENCES", "TEMPLATE OPERATIONNEL")
    
    add_cash_counter_box(
        doc,
        "Suppression de la vulnerabilite liee a l'homme-cle par la polyvalence croisee sur les activites vitales",
        "Taux de couverture des competences strategiques (au moins 2 personnes formees autonomes)",
        "Indice de securite d'exploitation = 100% des postes cles operationnels meme en cas d'absence imprevue"
    )
    
    add_section_header(doc, "1. IDENTIFICATION DU SERVICE & OBJECTIFS DE DOUBLAGE")
    meta = {
        "Service / Atelier Concerne :" : "[ Ex: Atelier Production & Montage Mecanique ]",
        "Responsable RH / Chef d'Atelier :" : "[ Nom du Chef d'Atelier ]",
        "Date de Diagnostic de Polyvalence :" : "[ Date du diagnostic initial ]",
        "Effectif Evalue :" : "[ Ex: 12 collaborateurs ]",
        "Nombre de Postes Critiques Identifies :" : "[ Ex: 5 postes vitaux pour le flux ]",
        "Regle d'Or de Securite :" : "MINIMUM 2 PERSONNES AUTONOMES (NIVEAU 3+) PAR POSTE VITAL"
    }
    add_metadata_box(doc, meta)
    
    add_section_header(doc, "2. MATRICE VISUELLE DES COMPETENCES CRITIQUES (BAREME DE 1 A 4)")
    headers_pol = ["COLLABORATEUR", "POSTE 1: CN LASER", "POSTE 2: PLIAGE CNC", "POSTE 3: SOUDURE TIG", "POSTE 4: MONTAGE H2", "POSTE 5: EXPEDITION"]
    col_w_pol = [2400, 1600, 1600, 1600, 1600, 1400]
    sub_pol = ["Echelle : 1 a 4", "Poste Critique", "Poste Critique", "Poste Critique", "Poste Critique", "Poste Standard"]
    rows_pol = [
        ["Jean-Luc M. (Expert)", "NIVEAU 4 (Expert)", "NIVEAU 2 (Aide)", "NIVEAU 1 (Notion)", "NIVEAU 1 (Notion)", "NIVEAU 1 (Notion)"],
        ["Marc D. (Plieur)", "NIVEAU 1 (Notion)", "NIVEAU 4 (Expert)", "NIVEAU 2 (Aide)", "NIVEAU 1 (Notion)", "NIVEAU 2 (Aide)"],
        ["Karim B. (Soudeur)", "NIVEAU 1 (Notion)", "NIVEAU 1 (Notion)", "NIVEAU 4 (Expert)", "NIVEAU 2 (Aide)", "NIVEAU 1 (Notion)"],
        ["Thomas R. (Polyvalent)", "NIVEAU 3 (Autonome)", "NIVEAU 3 (Autonome)", "NIVEAU 1 (Notion)", "NIVEAU 3 (Autonome)", "NIVEAU 4 (Expert)"],
        ["[Collaborateur 5]", "[Niveau 1 a 4]", "[Niveau 1 a 4]", "[Niveau 1 a 4]", "[Niveau 1 a 4]", "[Niveau 1 a 4]"]
    ]
    format_word_table(doc, headers_pol, rows_pol, col_widths_dxa=col_w_pol, subheaders=sub_pol, center_cols=[1, 2, 3, 4, 5])
    
    add_section_header(doc, "3. DIAGNOSTIC DES POSTES EN RISQUE MAJEUR (SEUL 1 NIVEAU 3/4)")
    headers_rsk = ["POSTE OPERATIONNEL", "TITULAIRE PRINCIPAL", "EFFECTIF NIVEAU 3+", "INDICE DE VULNERABILITE", "ACTION D'URGENCE"]
    col_w_rsk = [2800, 2200, 1600, 1800, 1800]
    rows_rsk = [
        ["Poste 3 : Soudure TIG Inox", "Karim B. (Seul)", "1 SEULE PERSONNE", "ALERTE ROUGE (CRITIQUE)", "Former Marc en doublure sous 60j"],
        ["Poste 1 : Decoupe Laser", "Jean-Luc M. & Thomas R.", "2 personnes autonomes", "SECURISE (VERT)", "Maintenir pratique 1j/mois"],
        ["Poste 2 : Pliage CNC", "Marc D. & Thomas R.", "2 personnes autonomes", "SECURISE (VERT)", "Maintenir pratique 1j/mois"],
        ["Poste 4 : Montage H2", "Thomas R. (Seul)", "1 SEULE PERSONNE", "ALERTE ROUGE (CRITIQUE)", "Former Jean-Luc en doublure sous 45j"]
    ]
    format_word_table(doc, headers_rsk, rows_rsk, col_widths_dxa=col_w_rsk, center_cols=[2, 3])
    
    add_section_header(doc, "4. PLAN D'ENTRAÎNEMENT CROISE & PARRAINAGE SOUS 60 JOURS")
    headers_frm = ["POSTE A DOUBLER", "TUTEUR EXPERT", "APPRENANT RETENU", "VOLUME PARRAINAGE", "TEST AUTONOMIE"]
    col_w_frm = [2600, 2000, 2000, 1800, 1800]
    rows_frm = [
        ["Soudure TIG Inox", "Karim B. (Tuteur)", "Marc D. (Apprenant)", "2h par semaine (16h total)", "Examen pratique 30/11"],
        ["Montage Hydraulique H2", "Thomas R. (Tuteur)", "Jean-Luc M. (Apprenant)", "3h par semaine (24h total)", "Examen pratique 15/11"],
        ["[Poste critique a doubler]", "[Nom du tuteur]", "[Nom de l'apprenant]", "[__ h par semaine]", "[Date butoir]"]
    ]
    format_word_table(doc, headers_frm, rows_frm, col_widths_dxa=col_w_frm, center_cols=[3, 4])
    
    add_section_header(doc, "5. VALIDATION DE LA MONTEE EN COMPETENCES")
    signoff = ["COLLABORATEUR APPRENANT", "TUTEUR EXPERT", "CHEF D'ATELIER / DIRECTION"]
    add_validation_signoff_box(doc, signoff)
    
    add_next_steps_box(doc, [
        "Afficher la grille de polyvalence dans l'atelier pour creer une saine reconnaissance.",
        "Inscrire les sessions de parrainage de 2 heures dans le planning de charge hebdomadaire.",
        "Valider l'autonomie par la realisation reelle de pieces en autonomie sans assistance.",
        "Actualiser la matrice de polyvalence tous les 6 mois en revue de direction."
    ])
    
    out_path = os.path.join(TEMPLATES_DIR, "OUTIL_09_POLYVALENCE_ET_SECURITE_COMPETENCES_TEMPLATE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

def generate_tool_09_guide():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 09", "POLYVALENCE & SECURISATION COMPETENCES", "GUIDE METHODOLOGIQUE")
    
    add_why_box(
        doc,
        [
            "Garantie absolue de continuite d'activite : aucune absence ne peut bloquer l'entreprise.",
            "Agilite operationnelle pour absorber les pics de charge en reallouant le personnel.",
            "Valorisation des operateurs experts transformes en formateurs internes valorises.",
            "Climat social apaise : disparition de la charge mentale ecrasante pesant sur l''homme providentiel'."
        ],
        [
            "Le syndrome du 'Savoir prisonnier' : si l'expert part ou est malade, l'entreprise s'arrete net.",
            "Chantage implicite a l'augmentation par des salaries conscients d'etre irremplacables a court terme.",
            "Retards de livraison majeurs et chantiers bloques lors des conges annuels des postes uniques.",
            "Perte definitive de pans entiers de savoir-faire lors des departs en retraite."
        ]
    )
    
    add_consultant_box(
        doc,
        "Desamorcer la peur du salarie expert en valorisant le role de tuteur : 'Un expert est quelqu'un qui sait transmettre, pas quelqu'un qui garde ses secrets'.",
        [
            ("L'audit de vulnerabilite en 30 minutes", "Poser la question brutale au patron : 'Si Jean-Marc a un accident de velo ce soir et 2 mois d'arret, que se passe-t-il demain matin ?'."),
            ("La regle du 2 minimum", "Chaque poste ou machine qui conditionne une ligne de facturation doit obligatoirement compter au moins 2 personnes autonomes."),
            ("Le parrainage sans douleur", "Ne pas envoyer les salaries en stage theorique externe : 2 heures de binome par semaine au poste suffisent a transmettre 80% du metier en 2 mois."),
            ("Le maintien en condition", "Une doublure formee doit pratiquer au minimum 1 demi-journee par mois sur le poste pour ne pas perdre ses automatismes.")
        ]
    )
    
    add_guide_box(
        doc,
        [
            "Lister les 5 a 10 competences cles qui cadencent la valeur ajoutee de l'entreprise.",
            "Construire la matrice avec l'echelle 1 a 4 (Notion, Accompagne, Autonome, Tuteur).",
            "Mettre en evidence en ROUGE tous les postes qui ne comptent qu'un seul Niveau 3 ou 4.",
            "Etablir le contrat de binome sur 60 jours : 2h par semaine bloquees au planning.",
            "Faire passer le test pratique de validation d'autonomie et mettre a jour la matrice publiquement."
        ]
    )
    
    add_case_study_box(
        doc,
        "PME Fabrication Menuiserie Aluminium & Facades (20 salaries - CA : 3,3 M EUR)",
        "Un seul operateur maitrisait la programmation du centre d'usinage 4 axes. Lors de son arret maladie de 4 semaines, l'usine a tourne au ralenti, generant 48 000 EUR de penalites de retard et la perte d'un marche public.",
        "Mise en place de l'Outil 09 : identification des 3 postes critiques en alerte rouge, mise en place de 2h de doublon hebdomadaire pendant 8 semaines pour former 2 collegues monteurs.",
        "Les 3 postes critiques sont desormais doubles a 100%. L'entreprise a absorbe les conges d'ete sans aucune baisse de cadence de production. Cout de formation interne : 1 800 EUR en temps de doublon."
    )
    
    add_section_header(doc, "GRILLE D'AUTO-EVALUATION DE LA POLYVALENCE DES EQUIPES")
    criteria = [
        ("Taux de postes critiques d'atelier ayant au moins 2 salaries autonomes (Niveau 3+)", "100 % des postes", "Plan de formation prioritaire"),
        ("Taux de respect des creneaux hebdomadaires de parrainage au planning", ">= 90 % tenus", "Priorite absolue d'arbitrage"),
        ("Temps d'arret de production du a l'absence imprevue d'un operateur", "0 heure d'arret", "Bascule immediate de la doublure"),
        ("Revue semestrielle de la matrice de polyvalence realisee", "2 fois par an", "Mise a jour formelle des niveaux")
    ]
    add_audit_checklist_box(doc, criteria)
    
    out_path = os.path.join(GUIDES_DIR, "OUTIL_09_POLYVALENCE_ET_SECURITE_COMPETENCES_GUIDE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

# ==============================================================================
# OUTIL 10 : TABLEAU DE BORD DU DIRIGEANT : LES 5 KPIS HEBDO DU CASH
# ==============================================================================
def generate_tool_10_template():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 10", "TABLEAU DE BORD DU DIRIGEANT (5 KPIS CASH)", "TEMPLATE OPERATIONNEL")
    
    add_cash_counter_box(
        doc,
        "Pilotage hebdomadaire en 15 min le lundi matin et anticipation de tresorerie glissante a 4 semaines",
        "Ecart de marge reelle vs marge cible & Respect du solde previsionnel de tresorerie a 4 semaines",
        "Marge nette securisee = Detection precoce des derives d'exploitation avant la cloture comptable"
    )
    
    add_section_header(doc, "1. IDENTIFICATION DE LA REVUE DE PILOTAGE DU LUNDI MATIN")
    meta = {
        "Semaine N° / Periode :" : "[ Ex: Semaine 38 - Mois de Septembre 2026 ]",
        "Entreprise / Site :" : "[ Nom de la PME ]",
        "Date & Heure du Rituel :" : "CHAQUE LUNDI MATIN A 08H30 PRECIS - DUREE : 15 MINUTES CHRONO",
        "Participants Obligatoires :" : "DIRIGEANT, RESPONSABLE COMMERCIAL, CHEF D'ATELIER, COMPTABLE",
        "Objectif d'Exploitation du Mois :" : "[ Ex: 250 000 EUR HT facture - Marge brute minimale 35% ]"
    }
    add_metadata_box(doc, meta)
    
    add_section_header(doc, "2. LE COCKPIT DES 5 KPIS VITAUX DU CASH (LUNDI 08H30)")
    headers_kpi = ["N°", "INDICATEUR VITAL DU CASH", "OBJECTIF / CIBLE", "VALEUR REELLE SEMAINE", "ZONE RISQUE", "IMPACT SUR LE CASH"]
    col_w_kpi = [500, 3200, 1800, 1800, 1400, 1500]
    rows_kpi = [
        ["K1", "Chiffre d'Affaires Facture & Reste a Facturer", ">= 60 000 EUR / sem", "64 200 EUR HT", "VERT", "Cash encaisse a 30j"],
        ["K2", "Marge Brute Moyenne des Devis Signes", "Minimum 35,00 %", "36,80 %", "VERT", "Marge nette preservee"],
        ["K3", "Taux de Livraison a l'Heure (OTIF %)", ">= 95,0 %", "88,5 %", "ALERTE ORANGE", "Risque de retard paiement"],
        ["K4", "Montant Cumule des Avoirs & Litiges du Mois", "< 1 500 EUR / mois", "480 EUR HT", "VERT", "Zero fuite de tresorerie"],
        ["K5", "Heures d'Arret Imprevu Machine Goulet", "< 1,0 heure / sem", "0,0 heure", "VERT", "Cadence usine protegee"]
    ]
    format_word_table(doc, headers_kpi, rows_kpi, col_widths_dxa=col_w_kpi, center_cols=[0, 2, 3, 4])
    
    add_section_header(doc, "3. PLAN D'ACTION D'URGENCE SUR LES DERIVES DE LA SEMAINE")
    headers_act = ["KPI EN DERIVE", "CAUSE IDENTIFIEE SEANCE TENANTE", "ACTION CORRECTIVE IMMEDIATE", "1 PILOTE UNIQUE", "RESULTAT VENDREDI"]
    col_w_act = [2000, 2800, 2800, 1400, 1200]
    rows_act = [
        ["K3: Livraison OTIF a 88,5%", "Retard approvisionnement toles inox", "Bascule sur fournisseur secondaire en express", "P. Martin", "100% livres"],
        ["[KPI en alerte rouge]", "[ Cause operationnelle precise ]", "[ Action corrective de redressement ]", "[ Nom unique ]", "[ Cible ven. ]"],
        ["[KPI en alerte rouge]", "[ Cause operationnelle precise ]", "[ Action corrective de redressement ]", "[ Nom unique ]", "[ Cible ven. ]"]
    ]
    format_word_table(doc, headers_act, rows_act, col_widths_dxa=col_w_act, center_cols=[0, 3, 4])
    
    add_section_header(doc, "4. PREVISIONNEL DE TRESORERIE NETTE A 4 SEMAINES (FLUX REEL)")
    headers_trs = ["SEMAINE", "ENCAISSEMENTS FERMES (CLIENTS)", "DECAISSEMENTS FERMES (FOURN.+SALAIRES)", "SOLDE NET DE TRESORERIE", "ARBITRAGE"]
    col_w_trs = [1600, 2400, 2600, 2000, 1600]
    rows_trs = [
        ["Semaine S", "45 000 EUR", "38 000 EUR", "+7 000 EUR", "RAS"],
        ["Semaine S+1", "52 000 EUR", "64 000 EUR (TVA + Salaires)", "-12 000 EUR", "Relance client X"],
        ["Semaine S+2", "68 000 EUR", "32 000 EUR", "+36 000 EUR", "Equilibre"],
        ["Semaine S+3", "40 000 EUR", "28 000 EUR", "+12 000 EUR", "Securise"]
    ]
    format_word_table(doc, headers_trs, rows_trs, col_widths_dxa=col_w_trs, center_cols=[0, 1, 2, 3, 4])
    
    add_section_header(doc, "5. VALIDATION DU PILOTAGE HEBDOMADAIRE")
    signoff = ["RESPONSABLE COMPTABLE / FINANCIER", "RESPONSABLE D'EXPLOITATION", "DIRIGEANT DE L'ENTREPRISE"]
    add_validation_signoff_box(doc, signoff)
    
    add_next_steps_box(doc, [
        "Tenir le point chaque lundi a 8h30 sans exception meme en cas de deplacement.",
        "Toute zone rouge declenche un ordre de mission immediat solde avant le vendredi soir.",
        "Mettre a jour le suivi bancaire reel chaque vendredi apres-midi.",
        "Classement : Serveur GED / PILOTAGE_DIRECTION / TABLEAUX_DE_BORD_2026."
    ])
    
    out_path = os.path.join(TEMPLATES_DIR, "OUTIL_10_TABLEAU_DE_BORD_5_KPIS_HEBDO_TEMPLATE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

def generate_tool_10_guide():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 10", "TABLEAU DE BORD DU DIRIGEANT (5 KPIS CASH)", "GUIDE METHODOLOGIQUE")
    
    add_why_box(
        doc,
        [
            "Visibilite parfaite sur le cash et la rentabilite reelle en continu sans attendre le comptable.",
            "Detection immediate des ecarts d'exploitation : une derive est corrigee en 48h au lieu de 6 mois.",
            "Culture du chiffre froid et partagee avec l'encadrement sans devoiler la remuneration du dirigeant.",
            "Anticipation sereine des echeances fiscales, sociales et fournisseurs a 4 semaines."
        ],
        [
            "Gestion a vue : le dirigeant regarde le solde bancaire chaque matin sans savoir s'il est rentable.",
            "Decouverte de la catastrophe financière 6 mois apres la fin de l'annee fiscale.",
            "Usines a gaz de 50 indicateurs complexes montees sur Excel, abandonnees au bout de 6 semaines.",
            "Litiges clients et pannes d'atelier qui s'accumulent sans que la direction n'en mesure l'impact direct."
        ]
    )
    
    add_consultant_box(
        doc,
        "Le consultant doit purger 90% des indicateurs inutiles : '5 chiffres froids valent mieux que 50 graphiques illisibles'.",
        [
            ("Le rituel sacre du lundi 08h30", "15 minutes chrono autour de la table. Les chiffres doivent etre prets sur la table a 8h29 sans discussion d'opinion."),
            ("Separer CA et Marge", "Le chiffre d'affaires flatte l'ego, la marge brute nourrit l'entreprise, le cash paye les factures. Suivre prioritairement les KPIs 2 et 4."),
            ("La tresorerie a 4 semaines", "Ne jamais raisonner a l'annee : une PME meurt d'un trou de tresorerie de 15 jours. Le prévisionnel a 4 semaines alerte avant l'impasse."),
            ("Pas d'excuse, une action", "Si le taux de service ou la marge est sous la cible, refuser les lamentations : exiger une decision immediate avec resultat le vendredi.")
        ]
    )
    
    add_guide_box(
        doc,
        [
            "Extraire les 5 chiffres de base chaque vendredi soir ou lundi matin tot.",
            "Reunir le quatuor Direction - Commerce - Atelier - Comptabilite pendant 15 minutes chrono.",
            "Examiner les 5 chiffres : si vert = felicitation et on avance; si rouge = action d'urgence.",
            "Pointer les entrees et sorties de cash des 4 prochaines semaines.",
            "Faire le point d'atterrissage le vendredi a 17h00 pour verifier la resolution du probleme."
        ]
    )
    
    add_case_study_box(
        doc,
        "PME Chaudronnerie & Mecanique Industrielle (26 salaries - CA : 4,1 M EUR)",
        "L'entreprise naviguait a vue : apres une annee a +110 000 EUR, elle enregistrait brutalement une perte de -85 000 EUR sans comprendre la fuite de rentabilite. Le chef d'entreprise subissait des tensions de tresorerie permanentes.",
        "Mise en place de l'Outil 10 : rituel hebdo de 15 minutes le lundi matin base exclusivement sur les 5 KPIs du cash et previsionnel a 4 semaines.",
        "La marge brute des devis a ete redressee de 31% a 36,5%, les avoirs ont ete divises par 3 et la tresorerie est redevenue positive de maniere perenne. Resultat net a 12 mois : +174 000 EUR."
    )
    
    add_section_header(doc, "GRILLE D'AUTO-EVALUATION DU PILOTAGE DU CASH")
    criteria = [
        ("Le rituel du lundi 08h30 est tenu 100% des semaines en 15 minutes max", "100 % des lundis", "Engagement absolu de la direction"),
        ("Les 5 indicateurs sont renseignes sans exception avant la reunion", "100 % des chiffres prets", "Extraction automatique comptable"),
        ("Toute alerte rouge donne lieu a une action soldee sous 5 jours", "100 % des alertes traitees", "Revue du vendredi apres-midi"),
        ("Le solde net previsionnel de tresorerie a 4 semaines est toujours positif", "Zero impasse bancaire", "Plan de relance client immediat")
    ]
    add_audit_checklist_box(doc, criteria)
    
    out_path = os.path.join(GUIDES_DIR, "OUTIL_10_TABLEAU_DE_BORD_5_KPIS_HEBDO_GUIDE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

if __name__ == "__main__":
    print("Generating FLUX 3 Tools...")
    generate_tool_08_template()
    generate_tool_08_guide()
    generate_tool_09_template()
    generate_tool_09_guide()
    generate_tool_10_template()
    generate_tool_10_guide()
    print("FLUX 3 generated successfully.")
