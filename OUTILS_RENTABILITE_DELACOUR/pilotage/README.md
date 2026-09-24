# Pilotage Delacour : outils 1.1 et 1.2 reconstruits

- **Indicateurs (1.1)** : tableau de pilotage mensuel d'une PME : synthèse dirigeant, saisie du mois, plan d'actions (5 pourquoi + 5M) et mesure d'efficacité.
- **Plans B (1.2)**, ouvert par `pilotage.html#continuite` : cartographie des risques vitaux (matrice gravité × probabilité), fiche risque en 4 étapes, tests des Plans B, fiches réflexes imprimables (écran Crise).
- **Agir** : un seul plan d'actions pour les deux outils (actions correctives d'indicateurs et actions de préparation des Plans B).

Remplace les outils 1.1 et 1.2 de `../app/tool_page.html`.

Livré comme **un seul fichier HTML** (`dist/index.html`, copié en `../livrable/pilotage.html`), sans aucune requête réseau (règle de sécurité CSP intégrée), qui enregistre dans le navigateur ou dans le dossier OneDrive / SharePoint du client.

## Commandes

```bash
npm install        # une fois
npm run dev        # développement (http://localhost:5173)
npm test           # tests des calculs et du stockage (vitest)
npm run build      # vérification TypeScript + fichier unique dist/index.html
python3 ../../execution/build_outils_app.py   # met à jour ../livrable/ (depuis la racine du projet)
```

## Organisation

| Dossier | Rôle |
|---|---|
| `src/domain/` | **Métier, sans interface** : types, périodes, nombres, moteur de calcul des indicateurs (`engine.ts` : statuts, bilans, tendance, dérive lente, efficacité, messages) et des risques (`risk.ts` : criticité, état du Plan B, tests, exposition), reprise de l'ancienne version, exemple et listes par métier (`templates.ts`, `riskTemplates.ts`). Testé. |
| `src/store/` | **Stockage** : clés synchronisées, navigateur (`localStorage`), dossier partagé (un fichier par personne, dossier `direction` séparé), contexte React. Testé. |
| `src/ui/` | **Écrans** : mise en route, Piloter, Saisir, Agir, fiche action, détail d'un indicateur, réglages, graphique ; pour le 1.2 : Cartographie (`Risques.tsx`), fiche risque, Tests, Crise. |
| `scripts/extract-templates.cjs` | Extraction unique de l'exemple et des listes par métier depuis l'ancienne version (`src/domain/legacy-templates.json`). |

## Principes

- **Données repérées par la période** (`"2026-12"`), jamais par une position de colonne.
- **Valeurs numériques** stockées en nombres ; le format français n'intervient qu'à l'affichage.
- **Rôle explicite des indicateurs** (`role: 'ca' | 'marge' | 'treso'…`) pour la synthèse et les messages, au lieu de deviner d'après le nom.
- **Statut** calculé sur le mois affiché ; dérive jusqu'à −10 % (ou +20 % si « plus bas = mieux »), alerte au-delà ; cible à 0 en écart absolu.
- **Efficacité** d'une action corrective jugée sur le mois qui suit sa clôture ; d'une action de préparation, sur le premier test du Plan B qui suit sa clôture.
- **État d'un Plan B** calculé, jamais deviné : non couvert (pas de Plan B), à préparer (actions ouvertes), prêt à tester, testé (test réussi il y a moins de 180 jours), test périmé, test raté (le dernier test fait foi).
- **Criticité** = gravité × probabilité (1 à 16 ; critique à partir de 9). Les niveaux de gravité sont définis en euros, calés sur l'objectif de CA (0,2 %, 2 %, 8 %), et en conséquences non financières. Le coût d'un arrêt est facultatif : il propose une gravité, l'exposition annuelle et le délai de remboursement du Plan B.
- **Couverture testée** : part de la criticité totale dont le Plan B est testé ; c'est le chiffre clé du 1.2.
- **Confidentialité** : en vue équipe (ou sans accès au dossier `direction`), aucun montant ni message ne révèle un indicateur confidentiel ; les coûts d'arrêt des risques sont masqués. Les contacts des fiches réflexes restent visibles de tous : l'équipe en a besoin le jour de la panne.
- Règles visuelles : `../app/DESIGN_OUTILS.md`.

## Format des fichiers partagés

`donnees/equipe/pilotage-<auteur>.json` et `donnees/direction/pilotage-<auteur>.json` :

```json
{ "version": 2, "author": "Sandrine", "updatedAt": "…", "entries": { "value|kpi_cnq|2026-12": { "ts": "2026-12-05T09:12:00Z", "v": 310 } } }
```

Clés : `settings`, `timeline`, `process|<id>`, `kpi|<id>`, `value|<kpi>|<AAAA-MM>`, `action|<id>`, `risk|<id>` et `riskcost|<id>` (coûts d'un risque, dossier `direction`). À la lecture, toutes les entrées de tous les fichiers sont fusionnées : la plus récente gagne. Les anciens fichiers `journal-*.json` sont convertis à la première connexion. Les risques de l'ancien outil 1.2 (restés dans le navigateur) sont proposés à la reprise sur la cartographie vide.
