import os
import subprocess

out_md = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/outils_qualite/sequence_1"
out_html = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/.tmp/outils_qualite/sequence_1"
out_html_unified = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_1_STRATEGIE_ET_PILOTAGE/HTML"
out_md_unified = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_1_STRATEGIE_ET_PILOTAGE/MARKDOWN"

os.makedirs(out_md, exist_ok=True)
os.makedirs(out_html, exist_ok=True)
os.makedirs(out_html_unified, exist_ok=True)
os.makedirs(out_md_unified, exist_ok=True)

# Helper to convert table MD to HTML table with interactive inputs
def md_table_to_interactive_html(md_table, tool_id):
    lines = md_table.strip().split("\n")
    headers = [h.strip() for h in lines[0].split("|")[1:-1]]
    
    table_html = "<table class=\"interactive-table\">\n  <thead>\n    <tr>\n"
    for h in headers:
        table_html += f"      <th>{h}</th>\n"
    table_html += "    </tr>\n  </thead>\n  <tbody>\n"
    
    row_idx = 0
    for row in lines[2:]:
        cells = [c.strip() for c in row.split("|")[1:-1]]
        table_html += "    <tr>\n"
        for col_idx, cell in enumerate(cells):
            input_id = f"{tool_id}_r{row_idx}_c{col_idx}"
            clean_cell = cell.replace("**", "").replace("`", "").replace("🔴", "").replace("🟢", "").replace("🟠", "").replace("🟡", "").strip()
            if col_idx == 0:
                table_html += f"      <td style=\"width:22%;\"><input type=\"text\" id=\"{input_id}\" class=\"form-input bold-input\" value=\"{clean_cell}\" /></td>\n"
            else:
                table_html += f"      <td><input type=\"text\" id=\"{input_id}\" class=\"form-input\" value=\"{clean_cell}\" /></td>\n"
        table_html += "    </tr>\n"
        row_idx += 1
        
    table_html += "  </tbody>\n</table>"
    return table_html

