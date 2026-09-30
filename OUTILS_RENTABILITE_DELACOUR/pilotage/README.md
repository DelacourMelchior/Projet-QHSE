# Outils Delacour : 22 outils, un seul fichier

Un outil par question de l'audit des 5 processus (plus l'annuaire de crise, le seuil de rentabilité, les coûts horaires et la charte de prix), dans une seule application React + TypeScript. Tous les outils partagent le même plan d'actions, la même équipe et le même stockage.

| Processus | Outils | Adresse |
|---|---|---|
| **P1 Pilotage** | 1.1 Indicateurs (Piloter, Saisie) · 1.2 Plans B · 1.3 Annuaire · 1.4 Rentabilité (10 chiffres du compte de résultat : seuil de rentabilité, point mort, marge de sécurité, prix contre volume) · 1.5 Coûts horaires (coût d'une heure par poste ou machine : direct, complet, variable ; heures productives ; heures à vendre et capacité à remplir) · 1.6 Charte de prix (4 décisions prises une fois : marge visée, coefficients matière et sous-traitance, remises maximales, plafond de charge ; valeur de l'heure ; voyant « travailler pour travailler » ; exercice précédent et « Nouvel exercice ») | `pilotage.html`, `#continuite`, `#annuaire`, `#1.4`, `#1.5`, `#1.6` |
| **P2 Commercial** | 2.1 Devis (5 verrous, marge, échelle de prix : prix cible, plancher, coût complet, coût variable, remise maximale ; visas, relance) · 2.2 Avenants (accord écrit avant de faire) · 2.3 Réclamations (rappel sous 48 h) · 2.4 Bilan de fin d'affaire (3 questions, facture sous 24 h) | `#2.1` à `#2.4` |
| **P3 Opérations** | 3.1 Fournisseurs (fiche de débit sous 48 h, note A/B/C) · 3.2 Instructions visuelles (photos, versions, habilitations) · 3.3 Maintenance (routine du lundi, armoire de survie) · 3.4 Réceptions (jalons, PV, règle 95/5) | `#3.1` à `#3.4` |
| **P4 RH** | 4.1 Suppléances (2 suppléants entraînés, enveloppe des accès) · 4.2 Polyvalence (0 à 4, homme-clé) · 4.3 Accueil (parcours 15 jours, test en 3 questions) · 4.4 Classement (nommage, plan, test des 30 s) | `#4.1` à `#4.4` |
| **P5 Qualité** | 5.1 Bac rouge (décision sous 24 h) · 5.2 Non-qualité (coût par processus) · 5.3 Ateliers 5 Pourquoi · 5.4 Détrompeurs (contrôle à J+30) | `#5.1` à `#5.4` |
| | Accueil : les 22 outils et ce qui demande attention, rapport mensuel (PDF), glossaire | `#accueil` |
| | Mes tâches : tout ce qu'il y a à faire, par personne et par échéance, agenda (.ics) et semaine (PDF) | bouton de l'en-tête |

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
| `src/domain/` | **Métier, sans interface, testé.** Un moteur par processus : `engine.ts` (1.1), `risk.ts` (1.2), `contacts.ts` (1.3), `breakeven.ts` (1.4), `hourly.ts` (1.5), `charter.ts` (1.6), `commercial.ts` (2.1 à 2.4), `operations.ts` (3.1 à 3.4), `team.ts` (4.1 à 4.4), `quality.ts` (5.1 à 5.4). À côté : les exemples (`*Examples.ts`), les documents PDF (`reflexPdf.ts`, `docPdf.ts` et `*Pdf.ts`), les chiffres proposés au 1.1 (`feeds.ts`), l'état de chaque outil pour l'accueil et les onglets (`status.ts`), la reprise des anciennes versions (`migrate.ts`, `legacyTools.ts`). |
| `src/store/` | **Stockage** : clés synchronisées, navigateur (`localStorage`), dossier partagé (un fichier par personne, dossier `direction` séparé), contexte React. Testé. |
| `src/ui/` | **Écrans.** `App.tsx` (en-tête, processus, onglets), `tools.ts` (liste des 22 outils), `Home.tsx`, `Agir.tsx` (plan d'actions commun), `common.tsx` (briques communes : synthèse, filtres, méthode, champs) ; un dossier par processus : `commercial/`, `operations/`, `team/`, `quality/`. |
| `scripts/extract-templates.cjs` | Extraction unique, déjà faite, de l'exemple et des listes par métier depuis l'ancienne version (`src/domain/legacy-templates.json`). |

## Principes

- **Une même forme pour chaque outil** : une question en titre (« Les suppléments sont-ils payés ? »), 4 chiffres clés, des messages d'analyse, un registre filtrable, une fiche par enregistrement, la méthode en 3 étapes, et un exemple traité pour démarrer.
- **Chaque outil arrive avec ses chiffres fictifs** : l'entreprise d'exemple (`demoState`) les contient ; le bouton « Voir un exemple traité » d'un outil vide les écrit en place (`applyXxxExample`, sans toucher à ce que l'entreprise a saisi) ; `normalize` les donne, une seule fois, à un exemple enregistré avant que l'outil n'existe (relever `EXAMPLE_LEVEL` dans `migrate.ts` quand un outil reçoit des chiffres d'exemple). Un test vérifie qu'aucun outil n'est vide dans l'exemple. Voir `costExamples.ts` pour les outils 1.4 à 1.6.
- **États calculés, jamais saisis** : un devis est « à relancer » après 7 jours sans nouvelle, une réclamation « en retard » après 48 h sans rappel, une pièce du bac rouge « décision en retard » après 24 h, un détrompeur « contrôle J+30 à faire » 30 jours après sa mise en service, un suppléant « à entraîner » s'il n'a pas fait l'acte dans l'année.
- **Les outils se parlent** : une réclamation ouvre une fiche du bac rouge et un atelier 5 Pourquoi ; un atelier crée des actions et des détrompeurs dont le contrôle J+30 démontre l'efficacité ; un défaut fournisseur devient une fiche de débit ; le coût de chaque fiche remonte dans la non-qualité par processus ; une compétence tenue par une seule personne devient un risque des Plans B ; l'autorisation d'une recrue met à jour l'équipe, la polyvalence et les habilités du poste.
- **Chiffres proposés au tableau de pilotage, jamais écrits en silence** : coût de non-qualité, heures de retouche, réclamations, devis envoyés et gagnés, transformation, devis à relancer, postes clés doublés. L'outil qui les calcule (et l'écran Saisie du 1.1) propose de les reporter.
- **Valeurs proposées aux réglages, jamais écrites sans clic** : la marge sur coûts variables, la marge nette et les frais généraux que l'outil 1.4 calcule sur les 10 chiffres du compte de résultat, le coût horaire général et les coûts horaires des postes que l'outil 1.5 calcule, sont affichés à côté des valeurs actuelles, puis reportés d'un clic. Les frais généraux sont les charges fixes hors personnel de production, en % des coûts directs (matières, sous-traitance, personnel de production), comme les devis (2.1) les utilisent ; une fois les postes saisis dans 1.5, l'amortissement et la maintenance de leurs machines sortent des frais généraux (les coûts horaires les portent), pour qu'un devis ne les compte pas deux fois.
- **Échelle de prix d'un devis** (2.1, direction) : quatre repères calculés sur les coûts saisis, avec le prix du devis placé entre eux. Prix cible = coût complet ÷ (1 − marge visée avant impôt, décision de la charte 1.6, sinon la marge du compte de résultat). Plancher de marge brute = coût direct ÷ (1 − plancher des réglages). Coût complet = coût direct plus frais généraux. Coût variable = matière, sous-traitance, autres frais et consommation des machines (maintenance et énergie du poste, outil 1.5) : les salaires sont payés de toute façon. Le plancher des réglages sous le coût complet est signalé, et l'outil 1.4 propose la marge brute qui couvre les frais généraux.
- **Remise maximale** : la direction propose puis enregistre, sur chaque devis, la plus forte remise que le commercial peut accorder (jamais sous le plancher ni sous le coût complet). C'est le seul chiffre du devis vu en vue équipe, avec le prix minimum qui en découle : le plancher et les coûts ne sont pas montrés. Mais la remise se déduit du plancher : reprise telle quelle de la proposition, elle laisse deviner le plancher, donc le coût, à une demi-point près (la marge plancher des réglages est visible de l'équipe). La fixer plus bas, ou à la main, garde le coût confidentiel.
- **Charte de prix** (1.6) : on saisit une fois 4 décisions, tout le reste vient de 1.4, 1.5, 2.1 et 5.x. Marge visée avant impôt ; coefficients (prix ÷ coût direct) sur la matière et la sous-traitance, l'heure portant le solde, d'où un taux de vente par poste ; remises maximales du commercial et de la direction (par défaut la marge visée : au-delà, l'affaire perd de l'argent) ; plafond de charge, prime au-delà et seuil de charge faible. Valeur de l'heure = (charges fixes + résultat visé) ÷ heures vendues : la marge minimale par heure vendue (prix moins matière, sous-traitance et autres frais variables), affichée aussi sur chaque devis (2.1). Le voyant pose 5 questions aux chiffres saisis et se grise quand une donnée manque : la croissance a-t-elle payé (exercice contre exercice précédent), plus d'heures pour moins de marge par heure, charge contre plafond, affaires en cours sous la valeur de l'heure, non-qualité contre charge. Mise à jour une fois par an : « Nouvel exercice » dans 1.4 archive l'exercice, garde les charges fixes et vide ce qui suit l'activité ; la charte se recalcule et se réédite (bandeau « à rééditer » quand un taux ou un coefficient bouge de plus de 1 %). Aucun export pour l'instant, seulement l'impression du navigateur.
- **Coûts horaires** : le coût direct d'une heure (personnel chargé, amortissement, maintenance, énergie, divisés par les heures productives, pas par les 1 607 heures payées) s'écrit dans `rates` et `hourlyRate` ; le coût complet (plus les frais généraux) et le coût variable (maintenance et énergie : les salaires sont fixes) sont calculés et affichés, jamais enregistrés.
- **Données repérées par la période** (`"2026-12"`) ou la date, jamais par une position de colonne ; valeurs numériques en nombres, format français à l'affichage seulement.
- **Heures valorisées au coût horaire chargé** (55 €/h par défaut, dans Réglages) : non-qualité, fiches de débit, chiffrage des devis.
- **Confidentialité** : en vue équipe (ou sans accès au dossier `direction`), aucun montant confidentiel (CA, marge, trésorerie, coûts des arrêts, coûts et marges des devis sauf la remise maximale accordée, chiffres du compte de résultat de l'outil 1.4, salaires et coûts des machines de l'outil 1.5, décisions de prix et voyant de l'outil 1.6 : ces trois outils n'affichent rien). Les coûts de non-qualité restent visibles de tous : la méthode veut que l'équipe voie ce que coûtent les défauts.
- **Documents à imprimer écrits sans bibliothèque** (`domain/pdf.ts`, polices standard, fichier ASCII) : fiches réflexes, étiquettes du bac rouge, trame d'atelier, fiche détrompeur, fiche de validation d'un devis, bon pour accord, fiche de débit, feuille de routine, PV de réception, parcours d'accueil. Instruction de poste et charte de classement : impression A4 du navigateur (photos comprises).
- **Photos** (instructions de poste) : prises ou choisies sur l'appareil, réduites à 800 px en JPEG avant d'être enregistrées.
- Règles visuelles : `../app/DESIGN_OUTILS.md`.

