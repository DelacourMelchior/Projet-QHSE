# Original User Request

## 2026-09-20T13:00:14Z

Approfondir l'Outil 1.2 (Plan B & Continuité d'activité) dans la suite logicielle QHSE Delacour pour en faire un outil de pilotage de crise opérationnel complet : intégration d'un simulateur financier de crise multi-scénarios, d'un générateur de fiches réflexes d'urgence A5 imprimables/déployables sur le terrain, et d'un module d'export exécutif d'arbitrage pour la Direction Générale et les assurances.

Working directory: /Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE
Integrity mode: development

## Requirements

### R1. Simulateur Financier d'Impact & Stress-Tests de Trésorerie
Développer un module de simulation financière multi-scénarios (coupure de 2h, arrêt d'une journée de 7h, rupture prolongée d'une semaine de 35h). Le simulateur doit calculer automatiquement l'impact cumulé (salaires bloqués, marge brute perdue, pénalités contractuelles et coûts de redémarrage), déterminer le seuil de rentabilité du Plan B en euros épargnés, et afficher une comparaison immédiate "Coût sans Plan B vs Coût avec Plan B".

### R2. Générateur de Fiches Réflexes d'Urgence Terrain (Format A5 / Impression & Mobile)
Créer un composant autonome de génération et visualisation d'une Fiche Réflexe d'Urgence (format A5 optimisé pour affichage atelier / bureau et impression PDF propre sans éléments d'interface parasites). La fiche doit reprendre instantanément pour toute ligne sélectionnée : le contact d'astreinte 24/7, la localisation des clés/mots de passe, la tâche sacrifiée d'office sans réunion, la fenêtre critique de bascule et la date/protocole du crash-test à froid.

### R3. Export Exécutif de Continuité & Synthèse Décisionnelle
Ajouter une fonction d'export synthétique structuré (dossier de continuité d'activité) destiné à la Direction et aux assureurs. Ce document consolidé doit récapituler l'ensemble des goulets analysés, la matrice des risques opérationnels, le volume financier annuel sécurisé et le calendrier des crash-tests à froid programmés.

### R4. Maintien de l'Intégrité & Zéro Régression
Toutes les nouvelles fonctionnalités doivent s'intégrer harmonieusement dans `OUTILS_RENTABILITE_DELACOUR/app/tool_page.html` en respectant l'architecture existante : interface pure Tailwind CSS / Vanilla JS, support complet de `DelacourUndoManager` (Ctrl+Z / Ctrl+Y), maintien strict du format de données à 7 colonnes pour `TOOLS_DATA["1.2"]` et compatibilité avec l'ensemble des scripts de test existants.

## Verification Resources
L'équipe d'agents dispose des scripts de validation unitaire existants (exécutables via Node.js dans l'environnement du projet) :
- `scratch/test_decomposed_wizard.js` : validation du cycle en 4 étapes et de l'intégrité du tableau 7 colonnes.
- `scratch/test_problem_starter.js` : validation des amorces de départ, du détecteur anti-fausse solution et de la jauge de maturité.
- `scratch/test_undo_manager.js` : validation du moteur universel Ctrl+Z / Ctrl+Y au niveau document et champs texte.

## Acceptance Criteria

### Simulations Financières
- [ ] Le simulateur calcule avec exactitude mathématique le coût d'arrêt pour 2h, 1 jour (7h) et 1 semaine (35h) à partir des paramètres saisis (salariés, taux horaire, marge, pénalités).
- [ ] Le gain net protégé et le retour sur investissement (ROI) de la parade sont calculés et affichés sans erreur de formatage.
- [ ] Les cas limites (valeurs à zéro, taux élevés, saisies décimales) sont gérés sans générer de `NaN` ni d'erreur d'exécution.

### Fiches Réflexes Terrain
- [ ] Un bouton d'action dédié permet d'ouvrir la Fiche Réflexe pour n'importe quelle ligne de l'Outil 1.2.
- [ ] La fiche affiche de manière lisible les 5 données vitales de crise : allié/parade, contact 24/7, localisation clés/accès, tâche sacrifiée, échéance du crash-test.
- [ ] Un style d'impression dédié (`@media print`) garantit une mise en page A5 nette sans menus de navigation ni boutons d'administration.

### Export Exécutif & Zéro Régression
- [ ] L'export exécutif compile l'ensemble des lignes saisies avec les totaux consolidés (coût total d'arrêt potentiel vs total sécurisé).
- [ ] Les raccourcis clavier `Ctrl+Z` / `Ctrl+Y` continuent de fonctionner sur toutes les nouvelles zones de saisie.
- [ ] L'ensemble des tests de non-régression existants (`test_decomposed_wizard.js`, `test_problem_starter.js`, `test_undo_manager.js`) continuent de passer avec 100 % de succès.
- [ ] Un nouveau script de test unitaire Node.js (`scratch/test_planb_advanced.js`) est créé, couvre l'ensemble des critères R1-R3 et s'exécute avec succès (code de sortie 0).