# HTML INTERACTIVE LAYOUT TEMPLATE
html_layout = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | Formulaire Interactif Cabinet Delacour</title>
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
    max-width: 1080px;
    margin: 30px auto;
    background: #ffffff;
    padding: 45px;
    border: 1px solid var(--sb-accent);
    box-shadow: 0 12px 35px rgba(10, 18, 16, 0.06);
  }}

  /* Action Bar */
  .action-bar {{
    background: var(--sb-green-dark);
    color: #ffffff;
    padding: 15px 25px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 2px;
    margin-bottom: 25px;
    box-shadow: 0 4px 12px rgba(21, 40, 34, 0.15);
  }}
  .action-bar-title {{
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: var(--sb-beige);
  }}
  .action-buttons {{
    display: flex;
    gap: 12px;
  }}
  .btn {{
    background: var(--gold);
    color: var(--sb-green-dark);
    border: none;
    padding: 9px 16px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    border-radius: 2px;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }}
  .btn:hover {{
    background: #d4b075;
    transform: translateY(-1px);
  }}
  .btn-outline {{
    background: transparent;
    border: 1px solid var(--sb-beige);
    color: var(--sb-beige);
  }}
  .btn-outline:hover {{
    background: rgba(240, 234, 214, 0.15);
    color: #ffffff;
  }}

  .header-brand {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--gold);
    padding-bottom: 20px;
    margin-bottom: 25px;
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
    padding: 22px 25px;
    margin-bottom: 25px;
    border-left: 6px solid var(--gold);
  }}
  .tool-title-box h2 {{
    font-family: 'Playfair Display', serif;
    font-size: 25px;
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

  .consultant-themes-box {{
    background: #f7f9f8;
    border: 1px solid var(--sb-green-light);
    border-left: 6px solid var(--sb-green-dark);
    padding: 22px 25px;
    margin-bottom: 25px;
    border-radius: 2px;
  }}
  .consultant-themes-box h3 {{
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: var(--sb-green-dark);
    margin: 0 0 10px 0;
    border-bottom: 1px solid var(--sb-accent);
    padding-bottom: 5px;
  }}
  .consultant-advice {{
    font-size: 12.5px;
    margin-bottom: 12px;
    background: #ffffff;
    padding: 10px 14px;
    border: 1px solid var(--sb-accent);
  }}
  .themes-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    font-size: 12px;
  }}
  .theme-card {{
    background: #ffffff;
    padding: 10px 12px;
    border: 1px solid var(--sb-accent);
  }}
  .theme-card strong {{
    color: var(--sb-green-dark);
    display: block;
    margin-bottom: 3px;
  }}

  .why-box {{
    background: #fdfbf7;
    border: 1px solid var(--gold);
    padding: 20px 22px;
    margin-bottom: 25px;
    border-radius: 2px;
  }}
  .why-box h3 {{
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: var(--sb-green-dark);
    margin: 0 0 10px 0;
    border-bottom: 1px solid var(--gold);
    padding-bottom: 5px;
  }}
  .why-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    font-size: 12.5px;
  }}
  .why-column ul {{ margin: 4px 0 0 0; padding-left: 18px; }}
  .why-column.gains {{ color: #1b5e20; }}
  .why-column.risques {{ color: #b71c1c; }}

  .guide-box {{
    background: #ffffff;
    border: 1px solid var(--sb-accent);
    padding: 20px 22px;
    margin-bottom: 30px;
    font-size: 12.5px;
    border-radius: 2px;
    border-left: 4px solid var(--sb-green-dark);
  }}
  .guide-box h3 {{
    font-family: 'Playfair Display', serif;
    font-size: 17px;
    color: var(--sb-green-dark);
    margin: 0 0 10px 0;
  }}
  .guide-box ol {{ margin: 0; padding-left: 20px; }}
  .guide-box li {{ margin-bottom: 6px; }}

  h3.section-subtitle {{
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    color: var(--sb-green-dark);
    border-bottom: 2px solid var(--gold);
    padding-bottom: 6px;
    margin: 30px 0 15px 0;
  }}

  /* Form Inputs & Tables */
  table.interactive-table {{
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0 25px 0;
    font-size: 12px;
  }}
  table.interactive-table th {{
    background-color: var(--sb-green-dark);
    color: #ffffff;
    padding: 10px;
    text-align: left;
    font-weight: 600;
    border: 1px solid var(--sb-green-dark);
  }}
  table.interactive-table td {{
    padding: 4px;
    border: 1px solid var(--sb-accent);
    background: #ffffff;
  }}
  .form-input {{
    width: 100%;
    padding: 8px 10px;
    border: 1px solid transparent;
    font-family: 'Montserrat', sans-serif;
    font-size: 12px;
    color: var(--sb-green-dark);
    background: transparent;
    outline: none;
    transition: all 0.2s ease;
  }}
  .form-input:focus {{
    background: #fffdf7;
    border-color: var(--gold);
    box-shadow: inset 0 0 3px rgba(197, 160, 101, 0.4);
  }}
  .form-input.bold-input {{
    font-weight: 700;
  }}

  textarea.template-textarea {{
    width: 100%;
    min-height: 400px;
    padding: 18px;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.55;
    background: #fdfdfd;
    border: 1px solid var(--sb-accent);
    border-left: 4px solid var(--gold);
    color: #152822;
    outline: none;
    resize: vertical;
  }}
  textarea.template-textarea:focus {{
    background: #ffffff;
    border-color: var(--gold);
  }}

  .next-steps-box {{
    background: var(--sb-cream);
    border: 1px solid var(--gold);
    border-left: 5px solid var(--sb-green-dark);
    padding: 20px 22px;
    margin-top: 35px;
    border-radius: 2px;
  }}
  .next-steps-box h3 {{
    font-family: 'Playfair Display', serif;
    font-size: 17px;
    color: var(--sb-green-dark);
    margin: 0 0 10px 0;
  }}
  .next-steps-box ul {{
    margin: 0;
    padding-left: 20px;
    font-size: 12.5px;
  }}
  .next-steps-box li {{ margin-bottom: 6px; }}

  .footer {{
    text-align: center;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid var(--sb-accent);
    font-size: 11px;
    color: var(--sb-green-light);
  }}

  @media print {{
    body {{ background: #ffffff; }}
    .container {{ border: none; box-shadow: none; padding: 0; margin: 0; max-width: 100%; }}
    .action-bar {{ display: none !important; }}
    .form-input {{ border: none !important; background: transparent !important; padding: 4px !important; }}
    textarea.template-textarea {{ border: 1px solid #ccc !important; min-height: 300px; }}
  }}
</style>
</head>
<body>

<div class="container">

  <!-- Action Bar -->
  <div class="action-bar">
    <div class="action-bar-title">📝 Formulaire Saisissable Client - {code}</div>
    <div class="action-buttons">
      <button class="btn" onclick="saveData('{code}')">💾 Enregistrer ma Saisie</button>
      <button class="btn btn-outline" onclick="clearData('{code}')">🧹 Vider (Démarrer Vierge)</button>
      <button class="btn btn-outline" onclick="window.print()">🖨️ Imprimer / PDF</button>
    </div>
  </div>

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
    <h3 class="section-subtitle">📝 LE FORMULAIRE INTERACTIF PRÊT À COMPLÉTER</h3>
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

<!-- Auto-Save & Data Persistence Script -->
<script>
  function saveData(toolId) {{
    const inputs = document.querySelectorAll('.form-input, .template-textarea');
    const data = {{}};
    inputs.forEach(input => {{
      if (input.id) {{
        data[input.id] = input.value;
      }}
    }});
    localStorage.setItem('delacour_' + toolId, JSON.stringify(data));
    alert('✅ Vos données ont été enregistrées avec succès dans votre navigateur !');
  }}

  function loadData(toolId) {{
    const saved = localStorage.getItem('delacour_' + toolId);
    if (saved) {{
      const data = JSON.parse(saved);
      Object.keys(data).forEach(id => {{
        const input = document.getElementById(id);
        if (input) {{
          input.value = data[id];
        }}
      }});
    }}
  }}

  function clearData(toolId) {{
    if (confirm('Voulez-vous vraiment effacer les exemples et réinitialiser les champs ?')) {{
      const inputs = document.querySelectorAll('.form-input, .template-textarea');
      inputs.forEach(input => {{
        input.value = '';
      }});
      localStorage.removeItem('delacour_' + toolId);
    }}
  }}

  window.addEventListener('DOMContentLoaded', () => {{
    loadData('{code}');
  }});
</script>

</body>
</html>
"""

# =============================================================================
# ACTION 4 : CREATE START_HERE_SEQUENCE_1 (CLIENT QUICK-START GUIDE)
# =============================================================================
start_here_md = """# 🚀 GUIDE DE DÉMARRAGE RAPIDE CLIENT : SÉQUENCE 1
## PARCOURS AUTONOME EN 5 JOURS (GOUVERNANCE & DIRECTION)

> **Cabinet Delacour — Stratégie & Performance QHSE - ISO 9001**
> Bienvenue dans votre Kit d'Outils Qualité Séquence 1. Ce guide a été conçu pour vous permettre de compléter vos 8 documents de gouvernance de manière **100% autonome, simple et rapide** (20 à 30 min par jour).

---

## 🛠️ COMMENT UTILISER VOS FORMULAIRES INTERACTIFS WEB ?

1. **Ouvrez simplement le fichier HTML** dans n'importe quel navigateur Web (Chrome, Edge, Safari, Firefox) en double-cliquant dessus.
2. **Cliquez directement dans les cases** pour remplacer nos exemples PME par vos propres données d'entreprise.
3. **Utilisez les 3 Boutons d'Action au sommet de votre écran** :
   * 💾 **`Enregistrer ma Saisie`** : Sauvegarde vos données automatiquement dans votre navigateur sans risque de les perdre.
   * 🧹 **`Vider (Démarrer Vierge)`** : Efface les exemples pour repartir d'une page blanche en 1 clic.
   * 🖨️ **`Imprimer / PDF`** : Exporte votre document final au format PDF ou l'imprime sur feuille A4 propre.

---

## 📅 VOTRE PLANNING DE REMPLISSAGE OPTIMISÉ EN 5 JOURS

```text
+-----------------------------------------------------------------------------------+
|  LUNDI (Day 1)    : Diagnostic de Contexte (SWOT & PESTEL - 30 min)               |
|  MARDI (Day 2)    : Cartographie des Parties Prenantes (Outil 02 - 20 min)        |
|  MERCREDI (Day 3) : Engagement & Politique Qualité (Outil 04 - 20 min)            |
|  JEUDI (Day 4)    : Registre AMDEC Risques & Objectifs SMART (Outils 05/06 - 30 min)|
|  VENDREDI (Day 5) : Tableau de Bord 5 KPIs & PV Revue Direction (Outils 03/07 - 20min)|
+-----------------------------------------------------------------------------------+
```

---

### 📆 JOUR 1 : DIAGNOSTIC DU CONTEXTE (30 MIN)
* **Outil 01A (SWOT)** : [Formulaire Web Saisissable](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/.tmp/outils_qualite/sequence_1/OUTIL_01A_SWOT.html)
  * *Mission* : Remplir 3 forces et 3 faiblesses internes de votre PME, puis 2 opportunités et 2 menaces du marché.
* **Outil 01B (PESTEL)** : [Formulaire Web Saisissable](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/.tmp/outils_qualite/sequence_1/OUTIL_01B_PESTEL.html)
  * *Mission* : Noter l'impact (🟢/🟠/🔴) sur les 6 piliers (Politique, Économique, Social, Tech, Écolo, Légal).

---

### 📆 JOUR 2 : VOS PARTIES PRENANTES STRATÉGIQUES (20 MIN)
* **Outil 02 (Parties Prenantes)** : [Formulaire Web Saisissable](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/.tmp/outils_qualite/sequence_1/OUTIL_02_PARTIES_PRENANTES.html)
  * *Mission* : Inscrire vos clients clés, fournisseurs vitaux et banques avec leurs exigences non négociables.

---

### 📆 JOUR 3 : ENGAGEMENT DE LA DIRECTION (20 MIN)
* **Outil 04 (Politique Qualité)** : [Formulaire Web Saisissable](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/.tmp/outils_qualite/sequence_1/OUTIL_04_POLITIQUE_QUALITE.html)
  * *Mission* : Personnaliser le contrat d'honneur 1 page, apposer la signature du DG et imprimer pour affichage.

---

### 📆 JOUR 4 : GESTION DES RISQUES & OBJECTIFS (30 MIN)
* **Outil 05 (AMDEC Risques)** : [Formulaire Web Saisissable](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/.tmp/outils_qualite/sequence_1/OUTIL_05_AMDEC_RISQUES.html)
  * *Mission* : Calculer la criticité (Fréquence x Gravité). Si Score ≥ 10, définir l'action préventive.
* **Outil 06 (Objectifs SMART)** : [Formulaire Web Saisissable](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/.tmp/outils_qualite/sequence_1/OUTIL_06_OBJECTIFS_SMART.html)
  * *Mission* : Fixer 1 objectif SMART par service (Commercial, Prod, Achats, QSE) avec la formule de calcul.

---

### 📆 JOUR 5 : PILOTAGE & REVUE DE DIRECTION (20 MIN)
* **Outil 03 (Dashboard 5 KPIs)** : [Formulaire Web Saisissable](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/.tmp/outils_qualite/sequence_1/OUTIL_03_DASHBOARD_DIRECTION.html)
  * *Mission* : Renseigner les 5 chiffres vitaux du mois M (CA, Marge %, Coût Non-Qualité, NPS, Taux de service).
* **Outil 07 (PV Revue de Direction)** : [Formulaire Web Saisissable](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/.tmp/outils_qualite/sequence_1/OUTIL_07_REVUE_DIRECTION.html)
  * *Mission* : Remplir le procès-verbal normatif 7 points et faire émarger les participants.

---

## 📬 BESOIN D'ASSISTANCE OU DE VALIDATION ?
Une fois vos 8 formulaires complétés et enregistrés, vous pouvez transmettre vos fichiers PDF au **Cabinet Delacour** pour relecture finale et validation avant votre audit ISO 9001 !
"""

start_here_html = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Notice de Démarrage Client Séquence 1 | Cabinet Delacour</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
  :root {
    --sb-green-dark: #152822;
    --sb-green-light: #4A6C5C;
    --sb-beige: #F0EAD6;
    --sb-cream: #F9F9F7;
    --gold: #C5A065;
  }
  * { box-sizing: border-box; }
  body {
    background-color: var(--sb-cream);
    color: var(--sb-green-dark);
    font-family: 'Montserrat', sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 1000px;
    margin: 30px auto;
    background: #ffffff;
    padding: 50px;
    border: 1px solid var(--sb-beige);
    box-shadow: 0 12px 35px rgba(10, 18, 16, 0.06);
  }
  .header-brand {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--gold);
    padding-bottom: 20px;
    margin-bottom: 30px;
  }
  .brand-text h1 {
    font-family: 'Playfair Display', serif;
    font-size: 24px;
    color: var(--sb-green-dark);
    margin: 0;
  }
  .day-card {
    background: var(--sb-cream);
    border-left: 5px solid var(--sb-green-dark);
    padding: 20px 25px;
    margin-bottom: 20px;
    border-radius: 2px;
  }
  .day-card h3 {
    font-family: 'Playfair Display', serif;
    margin: 0 0 8px 0;
    color: var(--sb-green-dark);
  }
  .btn-link {
    display: inline-block;
    background: var(--gold);
    color: var(--sb-green-dark);
    padding: 7px 14px;
    font-weight: 700;
    font-size: 12px;
    text-decoration: none;
    border-radius: 2px;
    margin-top: 5px;
    margin-right: 8px;
  }
  .footer { text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #888; }
</style>
</head>
<body>
<div class="container">
  <div class="header-brand">
    <div class="brand-text">
      <h1>CABINET DELACOUR</h1>
      <p>Guide de Démarrage Client Séquence 1</p>
    </div>
    <div style="background:var(--sb-green-dark); color:var(--sb-beige); padding:8px 16px; font-weight:600; font-size:12px;">Notice Autonome 5 Jours</div>
  </div>

  <h2 style="font-family:'Playfair Display', serif; color:var(--sb-green-dark);">🚀 VOTRE PARCOURS AUTONOME EN 5 JOURS</h2>
  <p>Complétez vos 8 outils de gouvernance en 20 à 30 minutes par jour directement dans votre navigateur web.</p>

  <div class="day-card">
    <h3>📆 JOUR 1 : DIAGNOSTIC DU CONTEXTE (30 MIN)</h3>
    <p>Renseignez les forces, faiblesses, opportunités et menaces de votre PME.</p>
    <a href="OUTIL_01A_SWOT.html" class="btn-link">Ouvrir Outil 01A (SWOT)</a>
    <a href="OUTIL_01B_PESTEL.html" class="btn-link" style="background:var(--sb-green-dark); color:#fff;">Ouvrir Outil 01B (PESTEL)</a>
  </div>

  <div class="day-card">
    <h3>📆 JOUR 2 : PARTIES PRENANTES STRATÉGIQUES (20 MIN)</h3>
    <p>Identifiez les exigences de vos clients grands comptes, fournisseurs et banques.</p>
    <a href="OUTIL_02_PARTIES_PRENANTES.html" class="btn-link">Ouvrir Outil 02 (Parties Prenantes)</a>
  </div>

  <div class="day-card">
    <h3>📆 JOUR 3 : POLITIQUE QUALITÉ &amp; ENGAGEMENT (20 MIN)</h3>
    <p>Personnalisez la charte d'engagement 1 page et apposez la signature du DG.</p>
    <a href="OUTIL_04_POLITIQUE_QUALITE.html" class="btn-link">Ouvrir Outil 04 (Politique Qualité)</a>
  </div>

  <div class="day-card">
    <h3>📆 JOUR 4 : RISQUES AMDEC &amp; OBJECTIFS SMART (30 MIN)</h3>
    <p>Chiffrez la criticité de vos risques et fixez 1 objectif SMART par service.</p>
    <a href="OUTIL_05_AMDEC_RISQUES.html" class="btn-link">Ouvrir Outil 05 (AMDEC Risques)</a>
    <a href="OUTIL_06_OBJECTIFS_SMART.html" class="btn-link" style="background:var(--sb-green-dark); color:#fff;">Ouvrir Outil 06 (Objectifs SMART)</a>
  </div>

  <div class="day-card">
    <h3>📆 JOUR 5 : DASHBOARD 5 KPIS &amp; REVUE DE DIRECTION (20 MIN)</h3>
    <p>Renseignez votre tableau de bord mensuel et remplissez le PV de Revue de Direction.</p>
    <a href="OUTIL_03_DASHBOARD_DIRECTION.html" class="btn-link">Ouvrir Outil 03 (Dashboard KPIs)</a>
    <a href="OUTIL_07_REVUE_DIRECTION.html" class="btn-link" style="background:var(--sb-green-dark); color:#fff;">Ouvrir Outil 07 (PV Revue Direction)</a>
  </div>

  <div class="footer">
    Cabinet Delacour - Stratégie &amp; Performance QHSE - ISO 9001
  </div>
</div>
</body>
</html>
"""

# Save START_HERE_SEQUENCE_1 files
with open(os.path.join(out_md, "START_HERE_SEQUENCE_1.md"), "w", encoding="utf-8") as f:
    f.write(start_here_md)
with open(os.path.join(out_md_unified, "START_HERE_SEQUENCE_1.md"), "w", encoding="utf-8") as f:
    f.write(start_here_md)

with open(os.path.join(out_html, "START_HERE_SEQUENCE_1.html"), "w", encoding="utf-8") as f:
    f.write(start_here_html)
with open(os.path.join(out_html_unified, "START_HERE_SEQUENCE_1.html"), "w", encoding="utf-8") as f:
    f.write(start_here_html)

# =============================================================================
# DATA DEFINITIONS FOR ALL 8 TOOLS
# =============================================================================

# TOOL 01A SWOT
t1a_advice = "Le SWOT ne doit pas être un exercice littéraire théorique. Concentrez l'échange avec le dirigeant sur ce qui fait perdre des sous ou du temps au quotidien (faiblesses/menaces) et sur ce qui rapporte de la marge (forces/opportunités)."
t1a_themes_html = """
<div class="theme-card"><strong>1. Thématiques "FORCES" :</strong> Savoir-faire technique rare, équipe expérimentée stable, parc machines récents, réactivité devis &lt; 24h, certification ISO, proximité client.</div>
<div class="theme-card"><strong>2. Thématiques "FAIBLESSES" :</strong> Goulot d'étranglement sur 1 personne (homme-clé), absence de GED, devis complexes signés à perte, coûts de non-qualité non suivis.</div>
<div class="theme-card"><strong>3. Thématiques "OPPORTUNITÉS" :</strong> Exigence ISO 9001 chez les grands comptes régionaux, défaillance d'un concurrent direct, subventions régionales transition numérique.</div>
<div class="theme-card"><strong>4. Thématiques "MENACES" :</strong> Hausse du prix des matières premières/énergie, pénurie de main d'œuvre qualifiée, durcissement des taxes sur les déchets industriels.</div>
"""
t1a_gains = "<ul><li>Vision 360° des atouts et vulnérabilités.</li><li>Valorisation financière des menaces pour protéger la marge.</li><li>Boussole stratégique pour l'audit ISO.</li></ul>"
t1a_risques = "<ul><li>Navigation à vue sans anticipation.</li><li>Coûts cachés non maîtrisés.</li><li>Non-conformité majeure d'audit (Clause 4.1).</li></ul>"
t1a_guide = "<ol><li>Réunir DG + Com + Prod + QSE.</li><li>Séparer Interne vs Externe.</li><li>Inscrire 3 à 5 éléments factuels chiffrés par quadrant.</li><li>Basculer chaque faiblesse/menace rouge dans l'AMDEC (Outil 05).</li></ol>"
t1a_next = "<ul><li>Validation en Comité de Direction.</li><li>Transfert vers l'AMDEC (Outil 05).</li><li>Archivage sous <code>01_DIRECTION_STRATEGIE/SWOT_2026.pdf</code>.</li></ul>"
t1a_body = """
<div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
  <div style="border:1px solid #ccc; padding:15px; border-top:4px solid #2e7d32; background:#fff;">
    <h4 style="margin:0 0 10px 0; color:#2e7d32;">🟢 FORCES (Forces Internes)</h4>
    <input type="text" id="swot_f1" class="form-input" value="Savoir-faire technique reconnu & équipe stable (8 ans ancienneté)" style="margin-bottom:6px;" />
    <input type="text" id="swot_f2" class="form-input" value="Parc machines récent & disponible à 95%" style="margin-bottom:6px;" />
    <input type="text" id="swot_f3" class="form-input" value="Proximité client & devis transmis sous 24h" style="margin-bottom:6px;" />
    <input type="text" id="swot_f4" class="form-input" value="[Votre Force 1]" style="margin-bottom:6px;" />
    <input type="text" id="swot_f5" class="form-input" value="[Votre Force 2]" />
  </div>
  <div style="border:1px solid #ccc; padding:15px; border-top:4px solid #c62828; background:#fff;">
    <h4 style="margin:0 0 10px 0; color:#c62828;">🔴 FAIBLESSES (Faiblesses Internes)</h4>
    <input type="text" id="swot_w1" class="form-input" value="Dépendance forte envers 1 cadre homme-clé" style="margin-bottom:6px;" />
    <input type="text" id="swot_w2" class="form-input" value="Absence de GED (perte de 45 min/jour à chercher l'info)" style="margin-bottom:6px;" />
    <input type="text" id="swot_w3" class="form-input" value="Absence de suivi chiffré des coûts de non-qualité" style="margin-bottom:6px;" />
    <input type="text" id="swot_w4" class="form-input" value="[Votre Faiblesse 1]" style="margin-bottom:6px;" />
    <input type="text" id="swot_w5" class="form-input" value="[Votre Faiblesse 2]" />
  </div>
  <div style="border:1px solid #ccc; padding:15px; border-top:4px solid #0277bd; background:#fff;">
    <h4 style="margin:0 0 10px 0; color:#0277bd;">🔵 OPPORTUNITÉS (Externes)</h4>
    <input type="text" id="swot_o1" class="form-input" value="Exigence forte de certification ISO par les grands comptes" style="margin-bottom:6px;" />
    <input type="text" id="swot_o2" class="form-input" value="Recul d'un concurrent direct sur le bassin régional" style="margin-bottom:6px;" />
    <input type="text" id="swot_o3" class="form-input" value="Subventions régionales pour la transition numérique/GED" style="margin-bottom:6px;" />
    <input type="text" id="swot_o4" class="form-input" value="[Votre Opportunité 1]" style="margin-bottom:6px;" />
    <input type="text" id="swot_o5" class="form-input" value="[Votre Opportunité 2]" />
  </div>
  <div style="border:1px solid #ccc; padding:15px; border-top:4px solid #e65100; background:#fff;">
    <h4 style="margin:0 0 10px 0; color:#e65100;">🟠 MENACES (Externes)</h4>
    <input type="text" id="swot_t1" class="form-input" value="Hausse des prix des matières premières (+15%/an)" style="margin-bottom:6px;" />
    <input type="text" id="swot_t2" class="form-input" value="Pénurie de main d'œuvre technique sur le secteur" style="margin-bottom:6px;" />
    <input type="text" id="swot_t3" class="form-input" value="Nouvelles exigences environnementales / bilan carbone" style="margin-bottom:6px;" />
    <input type="text" id="swot_t4" class="form-input" value="[Votre Menace 1]" style="margin-bottom:6px;" />
    <input type="text" id="swot_t5" class="form-input" value="[Votre Menace 2]" />
  </div>
</div>
"""

# TOOL 01B PESTEL
t1b_advice = "Ne traitez pas la géopolitique internationale globale. Rapprochez chaque lettre PESTEL de l'impact direct sur la facture et le carnet de commandes de votre PME."
t1b_themes_html = """
<div class="theme-card"><strong>1. Politique &amp; Économique :</strong> Aides régionales Industrie 4.0, hausse du KWh gaz/élec atelier, inflation aciers/alu, hausse des frais de transport.</div>
<div class="theme-card"><strong>2. Social &amp; Technologique :</strong> Pyramide des âges (départs retraite sous 2 ans), turn-over jeunes, obsolescence ERP, risque cyberattaque ransomware.</div>
<div class="theme-card"><strong>3. Écologique :</strong> Traitement des huiles/effluents, compactage des copeaux, bilan carbone réclamé par les clients grands comptes.</div>
<div class="theme-card"><strong>4. Légal &amp; Réglementaire :</strong> Mise à jour DUERP (Document Unique Sécurité), contrôle CE machines, règles RGPD fichiers clients/fournisseurs.</div>
"""
t1b_gains = "<ul><li>Anticipation des chocs d'inflation et d'énergie.</li><li>Protection proactive des marges brutes.</li><li>Captation de subventions d'aide à l'investissement PME.</li></ul>"
t1b_risques = "<ul><li>Marge détruite par des hausses de coûts non répercutées.</li><li>Amendes ou arrêts de production pour non-respect des normes.</li><li>Non-conformité majeure ISO 9001 (Clause 4.1).</li></ul>"
t1b_guide = "<ol><li>Parcourir les 6 Piliers PESTEL.</li><li>Renseigner 2 à 3 facteurs réels par pilier.</li><li>Attribuer l'impact (🟢/🟠/🔴).</li><li>Programmer 1 action par risque rouge dans l'AMDEC (Outil 05).</li></ol>"
t1b_next = "<ul><li>Validation en Comité de Direction.</li><li>Bascule vers le Registre AMDEC (Outil 05).</li><li>Archivage sous <code>01_DIRECTION_STRATEGIE/PESTEL_2026.pdf</code>.</li></ul>"
t1b_table_md = """| Pilier PESTEL | Facteurs d'Influence à Examiner dans votre PME | Impact Estimé | Action Préventive / Opportunité à Saisir | Responsable |
| :--- | :--- | :-: | :--- | :--- |
| **POLITIQUE (P)** | Subventions régionales pour la transition numérique et achat de machines. | Opportunité | Monter un dossier d'aide régionale à l'investissement PME | DG / RAF |
| **ÉCONOMIQUE (E)** | Volatilité et hausse continue du prix des matières premières (acier/alu +15%). | Risque Fort | Inclure une clause de révision tarifaire trimestrielle sur devis | Resp. Com |
| **SOCIAL (S)** | Pénurie de profils qualifiés (techniciens de maintenance, usîneurs). | Risque Fort | Déployer la matrice de polyvalence (Outil 22) et tutorat | RH / Prod |
| **TECHNOLOGIQUE (T)** | Digitalisation des processus : nécessité d'automatiser les données atelier. | Risque Moyen | Implémenter un ERP/GED Cloud pour supprimer le papier | Resp. IT |
| **ÉCOLOGIQUE (E)** | Exigence croissante des clients grands comptes sur le bilan carbone et le tri. | Opportunité | Structurer la filière de recyclage des chutes et communiquer | Resp. QSE |
| **LÉGAL (L)** | Évolutions du code du travail (Document Unique Sécurité - DUERP). | Conforme | Mettre à jour le DUERP annuel et le programme de prévention | Resp. QSE |
| `[Votre Pilier]` | `[Votre Facteur]` | Risque | `[Votre Action]` | `[Nom]` |
"""

# TOOL 02 PARTIES PRENANTES
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
t2_next = "<ul><li>Diffusion aux Ventes, Achats, RH et Prod.</li><li>Intégration dans les Grilles Fournisseurs (Outil 09) et Fiches Recette (Outil 17).</li><li>GED : <code>01_DIRECTION_STRATEGIE/PARTIES_PRENANTES_2026.pdf</code>.</li></ul>"
t2_table_md = """| Catégorie | Nom / Acteur Réel PME | Exigence Critique Non Négociable | Risque Majeur si Non Respecté | Preuve ou Outil de Contrôle | Responsable Interne |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Clients Stratégiques** | Client Grand Compte ALFA | Livraison sous 48h maxi avec certificat de conformité | Pénalité de retard de 5%/jour + risque de déréférencement | Bon de livraison émargé + PV de contrôle signé (Outil 17) | Dir. Commercial |
| **2. Fournisseurs Critiques** | Fournisseur Métaux ACIER-X | Matières premières 100% conformes aux spécifications | Pièces défectueuses fabriquées + arrêt chaîne prod | Certificat 3.1 archivé GED + Grille d'évaluation (Outil 09) | Resp. Achats |
| **3. Financeurs / Banques** | Banque Régionale Z | Transmission des comptes certifiés et ratios de trésorerie | Refus de renouvellement de la ligne de découvert/crédit | Tableau de bord de trésorerie mensuel + Bilan annuel | RAF / DG |
| **4. Salariés & CSE** | Équipes de Production Atelier | Respect des règles de sécurité (EPI) et paiement fixe | Accidents du travail + démissions des cadres clés | Document Unique (DUERP) à jour + Registre formations | RH / QSE |
| **5. Organismes / État** | Organisme Certification ISO | Réalisation de l'audit annuel ISO 9001 sans écart majeur | Perte du certificat ISO 9001 (exigé sur les devis) | PV de Revue de Direction (Outil 07) + Rapports d'audits | Resp. QSE |
| `[Votre Catégorie]` | `[Nom du Partenaire]` | `[Exigence non négociable]` | `[Risque identifié]` | `[Document de preuve]` | `[Nom]` |
"""

# TOOL 03 DASHBOARD DIRECTION
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
t3_next = "<ul><li>Saisie mensuelle au 1er du mois.</li><li>Animation du Comité de Direction.</li><li>Affichage du Taux de Service en atelier.</li><li>GED : <code>01_DIRECTION_STRATEGIE/DASHBOARDS_2026/</code>.</li></ul>"
t3_table_md = """| Axe Métier | Indicateur Clé (KPI) | Formule Exacte de Calcul | Valeur Cible | Mois M-1 | Mois M (Réel) | Statut | Plan d'Action d'Urgence si Alerte |
| :--- | :--- | :--- | :-: | :-: | :-: | :-: | :--- |
| **1. Financier** | Chiffre d'Affaires Mensuel (€) | Somme des factures émises HT | ≥ 350 k€ | 340 k€ | **362 k€** | Conforme | Ras (Objectif dépassé) |
| **1. Financier** | Marge Brute Globale (%) | (CA HT - Coûts direct d'achat) / CA | ≥ 38 % | 36.5 % | **34.2 %** | Alerte | Bloquer la signature devis sous 35% de marge |
| **2. Qualité** | Coût de Non-Qualité (€) | Coût pièces jetées + heures retouches | ≤ 3 000 € | 5 400 € | **4 100 €** | À surveiller | Analyser la plus grosse FNC du mois (Outil 19) |
| **3. Client** | Satisfaction Client (NPS) | Score net issu des enquêtes flash | ≥ 45 | 42 | **48** | Conforme | Ras |
| **4. Opérations** | Taux de Service / Délais (%) | (Livraisons à date / Livraisons tot.) x 100 | ≥ 95 % | 92.0 % | **96.5 %** | Conforme | Ras |
| **5. Sécurité/RH**| Accidents du travail (Taux Freq) | Nb d'accidents avec arrêt / Heures travaillées | 0 accident | 0 | **0** | Conforme | Ras |
"""

# TOOL 04 POLITIQUE QUALITE
t4_advice = "Évitez le jargon d'audit théorique. La Politique Qualité doit se lire comme le contrat d'honneur du dirigeant envers ses salariés et ses clients."
t4_themes_html = """
<div class="theme-card"><strong>1. Zéro Gaspillage :</strong> Faire bien du premier coup, interdire le travail sans plan à jour, rejeter les affaires à perte.</div>
<div class="theme-card"><strong>2. Excellence Délais Client :</strong> Honorer 100% des dates de livraison promises, traiter toute alerte sous 24h.</div>
<div class="theme-card"><strong>3. Souveraineté du Savoir :</strong> Travailler dans la sécurité et le calme, formaliser les savoirs clés pour supprimer le stress des départs.</div>
"""
t4_gains = "<ul><li>Alignement de l'ensemble des équipes autour de 3 règles claires.</li><li>Crédibilité commerciale renforcée auprès des acheteurs grands comptes.</li><li>Conformité totale avec la Clause 5.2 ISO 9001.</li></ul>"
t4_risques = "<ul><li>Personnel désorienté sans priorités partagées.</li><li>Refus de certification ISO 9001 par manque d'engagement officiel.</li></ul>"
t4_guide = "<ol><li>Personnaliser les crochets <code>[...]</code>.</li><li>Revoir en Comité de Direction.</li><li>Signatures manuscrites du DG et du QSE.</li><li>Afficher en couleur et envoyer par email.</li></ol>"
t4_next = "<ul><li>Signatures manuscrites originales.</li><li>Affichage hall, salle de réunion, atelier.</li><li>Joindre au Livret d'Accueil (Outil 23).</li><li>Publication sur le site Web PME.</li></ul>"
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

# TOOL 05 AMDEC RISQUES
t5_advice = "L'AMDEC est un outil d'arbitrage financier. Ne notez pas les risques selon les ressentis affectifs : appliquez la cotation F x G pour stopper les querelles et investir là où c'est vital."
t5_themes_html = """
<div class="theme-card"><strong>1. Risques Ventes &amp; Appro :</strong> Devis chiffré sans marge brute suffisante, fournisseur unique sur composant critique.</div>
<div class="theme-card"><strong>2. Risques Prod &amp; IT :</strong> Panne de machine unique sans contrat de maintenance préventive, perte des données suite virus IT.</div>
<div class="theme-card"><strong>3. Risques Humains &amp; Sécurité :</strong> Départ imprévu du seul régleur sans procédure écrite, accident du travail sur carter manquant.</div>
"""
t5_gains = "<ul><li>Priorisation scientifique des investissements par le chiffre (ROI).</li><li>Neutralisation des pannes et crises avant survenance.</li><li>Tranquillité d'esprit du dirigeant PME.</li></ul>"
t5_risques = "<ul><li>Argent gâché dans des actions secondaires sans impact.</li><li>Accident brutal d'activité non anticipé.</li><li>Non-conformité majeure ISO 9001 (Clause 6.1).</li></ul>"
t5_guide = "<ol><li>Noter Fréquence (F: 1-5) et Gravité (G: 1-5).</li><li>Calculer Score = F x G.</li><li>Si Score &ge; 10 (Zone Rouge), action préventive OBLIGATOIRE avec ROI.</li><li>Désigner 1 pilote et 1 date d'échéance.</li></ol>"
t5_next = "<ul><li>Validation budgétaire du DG.</li><li>Délégation des actions aux pilotes.</li><li>Raccordement à la Feuille de Route SMART (Outil 06).</li><li>GED : <code>01_DIRECTION_STRATEGIE/REGISTRE_AMDEC_RISQUES.xlsx</code>.</li></ul>"
t5_table_md = """| N° | Risque / Vulnérabilité Identifiée | Cause Racine Identifiée | Fréq (1-5) | Grav (1-5) | Score (FxG) | Action Préventive à Déployer | Budget / ROI Estimé | Responsable | Statut |
| :-: | :--- | :--- | :-: | :-: | :-: | :--- | :-: | :--- | :-: |
| **R1** | Erreur de chiffrage sur devis complexe | Calcul de marge manuel sur fichier Excel | 3 | 4 | **12 (Rouge)** | Imposer une grille de validation obligatoire devis > 10k€ | ROI : Évite 20k€ d'affaires à perte | Resp. Com | Actif |
| **R2** | Rupture d'approvisionnement matière | Fournisseur unique sur composant X critique | 2 | 5 | **10 (Rouge)** | Homologuer un 2ème fournisseur de secours sous 30 jours | Coût : 500€ d'essais | Resp. Achats | Actif |
| **R3** | Panne prolongée machine découpe Laser | Défaut de maintenance préventive régulière | 2 | 4 | **8 (Orange)** | Souscrire contrat de maintenance préventive constructeur | Coût : 1 500€/an | Resp. Prod | Actif |
| **R4** | Départ imprévu du Chef d'Atelier | Absences de procédures écrites au poste | 2 | 4 | **8 (Orange)** | Rédiger les modes opératoires et former un binôme | Temps interne 20h | RH / Prod | Actif |
| **R5** | Pertes de données suite cyberattaque | Sauvegardes manuelles irrégulières serveur | 1 | 5 | **5 (Jaune)** | Automatiser des sauvegardes Cloud quotidiennes | Coût : 30€/mois | Resp. IT | Actif |
| **R6** | Accident du travail sur machine découpe | Protection carter retirée par l'opérateur | 1 | 5 | **5 (Jaune)** | Remettre le carter + consigne visuelle de sécurité (Outil 14) | Temps interne 2h | Resp. QSE | Actif |
| `[N°]` | `[Description du risque]` | `[Cause]` | `[1-5]` | `[1-5]` | `[FxG]` | `[Action préventive]` | `[Budget/ROI]` | `[Nom]` | Actif |
"""

# TOOL 06 OBJECTIFS SMART
t6_advice = "Exigez une formule mathématique exacte. Si un indicateur ne peut pas être extrait en 2 clics de votre ERP ou d'un fichier Excel, l'objectif sera abandonné en cours d'année."
t6_themes_html = """
<div class="theme-card"><strong>1. Ventes :</strong> Taux de devis transformés en commandes (%), délai moyen de transmission d'offre commercial (&lt; 48h).</div>
<div class="theme-card"><strong>2. Atelier :</strong> Réduction du pourcentage de chutes d'atelier (%), taux de pièces conformes au premier contrôle (%).</div>
<div class="theme-card"><strong>3. Achats &amp; QSE :</strong> Taux d'évaluation des fournisseurs clés &ge; 15/20 (%), taux de clôture des FNC sous 15 jours (%).</div>
"""
t6_gains = "<ul><li>Responsabilisation directe de chaque chef de service sur des chiffres.</li><li>Suivi précis grâce aux jalons trimestriels M+3 et M+6.</li><li>Preuve d'amélioration continue pour l'audit ISO.</li></ul>"
t6_risques = "<ul><li>Objectifs flous non mesurés se transformant en vœux pieux.</li><li>Démotivation des managers par manque de repères mesurables.</li><li>Écart d'audit ISO (Clause 6.2).</li></ul>"
t6_guide = "<ol><li>Appliquer le filtre SMART.</li><li>Renseigner la formule de calcul exacte.</li><li>Fixer la Cible et les Jalons M+3 / M+6.</li><li>Faire émarger le responsable de pôle.</li></ol>"
t6_next = "<ul><li>Émargement individuel de chaque responsable.</li><li>Intégration au Dashboard mensuel (Outil 03).</li><li>Points d'étape aux jalons M+3 et M+6.</li><li>GED : <code>01_DIRECTION_STRATEGIE/OBJECTIFS_SMART_2026.pdf</code>.</li></ul>"
t6_table_md = """| Service | Objectif Amélioration SMART | Formule Exacte de Mesure | Valeur Cible | Jalons M+3 | Jalons M+6 | Ressources Allocées | Responsable | Statut |
| :--- | :--- | :--- | :-: | :-: | :-: | :--- | :--- | :-: |
| **Commercial** | Réduire les devis perdus pour délai de chiffrage trop long | (Devis perdus pour délai / Total devis) x 100 | ≤ 10 % | 15 % | **8 %** | Logiciel de chiffrage express | Dir. Commercial | Conforme |
| **Production** | Diviser par deux le taux de rebuts atelier | (Valeur pièces jetées / CA produit) x 100 | ≤ 1.5 % | 2.2 % | **1.3 %** | Formation réglage + gabarits | Chef Prod | Conforme |
| **Achats** | Obtenir 100% de livraisons fournisseurs dans les délais | (Commandes reçues à date / Total commandes) x 100 | ≥ 98 % | 95 % | **98.5 %** | Grille d'évaluation (Outil 09) | Resp. Achats | Conforme |
| **Qualité / QSE** | Prise en charge des réclamations clients sous 24h | (Réclamations traitées < 24h / Total réclamations) | 100 % | 90 % | **100 %** | Registre réclamations (Outil 10) | Resp. QSE | Conforme |
| **RH / Formations** | Former 100% des nouveaux salariés au Livret Qualité | (Salariés formés J+7 / Total embauches) x 100 | 100 % | 100 % | **100 %** | Livret d'accueil (Outil 23) | RH | Conforme |
| `[Votre Service]` | `[Objectif SMART]` | `[Formule]` | `[Cible]` | `[M+3]` | `[M+6]` | `[Ressources]` | `[Nom]` | Conforme |
"""

# TOOL 07 REVUE DIRECTION
t7_advice = "La Revue de Direction n'est pas une simple réunion d'information : c'est le conseil d'administration opérationnel de la Qualité. Suivez scrupuleusement les 7 points normatifs pour ressortir avec des arbitrages et des budgets votés."
t7_themes_html = """
<div class="theme-card"><strong>1. Équipements &amp; Outillage :</strong> Arbitrages d'achats de nouvelles machines, outillage de contrôle dimensionnel.</div>
<div class="theme-card"><strong>2. Ressources Humaines :</strong> Validation des budgets de formation polyvalence, recrutements de binômes.</div>
<div class="theme-card"><strong>3. Audits &amp; GED :</strong> Validation du programme d'audit interne, déploiement de l'arborescence GED Cloud.</div>
"""
t7_gains = "<ul><li>Validation officielle annuelle du Système par le Directeur Général.</li><li>Arbitrages budgétaires consigné dans un document managérial et juridique.</li><li>Preuve N°1 absolue exigée par les auditeurs ISO 9001 (Clause 9.3).</li></ul>"
t7_risques = "<ul><li>Refus de certification ISO 9001 (Défaut normatif majeur).</li><li>Direction déconnectée des coûts cachés et de la réalité terrain.</li></ul>"
t7_guide = "<ol><li>Préparer les données en amont (Dashboard, SWOT, AMDEC).</li><li>Animer la séance en 1h chrono sur les 7 points.</li><li>Consigner les décisions budgétaires.</li><li>Émargement manuscrit de tous les participants.</li></ol>"
t7_next = "<ul><li>Émargement obligatoire du DG et des participants.</li><li>Archivage sous <code>01_DIRECTION_STRATEGIE/PV_REVUE_DIRECTION_2026.pdf</code>.</li><li>Communication d'une note synthétique aux salariés.</li></ul>"

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


# LIST OF ALL TOOLS FOR THE GENERATOR LOOP
tools = [
    {
        "code": "OUTIL_01A",
        "file": "OUTIL_01A_SWOT.html",
        "title": "Outil 01A - Formulaire Saisissable SWOT",
        "clause": "Clause 4.1",
        "q_num": "Q1",
        "advice_text": t1a_advice,
        "themes_html": t1a_themes_html,
        "gains_html": t1a_gains,
        "risques_html": t1a_risques,
        "guide_html": t1a_guide,
        "next_steps_html": t1a_next,
        "body_content": t1a_body
    },
    {
        "code": "OUTIL_01B",
        "file": "OUTIL_01B_PESTEL.html",
        "title": "Outil 01B - Formulaire Saisissable PESTEL",
        "clause": "Clause 4.1",
        "q_num": "Q1",
        "advice_text": t1b_advice,
        "themes_html": t1b_themes_html,
        "gains_html": t1b_gains,
        "risques_html": t1b_risques,
        "guide_html": t1b_guide,
        "next_steps_html": t1b_next,
        "body_content": md_table_to_interactive_html(t1b_table_md, "pestel")
    },
    {
        "code": "OUTIL_02",
        "file": "OUTIL_02_PARTIES_PRENANTES.html",
        "title": "Outil 02 - Formulaire Saisissable Parties Prenantes",
        "clause": "Clause 4.2",
        "q_num": "Q2",
        "advice_text": t2_advice,
        "themes_html": t2_themes_html,
        "gains_html": t2_gains,
        "risques_html": t2_risques,
        "guide_html": t2_guide,
        "next_steps_html": t2_next,
        "body_content": md_table_to_interactive_html(t2_table_md, "parties")
    },
    {
        "code": "OUTIL_03",
        "file": "OUTIL_03_DASHBOARD_DIRECTION.html",
        "title": "Outil 03 - Formulaire Saisissable Dashboard Direction",
        "clause": "Clause 5.1 & 9.1",
        "q_num": "Q3 & Q26",
        "advice_text": t3_advice,
        "themes_html": t3_themes_html,
        "gains_html": t3_gains,
        "risques_html": t3_risques,
        "guide_html": t3_guide,
        "next_steps_html": t3_next,
        "body_content": md_table_to_interactive_html(t3_table_md, "dashboard")
    },
    {
        "code": "OUTIL_04",
        "file": "OUTIL_04_POLITIQUE_QUALITE.html",
        "title": "Outil 04 - Formulaire Saisissable Politique Qualité",
        "clause": "Clause 5.2",
        "q_num": "Q4",
        "advice_text": t4_advice,
        "themes_html": t4_themes_html,
        "gains_html": t4_gains,
        "risques_html": t4_risques,
        "guide_html": t4_guide,
        "next_steps_html": t4_next,
        "body_content": f"<textarea id=\"politique_text\" class=\"template-textarea\">{t4_text}</textarea>"
    },
    {
        "code": "OUTIL_05",
        "file": "OUTIL_05_AMDEC_RISQUES.html",
        "title": "Outil 05 - Formulaire Saisissable AMDEC Risques",
        "clause": "Clause 6.1",
        "q_num": "Q5",
        "advice_text": t5_advice,
        "themes_html": t5_themes_html,
        "gains_html": t5_gains,
        "risques_html": t5_risques,
        "guide_html": t5_guide,
        "next_steps_html": t5_next,
        "body_content": md_table_to_interactive_html(t5_table_md, "amdec")
    },
    {
        "code": "OUTIL_06",
        "file": "OUTIL_06_OBJECTIFS_SMART.html",
        "title": "Outil 06 - Formulaire Saisissable Objectifs SMART",
        "clause": "Clause 6.2",
        "q_num": "Q6",
        "advice_text": t6_advice,
        "themes_html": t6_themes_html,
        "gains_html": t6_gains,
        "risques_html": t6_risques,
        "guide_html": t6_guide,
        "next_steps_html": t6_next,
        "body_content": md_table_to_interactive_html(t6_table_md, "smart")
    },
    {
        "code": "OUTIL_07",
        "file": "OUTIL_07_REVUE_DIRECTION.html",
        "title": "Outil 07 - Formulaire Saisissable PV Revue Direction",
        "clause": "Clause 9.3",
        "q_num": "Q7",
        "advice_text": t7_advice,
        "themes_html": t7_themes_html,
        "gains_html": t7_gains,
        "risques_html": t7_risques,
        "guide_html": t7_guide,
        "next_steps_html": t7_next,
        "body_content": f"<textarea id=\"pv_revue_text\" class=\"template-textarea\">{t7_text}</textarea>"
    }
]

for t in tools:
    file_path = os.path.join(out_html, t["file"])
    html_content = html_layout.format(
        title=t["title"],
        code=t["code"],
        clause=t["clause"],
        q_num=t["q_num"],
        advice_text=t["advice_text"],
        themes_html=t["themes_html"],
        gains_html=t["gains_html"],
        risques_html=t["risques_html"],
        guide_html=t["guide_html"],
        body_content=t["body_content"],
        next_steps_html=t["next_steps_html"]
    )
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    with open(os.path.join(out_html_unified, t["file"]), "w", encoding="utf-8") as f:
        f.write(html_content)

print("Successfully generated all 8 interactive HTML tools and START_HERE guide for Sequence 1!")
