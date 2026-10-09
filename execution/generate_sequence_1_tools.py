import os
import subprocess

out_md = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/outils_qualite/sequence_1"
out_html = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/.tmp/outils_qualite/sequence_1"

os.makedirs(out_md, exist_ok=True)
os.makedirs(out_html, exist_ok=True)

# -----------------------------------------------------------------------------
# HTML LAYOUT TEMPLATE WITH NEXT STEPS SECTION
# -----------------------------------------------------------------------------
html_layout = """<!DOCTYPE html>
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
    --sb-black: #0A1210;
    --sb-accent: #E2DCCC;
    --gold: #C5A065;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    background-color: var(--sb-cream);
    color: var(--sb-green-dark);
    font-family: 'Montserrat', sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
  }}
  .container {{
    max-width: 1000px;
    margin: 30px auto;
    background: #ffffff;
    padding: 45px;
    border: 1px solid var(--sb-accent);
    box-shadow: 0 10px 30px rgba(10, 18, 16, 0.05);
  }}
  .header-brand {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--gold);
    padding-bottom: 20px;
    margin-bottom: 30px;
  }}
  .brand-logo-title {{
    display: flex;
    align-items: center;
    gap: 15px;
  }}
  .logo-svg {{ width: 48px; height: 42px; }}
  .brand-text h1 {{
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
    color: var(--sb-green-dark);
    margin: 0;
  }}
  .brand-text p {{
    font-size: 11px;
    color: var(--sb-green-light);
    margin: 2px 0 0 0;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-weight: 600;
  }}
  .header-tag {{
    background: var(--sb-green-dark);
    color: var(--sb-beige);
    padding: 6px 14px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    border-radius: 2px;
  }}
  .tool-title-box {{
    background: var(--sb-cream);
    border: 1px solid var(--sb-accent);
    padding: 25px;
    margin-bottom: 25px;
    border-left: 5px solid var(--gold);
  }}
  .tool-title-box h2 {{
    font-family: 'Playfair Display', serif;
    font-size: 24px;
    color: var(--sb-green-dark);
    margin: 0 0 8px 0;
  }}
  .tool-clause {{
    display: inline-block;
    background: var(--sb-green-dark);
    color: var(--gold);
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 2px;
    margin-bottom: 10px;
  }}
  .notice-box {{
    background: #ffffff;
    border: 1px solid var(--sb-accent);
    padding: 18px 22px;
    margin-bottom: 30px;
    font-size: 13px;
    border-radius: 2px;
  }}
  .notice-box p {{ margin: 5px 0; }}
  .notice-box strong {{ color: var(--sb-green-dark); }}

  .next-steps-box {{
    background: var(--sb-cream);
    border: 1px solid var(--gold);
    border-left: 5px solid var(--sb-green-dark);
    padding: 20px 25px;
    margin-top: 35px;
    border-radius: 2px;
  }}
  .next-steps-box h3 {{
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: var(--sb-green-dark);
    margin: 0 0 12px 0;
  }}
  .next-steps-box ul {{
    margin: 0;
    padding-left: 20px;
    font-size: 13px;
  }}
  .next-steps-box li {{
    margin-bottom: 8px;
  }}

  h3.section-subtitle {{
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: var(--sb-green-dark);
    border-bottom: 2px solid var(--sb-accent);
    padding-bottom: 6px;
    margin: 30px 0 15px 0;
  }}

  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0 25px 0;
    font-size: 12.5px;
  }}
  th {{
    background-color: var(--sb-green-dark);
    color: #ffffff;
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
    border: 1px solid var(--sb-green-dark);
  }}
  td {{
    padding: 10px 12px;
    border: 1px solid var(--sb-accent);
    vertical-align: top;
  }}
  tr:nth-child(even) td {{ background-color: var(--sb-cream); }}

  .quadrant-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin: 20px 0;
  }}
  .quadrant-box {{
    border: 1px solid var(--sb-accent);
    padding: 20px;
    background: #ffffff;
    border-radius: 2px;
  }}
  .quadrant-box.forces {{ border-top: 4px solid #2e7d32; }}
  .quadrant-box.faiblesses {{ border-top: 4px solid #c62828; }}
  .quadrant-box.opportunites {{ border-top: 4px solid #0277bd; }}
  .quadrant-box.menaces {{ border-top: 4px solid #e65100; }}

  .quadrant-box h4 {{
    font-family: 'Playfair Display', serif;
    margin: 0 0 12px 0;
    font-size: 16px;
  }}

  pre.template-box {{
    background: #fdfdfd;
    border: 1px solid var(--sb-accent);
    border-left: 4px solid var(--gold);
    padding: 22px;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    margin: 15px 0;
    color: #152822;
  }}

  .footer {{
    text-align: center;
    margin-top: 45px;
    padding-top: 20px;
    border-top: 1px solid var(--sb-accent);
    font-size: 11px;
    color: var(--sb-green-light);
  }}

  @media print {{
    body {{ background: #ffffff; }}
    .container {{ border: none; box-shadow: none; padding: 0; margin: 0; max-width: 100%; }}
    .quadrant-grid {{ grid-template-columns: 1fr 1fr; }}
  }}
</style>
</head>
<body>

<div class="container">

  <!-- Header Branding -->
  <div class="header-brand">
    <div class="brand-logo-title">
      <svg class="logo-svg" viewBox="0 0 100 87" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 3L97 84H3L50 3Z" stroke="#152822" stroke-width="5" stroke-linecap="square" stroke-linejoin="miter"/>
        <path d="M50 25L78 74H22L50 25Z" stroke="#152822" stroke-width="4" stroke-linecap="square" stroke-linejoin="miter"/>
        <path d="M50 49L52 55L58 57L52 59L50 65L48 59L42 57L48 55L50 49Z" fill="#C5A065"/>
      </svg>
      <div class="brand-text">
        <h1>CABINET DELACOUR</h1>
        <p>Stratégie & Performance QHSE - ISO 9001</p>
      </div>
    </div>
    <div class="header-tag">Séquence 1 - {code}</div>
  </div>

  <!-- Title Box -->
  <div class="tool-title-box">
    <span class="tool-clause">{clause} - Question {q_num}</span>
    <h2>{title}</h2>
  </div>

  <!-- Instructions Notice -->
  <div class="notice-box">
    <p><strong>💡 Utilité Business :</strong> {utility}</p>
    <p><strong>📝 Mode d'emploi & Remplissage :</strong> {instructions}</p>
  </div>

  <!-- Main Body Content -->
  <div class="tool-body">
    {body_content}
  </div>

  <!-- Next Steps Box -->
  <div class="next-steps-box">
    <h3>🚀 QUE FAIRE UNE FOIS CET OUTIL COMPLÉTÉ ?</h3>
    {next_steps_html}
  </div>

  <!-- Footer -->
  <div class="footer">
    Cabinet Delacour - Consultant Expert Stratégie & Performance QHSE - ISO 9001<br>
    Outil Prêt à l'Emploi Séquence 1 (Gouvernance & Direction)
  </div>

</div>

</body>
</html>
"""

def md_table_to_html(md_table):
    lines = md_table.strip().split("\n")
    table_html = "<table>\n"
    headers = [h.strip() for h in lines[0].split("|")[1:-1]]
    table_html += "  <tr>\n" + "".join([f"    <th>{h}</th>\n" for h in headers]) + "  </tr>\n"
    for row in lines[2:]:
        cells = [c.strip() for c in row.split("|")[1:-1]]
        table_html += "  <tr>\n" + "".join([f"    <td>{c}</td>\n" for c in cells]) + "  </tr>\n"
    table_html += "</table>"
    return table_html

