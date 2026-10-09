# -*- coding: utf-8 -*-
import os
import sys

# Ensure current dir is in path
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
# OUTIL 01 : CADRAGE DES DEVIS & SECURISATION DE LA MARGE
# ==============================================================================
def generate_tool_01_template():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 01", "CADRAGE DES DEVIS & SECURISATION DE LA MARGE", "TEMPLATE OPERATIONNEL")
    
    add_cash_counter_box(
        doc,
        "Verrouillage de la marge brute et facturation systematique de 100% des prestations hors devis",
        "Total des heures d'avenants facturees & Ecart de marge brute realisee vs cible",
        "Marge brute recuperee = (Volume d'heures d'ajustements x Taux horaire facture) + Marge sauvegardee sur devis"
    )
    
    add_section_header(doc, "1. IDENTIFICATION DU DEVIS & PARAMETRES FINANCIERS")
    meta = {
        "Numero de Devis / Affaire :" : "[ Ex: DEV-2026-084 ]",
        "Client / Raison Sociale :" : "[ Raison Sociale du Client ]",
        "Charge d'Affaires / Commercial :" : "[ Nom du Commercial / Chiffreur ]",
        "Taux Horaire Atelier Retenu :" : "[ Ex: 52,00 EUR / h charge ]",
        "Taux Horaire Bureau d'Etudes :" : "[ Ex: 68,00 EUR / h charge ]",
        "Marge Brute Cible Contractuelle :" : "[ Ex: Minimum 35,00 % ]"
    }
    add_metadata_box(doc, meta)
    
    add_section_header(doc, "2. CHECKLIST DE CONTRÔLE AVANT ENVOI DU DEVIS (7 VERROUS)")
    headers_ck = ["POINT DE CONTROLE ELIMINATOIRE", "VALEUR / VERIFICATION", "CONFORME ?", "COMMENTAIRES & AJUSTEMENTS"]
    col_w_ck = [3800, 2400, 1400, 2600]
    rows_ck = [
        ["1. Prix des matieres premieres actualise", "Devis fournisseur < 15 jours", "CONFORME", "Indices inox et cuivre verifies"],
        ["2. Heures de fabrication validees atelier", "Avis formel du chef d'atelier", "CONFORME", "Temps d'usinage confirme a 14h"],
        ["3. Prestations annexes chiffrees ou exclues", "Transport, grutage, pose inclus/exclus", "[ OUI / NON ]", "Exclusion explicite mentionnee au devis"],
        ["4. Conditions de reglement chiffrees", "Acompte 30% a la commande obligatoire", "[ OUI / NON ]", "Solde a 30 jours net date facture"],
        ["5. Seuil de marge brute plancher respecte", "Marge brute calculee >= seuil cible", "[ OUI / NON ]", "Marge calculee a 37,2% (Cible 35%)"],
        ["6. Clause de reserve de propriete incluse", "Mentions legales CGV a jour", "[ OUI / NON ]", "CGV jointes au devis avec case a cocher"],
        ["7. Validite de l'offre limitee", "Duree max 30 jours calendaires", "[ OUI / NON ]", "Validite fixee au [Date limite]"]
    ]
    format_word_table(doc, headers_ck, rows_ck, col_widths_dxa=col_w_ck, center_cols=[2])
    
    add_section_header(doc, "3. MATRICE DE GESTION DES TRAVAUX SUPPLEMENTAIRES & AVENANTS")
    headers_av = ["N°", "DESCRIPTION DU TRAVAIL EXTRA", "HEURES MO", "ACHATS MATIERE", "MONTANT HT", "BON ACCORD SIGNE", "STATUT FACTURATION"]
    col_w_av = [500, 3200, 1000, 1200, 1300, 1500, 1500]
    rows_av = [
        ["AV1", "Rallongement cablage et support mural inox", "4,5 h", "180 EUR HT", "540 EUR HT", "VALIDE LE 12/03", "Facture n° FAC-102"],
        ["AV2", "Modification decoupe sur demande client sur site", "2,0 h", "45 EUR HT", "195 EUR HT", "VALIDE LE 15/03", "A facturer fin mois"],
        ["AV3", "[Description travail supplementaire demande]", "[__ h]", "[__ EUR HT]", "[__ EUR HT]", "[ OUI / NON ]", "[ A facturer ]"],
        ["AV4", "[Description travail supplementaire demande]", "[__ h]", "[__ EUR HT]", "[__ EUR HT]", "[ OUI / NON ]", "[ A facturer ]"]
    ]
    format_word_table(doc, headers_av, rows_av, col_widths_dxa=col_w_av, center_cols=[0, 2, 3, 4, 5])
    
    add_section_header(doc, "4. DEROGATION EXCEPTIONNELLE DE MARGE (SI MARGE < SEUIL CIBLE)")
    headers_derog = ["PARAMETRE", "VALEUR DOSSIER", "JUSTIFICATION STRATEGIQUE", "DECISION DIRECTION"]
    col_w_derog = [2600, 2000, 3600, 2000]
    rows_derog = [
        ["Marge Brute Proposee", "28,5 % (Cible 35%)", "Volume annuel garanti de 120 pieces fermes", "ACCORDEE DG"],
        ["Conditions Compensatoires", "Paiement comptant 100%", "Remise sous condition de reglement a 10 jours", "VALIDEE COMPTA"],
        ["Cas standard sans derogation", "[__ %]", "[Remplir uniquement si marge inferieure au seuil]", "[ ACCORD / REFUS ]"]
    ]
    format_word_table(doc, headers_derog, rows_derog, col_widths_dxa=col_w_derog, center_cols=[1, 3])
    
    add_section_header(doc, "5. VALIDATION HIERARCHIQUE DU DEVIS")
    signoff = ["CHARGE D'AFFAIRES (CHIFFRAGE)", "RESPONSABLE COMMERCIAL", "DIRECTION GENERALE (SI DEROGATION)"]
    add_validation_signoff_box(doc, signoff)
    
    add_next_steps_box(doc, [
        "Si la marge brute est conforme au seuil : envoyer le devis avec CGV jointes.",
        "Si la marge brute est sous le seuil cible : visa OBLIGATOIRE de la Direction Generale.",
        "Dès qu'une modification intervient en cours d'affaire : saisir immediatement la ligne Avenant.",
        "Classement du dossier : Serveur GED / AFFAIRES_EN_COURS / [CLIENT]_[NUM_DEVIS]."
    ])
    
    out_path = os.path.join(TEMPLATES_DIR, "OUTIL_01_CADRAGE_DEVIS_ET_MARGE_TEMPLATE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

def generate_tool_01_guide():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 01", "CADRAGE DES DEVIS & SECURISATION DE LA MARGE", "GUIDE METHODOLOGIQUE")
    
    add_why_box(
        doc,
        [
            "Garantie d'une marge brute reelle superieure ou egale au seuil cible sur chaque affaire.",
            "Facturation systematique des travaux supplementaires et fin des 'cadeaux' non chifPoint.",
            "Responsabilisation des commerciaux et chiffreurs sur la marge et non le volume de CA.",
            "Previsionnel de tresorerie fiabilise des la signature du devis grace a l'acompte de 30%."
        ],
        [
            "Perte invisible de 5% a 12% de marge brute sur chantier en raison des modifications orales.",
            "Temps passe par le bureau d'etudes et l'atelier non refacture au client final.",
            "Conflits en fin de chantier lorsque le client conteste les extras non formalises.",
            "Tresorerie asfixiee par des affaires a marge nulle qui consomment les capacites de production."
        ]
    )
    
    add_consultant_box(
        doc,
        "Le consultant doit imposer une regle non negociable : 'Tout ce qui n'est pas ecrit est gratuit pour le client mais ruineux pour l'entreprise'.",
        [
            ("Chasser les devis 'a la louche'", "Chaque devis doit reposer sur un chiffrage temps atelier valide par le chef d'equipe."),
            ("Fixer une marge plancher infranchissable", "Interdire aux commerciaux d'accorder des remises sans validation formelle de la Direction."),
            ("Le reflexe Avenant", "Des qu'un client demande une modification sur site, emettre un avenant d'1 page signe avant realisation."),
            ("Associer la remuneration a la marge", "Sensibiliser les commerciaux sur le fait que 1 EUR de marge brute vaut plus que 10 EUR de CA sans marge.")
        ]
    )
    
    add_guide_box(
        doc,
        [
            "Calibrer le taux horaire atelier et BE avec le comptable (inclure charges fixes, amortissements et encadrement).",
            "Mettre en place la Checklist des 7 verrous sur tout devis superieur a 1 500 EUR HT avant envoi.",
            "Former les chefs de chantier / techniciens : leur donner un bloc d'avenants a faire signer pour tout extra.",
            "Chaque lundi matin, auditer les marges brutes realisees sur les devis signes de la semaine ecoulee."
        ]
    )
    
    add_case_study_box(
        doc,
        "PME Metallerie & Agencement (18 salaries - CA : 2,8 M EUR)",
        "L'entreprise gagnait de beaux chantiers mais degageait moins de 2% de resultat net. Les techniciens realisaient sur chantier de nombreuses adaptations demandees oralement par les architectes, sans jamais les chiffrer ni les refacturer.",
        "Deploiement de l'Outil 01 : mise en place de la checklist devis avec seuil de marge brute plancher a 34% et obligation d'un bon d'avenant signe pour toute heure supplementaire sur site.",
        "+38 400 EUR HT d'avenants factures des la premiere annee. Remontee de la marge brute moyenne de l'entreprise de 29,8% a 35,2%, soit +151 000 EUR de resultat d'exploitation additionnel."
    )
    
    add_section_header(doc, "GRILLE D'AUTO-EVALUATION DE L'EFFICACITE DU CADRAGE DEVIS")
    criteria = [
        ("100% des devis > 1 500 EUR ont la checklist de controle renseignee", "100 % obligatoire", "Audit hebdomadaire direction"),
        ("Taux de travaux supplementaires factures avec avenant ecrit", ">= 95 % des extras", "Rappel a l'ordre chefs chantier"),
        ("Ecart entre marge previsionnelle devis et marge reelle de fin d'affaire", "<= 2 % d'ecart", "Recalibrer les temps standards atelier"),
        ("Aucun devis emis avec marge brute inferieure au seuil sans visa DG", "Zero derogation occulte", "Blocage informatique de validation")
    ]
    add_audit_checklist_box(doc, criteria)
    
    out_path = os.path.join(GUIDES_DIR, "OUTIL_01_CADRAGE_DEVIS_ET_MARGE_GUIDE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

# ==============================================================================
# OUTIL 02 : PROCES-VERBAL DE RECETTE & DECLENCHEUR DE FACTURATION
# ==============================================================================
def generate_tool_02_template():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 02", "PROCES-VERBAL DE RECETTE & DECLENCHEUR DE FACTURATION", "TEMPLATE OPERATIONNEL")
    
    add_cash_counter_box(
        doc,
        "Securisation juridique de la reception et emission de la facture finale sous 24h chrono",
        "Delai moyen d'encaissement (DSO en jours) & Taux de factures reglees a 95% sans blocage",
        "Tresorerie debloquee = (Gain en jours de DSO / 365) x Chiffre d'Affaires Annuel"
    )
    
    add_section_header(doc, "1. IDENTIFICATION DE L'INTERVENTION & LIVRABLES")
    meta = {
        "Numero de PV / Bon de Livraison :" : "[ Ex: PV-2026-112 ]",
        "Numero de Commande / Devis Client :" : "[ Ex: CMD-2026-084 / DEV-2026-084 ]",
        "Client / Chantier / Site :" : "[ Nom Client & Adresse exacte du site d'intervention ]",
        "Representant Entreprise (Livreur/Technicien) :" : "[ Nom du responsable de pose / livraison ]",
        "Representant Client Habilite :" : "[ Nom & Qualite du signataire client ]",
        "Montant Solde Restant a Facturer :" : "[ Ex: 14 850,00 EUR HT ]"
    }
    add_metadata_box(doc, meta)
    
    add_section_header(doc, "2. CONSTAT CONTRADICTOIRE DE LIVRAISON & ESSAIS FONCTIONNELS")
    headers_ctrl = ["LOT / EQUIPEMENT LIVRE", "QUANTITE", "CONTROLE VISUEL", "TEST FONCTIONNEL", "CONFORMITE GLOBALE"]
    col_w_ctrl = [3600, 1200, 1800, 1800, 1800]
    rows_ctrl = [
        ["Armoire de commande automatisee T4", "1 unite", "CONFORME", "Test sous tension OK", "RECEPTIONNE"],
        ["Cablage puissance et raccordement moteurs", "4 lignes", "CONFORME", "Mesure d'isolement OK", "RECEPTIONNE"],
        ["Garde-corps inox et platines de fixation", "12 metres", "CONFORME", "Verification ancrage OK", "RECEPTIONNE"],
        ["[Description lot / equipement installe]", "[__ qte]", "[ Conforme / Non ]", "[ Test realise ]", "[ RECEPTIONNE ]"],
        ["[Description lot / equipement installe]", "[__ qte]", "[ Conforme / Non ]", "[ Test realise ]", "[ RECEPTIONNE ]"]
    ]
    format_word_table(doc, headers_ctrl, rows_ctrl, col_widths_dxa=col_w_ctrl, center_cols=[1, 2, 3, 4])
    
    add_section_header(doc, "3. GESTION DES RESERVES MINEURES (PLAFOND MAX 5% RETENUE)")
    headers_res = ["N°", "DESCRIPTION DE LA RESERVE MINEURE", "COUT DE LEVEE ESTIMATION", "DATE BUTOIR LEVEE", "IMPACT FACTURATION"]
    col_w_res = [500, 4200, 1700, 1800, 2000]
    rows_res = [
        ["R1", "Retouche peinture sur capot inferieur gauche", "80 EUR HT", "Sous 7 jours (18/04)", "Facturation 95% sans blocage"],
        ["R2", "Livraison notice d'utilisation version papier", "20 EUR HT", "Sous 48h (14/04)", "Aucun impact financier"],
        ["R3", "[Description detaillee de la reserve]", "[__ EUR HT]", "[ Date ]", "[ 5% retenu max ]"],
        ["R4", "[Description detaillee de la reserve]", "[__ EUR HT]", "[ Date ]", "[ 5% retenu max ]"]
    ]
    format_word_table(doc, headers_res, rows_res, col_widths_dxa=col_w_res, center_cols=[0, 2, 3])
    
    add_section_header(doc, "4. ACCORD EXPRES DE FACTURATION & TRANSFERT DE GARDE")
    headers_acc = ["CLAUSE CONTRACTUELLE", "ENGAGEMENT JURIDIQUE DES PARTIES", "ACCORD"]
    col_w_acc = [2800, 5800, 1600]
    rows_acc = [
        ["Prononciation de la Reception", "Le client declare accepter les prestations/biens ci-dessus decrits conformement au devis.", "ACCEPTE"],
        ["Autorisation de Facturation", "L'emission de la facture finale de solde est autorisee a date de ce jour sans delai supplementaire.", "BON A FACTURER"],
        ["Reglement des 95% immediat", "En cas de reserves mineures, seule une retenue max de 5% est autorisee; les 95% sont exigibles a l'echeance.", "VALIDE"]
    ]
    format_word_table(doc, headers_acc, rows_acc, col_widths_dxa=col_w_acc, center_cols=[2])
    
    add_section_header(doc, "5. SIGNATURES CONTRADICTOIRES SUR SITE")
    signoff = ["REPRESENTANT ENTREPRISE (CHEF D'EQUIPE)", "REPRESENTANT CLIENT (DONNEUR D'ORDRE)"]
    add_validation_signoff_box(doc, signoff)
    
    add_next_steps_box(doc, [
        "Transmettre la photo ou scan du PV signe a la comptabilite des le retour d'intervention.",
        "La comptabilite emet la facture finale le jour meme (pas en fin de mois).",
        "Si reserves mineures existantes : planifier immediatement la levee sous 7 jours max.",
        "Classement : Serveur GED / FACTURATION_CLIENTS / PV_SIGNES / [CLIENT]_[ANNEE]."
    ])
    
    out_path = os.path.join(TEMPLATES_DIR, "OUTIL_02_PV_RECETTE_ET_FACTURATION_TEMPLATE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

def generate_tool_02_guide():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 02", "PROCES-VERBAL DE RECETTE & DECLENCHEUR DE FACTURATION", "GUIDE METHODOLOGIQUE")
    
    add_why_box(
        doc,
        [
            "Declenchement immediat de l'echeance de paiement : pas de PV = paiement repousse de 2 a 3 mois.",
            "Suppression definitive du blocage de 100% de la facture pour un defaut mineur a 100 EUR.",
            "Preuve juridique incontrovertible de transfert des risques et conformite de la livraison.",
            "Gain moyen de 25 a 45 jours de tresorerie disponible sur les encaissements de fin de chantier."
        ],
        [
            "Client qui refuse de payer 2 mois plus tard en pretendant que 'le chantier n'est pas termine'.",
            "Contestations tardives de rayures ou manques survenus APRES le depart de vos equipes.",
            "Chantage a la retenue financiere totale sur des factures de plusieurs dizaines de milliers d'euros.",
            "Tresorerie bloquee et recours obligatoire a des decouverts ou affacturages couteux."
        ]
    )
    
    add_consultant_box(
        doc,
        "Le consultant doit transformer les poseurs, livreurs et techniciens en 'premiers maillons de la tresorerie' de l'entreprise.",
        [
            ("Interdiction de quitter le site sans signature", "La livraison n'est pas terminee tant que le papier n'est pas signe avec cachet."),
            ("La regle du verrou des 5%", "Expliquer calmement au client que les reserves mineures font l'objet d'un engagement de levée sous 7 jours mais ne bloquent pas la facturation."),
            ("La posture face au client absent", "Prevoir l'heure exacte de reception 48h avant avec le client; s'il est absent, lui envoyer le PV par signature electronique dans l'heure."),
            ("Facturer le jour J", "Supprimer le rituel de la facturation une fois par mois. Chaque PV signe declenche la facture sous 24 heures.")
        ]
    )
    
    add_guide_box(
        doc,
        [
            "Equiper chaque vehicule ou chef de chantier de liasses papier de PV ou d'une tablette avec signature numerique.",
            "Realiser l'inspection contradictoire pas-a-pas avec le client (faire fonctionner la machine ou inspecter la pose ensemble).",
            "Noter precisement les reserves s'il y en a : refuser les formulations vagues comme 'finitions a revoir'.",
            "Envoyer la copie du PV au client par e-mail dans l'heure avec confirmation : 'Merci, la facture de solde vous est transmise ce jour'."
        ]
    )
    
    add_case_study_box(
        doc,
        "PME Fabricant et Installateur d'Equipements Industriels (24 salaries - CA : 3,6 M EUR)",
        "DSO moyen de 74 jours. Les clients attendaient plusieurs semaines avant de signaler des petites reserves pour retarder le paiement du solde de 40%, creusant un trou de tresorerie de 240 000 EUR permanent.",
        "Mise en place de l'Outil 02 : formation des monteurs a la reception contradictoire systematique avec protocole de retenue bloquee a 5% maximum et emission de la facture a J+1 du PV.",
        "Le DSO est descendu de 74 jours a 39 jours en 4 mois. Plus de 130 000 EUR de tresorerie immediatement recouvree, suppression des frais bancaires de decouvert (-7 800 EUR/an)."
    )
    
    add_section_header(doc, "GRILLE D'AUTO-EVALUATION DE L'EFFICACITE DU PV DE RECETTE")
    criteria = [
        ("100% des fins de chantiers ou livraisons font l'objet d'un PV signe", "100 % obligatoire", "Audit bimensuel par la comptabilite"),
        ("Delai moyen entre la date du PV et l'emission de la facture finale", "<= 24 heures", "Process de facturation au fil de l'eau"),
        ("Taux de contestation client apres reception signee", "<= 1 % des dossiers", "Recours au PV contradictoire signe"),
        ("Plafond des reserves respecte a 5% maximum du montant total", "100 % respecte", "Refus formel de blocage integral")
    ]
    add_audit_checklist_box(doc, criteria)
    
    out_path = os.path.join(GUIDES_DIR, "OUTIL_02_PV_RECETTE_ET_FACTURATION_GUIDE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

# ==============================================================================
# OUTIL 03 : CHASSE AUX AVOIRS & TRAITEMENT DES LITIGES CLIENTS
# ==============================================================================
def generate_tool_03_template():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 03", "CHASSE AUX AVOIRS & TRAITEMENT DES LITIGES CLIENTS", "TEMPLATE OPERATIONNEL")
    
    add_cash_counter_box(
        doc,
        "Encadrement strict des avoirs commerciaux et refacturation integrale des prejudices causes par les tiers",
        "Total des avoirs emis (Compte 709) & Montant des remboursements obtenus aupres des partenaires",
        "Resultat net preserve = Baisse des avoirs accordes + Montant des notes de debit encaissees"
    )
    
    add_section_header(doc, "1. IDENTIFICATION DU LITIGE CLIENT & ENJEU FINANCIER")
    meta = {
        "Numero de Fiche Litige :" : "[ Ex: LIT-2026-042 ]",
        "Facture Initiale Concernee :" : "[ Ex: FAC-2026-0310 - Montant : 8 400 EUR HT ]",
        "Client / Raison Sociale :" : "[ Raison Sociale du Client ]",
        "Commercial / Charge d'Affaires :" : "[ Nom du Commercial referent ]",
        "Montant de l'Avoir Demande par le Client :" : "[ Ex: 1 200,00 EUR HT ]",
        "Marge Nette Initiale de l'Affaire :" : "[ Ex: 1 680,00 EUR HT (20%) ]"
    }
    add_metadata_box(doc, meta)
    
    add_section_header(doc, "2. DIAGNOSTIC FINANCIER DU LITIGE (ARBRE DES CAUSES)")
    headers_diag = ["ORIGINE DE LA DEFAILLANCE", "DESCRIPTION DU FAIT GENERATEUR", "RESPONSABLE", "COUT REEL SUPPORTE"]
    col_w_diag = [2800, 3800, 2000, 1600]
    rows_diag = [
        ["Erreur Chiffrage / Commercial", "Mauvaise comprehension du besoin, option vendue non conforme", "Commercial", "350 EUR HT"],
        ["Defaut Fabrication Atelier", "Cote hors tolerance detectee a l'assemblage chez le client", "Atelier usinage", "520 EUR HT"],
        ["Avarie Transport / Logistique", "Casse durant l'acheminement, choc lateral cariste", "Transporteur X", "650 EUR HT (Recours)"],
        ["Non-conformite Matiere Fournisseur", "Defaut d'aspect sur toles laquees en provenance fournisseur", "Fournisseur Y", "800 EUR HT (Recours)"],
        ["Exigence Abusive Client", "Client contestant le rendu esthetique conforme aux plans valides", "Client", "0 EUR (Refus avoir)"]
    ]
    format_word_table(doc, headers_diag, rows_diag, col_widths_dxa=col_w_diag, center_cols=[0, 2, 3])
    
    add_section_header(doc, "3. BAREME DE CONTRE-OFFRE SANS DESTRUCTION DE CASH")
    headers_neg = ["NIVEAU", "SOLUTION ALTERNATIVE A L'AVOIR EN CASH", "IMPACT SUR LA TRESORERIE", "APPLICABLE ?"]
    col_w_neg = [1200, 4800, 2600, 1600]
    rows_neg = [
        ["Rang 1", "Reprise / Retouche technique immediate par nos equipes sur site", "Cout main-d'œuvre interne uniquement", "SOLUTION PRIORITAIRE"],
        ["Rang 2", "Avoir partiel sous forme de Bon d'Achat a valoir sur future commande", "Zero sortie de tresorerie immediate", "OPTION COMMERCIALE"],
        ["Rang 3", "Remplacement standard de la piece defectueuse a prix coutant", "Preservation du solde principal de facture", "OPTION ACCEPTEE"],
        ["Rang 4", "Recours contre le tiers responsable (Transporteur ou Fournisseur)", "Remboursement a 100% de la perte", "DOSSIER ASSURANCE"],
        ["Rang 5", "Avoir financier direct sur facture en cours", "Destruction pure et simple de tresorerie", "DERNIER RECOURS"]
    ]
    format_word_table(doc, headers_neg, rows_neg, col_widths_dxa=col_w_neg, center_cols=[0, 3])
    
    add_section_header(doc, "4. CIRCUIT D'ARBITRAGE ET DE DECISION DE L'AVOIR")
    headers_dec = ["SEUIL D'AUTORISATION", "MONTANT LIMITE", "POUVOIR DE SIGNATURE", "DECISION RETENUE"]
    col_w_dec = [2600, 2200, 2800, 2600]
    rows_dec = [
        ["Avoir Mineur (Erreur facturation)", "< 150 EUR HT", "Responsable Facturation", "ACCORD / REFUS"],
        ["Avoir Commercial Negocie", "150 EUR a 500 EUR HT", "Responsable Commercial", "ACCORD / REFUS"],
        ["Avoir Majeur ou Litige Technique", "> 500 EUR HT", "Direction Generale Uniquement", "ACCORD DIRECTION"]
    ]
    format_word_table(doc, headers_dec, rows_dec, col_widths_dxa=col_w_dec, center_cols=[1, 2, 3])
    
    add_section_header(doc, "5. VALIDATION HIERARCHIQUE DE LA FICHE LITIGE")
    signoff = ["CHARGE DE CLIENTELE / LITIGE", "RESPONSABLE COMMERCIAL", "DIRECTION GENERALE"]
    add_validation_signoff_box(doc, signoff)
    
    add_next_steps_box(doc, [
        "Tout recours transporteur ou fournisseur doit etre envoye sous 48h en LRAR ou portail dedie.",
        "Si l'avoir est refuse : adresser au client une reponse argumentee et professionnelle sous 24h.",
        "Si l'avoir est accorde : enregistrer l'avoir en comptabilite avec code motif obligatoire.",
        "Analyser en reunion de direction chaque mois le total cumule des avoirs emis par motif."
    ])
    
    out_path = os.path.join(TEMPLATES_DIR, "OUTIL_03_CHASSE_AUX_AVOIRS_ET_LITIGES_TEMPLATE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

def generate_tool_03_guide():
    doc = create_base_document()
    add_header_brand(doc, "OUTIL 03", "CHASSE AUX AVOIRS & TRAITEMENT DES LITIGES CLIENTS", "GUIDE METHODOLOGIQUE")
    
    add_why_box(
        doc,
        [
            "Preservation immediate du resultat net de l'entreprise : chaque euro d'avoir economise est 1 euro de benefice.",
            "Fin de la culture du 'geste commercial de facilite' consenti au detriment de l'entreprise.",
            "Recuperation systematique des couts aupres des vrais coupables (transporteurs et fournisseurs defaillants).",
            "Identification des clients chroniquement toxiques qui contestent systematiquement pour obtenir des remises."
        ],
        [
            "Emission d'avoirs incontrôlés par les commerciaux pour masquer leurs propres erreurs de négociation.",
            "Perte d'exploitation dramatique : une PME a 5% de marge nette doit vendre 20 000 EUR pour combler 1 000 EUR d'avoir.",
            "Non-recours aupres des transporteurs qui brisent les marchandises en toute impunite.",
            "Degradation de la valeur percue : un client a qui l'on accorde trop facilement un avoir considere que vos prix etaient gonfles."
        ]
    )
    
    add_consultant_box(
        doc,
        "Le consultant doit apprendre a l'equipe commerciale a defendre la marge comme s'il s'agissait de leur propre compte bancaire.",
        [
            ("Interdire les avoirs verbaux", "Aucun avoir ne doit etre promis a un client au telephone sans fiche d'instruction ecrite."),
            ("La pyramide de reponse", "Prioriser toujours la reparation technique ou le bon d'achat avant d'envisager le moindre avoir financier."),
            ("Faire payer les tiers", "Si le transporteur a casse le colis, actionner la reserve sur lettre de voiture sous 3 jours; ne pas faire supporter la perte a l'entreprise."),
            ("Le bilan mensuel de la honte", "Afficher chaque mois le montant total des avoirs emis ventile par responsable et cause.")
        ]
    )
    
    add_guide_box(
        doc,
        [
            "Parametrer le logiciel comptable/ERP : bloquer la creation d'un avoir sans saisie d'un code motif et d'une fiche validee.",
            "Mettre en place la matrice de delegation : les commerciaux ne peuvent signer aucun avoir superieur a 150 EUR.",
            "Creer le formulaire reflexe 'Recours Transporteur/Fournisseur' avec photos obligatoires a reception.",
            "Former les commerciaux a l'art de dire NON poliment mais fermement aux demandes de remises opportunistes."
        ]
    )
    
    add_case_study_box(
        doc,
        "PME Negoce Technique & Fournitures Batiment (14 salaries - CA : 4,2 M EUR)",
        "L'entreprise emettait plus de 52 000 EUR d'avoirs par an (soit 1,2% du CA). Les commerciaux utilisaient les avoirs pour calmer les clients sans chercher la cause des retards ou des erreurs de reference.",
        "Deploiement de l'Outil 03 : verrouillage informatique de l'emission des avoirs, obligation d'un visa de la DG au-dela de 300 EUR et refacturation systematique des litiges transporteurs aux prestataires logistiques.",
        "Le montant total des avoirs a chute de 52 000 EUR a 14 600 EUR en 12 mois. 18 200 EUR ont ete directement recuperes aupres des transporteurs. Gain net de tresorerie : +37 400 EUR."
    )
    
    add_section_header(doc, "GRILLE D'AUTO-EVALUATION DE LA MAÎTRISE DES AVOIRS")
    criteria = [
        ("Taux d'avoirs emis par rapport au Chiffre d'Affaires total", "<= 0,5 % du CA", "Audit mensuel comptabilite"),
        ("100% des avoirs > 500 EUR ont recu la signature prealable de la DG", "100 % obligatoire", "Verrouillage acces ERP"),
        ("Taux de recouvrement des litiges aupres des transporteurs/fournisseurs", ">= 75 % du prejudice", "Suivi des dossiers d'assurance"),
        ("Reunion mensuelle d'analyse des causes de litiges tenue", "12 par an", "Mise en place d'actions preventives")
    ]
    add_audit_checklist_box(doc, criteria)
    
    out_path = os.path.join(GUIDES_DIR, "OUTIL_03_CHASSE_AUX_AVOIRS_ET_LITIGES_GUIDE.docx")
    doc.save(out_path)
    print(f"Generated: {out_path}")

if __name__ == "__main__":
    print("Generating FLUX 1 Tools...")
    generate_tool_01_template()
    generate_tool_01_guide()
    generate_tool_02_template()
    generate_tool_02_guide()
    generate_tool_03_template()
    generate_tool_03_guide()
    print("FLUX 1 generated successfully.")
