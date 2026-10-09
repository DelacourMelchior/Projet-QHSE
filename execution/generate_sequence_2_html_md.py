import os

html_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_2_VENTES_MARGES_ACHATS/HTML"
md_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_2_VENTES_MARGES_ACHATS/MD"

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

# HTML 1: START HERE SEQUENCE 2
start_here_html = get_common_head("Guide de Démarrage Séquence 2") + """
  <div class="tool-title-box">
    <div class="tool-meta">SÉQUENCE 2 - NOTICE CLIENT — VENTES, MARGES & ACHATS</div>
    <div class="tool-title">Guide de Démarrage Client Autonome (Parcours 3 Jours)</div>
  </div>

  <div class="consultant-themes-box">
    <div class="box-title">CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER</div>
    <div class="consultant-posture">Bienvenue dans votre Kit d'Outils Qualité Séquence 2. Cette séquence sécurise le cœur financier de votre entreprise : la rentabilité brute de vos devis et la fiabilité de vos fournisseurs.</div>
    <div class="themes-grid">
      <div class="theme-card">
        <div class="theme-card-title">1. Validation Obligatoire Devis</div>
        <div class="theme-card-body">Imposer une revue systématique des offres > 10k€ pour ne signer aucune affaire à perte.</div>
      </div>
      <div class="theme-card">
        <div class="theme-card-title">2. Évaluation des Fournisseurs</div>
        <div class="theme-card-body">Noter les prestataires critiques sur des faits réels (Qualité, Délais OTD, Réactivité).</div>
      </div>
      <div class="theme-card">
        <div class="theme-card-title">3. Registre & NPS Clients</div>
        <div class="theme-card-body">Accuser réception de toute réclamation sous 24h et mesurer votre score NPS.</div>
      </div>
      <div class="theme-card">
        <div class="theme-card-title">4. Archivage dans la GED</div>
        <div class="theme-card-body">Enregistrer les grilles signées sous 02_VENTES_MARGES_ACHATS/.</div>
      </div>
    </div>
  </div>

  <div class="why-box">
    <div class="box-title">POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE ENTREPRISE ?</div>
    <div class="why-grid">
      <div class="why-column why-gains">
        <h4>Ce que vous gagnez à l'utiliser :</h4>
        <ul>
          <li>Protection immédiate du taux de marge brute (cible ≥ 35%).</li>
          <li>Élimination des retards de livraison dus aux défaillances fournisseurs.</li>
          <li>Fidélisation renforcée de vos clients grands comptes.</li>
        </ul>
      </div>
      <div class="why-column why-risques">
        <h4>Ce que vous risquez sans cet outil :</h4>
        <ul>
          <li>Signer des marchés déficitaires qui bloquent l'atelier à perte.</li>
          <li>Arrêt de production sur livraison de matières non conformes.</li>
          <li>Pertes de clients stratégiques suite à des réclamations non traitées.</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="section-subtitle">VOTRE PARCOURS AUTONOME EN 3 JOURS</div>

  <table class="data-table">
    <thead>
      <tr>
        <th>Jalon Chronologique</th>
        <th>Action Opérationnelle & Objectif</th>
        <th>Document & Fichier Associé</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>JOUR 1 : SÉCURISATION DES DEVIS (25 MIN)</strong></td>
        <td>Mettez en place la checklist de validation obligatoire des devis complexes.</td>
        <td class="fillable">OUTIL_08_REVUE_DEVIS_CONTRATS.docx</td>
      </tr>
      <tr>
        <td><strong>JOUR 2 : ÉVALUATION FOURNISSEURS (20 MIN)</strong></td>
        <td>Notez vos 3 principaux fournisseurs et sous-traitants d'achats critiques.</td>
        <td class="fillable">OUTIL_09_EVALUATION_FOURNISSEURS.docx</td>
      </tr>
      <tr>
        <td><strong>JOUR 3 : RECLAMATIONS & NPS (20 MIN)</strong></td>
        <td>Renseignez le registre des réclamations et mesurez votre score NPS client.</td>
        <td class="fillable">OUTIL_10_RECLAMATIONS_NPS_CLIENT.docx</td>
      </tr>
    </tbody>
  </table>

  <div class="next-steps-box">
    <div class="box-title">QUE FAIRE UNE FOIS CET OUTIL COMPLÉTÉ ?</div>
    <ul>
      <li>Transmettre vos grilles complétées au Cabinet Delacour.</li>
      <li>Archiver les versions sous 02_VENTES_MARGES_ACHATS/.</li>
    </ul>
  </div>
""" + COMMON_FOOTER