# =============================================================================
# TOOL 01A : SWOT
# =============================================================================
swot_next_steps_md = """## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Validation en Comité de Direction** : Présenter la matrice SWOT remplie au Directeur Général et aux responsables de pôles (Prod, Commercial, Achats) pour validation officielle.
2. **Transfert vers le Registre des Risques (Outil 05)** : Basculer immédiatement chaque *Faiblesse* et *Menace* critique dans l'**Outil 05 (Registre AMDEC Risques)** pour leur attribuer un niveau de gravité, une action préventive et un budget.
3. **Archivage GED** : Enregistrer le fichier finalisé dans le dossier informatique `01_DIRECTION_STRATEGIE/SWOT_2026.pdf`.
4. **Fréquence de mise à jour** : Réviser le SWOT au minimum 1 fois par an lors de la Revue de Direction (Outil 07) ou immédiatement en cas d'événement majeur (ex: crise, départ d'un client clé).
"""

swot_next_steps_html = """<ul>
  <li><strong>Validation en Comité de Direction :</strong> Présenter la matrice SWOT remplie au Directeur Général et aux responsables de pôles pour validation officielle.</li>
  <li><strong>Transfert vers le Registre des Risques (Outil 05) :</strong> Basculer chaque <em>Faiblesse</em> et <em>Menace</em> critique dans l'<strong>Outil 05 (AMDEC)</strong> pour leur attribuer un niveau de gravité, une action et un budget.</li>
  <li><strong>Archivage GED :</strong> Classer le document finalisé dans le dossier Cloud <code>01_DIRECTION_STRATEGIE/SWOT_2026.pdf</code>.</li>
  <li><strong>Fréquence de mise à jour :</strong> Réviser au minimum 1 fois par an lors de la Revue de Direction (Outil 07) ou en cas d'événement de marché majeur.</li>
</ul>"""

swot_md = """# 🧰 OUTIL 01A : MATRICE SWOT STRATÉGIQUE PRÊTE À REMPLIR

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 4.1 - **Question d'Audit** : Q1

---

## 💡 UTILITÉ & MODE D'EMPLOI RAPIDE

* **Utilité Business** : Analyser les 4 piliers stratégiques de votre PME pour capitaliser sur vos forces, corriger vos faiblesses internes, saisir les opportunités de marché et neutraliser les menaces financières.
* **Mode d'emploi** : Compléter chaque quadrant avec au moins 3 éléments réels de votre PME. Pour chaque faiblesse ou menace critique, définissez 1 action corrective.

---

## 📝 LA MATRICE SWOT (4 QUADRANTS SÉPARÉS)

### 🟢 1. FORCES (Forces Internes)
*Ce que votre PME maîtrise parfaitement et qui vous donne un avantage concurrentiel.*
* [Exemple] Savoir-faire technique reconnu et équipe d'opérateurs très expérimentée.
* [Exemple] Parc machines récent et capacité de production réactive.
* [Exemple] Proximité client et taux de réclamation très faible (< 1%).
* `[Votre Force 1]` : ____________________________________________________________________
* `[Votre Force 2]` : ____________________________________________________________________
* `[Votre Force 3]` : ____________________________________________________________________

---

### 🔴 2. FAIBLESSES (Faiblesses Internes)
*Les fragilités de votre organisation qui créent des coûts cachés ou du retard.*
* [Exemple] Dépendance forte envers 1 cadre homme-clé (risque d'arrêt en cas d'absence).
* [Exemple] Absence de GED centralisée (perte de temps à chercher les plans et procédures).
* [Exemple] Processus de chiffrage des devis trop long (perte de réactivité commerciale).
* `[Votre Faiblesse 1]` : ________________________________________________________________
* `[Votre Faiblesse 2]` : ________________________________________________________________
* `[Votre Faiblesse 3]` : ________________________________________________________________

---

### 🔵 3. OPPORTUNITÉS (Opportunités Externes)
*Les évolutions de votre marché ou environnement dont vous pouvez tirer profit.*
* [Exemple] Demande croissante de certification ISO 9001 exigée par les donneurs d'ordre.
* [Exemple] Défaillance d'un concurrent local permettant de récupérer des parts de marché.
* [Exemple] Subventions régionales disponibles pour la modernisation des outils industriels.
* `[Votre Opportunité 1]` : ______________________________________________________________
* `[Votre Opportunité 2]` : ______________________________________________________________
* `[Votre Opportunité 3]` : ______________________________________________________________

---

### 🟠 4. MENACES (Menaces Externes)
*Les risques extérieurs qui peuvent réduire vos marges ou bloquer votre activité.*
* [Exemple] Hausse des coûts des matières premières et de l'énergie (+15%).
* [Exemple] Difficulté de recrutement sur les métiers techniques qualifiés.
* [Exemple] Exigences réglementaires et environnementales de plus en plus lourdes.
* `[Votre Menace 1]` : __________________________________________________________________
* `[Votre Menace 2]` : __________________________________________________________________
* `[Votre Menace 3]` : __________________________________________________________________

---

## 🎯 PLAN D'ACTION DÉRIVÉ DU SWOT

| Axe de Travail | Problème Identifié dans le SWOT | Action Corrective / Stratégique à Lancer | Responsable | Échéance |
| :--- | :--- | :--- | :--- | :-: |
| **Sécurisation** | Dépendance homme-clé en atelier | Rédaction des fiches de postes + binômage de polyvalence | Resp. Prod | 31/03 |
| **Protection Marge** | Hausse des coûts matières premières | Indexation systématique des devis sur les cours d’achat | Resp. Com | Immédiat |
| **Gains de Temps** | Perte de temps recherche documents | Déploiement de l'arborescence GED simplifiée en 5 dossiers | Resp. IT / QSE | 30/04 |

---

""" + swot_next_steps_md

