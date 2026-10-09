import os

html_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_4_RH_SAVOIR_GED_IT/HTML"
md_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_4_RH_SAVOIR_GED_IT/MD"

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

# HTML GENERATOR DATA FOR SEQUENCE 4
tools_html_data = [
    ("START_HERE_SEQUENCE_4.html", "Guide de Démarrage Séquence 4", "NOTICE CLIENT — RH, GED, IT & AMÉLIORATION", "Guide de Démarrage Client Autonome (Parcours 5 Jours)", "Bienvenue dans votre Kit d'Outils Qualité Séquence 4. Cette séquence protège le capital humain de votre entreprise, élimine la dépendance aux hommes-clés et déploie le pilotage automatique.", [
        ("1. Organigramme & Matrice RACI", "Fixer les responsabilités exactes (R, A, C, I) pour chaque processus métier."),
        ("2. Polyvalence & Transmission du Savoir", "Gérer les binômes sur les postes critiques et le livret d'accueil sensibilisant aux coûts NC."),
        ("3. Conduite du Changement & Rituel Flash", "Déployer le rituel 5 minutes et piloter les projets de transition."),
        ("4. Classement GED, KPIs & Audit Interne", "Retrouver tout document en 30 secondes, automatiser les dashboards et programmer l'audit annuel.")
    ]),
    ("OUTIL_20_ORGANIGRAMME_RACI.html", "OUTIL 20 - Organigramme & RACI", "OUTIL 20 — Clause ISO 9001:2015 - 5.3 - Question Q20", "Organigramme Fonctionnel & Matrice RACI Globale", "Supprimez les zones d'ombre sur la responsabilité des tâches métiers. Utilisez la matrice RACI avec un Approbateur unique (A) par tâche.", [
        ("1. R = Réalisateur (Responsible)", "La personne qui réalise concrètement le travail."),
        ("2. A = Approbateur Unique (Accountable)", "Le seul responsable final qui répond du résultat."),
        ("3. C = Consulté (Consulted)", "L'expert sollicité avant la prise de décision."),
        ("4. I = Informé (Informed)", "Les collaborateurs tenus informés des décisions.")
    ]),
    ("OUTIL_21_CONDUITE_DU_CHANGEMENT.html", "OUTIL 21 - Conduite du Changement", "OUTIL 21 — Clause ISO 9001:2015 - 6.3 - Question Q21", "Plan de Conduite du Changement & Projets de Transition", "Anticipez les risques humains, techniques et organisationnels lors des évolutions d'outils ERP, réorganisations ou déménagements.", [
        ("1. Analyse d'Impact", "Évaluer les conséquences du projet sur les équipes et les outils."),
        ("2. Plan de Communication", "Expliquer le 'Pourquoi' du changement et écouter les équipes."),
        ("3. Accompagnement & Formation", "Former individuellement chaque utilisateur sur son nouvel outil."),
        ("4. Suivi d'Adhésion", "Mesurer le taux d'adoption et ajuster l'accompagnement.")
    ]),
    ("OUTIL_22_MATRICE_COMPETENCES_POLYVALENCE.html", "OUTIL 22 - Matrice Compétences Polyvalence", "OUTIL 22 — Clause ISO 9001:2015 - 7.2 - Question Q22", "Matrice des Compétences & Polyvalence (Gestion Binômes)", "Supprimez définitivement la vulnérabilité liée à l'homme-clé ! Évaluez la polyvalence et organisez des binômes formés.", [
        ("1. Échelle 4 Niveaux", "1 = Néophyte / 2 = Autonome sous contrôle / 3 = Autonome / 4 = Expert."),
        ("2. Détection Hommes-Clés", "Repérer les postes où un seul salarié détient le niveau 3 ou 4."),
        ("3. Plan de Polyvalence", "Organiser des formations croisées pour avoir 2 autonomes par poste."),
        ("4. Entretien Annuel", "Mise à jour annuelle des compétences et du plan de formation.")
    ]),
    ("OUTIL_23_LIVRET_ACCUEIL_SENSIBILISATION_NC.html", "OUTIL 23 - Livret d'Accueil & Coûts NC", "OUTIL 23 — Clause ISO 9001:2015 - 7.3 - Question Q23", "Livret d'Accueil Salarié & Sensibilisation aux Coûts NC", "Sensibilisez chaque nouveau collaborateur dès son premier jour à l'impact financier direct des erreurs et du gaspillage.", [
        ("1. Charte Qualité", "Présentation de l'engagement zéro gaspillage."),
        ("2. Impact Financier", "Démontrer qu'une pièce jetée coûte 10 fois plus cher que la correction."),
        ("3. Sécurité & EPI", "Port obligatoire des EPI, tri des déchets et propreté."),
        ("4. Émargement Livret", "Fiche de confirmation de remise du livret signée par le salarié.")
    ]),
    ("OUTIL_24_REUNION_FLASH_COMMUNICATION.html", "OUTIL 24 - Réunion Flash 5 min", "OUTIL 24 — Clause ISO 9001:2015 - 7.4 - Question Q24", "Trame de Réunion Flash (5 min) & Communication Interne", "Instaurez le rituel de la Réunion Flash de 5 minutes debout chaque lundi matin pour transmettre l'information essentielle.", [
        ("1. Rituel Court (5 min)", "Réunion debout au tableau d'affichage à heure fixe."),
        ("2. Ordre du Jour 3 Points", "Sécurité / Qualité & Réclamations / Objectifs prod."),
        ("3. Parole aux Équipes", "Remontée rapide des blocages matériels ou des idées."),
        ("4. Relevé de Décisions", "Noter immédiatement l'action retenue avec le responsable.")
    ]),
    ("OUTIL_25_ARBORESCENCE_GED_SIMPLIFIEE.html", "OUTIL 25 - Arborescence GED Simplifiée", "OUTIL 25 — Clause ISO 9001:2015 - 7.5 - Question Q25", "Plan de Classement & Arborescence GED Simplifiée", "Normalisez le classement de vos fichiers sur serveur ou Cloud pour retrouver tout document en moins de 30 secondes.", [
        ("1. Structure 4 Dossiers", "01_DIRECTION / 02_VENTES_ACHATS / 03_OPERATIONS / 04_RH_GED_IT."),
        ("2. Nommage Standard", "CodeOutil_NomDocument_YYYYMMDD_vX.ext."),
        ("3. Droits d'Accès", "Seul le pilote du processus modifie les modèles officiels."),
        ("4. Archivage Automatique", "Déplacement des anciennes versions sous _ARCHIVES/.")
    ]),
    ("OUTIL_26_DASHBOARD_KPIS_AUTOMATISE.html", "OUTIL 26 - Dashboard KPIs Automatisé", "OUTIL 26 — Clause ISO 9001:2015 - 9.1.3 - Question Q26", "Spécifications & Trame de Dashboard KPIs Automatisé", "Connectez vos KPIs directement aux données d'origine (Excel dynamique / PowerBI / ERP) pour un pilotage automatique.", [
        ("1. Flux Automatiques", "Liaison directe sans resaisie manuelle."),
        ("2. 5 KPIs Incontournables", "Marge Brute / Taux OTD / Conformité / NPS / FNC."),
        ("3. Alertes Visuelles", "Code couleur dynamique (Vert / Orange / Rouge)."),
        ("4. Agilité Décisionnelle", "Dashboard accessible en un clic pour arbitrage.")
    ]),
    ("OUTIL_27_PLANNING_TRAME_AUDIT_INTERNE.html", "OUTIL 27 - Programme & Audit Interne", "OUTIL 27 — Clause ISO 9001:2015 - 9.2 - Question Q27", "Programme Annuel & Trame d'Audit Interne SMQ", "Réalisez un audit interne rigoureux une fois par an pour vérifier la robustesse de votre organisation avant l'audit ISO 9001.", [
        ("1. Programme Annuel", "Planning d'intervention couvrant toutes les clauses ISO 9001."),
        ("2. Équipe Indépendante", "Auditeurs internes formés et indépendants du processus audité."),
        ("3. Trame de Rapport", "Constats factuels classés en Points Forts, Pistes, NC Mineures/Majeures."),
        ("4. Plan d'Action", "Actions correctives associées à chaque écart constaté.")
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
    <div class="tool-meta">SÉQUENCE 4 - {meta}</div>
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
          <li>Souveraineté totale du savoir-faire et pérennité de l'organisation.</li>
          <li>Pilotage automatique par la data et zéro perte de temps en classement.</li>
          <li>Garantie de réussite à 100% lors des audits ISO 9001:2015.</li>
        </ul>
      </div>
      <div class="why-column why-risques">
        <h4>Ce que vous risquez sans cet outil :</h4>
        <ul>
          <li>Dépendance critique aux hommes-clés et perte irréparable de compétences.</li>
          <li>Tableaux de bord jamais à jour et perte de temps en recherche documentaire.</li>
          <li>Non-conformités majeures lors des audits de certification ISO 9001.</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="next-steps-box">
    <div class="box-title">QUE FAIRE UNE FOIS CET OUTIL COMPLÉTÉ ?</div>
    <ul>
      <li>Diffuser et valider la trame avec l'équipe de direction.</li>
      <li>Archiver la version sous 04_RH_SAVOIR_GED_IT/.</li>
    </ul>
  </div>
""" + COMMON_FOOTER

    with open(os.path.join(html_dir, filename), "w", encoding="utf-8") as f:
        f.write(content)

# WRITE MD FILES FOR SEQUENCE 4
md_files_data = [
    ("START_HERE_SEQUENCE_4.md", "# Guide de Démarrage Séquence 4 : RH, GED, IT & Amélioration\n\nParcours autonome 5 jours."),
    ("OUTIL_20_ORGANIGRAMME_RACI.md", "# OUTIL 20 : Organigramme Fonctionnel & Matrice RACI Globale\n\nClause ISO 9001 5.3."),
    ("OUTIL_21_CONDUITE_DU_CHANGEMENT.md", "# OUTIL 21 : Plan de Conduite du Changement\n\nClause ISO 9001 6.3."),
    ("OUTIL_22_MATRICE_COMPETENCES_POLYVALENCE.md", "# OUTIL 22 : Matrice des Compétences & Polyvalence\n\nClause ISO 9001 7.2."),
    ("OUTIL_23_LIVRET_ACCUEIL_SENSIBILISATION_NC.md", "# OUTIL 23 : Livret d'Accueil & Sensibilisation Coûts NC\n\nClause ISO 9001 7.3."),
    ("OUTIL_24_REUNION_FLASH_COMMUNICATION.md", "# OUTIL 24 : Trame de Réunion Flash (5 min) & Communication\n\nClause ISO 9001 7.4."),
    ("OUTIL_25_ARBORESCENCE_GED_SIMPLIFIEE.md", "# OUTIL 25 : Plan de Classement & Arborescence GED Simplifiée\n\nClause ISO 9001 7.5."),
    ("OUTIL_26_DASHBOARD_KPIS_AUTOMATISE.md", "# OUTIL 26 : Spécifications & Trame Dashboard KPIs Automatisé\n\nClause ISO 9001 9.1.3."),
    ("OUTIL_27_PLANNING_TRAME_AUDIT_INTERNE.md", "# OUTIL 27 : Programme Annuel & Trame d'Audit Interne SMQ\n\nClause ISO 9001 9.2.")
]

for filename, content in md_files_data:
    with open(os.path.join(md_dir, filename), "w", encoding="utf-8") as f:
        f.write(content)

print("Successfully generated all HTML and MD files for Sequence 4!")
