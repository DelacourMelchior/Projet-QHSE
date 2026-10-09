import os
import subprocess

out_md = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/outils_qualite/sequence_1"
out_html = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/.tmp/outils_qualite/sequence_1"

os.makedirs(out_md, exist_ok=True)
os.makedirs(out_html, exist_ok=True)

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
    max-width: 1050px;
    margin: 30px auto;
    background: #ffffff;
    padding: 50px;
    border: 1px solid var(--sb-accent);
    box-shadow: 0 12px 35px rgba(10, 18, 16, 0.06);
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
  .logo-svg {{ width: 50px; height: 44px; }}
  .brand-text h1 {{
    font-family: 'Playfair Display', serif;
    font-size: 24px;
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
    padding: 7px 16px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    border-radius: 2px;
  }}
  .tool-title-box {{
    background: var(--sb-cream);
    border: 1px solid var(--sb-accent);
    padding: 25px 30px;
    margin-bottom: 30px;
    border-left: 6px solid var(--gold);
  }}
  .tool-title-box h2 {{
    font-family: 'Playfair Display', serif;
    font-size: 26px;
    color: var(--sb-green-dark);
    margin: 0 0 8px 0;
  }}
  .tool-clause {{
    display: inline-block;
    background: var(--sb-green-dark);
    color: var(--gold);
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 2px;
    margin-bottom: 10px;
  }}
  
  /* CONSULTANT & THEMES BOX */
  .consultant-themes-box {{
    background: #f7f9f8;
    border: 1px solid var(--sb-green-light);
    border-left: 6px solid var(--sb-green-dark);
    padding: 24px 28px;
    margin-bottom: 30px;
    border-radius: 2px;
  }}
  .consultant-themes-box h3 {{
    font-family: 'Playfair Display', serif;
    font-size: 19px;
    color: var(--sb-green-dark);
    margin: 0 0 12px 0;
    border-bottom: 1px solid var(--sb-accent);
    padding-bottom: 6px;
  }}
  .consultant-advice {{
    font-size: 13px;
    margin-bottom: 15px;
    background: #ffffff;
    padding: 12px 16px;
    border: 1px solid var(--sb-accent);
    border-radius: 2px;
  }}
  .themes-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    font-size: 12.5px;
  }}
  .theme-card {{
    background: #ffffff;
    padding: 12px 15px;
    border: 1px solid var(--sb-accent);
  }}
  .theme-card strong {{
    color: var(--sb-green-dark);
    display: block;
    margin-bottom: 5px;
    font-size: 13px;
  }}

  .why-box {{
    background: #fdfbf7;
    border: 1px solid var(--gold);
    padding: 22px 25px;
    margin-bottom: 30px;
    border-radius: 2px;
  }}
  .why-box h3 {{
    font-family: 'Playfair Display', serif;
    font-size: 19px;
    color: var(--sb-green-dark);
    margin: 0 0 12px 0;
    border-bottom: 1px solid var(--gold);
    padding-bottom: 5px;
  }}
  .why-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    font-size: 13px;
  }}
  .why-column ul {{ margin: 5px 0 0 0; padding-left: 18px; }}
  .why-column.gains {{ color: #1b5e20; }}
  .why-column.risques {{ color: #b71c1c; }}

  .guide-box {{
    background: #ffffff;
    border: 1px solid var(--sb-accent);
    padding: 22px 25px;
    margin-bottom: 35px;
    font-size: 13px;
    border-radius: 2px;
    border-left: 4px solid var(--sb-green-dark);
  }}
  .guide-box h3 {{
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: var(--sb-green-dark);
    margin: 0 0 12px 0;
  }}
  .guide-box ol {{ margin: 0; padding-left: 20px; }}
  .guide-box li {{ margin-bottom: 8px; }}

  h3.section-subtitle {{
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    color: var(--sb-green-dark);
    border-bottom: 2px solid var(--gold);
    padding-bottom: 6px;
    margin: 35px 0 20px 0;
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
    padding: 11px 12px;
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
    padding: 25px;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.55;
    white-space: pre-wrap;
    margin: 15px 0;
    color: #152822;
  }}

  .next-steps-box {{
    background: var(--sb-cream);
    border: 1px solid var(--gold);
    border-left: 5px solid var(--sb-green-dark);
    padding: 22px 25px;
    margin-top: 40px;
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
  .next-steps-box li {{ margin-bottom: 8px; }}

  .footer {{
    text-align: center;
    margin-top: 50px;
    padding-top: 25px;
    border-top: 1px solid var(--sb-accent);
    font-size: 11px;
    color: var(--sb-green-light);
  }}

  @media print {{
    body {{ background: #ffffff; }}
    .container {{ border: none; box-shadow: none; padding: 0; margin: 0; max-width: 100%; }}
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

  <!-- Upstream Consultant Advice & Themes Box -->
  <div class="consultant-themes-box">
    <h3>🧠 CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER</h3>
    <div class="consultant-advice">
      <strong>💡 Posture & Posture d'Animation :</strong> {advice_text}
    </div>
    <div class="themes-grid">
      {themes_html}
    </div>
  </div>

  <!-- Why Section -->
  <div class="why-box">
    <h3>💎 POURQUOI CET OUTIL EST-IL CAPITAL POUR VOTRE PME ?</h3>
    <div class="why-grid">
      <div class="why-column gains">
        <strong>🟢 Ce que vous gagnez à l'utiliser :</strong>
        {gains_html}
      </div>
      <div class="why-column risques">
        <strong>🔴 Ce que vous risquez sans cet outil :</strong>
        {risques_html}
      </div>
    </div>
  </div>

  <!-- Guide Step-by-Step -->
  <div class="guide-box">
    <h3>📘 GUIDE DE REMPLISSAGE PAS À PAS (4 ÉTAPES)</h3>
    {guide_html}
  </div>

  <!-- Main Model Content -->
  <div class="tool-body">
    <h3 class="section-subtitle">📝 LE MODÈLE COMPLÈTEMENT DÉTAILLÉ PRÊT À REMPLIR</h3>
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
    Document Référentiel Prêt à l'Emploi (Séquence 1 : Gouvernance & Direction)
  </div>

</div>

</body>
</html>
"""

# =============================================================================
# TOOL 01A : SWOT
# =============================================================================
swot_advice = "Le SWOT ne doit pas être un exercice littéraire théorique. Concentrez l'échange avec le dirigeant sur ce qui fait perdre des sous ou du temps au quotidien (faiblesses/menaces) et sur ce qui rapporte de la marge (forces/opportunités)."
swot_themes_html = """
<div class="theme-card"><strong>1. Thématiques "FORCES" :</strong> Savoir-faire technique rare, équipe expérimentée stable, parc machines récents, réactivité devis &lt; 24h, certification ISO, proximité client.</div>
<div class="theme-card"><strong>2. Thématiques "FAIBLESSES" :</strong> Goulot d'étranglement sur 1 personne (homme-clé), absence de GED, devis complexes signés à perte, coûts de non-qualité non suivis.</div>
<div class="theme-card"><strong>3. Thématiques "OPPORTUNITÉS" :</strong> Exigence ISO 9001 chez les grands comptes régionaux, défaillance d'un concurrent direct, subventions régionales transition numérique.</div>
<div class="theme-card"><strong>4. Thématiques "MENACES" :</strong> Hausse du prix des matières premières/énergie, pénurie de main d'œuvre qualifiée, durcissement des taxes sur les déchets industriels.</div>
"""
swot_gains = "<ul><li>Vision 360° des atouts et vulnérabilités.</li><li>Valorisation financière des menaces pour protéger la marge.</li><li>Boussole stratégique pour l'audit ISO.</li></ul>"
swot_risques = "<ul><li>Navigation à vue sans anticipation.</li><li>Coûts cachés non maîtrisés.</li><li>Non-conformité majeure d'audit (Clause 4.1).</li></ul>"
swot_guide = "<ol><li>Réunir DG + Com + Prod + QSE.</li><li>Séparer Interne vs Externe.</li><li>Inscrire 3 à 5 éléments factuels chiffrés par quadrant.</li><li>Basculer chaque faiblesse/menace rouge dans l'AMDEC (Outil 05).</li></ol>"
swot_next_html = "<ul><li>Validation en Comité de Direction.</li><li>Transfert vers l'AMDEC (Outil 05).</li><li>Archivage sous <code>01_DIRECTION_STRATEGIE/SWOT_2026.pdf</code>.</li></ul>"
swot_html_body = """
<div class="quadrant-grid">
  <div class="quadrant-box forces">
    <h4 style="color:#2e7d32;">🟢 1. FORCES (Forces Internes)</h4>
    <ul>
      <li>Savoir-faire technique reconnu &amp; équipe stable (8 ans ancienneté).</li>
      <li>Parc machines récent &amp; disponible à 95%.</li>
      <li>Proximité client &amp; devis transmis sous 24h.</li>
      <li>Taux de réclamation client &lt; 0.8%.</li>
      <li><code>[Votre Force 1] : ______________________</code></li>
    </ul>
  </div>
  <div class="quadrant-box faiblesses">
    <h4 style="color:#c62828;">🔴 2. FAIBLESSES (Faiblesses Internes)</h4>
    <ul>
      <li>Dépendance forte envers 1 cadre homme-clé.</li>
      <li>Absence de GED (perte de 45 min/jour à chercher l'info).</li>
      <li>Absence de suivi chiffré des coûts de non-qualité.</li>
      <li>Délais de chiffrage devis complexes &gt; 5 jours.</li>
      <li><code>[Votre Faiblesse 1] : __________________</code></li>
    </ul>
  </div>
  <div class="quadrant-box opportunites">
    <h4 style="color:#0277bd;">🔵 3. OPPORTUNITÉS (Externes)</h4>
    <ul>
      <li>Exigence forte de certification ISO par les grands comptes.</li>
      <li>Recul d'un concurrent direct sur le bassin régional.</li>
      <li>Subventions régionales pour la transition numérique/GED.</li>
      <li>Nouveaux besoins sur-mesure chez nos 3 gros clients.</li>
      <li><code>[Votre Opportunité 1] : ______________</code></li>
    </ul>
  </div>
  <div class="quadrant-box menaces">
    <h4 style="color:#e65100;">🟠 4. MENACES (Externes)</h4>
    <ul>
      <li>Hausse des prix des matières premières (+15%/an).</li>
      <li>Pénurie de main d'œuvre technique sur le secteur.</li>
      <li>Nouvelles exigences environnementales / bilan carbone.</li>
      <li>Pression à la baisse des prix par les acheteurs.</li>
      <li><code>[Votre Menace 1] : ___________________</code></li>
    </ul>
  </div>
</div>
<h3 class="section-subtitle">🎯 MATRICE DE CROISEMENT ET PLAN D'ACTION STRATÉGIQUE</h3>
<table>
  <tr><th>Axe Stratégique</th><th>Problème Clé Issu du SWOT</th><th>Action Stratégique à Lancer</th><th>Responsable</th><th>Échéance</th><th>Budget / ROI</th></tr>
  <tr><td><strong>Sécurisation (S-W)</strong></td><td>Dépendance homme-clé en atelier</td><td>Rédaction fiches poste + binômage polyvalence</td><td>Resp. Prod</td><td>31/03</td><td>ROI : Évite arrêt prod</td></tr>
  <tr><td><strong>Protection Marge (S-T)</strong></td><td>Hausse coûts matières premières</td><td>Indexation automatique des devis sur cours d'achat</td><td>Resp. Com</td><td>Immédiat</td><td>Évite -45k€ de perte</td></tr>
  <tr><td><strong>Gain de Temps (W-O)</strong></td><td>Recherche documentaire pénible</td><td>Déploiement de l'arborescence GED simplifiée</td><td>Resp. IT/QSE</td><td>30/04</td><td>Gain : 5h/semaine/pers</td></tr>
  <tr><td><strong>Croissance (S-O)</strong></td><td>Demande ISO 9001 des clients</td><td>Obtention du certificat ISO 9001 et communication</td><td>DG / QSE</td><td>30/06</td><td>+80k€ CA visé</td></tr>
</table>
"""

swot_md = f"""# 🧰 OUTIL 01A : MATRICE SWOT STRATÉGIQUE PRÊTE À REMPLIR

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 4.1 - **Question d'Audit** : Q1

---

## 🧠 CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER

### 💡 Posture & Animation :
*{swot_advice}*

### 📌 Banques d'Idées & Thématiques par Quadrant :
1. **Thématiques "FORCES"** : Savoir-faire technique rare, équipe expérimentée stable, parc machines récents, réactivité devis < 24h, certification ISO, proximité client.
2. **Thématiques "FAIBLESSES"** : Goulot d'étranglement sur 1 personne (homme-clé), absence de GED, devis complexes signés à perte, coûts de non-qualité non suivis.
3. **Thématiques "OPPORTUNITÉS"** : Exigence ISO 9001 chez les grands comptes régionaux, défaillance d'un concurrent direct, subventions régionales transition numérique.
4. **Thématiques "MENACES"** : Hausse du prix des matières premières/énergie, pénurie de main d'œuvre qualifiée, durcissement des taxes sur les déchets industriels.

---

## 💎 POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE PME ?

### 🟢 Ce que vous gagnez à l'utiliser :
* **Vision stratégique claire à 360°** : Vous identifiez en 1 heure les vrais leviers de croissance.
* **Protection de vos bénéfices** : Vous éliminez les faiblesses internes avant qu'elles ne détruisent vos marges.
* **Sérénité face aux audits ISO** : Le SWOT est la preuve N°1 exigée par l'auditeur (Clause 4.1).

### 🔴 Ce que vous risquez sans cet outil :
* **Navigation à vue** : Prise de décisions à l'intuition sans anticiper les défaillances.
* **Coûts cachés explosifs** : Persistance de faiblesses organisationnelles (retards, erreurs de devis).
* **Non-conformité majeure d'audit** : Refus de certification ISO 9001.

---

## 📘 GUIDE DE REMPLISSAGE PAS À PAS (4 ÉTAPES)

1. **Constituer l'équipe d'atelier (1h chrono)** : Réunir DG, Responsable Commercial, Chef d'Atelier, QSE.
2. **Distinguer l'Interne vs l'Externe** : L'interne concerne votre PME ; l'externe concerne le marché.
3. **Inscrire 3 à 5 éléments factuels par quadrant** : Bannir les généralités floues.
4. **Croiser les axes pour le plan d'action** : Définir 1 action concrète pour corriger chaque faiblesse/menace.

---

## 📝 LA MATRICE SWOT COMPLÈTE (4 QUADRANTS SÉPARÉS)

### 🟢 1. FORCES (Atouts Internes de votre PME)
* [Exemple PME 1] Savoir-faire technique reconnu et haute compétence des opérateurs (ancienneté moyenne 8 ans).
* [Exemple PME 2] Parc machines récent, entretenu en maintenance préventive avec fort taux de disponibilité (95%).
* [Exemple PME 3] Proximité client et ultra-réactivité commerciale (Devis standards transmis sous 24h).
* `[Votre Force 1]` : ____________________________________________________________________

### 🔴 2. FAIBLESSES (Fragilités Internes de votre PME)
* [Exemple PME 1] Dépendance forte envers 1 cadre homme-clé en atelier (aucun binôme formé).
* [Exemple PME 2] Absence de GED (perte de temps estimée à 45 min/jour/salarié).
* `[Votre Faiblesse 1]` : ________________________________________________________________

### 🔵 3. OPPORTUNITÉS (Opportunités Externes de Marché)
* [Exemple PME 1] Exigence croissante de la certification ISO 9001 par les donneurs d'ordres régionaux.
* [Exemple PME 2] Défaillance d'un concurrent local permettant de récupérer des parts de marché.
* `[Votre Opportunité 1]` : ______________________________________________________________

### 🟠 4. MENACES (Menaces Externes du Marché)
* [Exemple PME 1] Augmentation brutale des prix des matières premières et de l'énergie (+15%).
* [Exemple PME 2] Pénurie de main d'œuvre qualifiée sur le bassin d'emploi.
* `[Votre Menace 1]` : __________________________________________________________________

---

## 🎯 MATRICE DE CROISEMENT ET PLAN D'ACTION STRATÉGIQUE

| Axe Stratégique | Problème Clé Issu du SWOT | Action Stratégique à Lancer | Responsable | Échéance | Budget / ROI |
| :--- | :--- | :--- | :--- | :-: | :-: |
| **Sécurisation (S-W)** | Dépendance homme-clé en atelier | Rédaction fiches poste + binômage polyvalence | Resp. Prod | 31/03 | ROI : Évite arrêt prod |
| **Protection Marge (S-T)** | Hausse coûts matières premières | Indexation automatique des devis sur cours d'achat | Resp. Com | Immédiat | Évite -45k€ de perte |
| **Gain de Temps (W-O)** | Recherche documentaire pénible | Déploiement de l'arborescence GED simplifiée | Resp. IT/QSE | 30/04 | Gain : 5h/semaine/pers |
| **Croissance (S-O)** | Demande ISO 9001 des clients | Obtention du certificat ISO 9001 et communication | DG / QSE | 30/06 | +80k€ CA visé |

---

## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Validation officielle en Comité de Direction** : Faire relire et émarger par le DG.
2. **Transfert vers le Registre AMDEC (Outil 05)** : Importer chaque *Faiblesse* et *Menace* rouge dans l'AMDEC.
3. **Classement GED** : Enregistrer le PDF finalisé sous `01_DIRECTION_STRATEGIE/SWOT_2026.pdf`.
"""

with open(os.path.join(out_md, "OUTIL_01A_SWOT.md"), "w", encoding="utf-8") as f:
    f.write(swot_md)
with open(os.path.join(out_html, "OUTIL_01A_SWOT.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 01A - Matrice SWOT Ultra-Détaillée",
        code="OUTIL_01A",
        clause="Clause 4.1",
        q_num="Q1",
        utility="Analyser les 4 piliers stratégiques de votre PME pour bâtir une stratégie Qualité & ROI incontestable.",
        instructions="Compléter les 4 quadrants ci-dessous avec les données réelles de votre entreprise et décliner 3 actions prioritaires.",
        advice_text=swot_advice,
        themes_html=swot_themes_html,
        gains_html=swot_gains,
        risques_html=swot_risques,
        guide_html=swot_guide,
        body_content=swot_html_body,
        next_steps_html=swot_next_html
    ))

# =============================================================================
# TOOL 01B : PESTEL
# =============================================================================
pestel_advice = "Ne traitez pas la géopolitique internationale globale. Rapprochez chaque lettre PESTEL de l'impact direct sur la facture et le carnet de commandes de votre PME."
pestel_themes_html = """
<div class="theme-card"><strong>1. Politique &amp; Économique :</strong> Aides régionales Industrie 4.0, hausse du KWh gaz/élec atelier, inflation aciers/alu, hausse des frais de transport.</div>
<div class="theme-card"><strong>2. Social &amp; Technologique :</strong> Pyramide des âges (départs retraite sous 2 ans), turn-over jeunes, obsolescence ERP, risque cyberattaque ransomware.</div>
<div class="theme-card"><strong>3. Écologique :</strong> Traitement des huiles/effluents, compactage des copeaux, bilan carbone réclamé par les clients grands comptes.</div>
<div class="theme-card"><strong>4. Légal &amp; Réglementaire :</strong> Mise à jour DUERP (Document Unique Sécurité), contrôle CE machines, règles RGPD fichiers clients/fournisseurs.</div>
"""
pestel_gains = "<ul><li>Anticipation des chocs d'inflation et d'énergie.</li><li>Protection proactive des marges brutes.</li><li>Captation de subventions d'aide à l'investissement PME.</li></ul>"
pestel_risques = "<ul><li>Marge détruite par des hausses de coûts non répercutées.</li><li>Amendes ou arrêts de production pour non-respect des normes.</li><li>Non-conformité majeure ISO 9001 (Clause 4.1).</li></ul>"
pestel_guide = "<ol><li>Parcourir les 6 Piliers PESTEL.</li><li>Renseigner 2 à 3 facteurs réels par pilier.</li><li>Attribuer l'impact (🟢/🟠/🔴).</li><li>Programmer 1 action par risque rouge dans l'AMDEC (Outil 05).</li></ol>"
pestel_next_html = "<ul><li>Validation en Comité de Direction.</li><li>Bascule vers le Registre AMDEC (Outil 05).</li><li>Archivage sous <code>01_DIRECTION_STRATEGIE/PESTEL_2026.pdf</code>.</li></ul>"
pestel_table_md = """| Pilier PESTEL | Facteurs d'Influence à Examiner dans votre PME | Impact Estimé | Action Préventive / Opportunité à Saisir | Responsable |
| :--- | :--- | :-: | :--- | :--- |
| **🏛️ POLITIQUE (P)** | Subventions régionales pour la transition numérique et achat de machines. | 🟢 Opportunité | Monter un dossier d'aide régionale à l'investissement PME | DG / RAF |
| **💶 ÉCONOMIQUE (E)** | Volatilité et hausse continue du prix des matières premières (acier/alu +15%). | 🔴 Risque Fort | Inclure une clause de révision tarifaire trimestrielle sur devis | Resp. Com |
| **👥 SOCIAL (S)** | Pénurie de profils qualifiés (techniciens de maintenance, usîneurs). | 🔴 Risque Fort | Déployer la matrice de polyvalence (Outil 22) et tutorat | RH / Prod |
| **💻 TECHNOLOGIQUE (T)** | Digitalisation des processus : nécessité d'automatiser les données atelier. | 🟠 Risque Moyen | Implémenter un ERP/GED Cloud pour supprimer le papier | Resp. IT |
| **🌿 ÉCOLOGIQUE (E)** | Exigence croissante des clients grands comptes sur le bilan carbone et le tri. | 🟢 Opportunité | Structurer la filière de recyclage des chutes et communiquer | Resp. QSE |
| **⚖️ LÉGAL (L)** | Évolutions du code du travail (Document Unique Sécurité - DUERP). | 🟢 Conforme | Mettre à jour le DUERP annuel et le programme de prévention | Resp. QSE |
| `[Votre Pilier]` | `[Votre Facteur]` | 🔴/🟠/🟢 | `[Votre Action]` | `[Nom]` |
"""

pestel_md = f"""# 🧰 OUTIL 01B : MATRICE PESTEL COMPLÈTE (6 PILIERS D'ANALYSE)

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 4.1 - **Question d'Audit** : Q1

---

## 🧠 CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER

### 💡 Posture & Animation :
*{pestel_advice}*

### 📌 Banques d'Idées & Thématiques PESTEL PME :
1. **Politique & Économique** : Aides régionales Industrie 4.0, hausse du KWh gaz/élec atelier, inflation aciers/alu, hausse des frais de transport.
2. **Social & Technologique** : Pyramide des âges (départs retraite sous 2 ans), turn-over jeunes, obsolescence ERP, risque cyberattaque ransomware.
3. **Écologique** : Traitement des huiles/effluents, compactage des copeaux, bilan carbone réclamé par les clients grands comptes.
4. **Légal & Réglementaire** : Mise à jour DUERP (Document Unique Sécurité), contrôle CE machines, règles RGPD fichiers clients/fournisseurs.

---

## 💎 POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE PME ?

### 🟢 Ce que vous gagnez à l'utiliser :
* **Anticipation des chocs extérieurs** : Vous adaptez vos prix avant de perdre de la marge.
* **Captation d'aides publiques** : Identification des subventions régionales pour vos investissements PME.
* **Conformité totale ISO 9001** (Clause 4.1).

---

## 📝 LA MATRICE PESTEL COMPLÈTE PRÊTE À REMPLIR

{pestel_table_md}

---

## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Validation en Comité de Direction** : Présenter la synthèse au DG.
2. **Transfert vers l'AMDEC (Outil 05)** : Basculer les facteurs rouges dans l'AMDEC.
3. **GED** : Sauvegarder sous `01_DIRECTION_STRATEGIE/PESTEL_2026.pdf`.
"""

with open(os.path.join(out_md, "OUTIL_01B_PESTEL.md"), "w", encoding="utf-8") as f:
    f.write(pestel_md)
with open(os.path.join(out_html, "OUTIL_01B_PESTEL.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 01B - Matrice PESTEL Ultra-Détaillée",
        code="OUTIL_01B",
        clause="Clause 4.1",
        q_num="Q1",
        utility="Évaluer les 6 dimensions macro-économiques (PESTEL) pour protéger vos marges et anticiper les chocs.",
        instructions="Renseigner les facteurs d'influence dans chaque pilier et définir les actions prioritaires de protection.",
        advice_text=pestel_advice,
        themes_html=pestel_themes_html,
        gains_html=pestel_gains,
        risques_html=pestel_risques,
        guide_html=pestel_guide,
        body_content=md_table_to_html(pestel_table_md),
        next_steps_html=pestel_next_html
    ))

# =============================================================================
# TOOL 02 : PARTIES PRENANTES
# =============================================================================
t2_advice = "Demandez au dirigeant : Qui a le pouvoir de stopper vos livraisons, bloquer votre compte bancaire ou vous faire perdre votre plus gros client si vous commettez une erreur ?"
t2_themes_html = """
<div class="theme-card"><strong>1. Clients Grands Comptes :</strong> Exigence de certificats matières 3.1, contrôle tridimensionnel 3D, emballages spécifiques, livraison à H+0.</div>
<div class="theme-card"><strong>2. Fournisseurs Critiques :</strong> Transparence sur les stocks, respect des délais de livraison confirmés, réactivité sur FNC sous 48h.</div>
<div class="theme-card"><strong>3. Banques &amp; Assurances :</strong> Transmission des bilans certifiés au 30 avril, ratios d'EBE et fonds de roulement sains.</div>
<div class="theme-card"><strong>4. Équipes &amp; Organismes :</strong> DUERP Sécurité au poste, zéro accident, audit annuel ISO 9001, contrôles périodiques des ponts/extincteurs.</div>
"""
t2_gains = "<ul><li>Zéro litige contractuel avec les clients majeurs.</li><li>Sécurisation des approvisionnements fournisseurs.</li><li>Confiance renforcée avec les banques et l'organisme certificateur.</li></ul>"
t2_risques = "<ul><li>Pénalités de retard d'expédition (5%/jour).</li><li>Arrêt de production sur livraison de matières non conformes.</li><li>Non-conformité majeure ISO 9001 (Clause 4.2).</li></ul>"
t2_guide = "<ol><li>Lister les 5 catégories d'acteurs.</li><li>Renseigner les noms exacts de vos partenaires clés.</li><li>Formuler l'exigence non négociable.</li><li>Associer le document de preuve.</li></ol>"
t2_next_html = "<ul><li>Diffusion aux Ventes, Achats, RH et Prod.</li><li>Intégration dans les <strong>Grilles Fournisseurs (Outil 09)</strong> et <strong>Fiches Recette (Outil 17)</strong>.</li><li>GED : <code>01_DIRECTION_STRATEGIE/PARTIES_PRENANTES_2026.pdf</code>.</li></ul>"
t2_table_md = """| Catégorie | Nom / Acteur Réel PME | Exigence Critique Non Négociable | Risque Majeur si Non Respecté | Preuve ou Outil de Contrôle | Responsable Interne |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Clients Stratégiques** | Client Grand Compte ALFA | Livraison sous 48h maxi avec certificat de conformité | Pénalité de retard de 5%/jour + risque de déréférencement | Bon de livraison émargé + PV de contrôle signé (Outil 17) | Dir. Commercial |
| **2. Fournisseurs Critiques** | Fournisseur Métaux ACIER-X | Matières premières 100% conformes aux spécifications | Pièces défectueuses fabriquées + arrêt chaîne prod | Certificat 3.1 archivé GED + Grille d'évaluation (Outil 09) | Resp. Achats |
| **3. Financeurs / Banques** | Banque Régionale Z | Transmission des comptes certifiés et ratios de trésorerie | Refus de renouvellement de la ligne de découvert/crédit | Tableau de bord de trésorerie mensuel + Bilan annuel | RAF / DG |
| **4. Salariés & CSE** | Équipes de Production Atelier | Respect des règles de sécurité (EPI) et paiement fixe | Accidents du travail + démissions des cadres clés | Document Unique (DUERP) à jour + Registre formations | RH / QSE |
| **5. Organismes / État** | Organisme Certification ISO | Réalisation de l'audit annuel ISO 9001 sans écart majeur | Perte du certificat ISO 9001 (exigé sur les devis) | PV de Revue de Direction (Outil 07) + Rapports d'audits | Resp. QSE |
| `[Votre Catégorie]` | `[Nom du Partenaire]` | `[Exigence non négociable]` | `[Risque identifié]` | `[Document de preuve]` | `[Nom]` |
"""

tool02_md = f"""# 🧰 OUTIL 02 : CARTOGRAPHIE DES PARTIES PRENANTES STRATÉGIQUES

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 4.2 - **Question d'Audit** : Q2

---

## 🧠 CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER

### 💡 Posture & Animation :
*{t2_advice}*

### 📌 Banques d'Idées & Thématiques Parties Prenantes :
1. **Clients Grands Comptes** : Exigence de certificats matières 3.1, contrôle tridimensionnel 3D, emballages spécifiques, livraison à H+0.
2. **Fournisseurs Critiques** : Transparence sur les stocks, respect des délais de livraison confirmés, réactivité sur FNC sous 48h.
3. **Partenaires Financiers** : Transmission des bilans certifiés au 30 avril, ratios d'EBE et fonds de roulement sains.
4. **Équipes & Organismes** : DUERP Sécurité au poste, zéro accident, audit annuel ISO 9001, contrôles périodiques des ponts/extincteurs.

---

## 💎 POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE PME ?

### 🟢 Ce que vous gagnez à l'utiliser :
* **Zéro litige contractuel** : Vous connaissez exactement les exigences non négociables.
* **Sécurisation approvisionnement** : Vos fournisseurs apportent les preuves de conformité.
* **Conformité totale ISO 9001** (Clause 4.2).

---

## 📝 LE MODÈLE DÉTAILLÉ PRÊT À REMPLIR

{t2_table_md}

---

## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Diffusion aux Métiers** : Ventes, Achats, RH, Prod.
2. **Intégration aux Contrôles** : Intégrer les exigences clés dans les **Outils 09 et 17**.
3. **GED** : Sauvegarder sous `01_DIRECTION_STRATEGIE/PARTIES_PRENANTES_2026.pdf`.
"""

with open(os.path.join(out_md, "OUTIL_02_PARTIES_PRENANTES.md"), "w", encoding="utf-8") as f:
    f.write(tool02_md)
with open(os.path.join(out_html, "OUTIL_02_PARTIES_PRENANTES.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 02 - Parties Prenantes Ultra-Détaillé",
        code="OUTIL_02",
        clause="Clause 4.2",
        q_num="Q2",
        utility="Recenser les exigences obligatoires des 5 acteurs clés de votre écosystème pour zéro litige.",
        instructions="Remplir la grille ci-dessous pour chaque catégorie de partie prenante de votre PME.",
        advice_text=t2_advice,
        themes_html=t2_themes_html,
        gains_html=t2_gains,
        risques_html=t2_risques,
        guide_html=t2_guide,
        body_content=md_table_to_html(t2_table_md),
        next_steps_html=t2_next_html
    ))

# =============================================================================
# TOOL 03 : DASHBOARD DIRECTION
# =============================================================================
t3_advice = "Moins c'est mieux ! Limitez-vous strictement à 5 indicateurs vitaux. S'ils sont tous au vert, l'entreprise gagne de l'argent et sert ses clients sans stress."
t3_themes_html = """
<div class="theme-card"><strong>1. Financier :</strong> CA mensuel HT vs budget, Marge brute % globale (seuil min 35%).</div>
<div class="theme-card"><strong>2. Qualité :</strong> Coût total de non-qualité (€) = coût des rebuts + heures de retouches.</div>
<div class="theme-card"><strong>3. Client &amp; Opérations :</strong> Net Promoter Score (NPS), Taux de respect des délais d'expédition (OTD %).</div>
<div class="theme-card"><strong>4. RH &amp; Sécurité :</strong> Nombre d'accidents du travail avec ou sans arrêt (objectif zéro).</div>
"""
t3_gains = "<ul><li>Pilotage aux faits en 10 minutes par mois.</li><li>Sauvegarde de la marge brute dès la fin du mois M.</li><li>Reconstitution immédiate des coûts de non-qualité.</li></ul>"
t3_risques = "<ul><li>S'apercevoir des pertes 6 mois trop tard lors du bilan comptable.</li><li>Accumulation de retards de livraison entraînant la perte de clients.</li><li>Non-conformité majeure ISO 9001 (Clauses 5.1 & 9.1).</li></ul>"
t3_guide = "<ol><li>Saisie mensuelle fixe le 1er du mois (10 min).</li><li>Renseigner les réels du mois M.</li><li>Vérifier les alertes (🟢/🟠/🔴).</li><li>Si ROUGE, réunion de crise 15 min + Fiche FNC 5 Pourquoi (Outil 19).</li></ol>"
t3_next_html = "<ul><li>Saisie mensuelle au 1er du mois.</li><li>Animation du Comité de Direction.</li><li>Affichage du Taux de Service en atelier.</li><li>GED : <code>01_DIRECTION_STRATEGIE/DASHBOARDS_2026/</code>.</li></ul>"
t3_table_md = """| Axe Métier | Indicateur Clé (KPI) | Formule Exacte de Calcul | Valeur Cible | Mois M-1 | Mois M (Réel) | Statut | Plan d'Action d'Urgence si Alerte |
| :--- | :--- | :--- | :-: | :-: | :-: | :-: | :--- |
| **1. Financier** | Chiffre d'Affaires Mensuel (€) | Somme des factures émises HT | ≥ 350 k€ | 340 k€ | **362 k€** | 🟢 Conforme | Ras (Objectif dépassé) |
| **1. Financier** | Marge Brute Globale (%) | (CA HT - Coûts direct d'achat) / CA | ≥ 38 % | 36.5 % | **34.2 %** | 🔴 Alerte | Bloquer la signature devis sous 35% de marge |
| **2. Qualité** | Coût de Non-Qualité (€) | Coût pièces jetées + heures retouches | ≤ 3 000 € | 5 400 € | **4 100 €** | 🟠 À surveiller | Analyser la plus grosse FNC du mois (Outil 19) |
| **3. Client** | Satisfaction Client (NPS) | Score net issu des enquêtes flash | ≥ 45 | 42 | **48** | 🟢 Conforme | Ras |
| **4. Opérations** | Taux de Service / Délais (%) | (Livraisons à date / Livraisons tot.) x 100 | ≥ 95 % | 92.0 % | **96.5 %** | 🟢 Conforme | Ras |
| **5. Sécurité/RH**| Accidents du travail (Taux Freq) | Nb d'accidents avec arrêt / Heures travaillées | 0 accident | 0 | **0** | 🟢 Conforme | Ras |
"""

tool03_md = f"""# 🧰 OUTIL 03 : TABLEAU DE BORD DE PILOTAGE DIRECTION (5 AXES DATA)

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 5.1 & 9.1 - **Question d'Audit** : Q3 & Q26

---

## 🧠 CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER

### 💡 Posture & Animation :
*{t3_advice}*

### 📌 Banques d'Idées & KPIs Recommandés PME :
1. **Financier** : CA mensuel HT vs budget, Marge brute % globale (seuil min 35%).
2. **Qualité** : Coût total de non-qualité (€) = coût des rebuts + heures de retouches.
3. **Client & Opérations** : Net Promoter Score (NPS), Taux de respect des délais d'expédition (OTD %).
4. **RH & Sécurité** : Nombre d'accidents du travail avec ou sans arrêt (objectif zéro).

---

## 💎 POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE PME ?

### 🟢 Ce que vous gagnez à l'utiliser :
* **Pilotage aux faits en 10 minutes par mois**.
* **Sauvegarde de la marge brute le mois même**.

---

## 📝 LE TABLEAU DE BORD DÉTAILLÉ PRÊT À REMPLIR

{t3_table_md}

---

## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Saisie mensuelle au 1er du mois** (10 min).
2. **Comité de Direction** : Réunion de crise si case 🔴 ROUGE.
3. **GED** : Classer sous `01_DIRECTION_STRATEGIE/DASHBOARDS_2026/`.
"""

with open(os.path.join(out_md, "OUTIL_03_DASHBOARD_DIRECTION.md"), "w", encoding="utf-8") as f:
    f.write(tool03_md)
with open(os.path.join(out_html, "OUTIL_03_DASHBOARD_DIRECTION.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 03 - Dashboard Direction Ultra-Détaillé",
        code="OUTIL_03",
        clause="Clause 5.1 & 9.1",
        q_num="Q3 & Q26",
        utility="Piloter la performance globale de l'entreprise sur 5 axes métiers concrets.",
        instructions="Mettre à jour les chiffres une fois par mois et consigner les arbitrages en cas d'écart.",
        advice_text=t3_advice,
        themes_html=t3_themes_html,
        gains_html=t3_gains,
        risques_html=t3_risques,
        guide_html=t3_guide,
        body_content=md_table_to_html(t3_table_md),
        next_steps_html=t3_next_html
    ))

# =============================================================================
# TOOL 04 : POLITIQUE QUALITE
# =============================================================================
t4_advice = "Évitez le jargon d'audit théorique. La Politique Qualité doit se lire comme le contrat d'honneur du dirigeant envers ses salariés et ses clients."
t4_themes_html = """
<div class="theme-card"><strong>1. Zéro Gaspillage :</strong> Faire bien du premier coup, interdire le travail sans plan à jour, rejeter les affaires à perte.</div>
<div class="theme-card"><strong>2. Excellence Délais Client :</strong> Honorer 100% des dates de livraison promises, traiter toute alerte sous 24h.</div>
<div class="theme-card"><strong>3. Souveraineté du Savoir :</strong> Travailler dans la sécurité et le calme, formaliser les savoirs clés pour supprimer le stress des départs.</div>
"""
t4_gains = "<ul><li>Alignement de l'ensemble des équipes autour de 3 règles claires.</li><li>Crédibilité commerciale renforcée auprès des acheteurs grands comptes.</li><li>Conformité totale avec la Clause 5.2 ISO 9001.</li></ul>"
t4_risques = "<ul><li>Personnel désorienté sans priorités partagées.</li><li>Refus de certification ISO 9001 par manque d'engagement officiel.</li></ul>"
t4_guide = "<ol><li>Personnaliser les crochets <code>[...]</code>.</li><li>Revoir en Comité de Direction.</li><li>Signatures manuscrites du DG et du QSE.</li><li>Afficher en couleur et envoyer par email.</li></ol>"
t4_next_html = "<ul><li>Signatures manuscrites originales.</li><li>Affichage hall, salle de réunion, atelier.</li><li>Joindre au <strong>Livret d'Accueil (Outil 23)</strong>.</li><li>Publication sur le site Web PME.</li></ul>"
t4_text = """=================================================================================
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
   - Ne valider aucun devis ni contrat en dessous de notre seuil de marge brute cible (35%).

2. CHASSE AUX DÉLAIS & EXCELLENCE CLIENT :
   - Respecter 100% de nos engagements de livraison envers nos clients.
   - Prendre en charge et répondre à toute réclamation client sous 24 heures maximum.

3. SOUVERAINETÉ DU SAVOIR & SÉRÉNITÉ DES ÉQUIPES :
   - Clarifier les rôles de chacun (Matrice RACI) pour travailler sans stress ni dépendance.
   - Développer la polyvalence des compétences pour garantir la continuité d'activité.

DÉCLINAISON EN TABLEAUX DE BORD :
Ces engagements sont mesurés chaque mois à travers des indicateurs chiffrés (KPIs) 
revus lors de nos Comités de Direction.

La Direction s'engage à fournir les ressources humaines, matérielles et financières 
nécessaires à la réussite de cette démarche.

Signature de la Direction Générale :                     Signature du Responsable QSE :

________________________________________                  ________________________________________
[Nom & Prénom du DG]                                     [Nom & Prénom du QSE]
================================================================================="""

tool04_md = f"""# 🧰 OUTIL 04 : CHARTE COMPLÈTE DE POLITIQUE QUALITÉ & PERFORMANCE

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 5.2 - **Question d'Audit** : Q4

---

## 🧠 CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER

### 💡 Posture & Animation :
*{t4_advice}*

### 📌 Banques d'Idées & Piliers Engagements :
1. **Zéro Gaspillage** : Faire bien du premier coup, interdire le travail sans plan à jour, rejeter les affaires à perte.
2. **Excellence Délais Client** : Honorer 100% des dates de livraison promises, traiter toute alerte sous 24h.
3. **Souveraineté du Savoir** : Travailler dans la sécurité et le calme, formaliser les savoirs clés pour supprimer le stress des départs.

---

## 💎 POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE PME ?

### 🟢 Ce que vous gagnez à l'utiliser :
* **Fédération des salariés** : 3 règles claires et compréhensibles.
* **Crédibilité commerciale auprès des grands comptes**.

---

## 📝 LA CHARTE OFFICIELLE PRÊTE À SIGNER

```text
{t4_text}
```

---

## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Signatures manuscrites du DG et QSE**.
2. **Affichage dans les locaux & publication web**.
3. **Agrafer au Livret d'Accueil (Outil 23)**.
"""

with open(os.path.join(out_md, "OUTIL_04_POLITIQUE_QUALITE.md"), "w", encoding="utf-8") as f:
    f.write(tool04_md)
with open(os.path.join(out_html, "OUTIL_04_POLITIQUE_QUALITE.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 04 - Politique Qualité Ultra-Détaillée",
        code="OUTIL_04",
        clause="Clause 5.2",
        q_num="Q4",
        utility="Déclarer l'engagement officiel de la Direction et fixer la feuille de route stratégique.",
        instructions="Remplir la trame ci-dessous, apposer les signatures et diffuser dans l'entreprise.",
        advice_text=t4_advice,
        themes_html=t4_themes_html,
        gains_html=t4_gains,
        risques_html=t4_risques,
        guide_html=t4_guide,
        body_content=f"<pre class=\"template-box\">{t4_text}</pre>",
        next_steps_html=t4_next_html
    ))

# =============================================================================
# TOOL 05 : AMDEC RISQUES
# =============================================================================
t5_advice = "L'AMDEC est un outil d'arbitrage financier. Ne notez pas les risques selon les ressentis affectifs : appliquez la cotation F x G pour stopper les querelles et investir là où c'est vital."
t5_themes_html = """
<div class="theme-card"><strong>1. Risques Ventes &amp; Appro :</strong> Devis chiffré sans marge brute suffisante, fournisseur unique sur composant critique.</div>
<div class="theme-card"><strong>2. Risques Prod &amp; IT :</strong> Panne de machine unique sans contrat de maintenance préventive, perte des données suite virus IT.</div>
<div class="theme-card"><strong>3. Risques Humains &amp; Sécurité :</strong> Départ imprévu du seul régleur sans procédure écrite, accident du travail sur carter manquant.</div>
"""
t5_gains = "<ul><li>Priorisation scientifique des investissements par le chiffre (ROI).</li><li>Neutralisation des pannes et crises avant survenance.</li><li>Tranquillité d'esprit du dirigeant PME.</li></ul>"
t5_risques = "<ul><li>Argent gâché dans des actions secondaires sans impact.</li><li>Accident brutal d'activité non anticipé.</li><li>Non-conformité majeure ISO 9001 (Clause 6.1).</li></ul>"
t5_guide = "<ol><li>Noter Fréquence (F: 1-5) et Gravité (G: 1-5).</li><li>Calculer Score = F x G.</li><li>Si Score &ge; 10 (Zone Rouge), action préventive OBLIGATOIRE avec ROI.</li><li>Désigner 1 pilote et 1 date d'échéance.</li></ol>"
t5_next_html = "<ul><li>Validation budgétaire du DG.</li><li>Délégation des actions aux pilotes.</li><li>Raccordement à la **Feuille de Route SMART (Outil 06)**.</li><li>GED : <code>01_DIRECTION_STRATEGIE/REGISTRE_AMDEC_RISQUES.xlsx</code>.</li></ul>"
t5_table_md = """| N° | Risque / Vulnérabilité Identifiée | Cause Racine Identifiée | Fréq (1-5) | Grav (1-5) | Score (FxG) | Action Préventive à Déployer | Budget / ROI Estimé | Responsable | Statut |
| :-: | :--- | :--- | :-: | :-: | :-: | :--- | :-: | :--- | :-: |
| **R1** | Erreur de chiffrage sur devis complexe | Calcul de marge manuel sur fichier Excel | 3 | 4 | **12 (🔴)** | Imposer une grille de validation obligatoire devis > 10k€ | ROI : Évite 20k€ d'affaires à perte | Resp. Com | 🟢 Actif |
| **R2** | Rupture d'approvisionnement matière | Fournisseur unique sur composant X critique | 2 | 5 | **10 (🔴)** | Homologuer un 2ème fournisseur de secours sous 30 jours | Coût : 500€ d'essais | Resp. Achats | 🟢 Actif |
| **R3** | Panne prolongée machine découpe Laser | Défaut de maintenance préventive régulière | 2 | 4 | **8 (🟠)** | Souscrire contrat de maintenance préventive constructeur | Coût : 1 500€/an | Resp. Prod | 🟢 Actif |
| **R4** | Départ imprévu du Chef d'Atelier | Absences de procédures écrites au poste | 2 | 4 | **8 (🟠)** | Rédiger les modes opératoires et former un binôme | Temps interne 20h | RH / Prod | 🟢 Actif |
| **R5** | Pertes de données suite cyberattaque | Sauvegardes manuelles irrégulières serveur | 1 | 5 | **5 (🟡)** | Automatiser des sauvegardes Cloud quotidiennes | Coût : 30€/mois | Resp. IT | 🟢 Actif |
| **R6** | Accident du travail sur machine découpe | Protection carter retirée par l'opérateur | 1 | 5 | **5 (🟡)** | Remettre le carter + consigne visuelle de sécurité (Outil 14) | Temps interne 2h | Resp. QSE | 🟢 Actif |
| `[N°]` | `[Description du risque]` | `[Cause]` | `[1-5]` | `[1-5]` | `[FxG]` | `[Action préventive]` | `[Budget/ROI]` | `[Nom]` | 🟢 |
"""

tool05_md = f"""# 🧰 OUTIL 05 : REGISTRE COMPLET DES RISQUES & OPPORTUNITÉS (AMDEC SIMPLIFIÉE)

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 6.1 - **Question d'Audit** : Q5

---

## 🧠 CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER

### 💡 Posture & Animation :
*{t5_advice}*

### 📌 Banques d'Idées & Risques Fréquents PME :
1. **Risques Ventes & Appro** : Devis chiffré sans marge brute suffisante, fournisseur unique sur composant critique.
2. **Risques Prod & IT** : Panne de machine unique sans contrat de maintenance préventive, perte des données suite virus IT.
3. **Risques Humains & Sécurité** : Départ imprévu du seul régleur sans procédure écrite, accident du travail sur carter manquant.

---

## 💎 POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE PME ?

### 🟢 Ce que vous gagnez à l'utiliser :
* **Priorisation scientifique des investissements par le chiffre**.
* **Neutralisation des pannes et crises avant survenance**.

---

## 📝 LE REGISTRE AMDEC DÉTAILLÉ PRÊT À REMPLIR

{t5_table_md}

---

## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Arbitrage budgétaire DG** sur les risques rouges (Score ≥ 10).
2. **Raccordement à la Feuille de Route SMART (Outil 06)**.
3. **GED** : `01_DIRECTION_STRATEGIE/REGISTRE_AMDEC_RISQUES.xlsx`.
"""

with open(os.path.join(out_md, "OUTIL_05_AMDEC_RISQUES.md"), "w", encoding="utf-8") as f:
    f.write(tool05_md)
with open(os.path.join(out_html, "OUTIL_05_AMDEC_RISQUES.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 05 - AMDEC Risques Ultra-Détaillé",
        code="OUTIL_05",
        clause="Clause 6.1",
        q_num="Q5",
        utility="Hiérarchiser les risques opérationnels et financiers pour déployer des actions à fort ROI.",
        instructions="Multiplier Fréquence (1-5) x Gravité (1-5). Si le score est ≥ 10, engager l'action corrective.",
        advice_text=t5_advice,
        themes_html=t5_themes_html,
        gains_html=t5_gains,
        risques_html=t5_risques,
        guide_html=t5_guide,
        body_content=md_table_to_html(t5_table_md),
        next_steps_html=t5_next_html
    ))

# =============================================================================
# TOOL 06 : OBJECTIFS SMART
# =============================================================================
t6_advice = "Exigez une formule mathématique exacte. Si un indicateur ne peut pas être extrait en 2 clics de votre ERP ou d'un fichier Excel, l'objectif sera abandonné en cours d'année."
t6_themes_html = """
<div class="theme-card"><strong>1. Ventes :</strong> Taux de devis transformés en commandes (%), délai moyen de transmission d'offre commercial (&lt; 48h).</div>
<div class="theme-card"><strong>2. Atelier :</strong> Réduction du pourcentage de chutes d'atelier (%), taux de pièces conformes au premier contrôle (%).</div>
<div class="theme-card"><strong>3. Achats &amp; QSE :</strong> Taux d'évaluation des fournisseurs clés &ge; 15/20 (%), taux de clôture des FNC sous 15 jours (%).</div>
"""
t6_gains = "<ul><li>Responsabilisation directe de chaque chef de service sur des chiffres.</li><li>Suivi précis grâce aux jalons trimestriels M+3 et M+6.</li><li>Preuve d'amélioration continue pour l'audit ISO.</li></ul>"
t6_risques = "<ul><li>Objectifs flous non mesurés se transformant en vœux pieux.</li><li>Démotivation des managers par manque de repères mesurables.</li><li>Écart d'audit ISO (Clause 6.2).</li></ul>"
t6_guide = "<ol><li>Appliquer le filtre SMART.</li><li>Renseigner la formule de calcul exacte.</li><li>Fixer la Cible et les Jalons M+3 / M+6.</li><li>Faire émarger le responsable de pôle.</li></ol>"
t6_next_html = "<ul><li>Émargement individuel de chaque responsable.</li><li>Intégration au Dashboard mensuel (Outil 03).</li><li>Points d'étape aux jalons M+3 et M+6.</li><li>GED : <code>01_DIRECTION_STRATEGIE/OBJECTIFS_SMART_2026.pdf</code>.</li></ul>"
t6_table_md = """| Service | Objectif Amélioration SMART | Formule Exacte de Mesure | Valeur Cible | Jalons M+3 | Jalons M+6 | Ressources Allocées | Responsable | Statut |
| :--- | :--- | :--- | :-: | :-: | :-: | :--- | :--- | :-: |
| **Commercial** | Réduire les devis perdus pour délai de chiffrage trop long | (Devis perdus pour délai / Total devis) x 100 | ≤ 10 % | 15 % | **8 %** | Logiciel de chiffrage express | Dir. Commercial | 🟢 Conforme |
| **Production** | Diviser par deux le taux de rebuts atelier | (Valeur pièces jetées / CA produit) x 100 | ≤ 1.5 % | 2.2 % | **1.3 %** | Formation réglage + gabarits | Chef Prod | 🟢 Conforme |
| **Achats** | Obtenir 100% de livraisons fournisseurs dans les délais | (Commandes reçues à date / Total commandes) x 100 | ≥ 98 % | 95 % | **98.5 %** | Grille d'évaluation (Outil 09) | Resp. Achats | 🟢 Conforme |
| **Qualité / QSE** | Prise en charge des réclamations clients sous 24h | (Réclamations traitées < 24h / Total réclamations) | 100 % | 90 % | **100 %** | Registre réclamations (Outil 10) | Resp. QSE | 🟢 Conforme |
| **RH / Formations** | Former 100% des nouveaux salariés au Livret Qualité | (Salariés formés J+7 / Total embauches) x 100 | 100 % | 100 % | **100 %** | Livret d'accueil (Outil 23) | RH | 🟢 Conforme |
| `[Votre Service]` | `[Objectif SMART]` | `[Formule]` | `[Cible]` | `[M+3]` | `[M+6]` | `[Ressources]` | `[Nom]` | 🟢 |
"""

tool06_md = f"""# 🧰 OUTIL 06 : FEUILLE DE ROUTE D'OBJECTIFS SMART PAR SERVICE

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 6.2 - **Question d'Audit** : Q6

---

## 🧠 CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER

### 💡 Posture & Animation :
*{t6_advice}*

### 📌 Banques d'Idées & Objectifs SMART PME :
1. **Ventes** : Taux de devis transformés en commandes (%), délai moyen de transmission d'offre commercial (< 48h).
2. **Atelier** : Réduction du pourcentage de chutes d'atelier (%), taux de pièces conformes au premier contrôle (%).
3. **Achats & QSE** : Taux d'évaluation des fournisseurs clés ≥ 15/20 (%), taux de clôture des FNC sous 15 jours (%).

---

## 💎 POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE PME ?

### 🟢 Ce que vous gagnez à l'utiliser :
* **Responsabilisation des managers par des chiffres**.
* **Suivi de progrès garanti aux jalons M+3 et M+6**.

---

## 📝 LA FEUILLE DE ROUTE DÉTAILLÉE PRÊT À REMPLIR

{t6_table_md}

---

## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Émargement des Responsables**.
2. **Connecter au Dashboard (Outil 03)**.
3. **GED** : `01_DIRECTION_STRATEGIE/OBJECTIFS_SMART_2026.pdf`.
"""

with open(os.path.join(out_md, "OUTIL_06_OBJECTIFS_SMART.md"), "w", encoding="utf-8") as f:
    f.write(tool06_md)
with open(os.path.join(out_html, "OUTIL_06_OBJECTIFS_SMART.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 06 - Objectifs SMART Ultra-Détaillé",
        code="OUTIL_06",
        clause="Clause 6.2",
        q_num="Q6",
        utility="Fixer des objectifs de progrès mesurables et déclinés par pôle métier.",
        instructions="Renseigner les objectifs par service et évaluer l'avancement lors des jalons trimestriels.",
        advice_text=t6_advice,
        themes_html=t6_themes_html,
        gains_html=t6_gains,
        risques_html=t6_risques,
        guide_html=t6_guide,
        body_content=md_table_to_html(t6_table_md),
        next_steps_html=t6_next_html
    ))

# =============================================================================
# TOOL 07 : REVUE DE DIRECTION
# =============================================================================
t7_advice = "La Revue de Direction n'est pas une simple réunion d'information : c'est le conseil d'administration opérationnel de la Qualité. Suivez scrupuleusement les 7 points normatifs pour ressortir avec des arbitrages et des budgets votés."
t7_themes_html = """
<div class="theme-card"><strong>1. Équipements &amp; Outillage :</strong> Arbitrages d'achats de nouvelles machines, outillage de contrôle dimensionnel.</div>
<div class="theme-card"><strong>2. Ressources Humaines :</strong> Validation des budgets de formation polyvalence, recrutements de binômes.</div>
<div class="theme-card"><strong>3. Audits &amp; GED :</strong> Validation du programme d'audit interne, déploiement de l'arborescence GED Cloud.</div>
"""
t7_gains = "<ul><li>Validation officielle annuelle du Système par le Directeur Général.</li><li>Arbitrages budgétaires consigné dans un document managérial et juridique.</li><li>Preuve N°1 absolue exigée par les auditeurs ISO 9001 (Clause 9.3).</li></ul>"
t7_risques = "<ul><li>Refus de certification ISO 9001 (Défaut normatif majeur).</li><li>Direction déconnectée des coûts cachés et de la réalité terrain.</li></ul>"
t7_guide = "<ol><li>Préparer les données en amont (Dashboard, SWOT, AMDEC).</li><li>Animer la séance en 1h chrono sur les 7 points.</li><li>Consigner les décisions budgétaires.</li><li>Émargement manuscrit de tous les participants.</li></ol>"
t7_next_html = "<ul><li>Émargement obligatoire du DG et des participants.</li><li>Archivage sous <code>01_DIRECTION_STRATEGIE/PV_REVUE_DIRECTION_2026.pdf</code>.</li><li>Communication d'une note synthétique aux salariés.</li></ul>"

t7_text = """=================================================================================
                 PROCÈS-VERBAL DE REVUE DE DIRECTION COMPLÈTE
=================================================================================
Société : [Nom de l'Entreprise] | Date : [Date de la réunion]
Présents : [Nom du DG, Responsable Qualité, Responsable Opérations, Responsable Commercial]

1. ÉTAT DES ACTIONS DE LA REVUE PRÉCÉDENTE (9.3.2.a) :
   - Action 1 : Déploiement de l'arborescence GED 30s ──► [🟢 Finalisée et fonctionnelle]
   - Action 2 : Formation de 2 opérateurs au contrôle dimensionnel ──► [🟢 Finalisée]

2. ÉVOLUTION DES ENJEUX INTERNES / EXTERNES (SWOT & PESTEL - 9.3.2.b) :
   - Hausse constatée des matières premières de +15% ──► Décision d'indexer nos devis sur le cours d'achat.
   - Pénurie locale de main d'œuvre ──► Validation du programme de polyvalence et binômage atelier.

3. INFORMATIONS SUR LA PERFORMANCE DU SMQ (9.3.2.c) :
   - Satisfaction client & Réclamations : 96.5% de satisfaction (NPS 48), 4 réclamations traitées sous 24h.
   - Atteinte des objectifs SMART : 4 objectifs sur 5 atteints (Rebuts réduits à 1.3%).
   - Non-conformités et coûts cachés : Coût total de non-qualité ramené à 4 100 € sur l'année.
   - Résultats des audits internes : Audit réalisé le 15/01 (1 écart mineur corrigé sous 15 jours).
   - Performance des fournisseurs : 2 fournisseurs principaux évalués à 17/20, sous-traitant B sous réserve.

4. ADÉQUATION DES RESSOURCES (9.3.2.d) :
   - Ressources humaines et compétences globalement satisfaisantes.
   - Validation de l'achat d'une imprimante d'étiquettes code-barres pour le bac quarantaine atelier.

5. EFFICACITÉ DES ACTIONS FACE AUX RISQUES (AMDEC - 9.3.2.e) :
   - Le risque de rupture approvisionnement a été neutralisé par l'homologation d'un 2ème fournisseur.

6. OPPORTUNITÉS D'AMÉLIORATION & ROI ESTIMÉ (9.3.2.f) :
   - Automatisation des remontées de données sur dashboard digital (Gain estimé : 5h/mois).

7. DÉCISIONS & ARBITRAGES BUDGETAIRES DE LA DIRECTION (9.3.3) :
   - Décision 1 : Budget de 3 500 € validé pour la formation polyvalence et sécurité atelier.
   - Décision 2 : Validation du programme d'audit interne pour l'année 2026.
   - Décision 3 : Maintien de l'objectif de certification ISO 9001 pour le 30 Juin.

Signatures des Participants au Comité :

DG : ___________________________        QSE : ___________________________

Resp. Com : ____________________        Chef Prod : ______________________
================================================================================="""

tool07_md = f"""# 🧰 OUTIL 07 : PROCÈS-VERBAL DE REVUE DE DIRECTION (7 POINTS ISO 9001)

> **Cabinet Delacour — Gouvernance & Direction**
> **ISO 9001** : Clause 9.3 - **Question d'Audit** : Q7

---

## 🧠 CONSEILS CONSULTANT & EXEMPLES DE THÉMATIQUES À EXPLORER

### 💡 Posture & Animation :
*{t7_advice}*

### 📌 Banques d'Idées & Thématiques d'Arbitrage :
1. **Équipements & Outillage** : Arbitrages d'achats de nouvelles machines, outillage de contrôle dimensionnel.
2. **Ressources Humaines** : Validation des budgets de formation polyvalence, recrutements de binômes.
3. **Audits & GED** : Validation du programme d'audit interne, déploiement de l'arborescence GED Cloud.

---

## 💎 POURQUOI CET OUTIL EST-IL ABSOLUMENT CAPITAL POUR VOTRE PME ?

### 🟢 Ce que vous gagnez à l'utiliser :
* **Preuve N°1 absolue d'audit ISO 9001**.
* **Arbitrages budgétaires officiels du DG**.

---

## 📝 MODÈLE DE PV DE REVUE DE DIRECTION PRÊT À REMPLIR

```text
{t7_text}
```

---

## 🚀 QUE FAIRE UNE FOIS L'OUTIL COMPLÉTÉ ?

1. **Émargement Obligatoire des participants**.
2. **Preuve Clé ISO 9001** : `01_DIRECTION_STRATEGIE/PV_REVUE_DIRECTION_2026.pdf`.
3. **Communication synthétique aux salariés**.
"""

with open(os.path.join(out_md, "OUTIL_07_REVUE_DIRECTION.md"), "w", encoding="utf-8") as f:
    f.write(tool07_md)
with open(os.path.join(out_html, "OUTIL_07_REVUE_DIRECTION.html"), "w", encoding="utf-8") as f:
    f.write(html_layout.format(
        title="Outil 07 - PV Revue de Direction Ultra-Détaillé",
        code="OUTIL_07",
        clause="Clause 9.3",
        q_num="Q7",
        utility="Valider le bilan annuel de la Direction selon les 7 points normatifs ISO 9001 et fixer les budgets.",
        instructions="Remplir le PV lors du comité de direction et faire signer les responsables.",
        advice_text=t7_advice,
        themes_html=t7_themes_html,
        gains_html=t7_gains,
        risques_html=t7_risques,
        guide_html=t7_guide,
        body_content=f"<pre class=\"template-box\">{t7_text}</pre>",
        next_steps_html=t7_next_html
    ))

print("Successfully generated all 8 ultra-detailed tools for Sequence 1 in Markdown and HTML with upstream Consultant Themes!")