swot_html_body = """
<div class="quadrant-grid">
  <div class="quadrant-box forces">
    <h4 style="color:#2e7d32;">🟢 1. FORCES (Forces Internes)</h4>
    <p><em>Ce que votre PME maîtrise et qui vous distingue :</em></p>
    <ul>
      <li>Savoir-faire technique reconnu & équipe stable.</li>
      <li>Parc machines récent & grande réactivité.</li>
      <li>Proximité client & taux de réclamation &lt; 1%.</li>
      <li><code>[Votre Force 1] : ______________________</code></li>
      <li><code>[Votre Force 2] : ______________________</code></li>
    </ul>
  </div>
  
  <div class="quadrant-box faiblesses">
    <h4 style="color:#c62828;">🔴 2. FAIBLESSES (Faiblesses Internes)</h4>
    <p><em>Les fragilités internes créant des pertes de temps ou d'argent :</em></p>
    <ul>
      <li>Dépendance forte envers 1 cadre homme-clé.</li>
      <li>Absence de GED (perte de temps à chercher l'info).</li>
      <li>Délais de chiffrage des devis trop longs.</li>
      <li><code>[Votre Faiblesse 1] : __________________</code></li>
      <li><code>[Votre Faiblesse 2] : __________________</code></li>
    </ul>
  </div>

  <div class="quadrant-box opportunites">
    <h4 style="color:#0277bd;">🔵 3. OPPORTUNITÉS (Externes)</h4>
    <p><em>Les opportunités de marché à saisir :</em></p>
    <ul>
      <li>Demande forte de certification ISO par les clients.</li>
      <li>Recul d'un concurrent direct sur la région.</li>
      <li>Aides à la modernisation industrielle PME.</li>
      <li><code>[Votre Opportunité 1] : ______________</code></li>
      <li><code>[Votre Opportunité 2] : ______________</code></li>
    </ul>
  </div>

  <div class="quadrant-box menaces">
    <h4 style="color:#e65100;">🟠 4. MENACES (Externes)</h4>
    <p><em>Les risques extérieurs menaçant vos bénéfices :</em></p>
    <ul>
      <li>Hausse des prix des matières premières (+15%).</li>
      <li>Pénurie de main d'œuvre technique qualifiée.</li>
      <li>Nouvelles contraintes réglementaires / normes.</li>
      <li><code>[Votre Menace 1] : ___________________</code></li>
      <li><code>[Votre Menace 2] : ___________________</code></li>
    </ul>
  </div>
</div>

<h3 class="section-subtitle">🎯 PLAN D'ACTION DÉRIVÉ DU SWOT</h3>
<table>
  <tr>
    <th>Axe de Travail</th><th>Problème Identifié dans le SWOT</th><th>Action Corrective / Stratégique à Lancer</th><th>Responsable</th><th>Échéance</th>
  </tr>
  <tr>
    <td><strong>Sécurisation</strong></td><td>Dépendance homme-clé en atelier</td><td>Rédaction des fiches de postes + binômage de polyvalence</td><td>Resp. Prod</td><td>31/03</td>
  </tr>
  <tr>
    <td><strong>Protection Marge</strong></td><td>Hausse des coûts matières premières</td><td>Indexation systématique des devis sur les cours d’achat</td><td>Resp. Com</td><td>Immédiat</td>
  </tr>
  <tr>
    <td><strong>Gains de Temps</strong></td><td>Perte de temps recherche documents</td><td>Déploiement de l'arborescence GED simplifiée en 5 dossiers</td><td>Resp. IT / QSE</td><td>30/04</td>
  </tr>
</table>
"""

with open(os.path.join(out_md, "OUTIL_01A_SWOT.md"), "w", encoding="utf-8") as f:
    f.write(swot_md)
with open(os.path.join(out_html, "OUTIL_01A_SWOT.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 01A - Matrice SWOT",
        code="OUTIL_01A",
        clause="Clause 4.1",
        q_num="Q1",
        utility="Analyser les 4 piliers stratégiques de votre PME pour bâtir une stratégie Qualité & ROI incontestable.",
        instructions="Compléter les 4 quadrants ci-dessous avec les données réelles de votre entreprise et décliner 3 actions prioritaires.",
        body_content=swot_html_body,
        next_steps_html=swot_next_steps_html
    ))

# =============================================================================
# TOOL 01B : PESTEL
# =============================================================================
pestel_next_steps_md = """## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Intégration au Comité de Direction** : Valider les 6 piliers PESTEL avec le Directeur Général et le Responsable Qualité.
2. **Raccordement au Registre des Risques (Outil 05)** : Tout élément évalué avec un *Impact Rouge (🔴 Risque Fort)* doit être automatiquement transposé dans le **Registre AMDEC Risques (Outil 05)** pour chiffrer l'impact et programmer une action.
3. **Archivage GED** : Sauvegarder dans le dossier Cloud `01_DIRECTION_STRATEGIE/PESTEL_2026.pdf`.
4. **Fréquence de mise à jour** : Réviser 1 fois par an lors de la préparation de la Revue de Direction (Outil 07).
"""

pestel_next_steps_html = """<ul>
  <li><strong>Intégration au Comité de Direction :</strong> Valider les 6 piliers PESTEL avec le Directeur Général et le Responsable Qualité.</li>
  <li><strong>Raccordement au Registre des Risques (Outil 05) :</strong> Tout facteur marqué d'un <em>Impact Rouge (🔴 Risque Fort)</em> doit être transposé dans le <strong>Registre AMDEC (Outil 05)</strong> pour chiffrer l'impact et engager une action préventive.</li>
  <li><strong>Archivage GED :</strong> Sauvegarder dans le dossier Cloud <code>01_DIRECTION_STRATEGIE/PESTEL_2026.pdf</code>.</li>
  <li><strong>Fréquence de mise à jour :</strong> Réviser 1 fois par an en amont de la Revue de Direction (Outil 07).</li>
</ul>"""

pestel_md = """# 🧰 OUTIL 01B : MATRICE PESTEL COMPLÈTE (6 PILIERS D'ANALYSE)

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 4.1 - **Question d'Audit** : Q1

---

## 💡 UTILITÉ & MODE D'EMPLOI RAPIDE

* **Utilité Business** : Analyser l'environnement macro-économique de votre PME selon 6 dimensions clés pour anticiper les réglementations, les inflations et les chocs extérieurs.
* **Mode d'emploi** : Renseigner les facteurs d'influence dans chaque pilier (Politique, Économique, Social, Technologique, Écologique, Légal) et évaluer leur impact (Positif / Neutre / Négatif).

---

## 📝 LA MATRICE PESTEL (6 PILIERS EXPLICITES)

| Pilier PESTEL | Facteurs d'Influence à Examiner dans votre PME | Impact Estimé | Action Préventive / Opportunité à Saisir |
| :--- | :--- | :-: | :--- |
| **🏛️ POLITIQUE (P)** | Subventions régionales, aides à l'investissement PME, politiques de réindustrialisation. | 🟢 Opportunité | Déposer un dossier de subvention pour le nouvel équipement. |
| **💶 ÉCONOMIQUE (E)** | Inflation des matières premières, hausse des coûts de l'énergie, taux d'intérêt bancaires. | 🔴 Risque Fort | Ajuster les clauses d'indexation des tarifs sur les devis. |
| **👥 SOCIAL (S)** | Pénurie de main d'œuvre qualifiée, départs à la retraite non anticipés, attentes salariales. | 🔴 Risque Fort | Déployer la matrice des compétences et former des binômes. |
| **💻 TECHNOLOGIQUE (T)** | Digitalisation des processus, obsolescence des logiciels ERP, risques de cybersécurité. | 🟠 Risque Moyen | Mettre en place des sauvegardes Cloud et sécuriser l'IT. |
| **🌿 ÉCOLOGIQUE (E)** | Gestion des déchets industriels, bilan carbone exigé par les clients, efficacité énergétique. | 🟢 Opportunité | Valoriser le tri sélectif et la réduction des chutes matières. |
| **⚖️ LÉGAL (L)** | Évolutions du code du travail, normes ISO 9001, sécurité au travail, conformité RGPD. | 🟢 Conforme | Mettre à jour le Document Unique d'Évaluation des Risques. |

---

""" + pestel_next_steps_md

with open(os.path.join(out_md, "OUTIL_01B_PESTEL.md"), "w", encoding="utf-8") as f:
    f.write(pestel_md)
