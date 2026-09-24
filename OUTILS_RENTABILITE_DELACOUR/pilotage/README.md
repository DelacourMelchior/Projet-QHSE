# Pilotage Delacour : outil 1.1 reconstruit

Tableau de pilotage mensuel des indicateurs d'une PME : synthèse dirigeant, saisie du mois, plan d'actions (5 pourquoi + 5M) et mesure d'efficacité. Remplace l'outil 1.1 de `../app/tool_page.html`.

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
| `src/domain/` | **Métier, sans interface** : types, périodes, nombres, moteur de calcul (statuts, bilans, tendance, dérive lente, efficacité, messages), reprise de l'ancienne version, exemple et listes par métier. Testé. |
| `src/store/` | **Stockage** : clés synchronisées, navigateur (`localStorage`), dossier partagé (un fichier par personne, dossier `direction` séparé), contexte React. Testé. |
| `src/ui/` | **Écrans** : mise en route, Piloter, Saisir, Agir, fiche action, détail d'un indicateur, réglages, graphique. |
| `scripts/extract-templates.cjs` | Extraction unique de l'exemple et des listes par métier depuis l'ancienne version (`src/domain/legacy-templates.json`). |

## Principes

- **Données repérées par la période** (`"2026-12"`), jamais par une position de colonne.
- **Valeurs numériques** stockées en nombres ; le format français n'intervient qu'à l'affichage.
- **Rôle explicite des indicateurs** (`role: 'ca' | 'marge' | 'treso'…`) pour la synthèse et les messages, au lieu de deviner d'après le nom.
- **Statut** calculé sur le mois affiché ; dérive jusqu'à −10 % (ou +20 % si « plus bas = mieux »), alerte au-delà ; cible à 0 en écart absolu.
- **Efficacité** d'une action jugée sur le mois qui suit sa clôture.
- **Confidentialité** : en vue équipe (ou sans accès au dossier `direction`), aucun montant ni message ne révèle un indicateur confidentiel.
- Règles visuelles : `../app/DESIGN_OUTILS.md`.

## Format des fichiers partagés

`donnees/equipe/pilotage-<auteur>.json` et `donnees/direction/pilotage-<auteur>.json` :

```json
{ "version": 2, "author": "Sandrine", "updatedAt": "…", "entries": { "value|kpi_cnq|2026-12": { "ts": "2026-12-05T09:12:00Z", "v": 310 } } }
```

Clés : `settings`, `timeline`, `process|<id>`, `kpi|<id>`, `value|<kpi>|<AAAA-MM>`, `action|<id>`. À la lecture, toutes les entrées de tous les fichiers sont fusionnées : la plus récente gagne. Les anciens fichiers `journal-*.json` sont convertis à la première connexion.