# HTML 2: OUTIL 08
outil_08_html = get_common_head("OUTIL 08 - Revue Devis & Contrats") + """
  <div class="tool-title-box">
    <div class="tool-meta">SÉQUENCE 2 - OUTIL 08 — Clause ISO 9001:2015 - 8.2 - Question Q8</div>
    <div class="tool-title">Grille de Revue de Devis, Offres & Contrats (Checklist Marge & Faisabilité)</div>
  </div>

  <div class="consultant-themes-box">
    <div class="box-title">CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER</div>
    <div class="consultant-posture">Exigez une validation formelle avant la signature de tout devis > 10 000 € ou présentant une exigence technique spécifique. Ne signez aucune affaire en dessous de votre seuil de marge brute cible (35%).</div>
    <div class="themes-grid">
      <div class="theme-card">
        <div class="theme-card-title">1. Marge Brute & Chiffrage</div>
        <div class="theme-card-body">Vérification du coût réel des matières (avec inflation +15%), heures sous-traitance et frais de transport.</div>
      </div>
      <div class="theme-card">
        <div class="theme-card-title">2. Faisabilité & Délais</div>
        <div class="theme-card-body">Confirmation de la capacité des machines et des heures atelier disponibles par le Chef de Production.</div>
      </div>
      <div class="theme-card">
        <div class="theme-card-title">3. Conditions de Règlement</div>
        <div class="theme-card-body">Acompte de 30% exigé à la commande, vérification de la solvabilité du nouveau client.</div>
      </div>
      <div class="theme-card">
        <div class="theme-card-title">4. Exigences Particulières</div>
        <div class="theme-card-body">Certificats matières 3.1, contrôle 3D, emballage spécifique, pénalités de retard plafonnées à 5% max.</div>
      </div>
    </div>
  </div>

  <div class="why-box">
    <div class="box-title">POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE ENTREPRISE ?</div>
    <div class="why-grid">
      <div class="why-column why-gains">
        <h4>Ce que vous gagnez à l'utiliser :</h4>
        <ul>
          <li>Élimination des affaires conclues à perte avant lancement en fabrication.</li>
          <li>Sécurisation du résultat d'exploitation et de la trésorerie.</li>
          <li>Preuve N°1 de maîtrise du processus commercial (ISO 9001 Clause 8.2).</li>
        </ul>
      </div>
      <div class="why-column why-risques">
        <h4>Ce que vous risquez sans cet outil :</h4>
        <ul>
          <li>Projets déficitaires bloquant l'atelier pendant des semaines.</li>
          <li>Litiges contractuels coûteux sur exigences clients mal comprises.</li>
          <li>Non-conformité majeure d'audit ISO 9001 (Clause 8.2).</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="guide-box">
    <div class="box-title">GUIDE DE REMPLISSAGE PAS À PAS (4 ÉTAPES)</div>
    <div class="guide-steps">
      <div class="guide-step"><span class="guide-step-num">Étape 1 :</span> Ouvrir la grille pour tout devis ou contrat dont le montant est > 10 000 € HT.</div>
      <div class="guide-step"><span class="guide-step-num">Étape 2 :</span> Vérifier les 5 points de contrôle obligatoires (Marge, Faisabilité, Délais, Règlement, Exigences).</div>
      <div class="guide-step"><span class="guide-step-num">Étape 3 :</span> Faire apposer les visas du Responsable Commercial et du Responsable Production/BE.</div>
      <div class="guide-step"><span class="guide-step-num">Étape 4 :</span> Consigner l'accord dans le registre et archiver avec l'offre commerciale.</div>
    </div>
  </div>

  <div class="section-subtitle">CHECKLIST DE VALIDATION OBLIGATOIRE DE DEVIS PRÊTE À REMPLIR</div>

  <table class="data-table">
    <thead>
      <tr>
        <th>N°</th>
        <th>Point de Contrôle Stratégique</th>
        <th>Exigence / Seuil de Sécurité Target</th>
        <th>Validé (Oui/Non)</th>
        <th>Risque Identifié si Non Conforme</th>
        <th>Action Corrective ou Révision Imposée</th>
        <th>Responsable</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>Seuil de Marge Brute Minimum</td>
        <td>Marge Brute HT ≥ 35 % du montant total</td>
        <td>Oui</td>
        <td>Vente à perte, dégradation du résultat EBE</td>
        <td>Réviser le chiffrage ou refuser la commande</td>
        <td>Dir. Commercial</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Faisabilité Technique BE/Atelier</td>
        <td>Outillage disponible & tolérances réalisables</td>
        <td>Oui</td>
        <td>Rebuts massifs en prod, impossibilité technique</td>
        <td>Validation formelle du Responsable BE/Prod</td>
        <td>Chef Prod</td>
      </tr>
      <tr>
        <td>3</td>
        <td>Délais de Livraison Promis</td>
        <td>Planning machines & heures atelier disponibles</td>
        <td>Oui</td>
        <td>Pénalités de retard (5%/jour), perte du client</td>
        <td>Ajuster la date de livraison confirmée (+15j)</td>
        <td>Resp. Planning</td>
      </tr>
      <tr>
        <td>4</td>
        <td>Conditions de Paiement & Acompte</td>
        <td>Acompte 30% à la commande + encours sain</td>
        <td>Oui</td>
        <td>Trou de trésorerie, impayé client en fin d'affaire</td>
        <td>Conditionner le lancement de prod au virement</td>
        <td>RAF / DG</td>
      </tr>
      <tr>
        <td>5</td>
        <td>Exigences Spécifiques & Pénalités</td>
        <td>Certificats 3.1 requis & pénalités plafonnées ≤5%</td>
        <td>Oui</td>
        <td>Pénalités de retard illimitées, blocage livraison</td>
        <td>Négocier le plafonnement des pénalités</td>
        <td>Dir. Commercial</td>
      </tr>
      <tr>
        <td class="fillable">[N°]</td>
        <td class="fillable">[Votre point de contrôle]</td>
        <td class="fillable">[Exigence cible]</td>
        <td class="fillable">[Oui/Non]</td>
        <td class="fillable">[Risque identifié]</td>
        <td class="fillable">[Action de révision]</td>
        <td class="fillable">[Nom]</td>
      </tr>
    </tbody>
  </table>

  <div class="section-subtitle">REGISTRE DES DEVIS ET CONTRATS REVUS & VALIDÉS</div>

  <table class="data-table">
    <thead>
      <tr>
        <th>N° Devis</th>
        <th>Nom Client</th>
        <th>Montant HT (€)</th>
        <th>Marge Brute %</th>
        <th>Faisabilité Validée</th>
        <th>Visa Commercial</th>
        <th>Visa Prod / DG</th>
        <th>Statut Affaire</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>DEV-2026-089</td>
        <td>Client Grand Compte ALFA</td>
        <td>45 000 €</td>
        <td>38.5 %</td>
        <td>Conforme BE</td>
        <td>V. Commercial</td>
        <td>V. Dir. Prod</td>
        <td>Validé & Signé</td>
      </tr>
      <tr>
        <td>DEV-2026-092</td>
        <td>Client Groupe BETA</td>
        <td>18 500 €</td>
        <td>32.0 %</td>
        <td>Sous réserve</td>
        <td>V. Commercial</td>
        <td>Attente Acompte</td>
        <td>En révision tarif</td>
      </tr>
      <tr>
        <td>DEV-2026-095</td>
        <td>Client Société GAMMA</td>
        <td>62 000 €</td>
        <td>41.0 %</td>
        <td>Conforme BE</td>
        <td>V. Commercial</td>
        <td>V. DG</td>
        <td>Validé & Signé</td>
      </tr>
      <tr>
        <td class="fillable">[N° Devis]</td>
        <td class="fillable">[Nom du Client]</td>
        <td class="fillable">[Montant]</td>
        <td class="fillable">[Marge %]</td>
        <td class="fillable">[Faisabilité]</td>
        <td class="fillable">[Visa Com]</td>
        <td class="fillable">[Visa Prod]</td>
        <td class="fillable">[Statut]</td>
      </tr>
    </tbody>
  </table>

  <div class="next-steps-box">
    <div class="box-title">QUE FAIRE UNE FOIS CET OUTIL COMPLÉTÉ ?</div>
    <ul>
      <li>Visa obligatoire avant transmission de toute offre > 10k€.</li>
      <li>Archivage de la grille visée dans le dossier affaire sous 02_VENTES_MARGES_ACHATS/DEVIS_VALIDES/.</li>
      <li>Revue mensuelle du taux de marge réelle vs prévisionnelle.</li>
    </ul>
  </div>
""" + COMMON_FOOTER

