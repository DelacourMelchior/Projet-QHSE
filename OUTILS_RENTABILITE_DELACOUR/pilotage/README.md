# Outils Delacour : 19 outils, un seul fichier

Un outil par question de l'audit des 5 processus (plus l'annuaire de crise), dans une seule application React + TypeScript. Tous les outils partagent le même plan d'actions, la même équipe et le même stockage.

| Processus | Outils | Adresse |
|---|---|---|
| **P1 Pilotage** | 1.1 Indicateurs (Piloter, Saisie) · 1.2 Plans B · 1.3 Annuaire | `pilotage.html`, `#continuite`, `#annuaire` |
| **P2 Commercial** | 2.1 Devis (5 verrous, marge, visas, relance) · 2.2 Avenants (accord écrit avant de faire) · 2.3 Réclamations (rappel sous 48 h) · 2.4 Bilan de fin d'affaire (3 questions, facture sous 24 h) | `#2.1` à `#2.4` |
| **P3 Opérations** | 3.1 Fournisseurs (fiche de débit sous 48 h, note A/B/C) · 3.2 Instructions visuelles (photos, versions, habilitations) · 3.3 Maintenance (routine du lundi, armoire de survie) · 3.4 Réceptions (jalons, PV, règle 95/5) | `#3.1` à `#3.4` |
| **P4 RH** | 4.1 Suppléances (2 suppléants entraînés, enveloppe des accès) · 4.2 Polyvalence (0 à 4, homme-clé) · 4.3 Accueil (parcours 15 jours, test en 3 questions) · 4.4 Classement (nommage, plan, test des 30 s) | `#4.1` à `#4.4` |
| **P5 Qualité** | 5.1 Bac rouge (décision sous 24 h) · 5.2 Non-qualité (coût par processus) · 5.3 Ateliers 5 Pourquoi · 5.4 Détrompeurs (contrôle à J+30) | `#5.1` à `#5.4` |
| | Accueil : les 19 outils et ce qui demande attention | `#accueil` |

Livré comme **un seul fichier HTML** (`dist/index.html`, copié en `../livrable/pilotage.html`), sans aucune requête réseau (règle de sécurité CSP intégrée), qui enregistre dans le navigateur ou dans le dossier OneDrive / SharePoint du client.

## Commandes

```bash
npm install        # une fois
npm run dev        # développement (http://localhost:5173)
npm test           # tests des calculs, des documents PDF et du stockage (vitest)
npm run build      # vérification TypeScript + fichier unique dist/index.html
python3 ../../execution/build_outils_app.py   # construit puis met à jour ../livrable/ (depuis la racine du projet)
```

## Organisation