with open(os.path.join(out_html, "OUTIL_01B_PESTEL.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 01B - Matrice PESTEL",
        code="OUTIL_01B",
        clause="Clause 4.1",
        q_num="Q1",
        utility="Évaluer les 6 dimensions macro-économiques (PESTEL) pour protéger vos marges et anticiper les chocs.",
        instructions="Renseigner les facteurs d'influence dans chaque pilier et définir les actions prioritaires de protection.",
        body_content=md_table_to_html("""| Pilier PESTEL | Facteurs d'Influence à Examiner dans votre PME | Impact Estimé | Action Préventive / Opportunité à Saisir |
| :--- | :--- | :-: | :--- |
| **🏛️ POLITIQUE (P)** | Subventions régionales, aides à l'investissement PME, politiques de réindustrialisation. | 🟢 Opportunité | Déposer un dossier de subvention pour le nouvel équipement. |
| **💶 ÉCONOMIQUE (E)** | Inflation des matières premières, hausse des coûts de l'énergie, taux d'intérêt bancaires. | 🔴 Risque Fort | Ajuster les clauses d'indexation des tarifs sur les devis. |
| **👥 SOCIAL (S)** | Pénurie de main d'œuvre qualifiée, départs à la retraite non anticipés, attentes salariales. | 🔴 Risque Fort | Déployer la matrice des compétences et former des binômes. |
| **💻 TECHNOLOGIQUE (T)** | Digitalisation des processus, obsolescence des logiciels ERP, risques de cybersécurité. | 🟠 Risque Moyen | Mettre en place des sauvegardes Cloud et sécuriser l'IT. |
| **🌿 ÉCOLOGIQUE (E)** | Gestion des déchets industriels, bilan carbone exigé par les clients, efficacité énergétique. | 🟢 Opportunité | Valoriser le tri sélectif et la réduction des chutes matières. |
| **⚖️ LÉGAL (L)** | Évolutions du code du travail, normes ISO 9001, sécurité au travail, conformité RGPD. | 🟢 Conforme | Mettre à jour le Document Unique d'Évaluation des Risques. |"""),
        next_steps_html=pestel_next_steps_html
    ))

# =============================================================================
# TOOL 02 : PARTIES PRENANTES
# =============================================================================
tool02_next_steps_md = """## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Diffusion aux Responsables Métiers** : Transmettre la matrice aux responsables des Ventes, Achats, RH et Production pour qu'ils prennent connaissance des exigences non négociables.
2. **Intégration dans les Contrôles Opérationnels** : Intégrer les exigences clés (ex: certificats d'analyse fournisseurs, délais d'expédition clients) dans les **Grilles d'Évaluation Fournisseurs (Outil 09)** et **Fiches de Libération Produit (Outil 17)**.
3. **Archivage GED** : Classer le fichier sous `01_DIRECTION_STRATEGIE/PARTIES_PRENANTES_2026.pdf`.
4. **Fréquence de révision** : Réviser dès la signature d'un nouveau contrat client stratégique ou lors de la Revue de Direction annuelle.
"""

tool02_next_steps_html = """<ul>
  <li><strong>Diffusion aux Responsables Métiers :</strong> Transmettre la matrice aux Ventes, Achats, RH et Prod pour alignement sur les exigences non négociables.</li>
  <li><strong>Intégration dans les Contrôles Opérationnels :</strong> Intégrer les exigences clés (ex: certificats matières, délais) dans les <strong>Grilles Fournisseurs (Outil 09)</strong> et <strong>Fiches de Libération (Outil 17)</strong>.</li>
  <li><strong>Archivage GED :</strong> Sauvegarder sous <code>01_DIRECTION_STRATEGIE/PARTIES_PRENANTES_2026.pdf</code>.</li>
  <li><strong>Fréquence de révision :</strong> Réviser lors de chaque signature de contrat majeur ou 1 fois par an.</li>
</ul>"""

tool02_md = """# 🧰 OUTIL 02 : CARTOGRAPHIE DES PARTIES PRENANTES STRATÉGIQUES

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 4.2 - **Question d'Audit** : Q2

---

## 💡 UTILITÉ & MODE D'EMPLOI RAPIDE

* **Utilité Business** : Identifier les exigences clés de vos 5 partenaires majeurs (Clients, Fournisseurs, Banques, Salariés, État) pour éviter les litiges financiers et ruptures d'activité.
* **Mode d'emploi** : Lister l'exigence non négociable pour chaque catégorie, évaluer le risque en cas de manquement et consigner le document de preuve associé.

---

## 📝 LE MODÈLE PRÊT À REMPLIR (5 CATÉGORIES STRACTÉGIQUES)

| Catégorie de Partie Prenante | Nom / Acteur Réel | Exigence Critique Non Négociable | Risque Majeur si Non Respecté | Preuve ou Outil de Contrôle |
| :--- | :--- | :--- | :--- | :--- |
| **1. Clients Stratégiques** | Client Grand Compte X | Livraison sous 48h maxi avec certificat de conformité | Pénalité de retard de 5%/jour + risque de déréférencement | Bon de livraison émargé + PV de contrôle signé |
| **2. Fournisseurs Critiques** | Fournisseur Matière Y | Matières premières 100% conformes aux spécifications | Arrêt de production atelier + pièces défectueuses | Certificat d'analyse matière + Grille d'évaluation |
| **3. Banques & Actionnaires** | Partenaire Bancaire Z | Respect des ratios de rentabilité et bilan certifié au 30/04 | Refus de renouvellement de la ligne de crédit de roulement | Tableau de bord de trésorerie mensuel + Bilan |
| **4. Salariés & CSE** | Équipes de Production | Conditions de travail sécurisées et paiement à date fixe | Démissions des compétences clés + risque d'accident | Document Unique (DUERP) + Planning de formation |
| **5. Organisme / État** | AFNOR / Bureau Veritas | Réalisation de l'audit annuel ISO 9001 sans écart majeur | Perte de la certification ISO (exigée sur les appels d'offres) | Rapport d'audit interne + Plan d'action respecté |

---

""" + tool02_next_steps_md

with open(os.path.join(out_md, "OUTIL_02_PARTIES_PRENANTES.md"), "w", encoding="utf-8") as f:
    f.write(tool02_md)
with open(os.path.join(out_html, "OUTIL_02_PARTIES_PRENANTES.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 02 - Parties Prenantes",
        code="OUTIL_02",
        clause="Clause 4.2",
        q_num="Q2",
        utility="Recenser les exigences obligatoires des 5 acteurs clés de votre écosystème pour zéro litige.",
        instructions="Remplir la grille ci-dessous pour chaque catégorie de partie prenante de votre PME.",
        body_content=md_table_to_html("""| Catégorie de Partie Prenante | Nom / Acteur Réel | Exigence Critique Non Négociable | Risque Majeur si Non Respecté | Preuve ou Outil de Contrôle |
| :--- | :--- | :--- | :--- | :--- |
| **1. Clients Stratégiques** | Client Grand Compte X | Livraison sous 48h maxi avec certificat de conformité | Pénalité de retard de 5%/jour + risque de déréférencement | Bon de livraison émargé + PV de contrôle signé |
| **2. Fournisseurs Critiques** | Fournisseur Matière Y | Matières premières 100% conformes aux spécifications | Arrêt de production atelier + pièces défectueuses | Certificat d'analyse matière + Grille d'évaluation |
| **3. Banques & Actionnaires** | Partenaire Bancaire Z | Respect des ratios de rentabilité et bilan certifié au 30/04 | Refus de renouvellement de la ligne de crédit de roulement | Tableau de bord de trésorerie mensuel + Bilan |
| **4. Salariés & CSE** | Équipes de Production | Conditions de travail sécurisées et paiement à date fixe | Démissions des compétences clés + risque d'accident | Document Unique (DUERP) + Planning de formation |
| **5. Organisme / État** | AFNOR / Bureau Veritas | Réalisation de l'audit annuel ISO 9001 sans écart majeur | Perte de la certification ISO (exigée sur les appels d'offres) | Rapport d'audit interne + Plan d'action respecté |"""),
        next_steps_html=tool02_next_steps_html
    ))