# HTML 3: OUTIL 09
outil_09_html = get_common_head("OUTIL 09 - Évaluation Fournisseurs") + """
  <div class="tool-title-box">
    <div class="tool-meta">SÉQUENCE 2 - OUTIL 09 — Clause ISO 9001:2015 - 8.4 - Question Q9</div>
    <div class="tool-title">Grille d'Évaluation & Homologation des Fournisseurs Critiques</div>
  </div>

  <div class="consultant-themes-box">
    <div class="box-title">CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER</div>
    <div class="consultant-posture">Évaluez vos fournisseurs sur des critères factuels mesurés (Taux de respect des délais OTD et Taux de non-conformité FNC). Un fournisseur non évalué est une menace directe sur votre chaîne de fabrication.</div>
    <div class="themes-grid">
      <div class="theme-card">
        <div class="theme-card-title">1. Qualité & Conformité (FNC)</div>
        <div class="theme-card-body">Taux de réception conforme du premier coup (≥ 98%), présence obligatoire des certificats matières 3.1.</div>
      </div>
      <div class="theme-card">
        <div class="theme-card-title">2. Respect des Délais (OTD %)</div>
        <div class="theme-card-body">Livraison à la date promise confirmée sur l'AR de commande (objectif ≥ 95%).</div>
      </div>
      <div class="theme-card">
        <div class="theme-card-title">3. Réactivité & Service Client</div>
        <div class="theme-card-body">Délai de réponse aux demandes d'offres (< 24h), réactivité sur traitement des FNC sous 48h.</div>
      </div>
      <div class="theme-card">
        <div class="theme-card-title">4. Santé Financière & RSE</div>
        <div class="theme-card-body">Stabilité financière du prestataire, engagement environnemental et sécurité.</div>
      </div>
    </div>
  </div>

  <div class="why-box">
    <div class="box-title">POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE ENTREPRISE ?</div>
    <div class="why-grid">
      <div class="why-column why-gains">
        <h4>Ce que vous gagnez à l'utiliser :</h4>
        <ul>
          <li>Approvisionnements 100% fiables et conformes.</li>
          <li>Élimination des arrêts de production pour matière manquante.</li>
          <li>Preuve incontestable de maîtrise des achats (ISO 9001 Clause 8.4).</li>
        </ul>
      </div>
      <div class="why-column why-risques">
        <h4>Ce que vous risquez sans cet outil :</h4>
        <ul>
          <li>Fabrication de pièces défectueuses suite matière hors spécification.</li>
          <li>Pénalités de retard subies par la faute d'un sous-traitant défaillant.</li>
          <li>Non-conformité majeure d'audit ISO 9001 (Clause 8.4).</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="guide-box">
    <div class="box-title">GUIDE DE REMPLISSAGE PAS À PAS (4 ÉTAPES)</div>
    <div class="guide-steps">
      <div class="guide-step"><span class="guide-step-num">Étape 1 :</span> Identifier la liste des 5 à 10 fournisseurs et sous-traitants critiques pour votre entreprise.</div>
      <div class="guide-step"><span class="guide-step-num">Étape 2 :</span> Renseigner les indicateurs de l'année (Nombre de commandes, FNC générées, Retards).</div>
      <div class="guide-step"><span class="guide-step-num">Étape 3 :</span> Calculer la note finale sur 20 points.</div>
      <div class="guide-step"><span class="guide-step-num">Étape 4 :</span> Déterminer le statut d'agrément (Agréé / Sous Surveillance / Déréférencé) et notifier le fournisseur.</div>
    </div>
  </div>

  <div class="section-subtitle">GRILLE DE COTATION & BARÈME D'ÉVALUATION FOURNISSEURS</div>

  <table class="data-table">
    <thead>
      <tr>
        <th>Critère d'Évaluation</th>
        <th>Poids / Barème</th>
        <th>Méthode de Mesure Exacte</th>
        <th>Seuil Minimum Requis</th>
        <th>Action si Seuil Non Atteint</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Qualité des Livraisons</td>
        <td>8 Points</td>
        <td>(Nb livraisons conformes / Nb total livraisons) x 8</td>
        <td>≥ 7.5 / 8 (95%)</td>
        <td>Fiche de Non-Conformité Fournisseur + Audit site</td>
      </tr>
      <tr>
        <td>2. Respect des Délais (OTD)</td>
        <td>8 Points</td>
        <td>(Nb livraisons à date / Nb total livraisons) x 8</td>
        <td>≥ 7.2 / 8 (90%)</td>
        <td>Mise en demeure + pénalités de retard contractuelles</td>
      </tr>
      <tr>
        <td>3. Réactivité & Service</td>
        <td>4 Points</td>
        <td>Réponse devis < 24h & traitement FNC < 48h</td>
        <td>≥ 3.0 / 4</td>
        <td>Entretien de cadrage avec la direction commerciale</td>
      </tr>
      <tr>
        <td class="fillable">[Votre Critère]</td>
        <td class="fillable">[Barème]</td>
        <td class="fillable">[Formule de calcul]</td>
        <td class="fillable">[Seuil]</td>
        <td class="fillable">[Action corrective]</td>
      </tr>
    </tbody>
  </table>

  <div class="section-subtitle">REGISTRE D'ÉVALUATION ET LISTE DES FOURNISSEURS AGRÉÉS</div>

  <table class="data-table">
    <thead>
      <tr>
        <th>Nom Fournisseur / Sous-Traitant</th>
        <th>Famille d'Achat</th>
        <th>Note Qualité /8</th>
        <th>Note Délais /8</th>
        <th>Note Service /4</th>
        <th>Note Totale /20</th>
        <th>Statut d'Agrément</th>
        <th>Plan d'Action / Échéance</th>
        <th>Responsable</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Fournisseur Métaux ACIER-X</td>
        <td>Matières Premières Aciers</td>
        <td>7.8</td>
        <td>7.6</td>
        <td>3.6</td>
        <td>19.0 / 20</td>
        <td>Agréé (A)</td>
        <td>Maintenir le volume d'achat</td>
        <td>Resp. Achats</td>
      </tr>
      <tr>
        <td>Sous-traitant Usinage USIN-PRO</td>
        <td>Usinage Spécifique BE</td>
        <td>6.2</td>
        <td>5.8</td>
        <td>2.5</td>
        <td>14.5 / 20</td>
        <td>Sous Surveillance (B)</td>
        <td>Audit sur site requis sous 30 jours</td>
        <td>Resp. QSE / Achats</td>
      </tr>
      <tr>
        <td>Transporteur CHRONO-EXPRESS</td>
        <td>Transport & Logistique</td>
        <td>7.5</td>
        <td>7.4</td>
        <td>3.5</td>
        <td>18.4 / 20</td>
        <td>Agréé (A)</td>
        <td>Renouvellement contrat annuel</td>
        <td>Resp. Logistique</td>
      </tr>
      <tr>
        <td class="fillable">[Nom du Fournisseur]</td>
        <td class="fillable">[Famille]</td>
        <td class="fillable">[/8]</td>
        <td class="fillable">[/8]</td>
        <td class="fillable">[/4]</td>
        <td class="fillable">[/20]</td>
        <td class="fillable">Agréé / Alerte</td>
        <td class="fillable">[Plan d'action]</td>
        <td class="fillable">[Nom]</td>
      </tr>
    </tbody>
  </table>

  <div class="next-steps-box">
    <div class="box-title">QUE FAIRE UNE FOIS CET OUTIL COMPLÉTÉ ?</div>
    <ul>
      <li>Revue annuelle des évaluations fournisseurs en Comité d'Achats.</li>
      <li>Communication du bulletin de note individuel à chaque fournisseur clé.</li>
      <li>Archivage sous 02_VENTES_MARGES_ACHATS/FOURNISSEURS_AGREES.pdf.</li>
    </ul>
  </div>
""" + COMMON_FOOTER