| Dossier | Rôle |
|---|---|
| `src/domain/` | **Métier, sans interface, testé.** Un moteur par processus : `engine.ts` (1.1), `risk.ts` (1.2), `contacts.ts` (1.3), `commercial.ts` (2.1 à 2.4), `operations.ts` (3.1 à 3.4), `team.ts` (4.1 à 4.4), `quality.ts` (5.1 à 5.4). À côté : les exemples (`*Examples.ts`), les documents PDF (`reflexPdf.ts`, `docPdf.ts` et `*Pdf.ts`), les chiffres proposés au 1.1 (`feeds.ts`), l'état de chaque outil pour l'accueil et les onglets (`status.ts`), la reprise des anciennes versions (`migrate.ts`, `legacyTools.ts`). |
| `src/store/` | **Stockage** : clés synchronisées, navigateur (`localStorage`), dossier partagé (un fichier par personne, dossier `direction` séparé), contexte React. Testé. |
| `src/ui/` | **Écrans.** `App.tsx` (en-tête, processus, onglets), `tools.ts` (liste des 19 outils), `Home.tsx`, `Agir.tsx` (plan d'actions commun), `common.tsx` (briques communes : synthèse, filtres, méthode, champs) ; un dossier par processus : `commercial/`, `operations/`, `team/`, `quality/`. |
| `scripts/extract-templates.cjs` | Extraction unique, déjà faite, de l'exemple et des listes par métier depuis l'ancienne version (`src/domain/legacy-templates.json`). |

## Principes

- **Une même forme pour chaque outil** : une question en titre (« Les suppléments sont-ils payés ? »), 4 chiffres clés, des messages d'analyse, un registre filtrable, une fiche par enregistrement, la méthode en 3 étapes, et un exemple traité pour démarrer.
- **États calculés, jamais saisis** : un devis est « à relancer » après 7 jours sans nouvelle, une réclamation « en retard » après 48 h sans rappel, une pièce du bac rouge « décision en retard » après 24 h, un détrompeur « contrôle J+30 à faire » 30 jours après sa mise en service, un suppléant « à entraîner » s'il n'a pas fait l'acte dans l'année.
- **Les outils se parlent** : une réclamation ouvre une fiche du bac rouge et un atelier 5 Pourquoi ; un atelier crée des actions et des détrompeurs dont le contrôle J+30 démontre l'efficacité ; un défaut fournisseur devient une fiche de débit ; le coût de chaque fiche remonte dans la non-qualité par processus ; une compétence tenue par une seule personne devient un risque des Plans B ; l'autorisation d'une recrue met à jour l'équipe, la polyvalence et les habilités du poste.
- **Chiffres proposés au tableau de pilotage, jamais écrits en silence** : coût de non-qualité, heures de retouche, réclamations, devis envoyés et gagnés, transformation, devis à relancer, postes clés doublés. L'outil qui les calcule (et l'écran Saisie du 1.1) propose de les reporter.
- **Données repérées par la période** (`"2026-12"`) ou la date, jamais par une position de colonne ; valeurs numériques en nombres, format français à l'affichage seulement.
- **Heures valorisées au coût horaire chargé** (55 €/h par défaut, dans Réglages) : non-qualité, fiches de débit, chiffrage des devis.
- **Confidentialité** : en vue équipe (ou sans accès au dossier `direction`), aucun montant confidentiel (CA, marge, trésorerie, coûts des arrêts, coûts et marges des devis). Les coûts de non-qualité restent visibles de tous : la méthode veut que l'équipe voie ce que coûtent les défauts.
- **Documents à imprimer écrits sans bibliothèque** (`domain/pdf.ts`, polices standard, fichier ASCII) : fiches réflexes, étiquettes du bac rouge, trame d'atelier, fiche détrompeur, fiche de validation d'un devis, bon pour accord, fiche de débit, feuille de routine, PV de réception, parcours d'accueil. Instruction de poste et charte de classement : impression A4 du navigateur (photos comprises).
- **Photos** (instructions de poste) : prises ou choisies sur l'appareil, réduites à 800 px en JPEG avant d'être enregistrées.
- Règles visuelles : `../app/DESIGN_OUTILS.md`.

## Format des fichiers partagés

`donnees/equipe/pilotage-<auteur>.json` et `donnees/direction/pilotage-<auteur>.json` :

```json
{ "version": 2, "author": "Sandrine", "updatedAt": "…", "entries": { "nc|nc_abc": { "ts": "2026-12-05T09:12:00Z", "v": { … } } } }
```

Clés : `settings`, `timeline`, `params`, `process|<id>`, `kpi|<id>`, `value|<kpi>|<AAAA-MM>`, `action|<id>`, `risk|<id>` et `riskcost|<id>` (dossier `direction`), `contact|<id>`, `scale`, et une clé par enregistrement des outils 2 à 5 : `quote|` (et `quotecost|` dans `direction`), `change|`, `complaint|`, `feedback|`, `supplier|`, `debit|`, `sop|`, `equipment|`, `delivery|`, `power|`, `person|`, `skill|`, `newcomer|`, `chrono|`, `nc|`, `analysis|`, `poka|`, plus `envelope` et `ged`. À la lecture, toutes les entrées de tous les fichiers sont fusionnées : la plus récente gagne. Les données de l'ancienne version (outils 1.1 et 1.2, et tableaux des outils 2.1 à 5.3 restés dans le navigateur) sont proposées à la reprise : 1.1 au premier lancement, 1.2 sur la cartographie vide, 2.1 à 5.3 dans Réglages.