# =============================================================================
# TOOL 03 : DASHBOARD DIRECTION
# =============================================================================
tool03_next_steps_md = """## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Renseigner la Saisie au 1er de chaque mois** : Saisir les valeurs réelles avec le RAF, le Responsable Prod et le QSE (10 min/mois).
2. **Animation du Comité de Direction Mensuel** : Présenter les 5 axes au DG. En cas de case ROUGE ou ORANGE :
   - Convoquer une réunion de crise flash de 15 min.
   - Ouvrir immédiatement une **Fiche de Résolution de Problème FNC & 5 Pourquoi (Outil 19)**.
3. **Affichage Synthétique** : Afficher le KPI Taux de Service et Qualité sur le panneau d'information de l'atelier pour motiver les équipes.
4. **Archivage GED** : Enregistrer le rapport mensuel dans `01_DIRECTION_STRATEGIE/DASHBOARDS_2026/`.
"""

tool03_next_steps_html = """<ul>
  <li><strong>Renseigner la Saisie au 1er du mois :</strong> Compléter les chiffres réels avec les responsables de pôles (10 min chrono).</li>
  <li><strong>Animation du Comité de Direction :</strong> En cas de chiffre 🔴 ROUGE (ex: Marge brute &lt; 35%), convoquer un point d'arbitrage sous 48h et ouvrir une <strong>Fiche FNC 5 Pourquoi (Outil 19)</strong>.</li>
  <li><strong>Affichage Synthétique :</strong> Communiquer le Taux de Service % et la Satisfaction Client en atelier.</li>
  <li><strong>Archivage GED :</strong> Classer mensuellement sous <code>01_DIRECTION_STRATEGIE/DASHBOARDS_2026/</code>.</li>
</ul>"""

tool03_md = """# 🧰 OUTIL 03 : TABLEAU DE BORD DE PILOTAGE DIRECTION (5 AXES DATA)

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 5.1 & 9.1 - **Question d'Audit** : Q3 & Q26

---

## 💡 UTILITÉ & MODE D'EMPLOI RAPIDE

* **Utilité Business** : Piloter votre PME aux faits avec 5 chiffres clés mis à jour chaque mois (temps de remplissage : 10 min/mois).
* **Mode d'emploi** : Renseigner les chiffres réels du mois. Si l'écart est rouge, déclencher immédiatement l'action corrective associée.

---

## 📝 LE TABLEAU DE BORD METIER (5 AXES PRÊT À REMPLIR)

| Axe Métier | Indicateur Clé (KPI) | Formule / Chiffre de Mesure | Valeur Cible | Mois M (Réel) | Statut | Action Corrective si Alerte |
| :--- | :--- | :--- | :-: | :-: | :-: | :--- |
| **1. Financier** | Chiffre d'Affaires Mensuel | Somme des factures émises HT | ≥ 350 k€ | **362 k€** | 🟢 Conforme | Ras (Objectif atteint) |
| **1. Financier** | Marge Brute Globale (%) | (CA HT - Coûts direct d'achat) / CA | ≥ 38 % | **34.2 %** | 🔴 Alerte | Bloquer la signature des devis sous 35% de marge |
| **2. Qualité** | Coût de Non-Qualité (€) | Coût des jetés + coût des retouches | ≤ 3 000 € | **4 100 €** | 🟠 À surveiller | Analyser la plus grosse FNC du mois via 5 Pourquoi |
| **3. Client** | Taux de Satisfaction (NPS) | Score issu des enquêtes flash | ≥ 45 | **48** | 🟢 Conforme | Ras |
| **4. Opérations** | Taux de Service / Délais (%) | (Livraisons à l'heure / Total) x 100 | ≥ 95 % | **96.5 %** | 🟢 Conforme | Ras |
| **5. Sécurité/RH** | Taux d'Accidents du Travail | Nb d'arrêt de travail sur le mois | 0 accident | **0** | 🟢 Conforme | Ras |

---

""" + tool03_next_steps_md

with open(os.path.join(out_md, "OUTIL_03_DASHBOARD_DIRECTION.md"), "w", encoding="utf-8") as f:
    f.write(tool03_md)
with open(os.path.join(out_html, "OUTIL_03_DASHBOARD_DIRECTION.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 03 - Dashboard Direction",
        code="OUTIL_03",
        clause="Clause 5.1 & 9.1",
        q_num="Q3 & Q26",
        utility="Piloter la performance globale de l'entreprise sur 5 axes métiers concrets.",
        instructions="Mettre à jour les chiffres une fois par mois et consigner les arbitrages en cas d'écart.",
        body_content=md_table_to_html("""| Axe Métier | Indicateur Clé (KPI) | Formule / Chiffre de Mesure | Valeur Cible | Mois M (Réel) | Statut | Action Corrective si Alerte |
| :--- | :--- | :--- | :-: | :-: | :-: | :--- |
| **1. Financier** | Chiffre d'Affaires Mensuel | Somme des factures émises HT | ≥ 350 k€ | **362 k€** | 🟢 Conforme | Ras (Objectif atteint) |
| **1. Financier** | Marge Brute Globale (%) | (CA HT - Coûts direct d'achat) / CA | ≥ 38 % | **34.2 %** | 🔴 Alerte | Bloquer la signature des devis sous 35% de marge |
| **2. Qualité** | Coût de Non-Qualité (€) | Coût des jetés + coût des retouches | ≤ 3 000 € | **4 100 €** | 🟠 À surveiller | Analyser la plus grosse FNC du mois via 5 Pourquoi |
| **3. Client** | Taux de Satisfaction (NPS) | Score issu des enquêtes flash | ≥ 45 | **48** | 🟢 Conforme | Ras |
| **4. Opérations** | Taux de Service / Délais (%) | (Livraisons à l'heure / Total) x 100 | ≥ 95 % | **96.5 %** | 🟢 Conforme | Ras |
| **5. Sécurité/RH** | Taux d'Accidents du Travail | Nb d'arrêt de travail sur le mois | 0 accident | **0** | 🟢 Conforme | Ras |"""),
        next_steps_html=tool03_next_steps_html
    ))

# =============================================================================
# TOOL 04 : POLITIQUE QUALITE
# =============================================================================
tool04_next_steps_md = """## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Signatures Officielles** : Faire signer physiquement le document original par le Directeur Général et le Responsable Qualité.
2. **Affichage & Communication Interne** :
   - Imprimer en couleur grand format (A3 ou A4) et afficher dans le hall d'accueil, la salle de réunion et l'atelier.
   - Envoyer une copie par email à l'ensemble du personnel avec un mot d'introduction du DG.
3. **Intégration à l'Accueil des Nouveaux Salariés** : Agrafer la charte au **Livret d'Accueil & Sensibilisation (Outil 23)** remis à chaque nouvel embauché.
4. **Publication Externe** : Publier la Politique Qualité sur le site internet de l'entreprise (Rubrique *"Notre Engagement Qualité ISO 9001"*).
5. **Archivage GED** : Classer le PDF signé sous `01_DIRECTION_STRATEGIE/POLITIQUE_QUALITE_SIGNEE.pdf`.
"""