# HTML 4: OUTIL 10
outil_10_html = get_common_head("OUTIL 10 - Réclamations & NPS Client") + """
  <div class="tool-title-box">
    <div class="tool-meta">SÉQUENCE 2 - OUTIL 10 — Clauses ISO 9001:2015 - 8.2.1 & 9.1.2 - Question Q10</div>
    <div class="tool-title">Registre de Traitement des Réclamations & NPS Client</div>
  </div>

  <div class="consultant-themes-box">
    <div class="box-title">CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER</div>
    <div class="consultant-posture">Une réclamation client prise en charge et résolue sous 24 heures transforme un client mécontent en ambassadeur fidèle de votre entreprise. Ne masquez pas les litiges : traitez-les avec rigueur !</div>
    <div class="themes-grid">
      <div class="theme-card">
        <div class="theme-card-title">1. Prise en Charge sous 24h</div>
        <div class="theme-card-body">Envoi d'un accusé de réception officiel au client avec désignation du pilote interne du dossier.</div>
      </div>
      <div class="theme-card">
        <div class="theme-card-title">2. Action Immédiate de Secours</div>
        <div class="theme-card-body">Lancement d'une fabrication ou expédition prioritaire de pièces de remplacement H+24 sans frais.</div>
      </div>
      <div class="theme-card">
        <div class="theme-card-title">3. Analyse Cause Profonde (5 Pourquoi)</div>
        <div class="theme-card-body">Identification de l'erreur initiale (plan non à jour, mauvais réglage, emballage fragile) via Outil 19.</div>
      </div>
      <div class="theme-card">
        <div class="theme-card-title">4. Enquête NPS (Net Promoter Score)</div>
        <div class="theme-card-body">Mesure semestrielle du score d'évaluation globale de satisfaction client.</div>
      </div>
    </div>
  </div>

  <div class="why-box">
    <div class="box-title">POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE ENTREPRISE ?</div>
    <div class="why-grid">
      <div class="why-column why-gains">
        <h4>Ce que vous gagnez à l'utiliser :</h4>
        <ul>
          <li>Fidélisation garantie de vos comptes clients stratégiques.</li>
          <li>Détection des failles internes avant amplification du coût caché.</li>
          <li>Preuve d'écoute et d'amélioration continue (ISO 9001 Clauses 8.2.1 & 9.1.2).</li>
        </ul>
      </div>
      <div class="why-column why-risques">
        <h4>Ce que vous risquez sans cet outil :</h4>
        <ul>
          <li>Perte irrémédiable de clients majeurs au profit de concurrents.</li>
          <li>Surcoûts d'avoirs et de réfections non maîtrisés.</li>
          <li>Non-conformité majeure d'audit ISO 9001 (Clause 8.2.1).</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="guide-box">
    <div class="box-title">GUIDE DE REMPLISSAGE PAS À PAS (4 ÉTAPES)</div>
    <div class="guide-steps">
      <div class="guide-step"><span class="guide-step-num">Étape 1 :</span> Enregistrer toute réclamation client dès sa réception dans le registre.</div>
      <div class="guide-step"><span class="guide-step-num">Étape 2 :</span> Transmettre l'accusé de réception formel au client sous 24h max.</div>
      <div class="guide-step"><span class="guide-step-num">Étape 3 :</span> Engager l'analyse des causes et l'action corrective avec le responsable du pôle.</div>
      <div class="guide-step"><span class="guide-step-num">Étape 4 :</span> Mesurer le score NPS lors des enquêtes semestrielles.</div>
    </div>
  </div>

  <div class="section-subtitle">REGISTRE CENTRALISÉ DE TRAITEMENT DES RÉCLAMATIONS CLIENTS</div>

  <table class="data-table">
    <thead>
      <tr>
        <th>N° RC</th>
        <th>Date</th>
        <th>Nom Client</th>
        <th>Description du Litige / Problème</th>
        <th>Coût Estimé (€)</th>
        <th>Accusé <24h</th>
        <th>Action Corrective Déployée</th>
        <th>Clôture Validée</th>
        <th>Responsable</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>RC-2026-01</td>
        <td>12/01</td>
        <td>Client Grand Compte ALFA</td>
        <td>Défaut de bavure sur lot 500 pièces usinées</td>
        <td>1 200 €</td>
        <td>Oui (H+4)</td>
        <td>Reprise en atelier + remplacement express 48h</td>
        <td>Oui (15/01)</td>
        <td>Resp. QSE / Prod</td>
      </tr>
      <tr>
        <td>RC-2026-02</td>
        <td>28/01</td>
        <td>Client Groupe BETA</td>
        <td>Retard de livraison de 24h par le transporteur</td>
        <td>0 €</td>
        <td>Oui (H+2)</td>
        <td>Changement de transporteur sur ce secteur</td>
        <td>Oui (29/01)</td>
        <td>Resp. Logistique</td>
      </tr>
      <tr>
        <td>RC-2026-03</td>
        <td>05/02</td>
        <td>Client Société GAMMA</td>
        <td>Erreur d'étiquetage sur emballage carton</td>
        <td>350 €</td>
        <td>Oui (H+6)</td>
        <td>Implémentation étiquette code-barres automatique</td>
        <td>Oui (08/02)</td>
        <td>Resp. Expedition</td>
      </tr>
      <tr>
        <td class="fillable">[N° RC]</td>
        <td class="fillable">[Date]</td>
        <td class="fillable">[Nom du Client]</td>
        <td class="fillable">[Description du problème]</td>
        <td class="fillable">[Coût €]</td>
        <td class="fillable">[Oui/Non]</td>
        <td class="fillable">[Action corrective]</td>
        <td class="fillable">[Oui/Date]</td>
        <td class="fillable">[Nom]</td>
      </tr>
    </tbody>
  </table>

  <div class="section-subtitle">SUIVI ET BAROMÈTRE NET PROMOTER SCORE (NPS CLIENT)</div>

  <table class="data-table">
    <thead>
      <tr>
        <th>Période / Trimestre</th>
        <th>Nb Envois Enquêtes</th>
        <th>Nb Réponses</th>
        <th>Promoteurs (9-10)</th>
        <th>Neutres (7-8)</th>
        <th>Détracteurs (0-6)</th>
        <th>Score NPS Net</th>
        <th>Plan d'Amélioration Associé</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Trimestre 1 (T1 2026)</td>
        <td>45</td>
        <td>32</td>
        <td>20 (62.5%)</td>
        <td>9 (28.1%)</td>
        <td>3 (9.4%)</td>
        <td>+ 53</td>
        <td>Optimiser les délais de livraison devis complexes</td>
      </tr>
      <tr>
        <td>Trimestre 2 (T2 2026)</td>
        <td>50</td>
        <td>38</td>
        <td>26 (68.4%)</td>
        <td>9 (23.7%)</td>
        <td>3 (7.9%)</td>
        <td>+ 60</td>
        <td>Objectif NPS > 50 maintenu</td>
      </tr>
      <tr>
        <td class="fillable">[Période]</td>
        <td class="fillable">[Nb]</td>
        <td class="fillable">[Nb]</td>
        <td class="fillable">[Promoteurs]</td>
        <td class="fillable">[Neutres]</td>
        <td class="fillable">[Détracteurs]</td>
        <td class="fillable">[NPS]</td>
        <td class="fillable">[Plan d'amélioration]</td>
      </tr>
    </tbody>
  </table>

  <div class="next-steps-box">
    <div class="box-title">QUE FAIRE UNE FOIS CET OUTIL COMPLÉTÉ ?</div>
    <ul>
      <li>Accusé de réception obligatoire sous 24h pour toute alerte client.</li>
      <li>Analyse de cause profonde systématique via la Fiche 5 Pourquoi (Outil 19).</li>
      <li>Archivage sous 02_VENTES_MARGES_ACHATS/REGISTRE_RECLAMATIONS_2026.pdf.</li>
    </ul>
  </div>
""" + COMMON_FOOTER

