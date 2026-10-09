# Directive : Charte & Directives de Conception des Documents & Outils (Cabinet Delacour)

## 📌 Objectif
Ce document définit les règles de conception graphiques, techniques, rédactionnelles et normatives pour tous les documents Word (`.docx`), gabarits HTML et notices du Cabinet Delacour. Il sert de **SOP (Standard Operating Procedure)** obligatoire pour créer ou adapter de nouveaux outils de management QHSE.

---

## 🎨 1. Identité Visuelle & Charte Graphique (Design System Website)

### Couleurs de Marque (Palette Officielle)
- **Vert Forêt Signature (Primary Dark)** : `#152822` (ou `#1B4D3E` en RGB: `27, 77, 62`)
- **Vert Émeraude Clair (Secondary)** : `#4A6C5C` (RGB: `74, 108, 92`)
- **Doré Noble / Beige Accent** : `#C5A065` (RGB: `197, 160, 101`)
- **Beige Noble Text** : `#F0EAD6`
- **Blanc Pur (Textes sur fond sombre)** : `#FFFFFF`
- **Arrière-plans Conteneurs** :
  - Crème Titre : `#F9F9F7`
  - Thématiques / Section : `#F7F9F8`
  - Pourquoi / Capital : `#FDFBF7`
- **Textes d'alerte / Statuts** :
  - Gain / Conforme : Vert `#1B5E20`
  - Risque / Alerte : Rouge `#B71C1C`
  - Zone modifiable client : Doré `#C5A065` (Gras Italique)

### Typographies Nativité macOS / Windows (0 Message d'Avertissement)
> **Règle absolue** : Ne pas utiliser de polices propriétaires Microsoft non préinstallées sur Mac (comme `Calibri`) pour éviter la pop-up de remplacement de police sous Apple Pages.

- **Police Corps, Tableaux & Pieds de page (Sans-Serif)** : **`Arial`** (ou `Helvetica` / `Montserrat`)
- **Police Titres & En-têtes (Serif)** : **`Georgia`** (ou `Playfair Display`)

---

## 🖼️ 2. Structure d'En-tête de Document (Header Banner)

Chaque document Word contient dans son en-tête natif l'image de bannière HD vectorisée Retina 300 DPI (`.tmp/header_brand_unified_hd.png`), correspondant exactement au header du site Web :

- **Fond** : Vert Forêt Sombre `#152822` avec ligne inférieure dorée 4px `#C5A065`.
- **Logo Double Triangle (Gauche)** :
  - Triangle externe & interne : Contours Beige Noble `#F0EAD6`
  - Étoile 4 branches centrale : Remplissage Doré `#C5A065`
- **Marque (Gauche)** :
  - Ligne 1 : `Cabinet` en Beige Noble (`#F0EAD6`), Montserrat Bold majuscule (`letter-spacing: 0.22em`).
  - Ligne 2 : `Delacour` en Blanc Pur (`#FFFFFF`), Montserrat Bold majuscule (`letter-spacing: 0.22em`).
- **Sous-titre / Navigation (Droite)** :
  - `STRATÉGIE & PERFORMANCE QHSE` en Beige Noble (`#F0EAD6`), Montserrat majuscule épurée.

---

## 📑 3. Structure du Pied de Page (Footer)

### Règle d'Alignement & OpenXML Strict
- **Gauche (Flush Left 100%)** : `Cabinet Delacour • delacour.melchior@cabinetdelacour.com`
- **Saut de Tabulation** : Double saut de tabulation (`\t\t`) avec taquet de tabulation droit XML (`<w:tab w:val="right" w:pos="10512"/>` soit 7.3 pouces / 18.5 cm).
- **Droite (Flush Right 100%)** : `Page X / Y` (champs XML natifs `<w:fldSimple w:instr="PAGE"/>` et `<w:fldSimple w:instr="NUMPAGES"/>`).
- **Style** : Police `Arial` 7.5pt, Italique, couleur gris `#787878`.
- **Exclusions** : Pas d'adresse physique ("13770 Venelles" retiré), pas de clause de confidentialité encombrante.

---

## 🧱 4. Structure des Blocs du Corps de Texte

Chaque outil suit la même architecture en 6 blocs ordonnés :

1. **Bandeau de Titre Métier** :
   - Tableau 1x1, fond crème `#F9F9F7`, bordure gauche dorée `#C5A065` (3pt).
   - Indication de Séquence, Code Outil, Clause ISO (ex: `SÉQUENCE 1 • OUTIL 01A — Clause ISO 9001:2015 • 4.1`).
   - Titre principal en Georgia 14.5pt Bold Vert `#1B4D3E`.

2. **Conseils Consultant & Exemple de 4 Thématiques (2x2)** :
   - Tableau 4x2, fond `#F7F9F8`, bordures vert émeraude.
   - En-tête : *Posture & Animation Consultant*.
   - 4 cartes d'exemples concrets du secteur (Forces, Faiblesses, Opportunités, Menaces ou Ventes, Prod, Achats, QSE).

3. **Pourquoi cet Outil est Capital pour votre Entreprise** :
   - Tableau 2x2, fond `#FDFBF7`, bordure dorée.
   - Colonne 1 : *Ce que vous gagnez à l'utiliser* (puces en vert `#1B5E20`).
   - Colonne 2 : *Ce que vous risquez sans cet outil* (puces en rouge `#B71C1C`).

4. **Guide de Remplissage Pas à Pas (4 Étapes)** :
   - Tableau 1x1, 4 étapes chronologiques claires et pragmatiques.

5. **Formulaires & Tableaux 100% Éditables (Zone d'Action Client)** :
   - Sauts de page au besoin pour aérer les grilles.
   - En-têtes de tableaux en Vert Forêt (`#1B4D3E`), texte blanc gras 8pt.
   - Lignes de données réelles d'exemples d'entreprises alternées (Blanc `#FFFFFF` / Gris Crème `#F9F9F7`).
   - Zones de saisie libre mises en relief en Doré Bold Italique (`[Votre Force 1] : __________________`).

6. **Que faire une fois l'outil complété ?** :
   - Tableau 1x1, fond crème `#F9F9F7`, bordure dorée.
   - Prochaines étapes de validation, animation et archivage dans l'arborescence GED (ex: `01_DIRECTION_STRATEGIE/`).

---

## ✍️ 5. Règles Rédactionnelles & Vocabulaire
- Remplacer systématiquement les acronymes flous (ex: `PME`) par **`votre entreprise`**.
- Exiger des indicateurs chiffrés, des formules mathématiques exactes et des ROI concrets (€, %, heures/semaine).
- Conserver un ton d'expert consultant orienté résultats, rentabilité et sérénité du dirigeant.

---

## ⚙️ 6. Scripts d'Exécution Associés
- `execution/generate_sequence_1_docx_exact_html_visual_v2.py` : Générateur principal des documents Word de la Séquence 1.
- `execution/generate_sequence_1_docx_exact_mirror.py` : Générateur miroir de synchronisation.
- `execution/organize_tools_directory.py` : Script d'organisation et d'arborescence des livrables sous `OUTILS_QUALITE_DELACOUR/`.
