import os

html_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_3_OPERATIONS_ATELIER_QUALITE/HTML"
md_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_3_OPERATIONS_ATELIER_QUALITE/MD"

os.makedirs(html_dir, exist_ok=True)
os.makedirs(md_dir, exist_ok=True)

def get_common_head(title):
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} | Cabinet Delacour</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    :root {{
      --sb-green-dark: #152822;
      --sb-green-light: #4A6C5C;
      --sb-beige: #F0EAD6;
      --sb-cream: #F9F9F7;
      --sb-gold: #C5A065;
      --sb-accent: #E2DCCC;
      --sb-why-bg: #FDFBF7;
      --sb-themes-bg: #F7F9F8;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Montserrat', sans-serif;
      background-color: var(--sb-cream);
      color: var(--sb-green-dark);
      line-height: 1.6;
      padding: 24px;
    }}
    .container {{
      max-width: 1080px;
      margin: 0 auto;
      background: #FFFFFF;
      padding: 32px;
      border-radius: 4px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }}
    .header-banner {{
      background-color: var(--sb-green-dark);
      border-bottom: 4px solid var(--sb-gold);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 2px;
      margin-bottom: 24px;
    }}
    .brand-container {{ display: flex; align-items: center; gap: 16px; }}
    .brand-text {{ display: flex; flex-direction: column; }}
    .brand-cabinet {{ color: var(--sb-beige); font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; line-height: 1.1; }}
    .brand-delacour {{ color: #FFFFFF; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; line-height: 1.1; }}
    .header-tagline {{ color: var(--sb-beige); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em; opacity: 0.9; }}
    
    .tool-title-box {{
      background-color: var(--sb-cream);
      border-left: 5px solid var(--sb-gold);
      border-top: 1px solid var(--sb-accent);
      border-right: 1px solid var(--sb-accent);
      border-bottom: 1px solid var(--sb-accent);
      padding: 16px 20px;
      margin-bottom: 24px;
    }}
    .tool-meta {{ color: var(--sb-gold); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }}
    .tool-title {{ font-family: 'Playfair Display', serif; color: var(--sb-green-dark); font-size: 22px; font-weight: 700; }}
    
    .consultant-themes-box {{
      background-color: var(--sb-themes-bg);
      border: 1px solid var(--sb-accent);
      border-left: 5px solid var(--sb-green-light);
      padding: 20px;
      margin-bottom: 24px;
    }}
    .box-title {{ font-family: 'Playfair Display', serif; color: var(--sb-green-dark); font-size: 15px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; }}
    .consultant-posture {{ font-size: 13px; font-style: italic; margin-bottom: 16px; color: var(--sb-green-dark); }}
    .themes-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
    .theme-card {{ background: #FFFFFF; border: 1px solid var(--sb-accent); padding: 12px; border-radius: 2px; }}
    .theme-card-title {{ font-family: 'Playfair Display', serif; font-size: 13px; font-weight: 700; color: var(--sb-green-dark); margin-bottom: 4px; }}
    .theme-card-body {{ font-size: 12px; color: var(--sb-green-dark); }}
    
    .why-box {{
      background-color: var(--sb-why-bg);
      border: 1px solid var(--sb-gold);
      padding: 20px;
      margin-bottom: 24px;
    }}
    .why-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }}
    .why-column h4 {{ font-family: 'Playfair Display', serif; font-size: 13px; font-weight: 700; margin-bottom: 8px; }}
    .why-gains h4 {{ color: #1B5E20; }}
    .why-risques h4 {{ color: #B71C1C; }}
    .why-column ul {{ list-style: none; }}
    .why-column li {{ font-size: 12px; margin-bottom: 6px; position: relative; padding-left: 14px; }}
    .why-column li::before {{ content: "•"; position: absolute; left: 0; font-weight: bold; }}
    
    .guide-box {{
      background: #FFFFFF;
      border: 1px solid var(--sb-accent);
      border-left: 5px solid var(--sb-green-dark);
      padding: 20px;
      margin-bottom: 24px;
    }}
    .guide-steps {{ margin-top: 10px; }}
    .guide-step {{ font-size: 12.5px; margin-bottom: 8px; }}
    .guide-step-num {{ font-weight: 700; color: var(--sb-green-dark); }}
    
    .section-subtitle {{
      font-family: 'Playfair Display', serif;
      background-color: var(--sb-themes-bg);
      border-left: 4px solid var(--sb-green-dark);
      padding: 10px 14px;
      font-size: 15px;
      font-weight: 700;
      color: var(--sb-green-dark);
      margin: 28px 0 16px 0;
    }}
    
    table.data-table {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 12px;
    }}
    table.data-table th {{
      background-color: var(--sb-green-dark);
      color: #FFFFFF;
      text-align: left;
      padding: 10px 12px;
      font-weight: 600;
      border: 1px solid var(--sb-green-dark);
    }}
    table.data-table td {{
      padding: 8px 12px;
      border: 1px solid var(--sb-accent);
    }}
    table.data-table tr:nth-child(even) td {{ background-color: var(--sb-cream); }}
    .fillable {{ font-weight: 700; font-style: italic; color: var(--sb-gold); }}
    
    .next-steps-box {{
      background-color: var(--sb-cream);
      border: 1px solid var(--sb-gold);
      border-left: 5px solid var(--sb-green-dark);
      padding: 20px;
      margin-top: 24px;
    }}
    .next-steps-box ul {{ list-style: none; margin-top: 8px; }}
    .next-steps-box li {{ font-size: 12px; color: var(--sb-green-dark); margin-bottom: 6px; padding-left: 14px; position: relative; }}
    .next-steps-box li::before {{ content: "•"; position: absolute; left: 0; font-weight: bold; color: var(--sb-gold); }}
    
    .footer-bar {{
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid var(--sb-accent);
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #787878;
      font-style: italic;
    }}
  </style>
</head>
<body>
<div class="container">
  <div class="header-banner">
    <div class="brand-container">
      <svg width="40" height="35" viewBox="0 0 100 87" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 3L97 84H3L50 3Z" stroke="#F0EAD6" stroke-width="5"/>
        <path d="M50 25L78 74H22L50 25Z" stroke="#F0EAD6" stroke-width="4"/>
        <path d="M50 49L52 55L58 57L52 59L50 65L48 59L42 57L48 55L50 49Z" fill="#C5A065"/>
      </svg>
      <div class="brand-text">
        <span class="brand-cabinet">Cabinet</span>
        <span class="brand-delacour">Delacour</span>
      </div>
    </div>
    <div class="header-tagline">STRATÉGIE & PERFORMANCE QHSE</div>
  </div>
"""

COMMON_FOOTER = """
  <div class="footer-bar">
    <div>Cabinet Delacour - delacour.melchior@cabinetdelacour.com</div>
    <div>Page 1 / 1</div>
  </div>
</div>
</body>
</html>
"""

# HTML GENERATOR DATA FOR SEQUENCE 3
tools_html_data = [
    ("START_HERE_SEQUENCE_3.html", "Guide de Démarrage Séquence 3", "NOTICE CLIENT — OPÉRATIONS & QUALITÉ", "Guide de Démarrage Client Autonome (Parcours 5 Jours)", "Bienvenue dans votre Kit d'Outils Qualité Séquence 3. Cette séquence structure le cœur opérationnel de votre entreprise : de la cartographie des processus à la méthode des 5 Pourquoi.", [
        ("1. Cartographie & Interactions", "Modéliser le fonctionnement global et les échanges inter-services."),
        ("2. Maintenance & Instructions Visuelles", "Planifier la maintenance préventive et afficher les fiches réflexes au poste."),
        ("3. Jalons Conception & Traçabilité", "Valider les étapes BE et tracer chaque lot de fabrication."),
        ("4. PV Recette, Isolement & 5 Pourquoi", "Délivrer le PV de libération, isoler les NC et stopper la récidive.")
    ]),
    ("OUTIL_11_CARTOGRAPHIE_PROCESSUS.html", "OUTIL 11 - Cartographie des Processus", "OUTIL 11 — Clause ISO 9001:2015 - 4.4 - Question Q11", "Cartographie Macro des Processus & Fiches d'Identité", "Définissez clairement l'enchaînement de vos activités en 3 familles : Pilotage, Réalisation et Support. Désignez un Pilote unique par processus.", [
        ("1. Processus de Pilotage", "Management Stratégique, Management Qualité & Amélioration Continue."),
        ("2. Processus de Réalisation", "Commercial, Bureau d'Études, Achats, Fabrication & Livraison."),
        ("3. Processus de Support", "Ressources Humaines, Maintenance Équipements, Système d'Information."),
        ("4. Fiche d'Identité Processus", "Entrées, Sorties, Indicateurs KPIs, Risques associés et Moyens matériels.")
    ]),
    ("OUTIL_12_INTERACTIONS_INTER_SERVICES.html", "OUTIL 12 - Interactions Inter-Services", "OUTIL 12 — Clauses ISO 9001:2015 - 4.4.1 & 8.5.1 - Question Q12", "Fiches d'Interactions Inter-Services (Entrées / Sorties)", "Clarifiez la donnée exacte transmise au passage de relais entre deux services, son format et son délai d'engagement.", [
        ("1. Commercial -> BE", "Transmission de la revue de devis signée et du cahier des charges client sous 24h."),
        ("2. BE -> Achats & Prod", "Nomination des références composants, diffusion du plan Indice A validé."),
        ("3. Achats -> Production", "Confirmation de la date de livraison des matières avec AR fournisseur sous 48h."),
        ("4. Prod -> Qualité/Expédition", "Transmission du dossier de lot émargé et des fiches d'autocontrôle final.")
    ]),
    ("OUTIL_13_MAINTENANCE_PREVENTIVE.html", "OUTIL 13 - Maintenance Préventive", "OUTIL 13 — Clauses ISO 9001:2015 - 7.1.3 & 8.5.1 - Question Q13", "Plan de Maintenance Préventive & Planning Équipements", "Formalisez le calendrier de maintenance préventive pour chaque machine stratégique pour éliminer les pannes soudaines.", [
        ("1. Inventaire Équipements", "Liste des machines-outils, centres d'usinage, compresseurs et ponts roulants."),
        ("2. Fréquence des Révisions", "Maintenance niveau 1 (opérateur) vs niveau 2/3 (expert technicien)."),
        ("3. Carnet d'Intervention", "Traçabilité de chaque vidange, changement de pièce et révision."),
        ("4. Indicateur MTBF", "Mesure du taux de disponibilité des équipements (objectif ≥ 98%).")
    ]),
    ("OUTIL_14_GAMMES_INSTRUCTIONS_VISUELLES.html", "OUTIL 14 - Instructions Visuelles", "OUTIL 14 — Clause ISO 9001:2015 - 8.5.1 - Question Q14", "Gammes Opératoires & Instructions Visuelles (One Point Lesson)", "Rédigez des consignes visuelles courtes avec photos OK/KO affichées directement au poste de travail.", [
        ("1. Standard Visuel", "Photos des Bons Gestes vs Gestes Interdits (OK / KO) positionnées à hauteur des yeux."),
        ("2. Paramètres Réglage", "Vitesse de coupe, pression de serrage, températures et cotes au pied à coulisse."),
        ("3. Consignes Sécurité", "EPI obligatoires et procédures d'arrêt d'urgence."),
        ("4. Fiche OPL (One Point Lesson)", "Une fiche synthétique d'une page maximum pour transmettre un standard en 2 minutes.")
    ]),
    ("OUTIL_15_JALONS_CONCEPTION_APQP.html", "OUTIL 15 - Jalons Conception APQP", "OUTIL 15 — Clause ISO 9001:2015 - 8.3 - Question Q15", "Checklist de Jalons de Conception & Développement (APQP)", "Validez les 4 jalons de conception avant d'investir dans l'outillage de production série.", [
        ("1. Jalon 1 : Faisabilité", "Validation du cahier des charges client et des marges cibles."),
        ("2. Jalon 2 : Conception 3D", "Revue de conception 3D, calculs de résistance et plans Indice A."),
        ("3. Jalon 3 : Prototypage", "Fabrication du prototype et métrologie 3D complète."),
        ("4. Jalon 4 : Qualification", "Validation des Échantillons Initiaux (EI) et accord écrit du client.")
    ]),
    ("OUTIL_16_TRAITABILITE_SUIVI_FABRICATION.html", "OUTIL 16 - Traçabilité & Suivi", "OUTIL 16 — Clause ISO 9001:2015 - 8.5.2 - Question Q16", "Fiche de Suivi de Fabrication, Traçabilité & Dossier de Lot", "Garantissez une traçabilité totale du numéro de coulée matière jusqu'au nom de l'opérateur final.", [
        ("1. N° Lot & OF", "Numéro de lot unique gravé ou étiqueté sur le produit et reporté sur le dossier."),
        ("2. Traçabilité Matière", "Certificat matière 3.1 rattaché au numéro de coulée de l'acier."),
        ("3. Émargement Étape", "Signature obligatoire de l'opérateur à la fin de chaque opération."),
        ("4. Relevé Cotes", "Enregistrement manuscrit des dimensions réelles mesurées.")
    ]),
    ("OUTIL_17_PV_RECETTE_LIBERATION.html", "OUTIL 17 - PV Recette & Libération", "OUTIL 17 — Clause ISO 9001:2015 - 8.6 - Question Q17", "Procès-Verbal (PV) de Recette, Libération & Autocontrôle Final", "Attestez formellement que 100% des contrôles requis ont été réalisés avant d'autoriser la livraison.", [
        ("1. Contrôle Dimensionnel", "Vérification des cotes critiques au moyen d'appareils étalonnés."),
        ("2. Aspect & Propreté", "Absence de bavures, de rayures et présence du traitement de surface."),
        ("3. Validation Dossier", "Vérification de la présence de toutes les signatures sur la fiche de suivi."),
        ("4. Libération Formelle", "Signature du Responsable Qualité autorisant le chargement et la facturation.")
    ]),
    ("OUTIL_18_SIGNALETIQUE_ISOLEMENT_NC.html", "OUTIL 18 - Signalétique Zone NC", "OUTIL 18 — Clause ISO 9001:2015 - 8.7 - Question Q18", "Signalétique & Fiche de Zone d'Isolement / Quarantaine NC", "Délimitez physiquement une zone rouge au sol avec des bacs rouges 'STOP NC' pour éviter tout mélange.", [
        ("1. Zone Rouge Délimitée", "Emplacement balisé au sol réservé aux pièces non conformes."),
        ("2. Étiquette STOP NC", "Fiche d'identification rouge collée sur la pièce indiquant l'interdiction de toucher."),
        ("3. Registre Quarantaine", "Traçabilité des pièces déposées et décision de la commission NC."),
        ("4. Traitement sous 48h", "Arbitrage obligatoire : Retouche, Rebut, ou Dérogation acceptée client.")
    ]),
    ("OUTIL_19_FNC_METHODE_5_POURQUOI.html", "OUTIL 19 - FNC & 5 Pourquoi", "OUTIL 19 — Clause ISO 9001:2015 - 10.2 - Question Q19", "Fiche de Non-Conformité (FNC) & Analyse des 5 Pourquoi", "Remontez jusqu'à la cause racine organisationnelle par la méthode des 5 Pourquoi pour éradiquer la récidive.", [
        ("1. Description Factuelle", "QQOQCCP sans jugement de valeur."),
        ("2. Enchaînement 5 Pourquoi", "Questionner 'Pourquoi ?' 5 fois jusqu'à identifier la faille de procédure."),
        ("3. Plan d'Action Correctif", "Action immédiate de secours + Action corrective pérenne."),
        ("4. Vérification à 30 Jours", "Vérifier sur le terrain un mois plus tard que le problème ne se réitère plus.")
    ])
]

for filename, title, meta, tool_title, posture, themes in tools_html_data:
    cards_html = ""
    for t_head, t_body in themes:
        cards_html += f"""
      <div class="theme-card">
        <div class="theme-card-title">{t_head}</div>
        <div class="theme-card-body">{t_body}</div>
      </div>"""
      
    content = get_common_head(title) + f"""
  <div class="tool-title-box">
    <div class="tool-meta">SÉQUENCE 3 - {meta}</div>
    <div class="tool-title">{tool_title}</div>
  </div>

  <div class="consultant-themes-box">
    <div class="box-title">CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER</div>
    <div class="consultant-posture">{posture}</div>
    <div class="themes-grid">
{cards_html}
    </div>
  </div>

  <div class="why-box">
    <div class="box-title">POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE ENTREPRISE ?</div>
    <div class="why-grid">
      <div class="why-column why-gains">
        <h4>Ce que vous gagnez à l'utiliser :</h4>
        <ul>
          <li>Excellence opérationnelle et maîtrise parfaite de la fabrication.</li>
          <li>Élimination des rebuts, retouches et coûts cachés d'atelier.</li>
          <li>Preuve de conformité aux exigences ISO 9001:2015.</li>
        </ul>
      </div>
      <div class="why-column why-risques">
        <h4>Ce que vous risquez sans cet outil :</h4>
        <ul>
          <li>Erreurs de fabrication en chaîne et livraisons défectueuses.</li>
          <li>Pannes brutales de machines au milieu d'une commande urgente.</li>
          <li>Non-conformités majeures lors des audits de certification ISO 9001.</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="next-steps-box">
    <div class="box-title">QUE FAIRE UNE FOIS CET OUTIL COMPLÉTÉ ?</div>
    <ul>
      <li>Diffuser les consignes et émarger les fiches en atelier.</li>
      <li>Archiver la version sous 03_OPERATIONS_PRODUCTION/.</li>
    </ul>
  </div>
""" + COMMON_FOOTER

    with open(os.path.join(html_dir, filename), "w", encoding="utf-8") as f:
        f.write(content)

# WRITE MD FILES FOR SEQUENCE 3
md_files_data = [
    ("START_HERE_SEQUENCE_3.md", "# Guide de Démarrage Séquence 3 : Opérations & Qualité\n\nParcours autonome 5 jours."),
    ("OUTIL_11_CARTOGRAPHIE_PROCESSUS.md", "# OUTIL 11 : Cartographie Macro des Processus & Fiches d'Identité\n\nClauses ISO 9001 4.4."),
    ("OUTIL_12_INTERACTIONS_INTER_SERVICES.md", "# OUTIL 12 : Fiches d'Interactions Inter-Services\n\nEntrées / Sorties inter-processus."),
    ("OUTIL_13_MAINTENANCE_PREVENTIVE.md", "# OUTIL 13 : Plan de Maintenance Préventive Équipements\n\nPlanning et carnet d'entretien."),
    ("OUTIL_14_GAMMES_INSTRUCTIONS_VISUELLES.md", "# OUTIL 14 : Gammes Opératoires Visuelles\n\nInstructions au poste One Point Lesson."),
    ("OUTIL_15_JALONS_CONCEPTION_APQP.md", "# OUTIL 15 : Checklist de Jalons de Conception (APQP)\n\nValidation des jalons BE/Prod."),
    ("OUTIL_16_TRAITABILITE_SUIVI_FABRICATION.md", "# OUTIL 16 : Fiche de Suivi de Fabrication & Traçabilité\n\nDossier de lot et certificats 3.1."),
    ("OUTIL_17_PV_RECETTE_LIBERATION.md", "# OUTIL 17 : Procès-Verbal (PV) de Recette & Libération\n\nFiche de contrôle final et décharge."),
    ("OUTIL_18_SIGNALETIQUE_ISOLEMENT_NC.md", "# OUTIL 18 : Signalétique & Fiche Zone Quarantaine NC\n\nBac rouge STOP NC et isolement."),
    ("OUTIL_19_FNC_METHODE_5_POURQUOI.md", "# OUTIL 19 : Fiche FNC & Analyse des 5 Pourquoi\n\nRecherche de la cause racine.")
]

for filename, content in md_files_data:
    with open(os.path.join(md_dir, filename), "w", encoding="utf-8") as f:
        f.write(content)

print("Successfully generated all HTML and MD files for Sequence 3!")