tool04_next_steps_html = """<ul>
  <li><strong>Signatures Officielles :</strong> Faire apposer les signatures originales du Directeur Général et du QSE.</li>
  <li><strong>Affichage &amp; Communication :</strong> Imprimer en couleur et afficher à l'accueil, en salle de réunion et dans l'atelier. Envoyer une copie par email aux équipes.</li>
  <li><strong>Accueil Nouveaux Salariés :</strong> Joindre la charte au <strong>Livret d'Accueil (Outil 23)</strong> remis dès l'embauche.</li>
  <li><strong>Publication Externe :</strong> Publier la Charte sur votre site internet pour valoriser votre démarche auprès des clients.</li>
  <li><strong>Archivage GED :</strong> Sauvegarder sous <code>01_DIRECTION_STRATEGIE/POLITIQUE_QUALITE_SIGNEE.pdf</code>.</li>
</ul>"""

tool04_md = """# 🧰 OUTIL 04 : CHARTE COMPLÈTE DE POLITIQUE QUALITÉ & PERFORMANCE

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 5.2 - **Question d'Audit** : Q4

---

## 💡 UTILITÉ & MODE D'EMPLOI RAPIDE

* **Utilité Business** : Exprimer en 1 page synthétique l'engagement officiel de la Direction pour la rentabilité, le zéro gaspillage et la satisfaction client.
* **Mode d'emploi** : Compléter les éléments entre crochets `[...]`, faire signer la Direction Générale et afficher le document.

---

## 📝 LA CHARTE OFFICIELLE PRÊTE À SIGNER

```text
=================================================================================
             ENGAGEMENT DE LA DIRECTION : POLITIQUE QUALITÉ & PERFORMANCE
=================================================================================
Société : [Nom de votre Entreprise]
Date de mise à jour : [Date du jour] | Version : 1.0

Notre démarche Qualité a un objectif simple et pragmatique : garantir la pérennité 
de notre entreprise, protéger nos marges brutes et assurer la satisfaction totale 
de nos clients.

NOS 3 ENGAGEMENTS STRATÉGIQUES INVIOLABLES :

1. ZÉRO GASPILLAGE & RENTABILITÉ :
   - Stopper les coûts cachés en réalisant chaque prestation conforme du premier coup.
   - Ne valider aucun devis ni contrat en dessous de notre seuil de marge brute cible.

2. CHASSE AUX DÉLAIS & EXCELLENCE CLIENT :
   - Respecter 100% de nos engagements de livraison envers nos clients.
   - Prendre en charge et répondre à toute réclamation client sous 24 heures maximum.

3. SOUVERAINETÉ DU SAVOIR & SÉRÉNITÉ DES ÉQUIPES :
   - Clarifier les rôles de chacun (Matrice RACI) pour travailler sans stress.
   - Développer la polyvalence des compétences pour garantir la continuité d'activité.

DÉCLINAISON EN TABLEAUX DE BORD :
Ces engagements sont mesurés chaque mois à travers des indicateurs chiffrés (KPIs) 
revus lors de nos Comités de Direction.

La Direction s'engage à fournir les ressources humaines, matérielles et financières 
nécessaires à la réussite de cette démarche.

Signature de la Direction Générale :                     Signature du Responsable QSE :

________________________________________                  ________________________________________
[Nom & Prénom du DG]                                     [Nom & Prénom du QSE]
=================================================================================
```

---

""" + tool04_next_steps_md

with open(os.path.join(out_md, "OUTIL_04_POLITIQUE_QUALITE.md"), "w", encoding="utf-8") as f:
    f.write(tool04_md)
with open(os.path.join(out_html, "OUTIL_04_POLITIQUE_QUALITE.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 04 - Politique Qualité",
        code="OUTIL_04",
        clause="Clause 5.2",
        q_num="Q4",
        utility="Déclarer l'engagement officiel de la Direction et fixer la feuille de route stratégique.",
        instructions="Remplir la trame ci-dessous, apposer les signatures et diffuser dans l'entreprise.",
        body_content=f"<pre class=\"template-box\">{tool04_md.split('## 📝 LA CHARTE OFFICIELLE PRÊTE À SIGNER\n\n```text\n')[1].split('```')[0]}</pre>",
        next_steps_html=tool04_next_steps_html
    ))

# =============================================================================
# TOOL 05 : AMDEC RISQUES
# =============================================================================
tool05_next_steps_md = """## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Validation & Arbitrage Budgétaire** : Présenter la grille AMDEC au Directeur Général pour valider l'attribution des budgets sur les risques rouges (Score ≥ 10).
2. **Attribution aux Pilotes de Processus** : Confier chaque action préventive au responsable désigné (ex: Resp. Prod, Resp. Achats) avec une date d'échéance ferme.
3. **Intégration à la Feuille de Route SMART (Outil 06)** : Vérifier que les actions AMDEC majeures sont bien inscrites dans la feuille de route annuelle.
4. **Revue Trimestrielle** : Évaluer l'efficacité des actions tous les 3 mois et recalculer le nouveau score de criticité (l'objectif étant d'abaisser chaque score sous 5).
5. **Archivage GED** : Enregistrer sous `01_DIRECTION_STRATEGIE/REGISTRE_AMDEC_RISQUES.xlsx`.
"""

tool05_next_steps_html = """<ul>
  <li><strong>Validation &amp; Arbitrage Budgétaire :</strong> Présenter la grille au DG pour valider l'attribution des budgets sur les risques prioritaires (Score &ge; 10).</li>
  <li><strong>Attribution aux Responsables :</strong> Confier chaque action au pilote concerné (Prod, Achats, IT) avec une date limite ferme.</li>
  <li><strong>Intégration à la Feuille de Route (Outil 06) :</strong> Inscrire les actions majeures dans les objectifs annuels des services.</li>
  <li><strong>Revue Trimestrielle :</strong> Recalculer le score de criticité tous les 3 mois (objectif : score &lt; 5 après action).</li>
  <li><strong>Archivage GED :</strong> Enregistrer sous <code>01_DIRECTION_STRATEGIE/REGISTRE_AMDEC_RISQUES.xlsx</code>.</li>
</ul>"""

