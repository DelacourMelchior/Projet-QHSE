# Project: Pilotage de Crise Opérationnel — Enrichissement Outil 1.2 (Plan B)

## Architecture
- **Environment**: Pure Tailwind CSS / Vanilla JS within single-page application `OUTILS_RENTABILITE_DELACOUR/app/tool_page.html`.
- **Testing Environment**: Node.js v26 native VM (`node:vm` + lightweight Mock DOM in `scratch/common_harness.js`), zero external npm dependencies required.
- **Data Persistence**: `localStorage` (via `DELACOUR_DATA_1.2`) strictly tied to a 7-column schema in `TOOLS_DATA["1.2"]`.
- **Undo/Redo Engine**: `DelacourUndoManager` managing document snapshots (`recordDocState`) and per-input field history (`recordFieldChange`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Moteur de Calcul Financier Multi-Scénarios | Calculs exacts 2h, 7h, 35h avec salaires, marge, pénalités, redémarrage, coût avec/sans Plan B, gain net protégé, seuil de rentabilité et ROI | M1 | Survey (R1) |
| F2 | Interface Utilisateur du Simulateur Financier | Modal dédié `#financialSimulatorModal` (bouton `🧮` ligne & barre d'actions) + intégration dans l'Étape 2 du Wizard | M1 | Survey (R1) |
| F3 | Moteur d'Extraction des 5 Données Vitales A5 | Extraction & normalisation des 5 données vitales de crise (parade, contact 24/7, clés/accès, tâche sacrifiée, délai bascule/crash-test) | M2 | Survey (R2) |
| F4 | Visualisation & Impression Fiche Réflexe A5 | Modal `#reflexCardModal`, prévisualisation A5 responsive, export SMS/WhatsApp, impression dédiée `@media print` A5 sans parasites | M2 | Survey (R2) |
| F5 | Moteur d'Agrégation Synthèse Exécutive | Consolidation multi-lignes, totaux d'arrêt brut (7h, 35h) vs volume annuel sécurisé, matrice des risques P1-P5, calendrier crash-tests | M3 | Survey (R3) |
| F6 | Interface & Formats d'Export Exécutif | Bouton barre d'actions & menu `#exportMenu`, modal exécutif, feuille Excel `00_SYNTHESE_EXECUTIVE_DG`, page A4 dédiée | M3 | Survey (R3) |
| F7 | Intégrité Architecturale & UndoManager | Maintien strict des 7 colonnes `TOOLS_DATA["1.2"]`, écoute universelle `DelacourUndoManager` (Ctrl+Z / Ctrl+Y), zéro régression | M4 | Survey (R4) |
| F8 | Harnais & Tests Unitaires de Baseline | `scratch/common_harness.js`, `scratch/test_decomposed_wizard.js`, `scratch/test_problem_starter.js`, `scratch/test_undo_manager.js` | E2E | Survey (R4) |
| F9 | Suite de Validation Avancée E2E | `scratch/test_planb_advanced.js` couvrant Tiers 1-4 (R1 à R3) avec exit code 0 et publication de `TEST_READY.md` | E2E | Survey (R1-R4) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Harnais partagé + 3 tests baseline + suite complète `test_planb_advanced.js` | none | DONE |
| M1 | Simulateur Financier R1 | Moteur de calcul multi-scénarios (2h, 7h, 35h) + UI modal & Wizard étape 2 | none | DONE |
| M2 | Fiches Réflexes Terrain R2 | Extraction 5 données vitales + modal de prévisualisation + print CSS A5 | none (interf. M1) | DONE |
| M3 | Export Exécutif R3 | Agrégation consolidée, matrice des risques P1-P5, calendrier crash-tests, export Excel/PDF | M1, M2 | DONE |
| M4 | Final Milestone & Intégrité R4 | Raccordement DelacourUndoManager, validation 100% tests E2E (Tiers 1-4) + hardening Tier 5 | E2E, M3 | DONE |

## Interface Contracts
### Simulateur Financier (M1) ↔ Outil 1.2 Table
- Function: `calculateCrisisScenarios(params)`
  - Input: `{ nbSalaries, tauxHoraire, margeHoraire, penalitesHoraire, coutRedemarrage, delaiBascule, budgetParade }`
  - Output: `{ hourlyCost, scenarios: { h2, h7, h35 }, seuilHeures, seuilEuros, roi }`
- Integration: Update row label in `tool.rows[rIdx][0]` without altering the 7-column schema.
- Event: Trigger `DelacourUndoManager.recordDocState("Mise à jour simulation financière")`.

### Fiche Réflexe (M2) ↔ Outil 1.2 Table
- Function: `openReflexCardModal(rowIdx)` / `printRowCrashCard(rowIdx)`
  - Extracts strictly from `tool.rows[rowIdx]`:
    - `r[0]`: Macro-processus & Risque vital
    - `r[1]`: Parade Plan B
    - `r[2]`: Tâche sacrifiée d'office
    - `r[3]`: Contact 24/7 & Localisation clés/MDP
    - `r[4]`: Délai max bascule
    - `r[5]`: Mandat express sans DG
    - `r[6]`: Statut et date crash-test
- DOM: Modal `#reflexCardModal` and print container styled with `@media print`.

### Export Exécutif (M3) ↔ Outil 1.2 Table
- Function: `generateExecutiveContinuityDossier()`
  - Reads all rows in `TOOLS_DATA["1.2"].rows`.
  - Aggregates metrics: total hourly impact, 7h loss, 35h loss, annual secured volume, express mandate envelope, crash-test compliance rate.
  - Groups rows by Macro-Processus (P1 à P5).

## Code Layout
- Exclusive ownership:
  - **E2E Testing Track**: `scratch/common_harness.js`, `scratch/test_decomposed_wizard.js`, `scratch/test_problem_starter.js`, `scratch/test_undo_manager.js`, `scratch/test_planb_advanced.js`, `TEST_INFRA.md`, `TEST_READY.md`.
  - **Implementation Track**: `OUTILS_RENTABILITE_DELACOUR/app/tool_page.html`.
  - **Metadata & State**: `.agents/*`, `PROJECT.md`, `GATE_STATUS.md`, `DEAD_ENDS.md`.