# SAVE HTML FILES
with open(os.path.join(html_dir, "START_HERE_SEQUENCE_2.html"), "w", encoding="utf-8") as f:
    f.write(start_here_html)

with open(os.path.join(html_dir, "OUTIL_08_REVUE_DEVIS_CONTRATS.html"), "w", encoding="utf-8") as f:
    f.write(outil_08_html)

with open(os.path.join(html_dir, "OUTIL_09_EVALUATION_FOURNISSEURS.html"), "w", encoding="utf-8") as f:
    f.write(outil_09_html)

with open(os.path.join(html_dir, "OUTIL_10_RECLAMATIONS_NPS_CLIENT.html"), "w", encoding="utf-8") as f:
    f.write(outil_10_html)

# SAVE MD FILES
with open(os.path.join(md_dir, "START_HERE_SEQUENCE_2.md"), "w", encoding="utf-8") as f:
    f.write("# Guide de Démarrage Séquence 2 : Ventes, Marges & Achats\n\nNotice synthétique du parcours 3 jours.")

with open(os.path.join(md_dir, "OUTIL_08_REVUE_DEVIS_CONTRATS.md"), "w", encoding="utf-8") as f:
    f.write("# OUTIL 08 : Grille de Revue de Devis, Offres & Contrats\n\nChecklist de validation obligatoire avant signature.")

with open(os.path.join(md_dir, "OUTIL_09_EVALUATION_FOURNISSEURS.md"), "w", encoding="utf-8") as f:
    f.write("# OUTIL 09 : Grille d'Évaluation & Homologation des Fournisseurs\n\nNotation des fournisseurs critiques.")

with open(os.path.join(md_dir, "OUTIL_10_RECLAMATIONS_NPS_CLIENT.md"), "w", encoding="utf-8") as f:
    f.write("# OUTIL 10 : Registre des Réclamations & Enquête NPS Client\n\nTraitement des litiges sous 24h et suivi du score NPS.")

print("Successfully generated all HTML and MD files for Sequence 2!")