tool05_md = """# 🧰 OUTIL 05 : REGISTRE COMPLET DES RISQUES & OPPORTUNITÉS (AMDEC SIMPLIFIÉE)

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 6.1 - **Question d'Audit** : Q5

---

## 💡 UTILITÉ & MODE D'EMPLOI RAPIDE

* **Utilité Business** : Calculer la criticité des risques opérationnels et financiers pour concentrer vos investissements sur les actions qui ont le plus fort ROI.
* **Mode d'emploi** : Évaluer la Fréquence (F : 1-5) x la Gravité (G : 1-5) = **Score de Criticité (C : 1-25)**. Si le Score est ≥ 10, une action corrective est obligatoire.

---

## 📊 ECHELLE DE COTATION AMDEC (1 À 5)

* **Fréquence (F)** : 1 (Très rare) | 2 (Rare) | 3 (Occasionnel) | 4 (Fréquent) | 5 (Très fréquent / Permanent)
* **Gravité (G)** : 1 (Insignifiant < 500€) | 2 (Mineur < 2k€) | 3 (Moyen < 10k€) | 4 (Grave < 50k€) | 5 (Critique / Vital)

---

## 📝 LE REGISTRE DES RISQUES PRÊT À REMPLIR

| N° | Risque / Vulnérabilité Identifiée | Cause Principale | Fréq (F) | Grav (G) | Score (FxG) | Action Préventive à Déployer | Budget / ROI Estimé | Resp. | Statut |
| :-: | :--- | :--- | :-: | :-: | :-: | :--- | :-: | :--- | :-: |
| **R1** | Erreur de chiffrage sur devis complexe | Calcul de marge manuel sur Excel | 3 | 4 | **12 (🔴)** | Imposer une grille de validation obligatoire devis > 10k€ | ROI : Évite 20k€ d'affaires à perte | Com | 🟢 Actif |
| **R2** | Rupture d'approvisionnement matière | Fournisseur unique sur composant X | 2 | 5 | **10 (🔴)** | Homologuer un 2ème fournisseur de secours | Coût : 500€ d'essais | Achats | 🟢 Actif |
| **R3** | Panne prolongée machine découpe | Défaut de maintenance préventive | 2 | 4 | **8 (🟠)** | Souscrire contrat de maintenance préventive constructeur | Coût : 1 500€/an | Prod | 🟢 Actif |
| **R4** | Départ imprévu du Chef d'Atelier | Absences de procédures écrites | 2 | 4 | **8 (🟠)** | Rédiger les modes opératoires et former un binôme | Temps interne 20h | RH/Prod | 🟢 Actif |
| **R5** | Pertes de données suite cyberattaque | Sauvegardes manuelles irrégulières | 1 | 5 | **5 (🟡)** | Automatiser des sauvegardes Cloud quotidiennes | Coût : 30€/mois | IT | 🟢 Actif |

---

""" + tool05_next_steps_md

with open(os.path.join(out_md, "OUTIL_05_AMDEC_RISQUES.md"), "w", encoding="utf-8") as f:
    f.write(tool05_md)
with open(os.path.join(out_html, "OUTIL_05_AMDEC_RISQUES.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 05 - AMDEC Risques",
        code="OUTIL_05",
        clause="Clause 6.1",
        q_num="Q5",
        utility="Hiérarchiser les risques opérationnels et financiers pour déployer des actions à fort ROI.",
        instructions="Multiplier Fréquence (1-5) x Gravité (1-5). Si le score est ≥ 10, engager l'action corrective.",
        body_content=md_table_to_html("""| N° | Risque / Vulnérabilité Identifiée | Cause Principale | Fréq (F) | Grav (G) | Score (FxG) | Action Préventive à Déployer | Budget / ROI Estimé | Resp. | Statut |
| :-: | :--- | :--- | :-: | :-: | :-: | :--- | :-: | :--- | :-: |
| **R1** | Erreur de chiffrage sur devis complexe | Calcul de marge manuel sur Excel | 3 | 4 | **12 (🔴)** | Imposer une grille de validation obligatoire devis > 10k€ | ROI : Évite 20k€ d'affaires à perte | Com | 🟢 Actif |
| **R2** | Rupture d'approvisionnement matière | Fournisseur unique sur composant X | 2 | 5 | **10 (🔴)** | Homologuer un 2ème fournisseur de secours | Coût : 500€ d'essais | Achats | 🟢 Actif |
| **R3** | Panne prolongée machine découpe | Défaut de maintenance préventive | 2 | 4 | **8 (🟠)** | Souscrire contrat de maintenance préventive constructeur | Coût : 1 500€/an | Prod | 🟢 Actif |
| **R4** | Départ imprévu du Chef d'Atelier | Absences de procédures écrites | 2 | 4 | **8 (🟠)** | Rédiger les modes opératoires et former un binôme | Temps interne 20h | RH/Prod | 🟢 Actif |
| **R5** | Pertes de données suite cyberattaque | Sauvegardes manuelles irrégulières | 1 | 5 | **5 (🟡)** | Automatiser des sauvegardes Cloud quotidiennes | Coût : 30€/mois | IT | 🟢 Actif |"""),
        next_steps_html=tool05_next_steps_html
    ))

# =============================================================================
# TOOL 06 : OBJECTIFS SMART
# =============================================================================
tool06_next_steps_md = """## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Émargement des Responsables de Service** : Faire signer la feuille de route à chaque responsable (Dir. Commercial, Chef Prod, Resp. Achats, Resp. QSE) pour formaliser leur engagement.
2. **Intégration au Dashboard Mensuel (Outil 03)** : Insérer les formules de calcul et cibles dans le tableau de bord de pilotage mensuel.
3. **Points d'Étape Trimestriels (Jalons M+3, M+6)** : Organiser une réunion de 30 minutes chaque trimestre pour mesurer l'avancement exact des chiffres réels par rapport à la cible.
4. **Archivage GED** : Classer sous `01_DIRECTION_STRATEGIE/OBJECTIFS_SMART_2026.pdf`.
"""

tool06_next_steps_html = """<ul>
  <li><strong>Émargement des Responsables :</strong> Faire signer la feuille de route à chaque pilote de service pour formaliser son engagement.</li>
  <li><strong>Intégration au Dashboard (Outil 03) :</strong> Connecter les formules et cibles au tableau de bord mensuel.</li>
  <li><strong>Points d'Étape Trimestriels :</strong> Mesurer l'avancement réel lors des jalons M+3 et M+6 en Comité de Direction.</li>
  <li><strong>Archivage GED :</strong> Sauvegarder sous <code>01_DIRECTION_STRATEGIE/OBJECTIFS_SMART_2026.pdf</code>.</li>
</ul>"""

tool06_md = """# 🧰 OUTIL 06 : FEUILLE DE ROUTE D'OBJECTIFS SMART PAR SERVICE

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 6.2 - **Question d'Audit** : Q6

---

## 💡 UTILITÉ & MODE D'EMPLOI RAPIDE

* **Utilité Business** : Transformer les ambitions de la Direction en objectifs chiffrés, mesurables et déclinés par service avec des jalons d'évaluation trimestriels.
* **Mode d'emploi** : Définir 1 objectif SMART par pôle métier, la formule de calcul exacte, la cible visée et les jalons de contrôle (M+3, M+6, M+9, M+12).

---

## 📝 LA FEUILLE DE ROUTE PRÊT À REMPLIR

| Service | Objectif Amélioration SMART | Formule de Mesure Chiffrée | Valeur Cible | Jalons M+3 | Jalons M+6 | Responsable | Statut |
| :--- | :--- | :--- | :-: | :-: | :-: | :--- | :-: |
| **Commercial** | Réduire les affaires perdues pour délai trop long | (Devis refusés pour délai / Total) x 100 | ≤ 10 % | 15 % | **8 %** | Dir. Com | 🟢 Conforme |
| **Production** | Diviser par deux le taux de rebuts atelier | (Valeur pièces jetées / CA produit) x 100 | ≤ 1.5 % | 2.2 % | **1.3 %** | Chef Prod | 🟢 Conforme |
| **Achats** | Garantir des livraisons fournisseurs à l'heure | (Commandes reçues à date / Total) x 100 | ≥ 98 % | 95 % | **98.5 %** | Resp. Achats | 🟢 Conforme |
| **Qualité / QSE** | Traiter les réclamations clients sous 24h | (Réclamations prises en charge < 24h / Total) | 100 % | 90 % | **100 %** | Resp. QSE | 🟢 Conforme |

---

""" + tool06_next_steps_md

with open(os.path.join(out_md, "OUTIL_06_OBJECTIFS_SMART.md"), "w", encoding="utf-8") as f:
    f.write(tool06_md)