## Pour les équipes

- **Saisie rapide** (3 champs et une photo) pour le bac rouge, les réclamations et les avenants ; sur un téléphone, les saisies restent sur l'appareil : exporter la sauvegarde, puis **Réglages, Fusionner un fichier de saisies** sur un poste connecté.
- **Import par copier-coller** depuis Excel ou le logiciel de gestion : devis, fournisseurs, réponses aux bilans.
- **Journal** des créations, modifications et suppressions (Réglages) ; suppression réservée à la direction sauf réglage contraire ; outils réservables à la direction.
- **Photos** annotables (flèche verte, croix rouge, cercle), rangées dans `donnees/photos` ; **signatures** au doigt sur le PV de réception, redessinées dans le PDF.

## Format des fichiers partagés

`donnees/equipe/pilotage-<auteur>.json` et `donnees/direction/pilotage-<auteur>.json` :

```json
{ "version": 2, "author": "Sandrine", "updatedAt": "…", "entries": { "nc|nc_abc": { "ts": "2026-12-05T09:12:00Z", "v": { … } } } }
```

Clés : `settings` (dossier `direction`, avec `accounts` : les 10 chiffres de l'outil 1.4, `previous` : l'exercice précédent, `hourly` : les postes de l'outil 1.5, et `policy` : les décisions de l'outil 1.6), `timeline`, `params`, `process|<id>`, `kpi|<id>`, `value|<kpi>|<AAAA-MM>`, `action|<id>`, `risk|<id>` et `riskcost|<id>` (dossier `direction`), `contact|<id>`, `scale`, et une clé par enregistrement des outils 2 à 5 : `quote|` (et `quotecost|` dans `direction`), `change|`, `complaint|`, `feedback|`, `supplier|`, `debit|`, `sop|`, `equipment|`, `delivery|`, `power|`, `person|`, `skill|`, `newcomer|`, `chrono|`, `nc|`, `analysis|`, `poka|`, `log|` (journal), `poweraccess|` et `envelope` (dossier `direction`), plus `ged`. Les photos sont des fichiers `donnees/photos/<empreinte>.jpg`, référencées `photo:<empreinte>` dans les enregistrements. À la lecture, toutes les entrées de tous les fichiers sont fusionnées : la plus récente gagne. Les données de l'ancienne version (outils 1.1 et 1.2, et tableaux des outils 2.1 à 5.3 restés dans le navigateur) sont proposées à la reprise : 1.1 au premier lancement, 1.2 sur la cartographie vide, 2.1 à 5.3 dans Réglages.