with open(os.path.join(out_html, "OUTIL_06_OBJECTIFS_SMART.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 06 - Objectifs SMART",
        code="OUTIL_06",
        clause="Clause 6.2",
        q_num="Q6",
        utility="Fixer des objectifs de progrès mesurables et déclinés par pôle métier.",
        instructions="Renseigner les objectifs par service et évaluer l'avancement lors des jalons trimestriels.",
        body_content=md_table_to_html("""| Service | Objectif Amélioration SMART | Formule de Mesure Chiffrée | Valeur Cible | Jalons M+3 | Jalons M+6 | Responsable | Statut |
| :--- | :--- | :--- | :-: | :-: | :-: | :--- | :-: |
| **Commercial** | Réduire les affaires perdues pour délai trop long | (Devis refusés pour délai / Total) x 100 | ≤ 10 % | 15 % | **8 %** | Dir. Com | 🟢 Conforme |
| **Production** | Diviser par deux le taux de rebuts atelier | (Valeur pièces jetées / CA produit) x 100 | ≤ 1.5 % | 2.2 % | **1.3 %** | Chef Prod | 🟢 Conforme |
| **Achats** | Garantir des livraisons fournisseurs à l'heure | (Commandes reçues à date / Total) x 100 | ≥ 98 % | 95 % | **98.5 %** | Resp. Achats | 🟢 Conforme |
| **Qualité / QSE** | Traiter les réclamations clients sous 24h | (Réclamations prises en charge < 24h / Total) | 100 % | 90 % | **100 %** | Resp. QSE | 🟢 Conforme |"""),
        next_steps_html=tool06_next_steps_html
    ))

# =============================================================================
# TOOL 07 : REVUE DE DIRECTION
# =============================================================================
tool07_next_steps_md = """## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Émargement de Tous les Participants** : Faire signer le procès-verbal original par le Directeur Général, le Responsable Qualité et l'ensemble des pilotes de processus présents.
2. **Archivage Preuve d'Audit ISO 9001** : Archiver impérativement le document scanné sous `01_DIRECTION_STRATEGIE/PV_REVUE_DIRECTION_2026.pdf`. *Note : Ce document sera exigé en priorité absolue par l'auditeur ISO 9001 lors de l'audit de certification.*
3. **Lancement du Plan d'Action Annuel** : Saisir les nouvelles décisions d'investissement et d'arbitrage dans les plans d'action individuels.
4. **Communication d'une Synthèse "Flash" aux Équipes** : Rédiger une note d'information d'une demi-page résumant les 3 grandes décisions de la Direction et la diffuser à l'ensemble du personnel pour entretenir la dynamique.
"""

tool07_next_steps_html = """<ul>
  <li><strong>Émargement Obligatoire :</strong> Faire signer le procès-verbal par le DG et tous les participants au comité.</li>
  <li><strong>Preuve Clé d'Audit ISO 9001 :</strong> Archiver le PDF scanné dans <code>01_DIRECTION_STRATEGIE/PV_REVUE_DIRECTION_2026.pdf</code>. <em>(Ce document est la preuve N°1 exigée par l'auditeur ISO 9001)</em>.</li>
  <li><strong>Lancement des Arbitrages Budgétaires :</strong> Intégrer les décisions validées dans les budgets et plans d'action des services.</li>
  <li><strong>Communication "Flash" du DG :</strong> Diffuser une note synthétique d'une demi-page aux salariés résumant les décisions clés de l'année.</li>
</ul>"""

tool07_md = """# 🧰 OUTIL 07 : PROCÈS-VERBAL DE REVUE DE DIRECTION (7 POINTS ISO 9001)

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 9.3 - **Question d'Audit** : Q7

---

## 💡 UTILITÉ & MODE D'EMPLOI RAPIDE

* **Utilité Business** : Structurer le bilan annuel de la Direction selon les 7 exigences normatives ISO 9001 et consigner les arbitrages budgétaires et d'investissement.
* **Mode d'emploi** : Compléter les 7 rubriques de l'ordre du jour et faire apposer les signatures officielles.

---

## 📝 MODÈLE DE PV DE REVUE DE DIRECTION PRÊT À REMPLIR

```text
=================================================================================
                 PROCÈS-VERBAL DE REVUE DE DIRECTION COMPLÈTE
=================================================================================
Société : [Nom de l'Entreprise] | Date : [Date de la réunion]
Présents : [Nom du DG, Responsable Qualité, Responsable Opérations, Responsable Commercial]

1. ÉTAT DES ACTIONS DE LA REVUE PRÉCÉDENTE :
   - Action 1 : Mise en place de la GED 30s ──► [🟢 Finalisée]
   - Action 2 : Formation de 2 opérateurs ──► [🟢 Finalisée]

2. ÉVOLUTION DES ENJEUX INTERNES / EXTERNES (SWOT & PESTEL) :
   - Hausse constatée des matières premières de +12% ──► Décision d'indexer nos devis.

3. INFORMATIONS SUR LA PERFORMANCE DU SMQ :
   - Satisfaction client & Réclamations : 96% de clients satisfaits, 4 réclamations clôturées.
   - Atteinte des objectifs SMART : 4 objectifs sur 5 atteints.
   - Non-conformités et coûts cachés : Coût total de non-qualité ramené à 1.2% du CA.
   - Résultats des audits internes : Audit réalisé le 15/01 (1 écart mineur corrigé).
   - Performance des fournisseurs : 2 fournisseurs principaux évalués à 17/20.

4. ADÉQUATION DES RESSOURCES :
   - Ressources humaines et compétences à jour.
   - Nécessité d'acquérir une nouvelle imprimante d'étiquettes code-barres pour l'atelier.

5. EFFICACITÉ DES ACTIONS FACE AUX RISQUES (AMDEC) :
   - Le risque de rupture approvisionnement a été neutralisé par l'homologation du 2ème fournisseur.

6. OPPORTUNITÉS D'AMÉLIORATION & ROI ESTIMÉ :
   - Automatisation des remontées d'indicateurs sur dashboard digital (Gain estimé : 5h/mois).

7. DÉCISIONS & ARBITRAGES BUDGETAIRES DE LA DIRECTION :
   - Décision 1 : Budget de 3 500 € validé pour la formation polyvalence atelier.
   - Décision 2 : Validation du programme d'audit interne pour l'année à venir.

Signatures des Participants :

DG : ___________________________        QSE : ___________________________
=================================================================================
```

---

""" + tool07_next_steps_md

with open(os.path.join(out_md, "OUTIL_07_REVUE_DIRECTION.md"), "w", encoding="utf-8") as f:
    f.write(tool07_md)
with open(os.path.join(out_html, "OUTIL_07_REVUE_DIRECTION.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 07 - PV Revue de Direction",
        code="OUTIL_07",
        clause="Clause 9.3",
        q_num="Q7",
        utility="Valider le bilan annuel de la Direction selon les 7 points normatifs ISO 9001 et fixer les budgets.",
        instructions="Remplir le PV lors du comité de direction et faire signer les responsables.",
        body_content=f"<pre class=\"template-box\">{tool07_md.split('## 📝 MODÈLE DE PV DE REVUE DE DIRECTION PRÊT À REMPLIR\n\n```text\n')[1].split('```')[0]}</pre>",
        next_steps_html=tool07_next_steps_html
    ))

print("Successfully updated all 8 tools for Sequence 1 with Next Steps section in Markdown and HTML!")
