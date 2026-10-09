# Audit de l'outil 1.4 – Cartographie des processus

Date : 2026-10-09 · Branche `audit-outil-1-4` · Six agents en lecture seule (A domaine, B carte et fiche, C logigramme, D UX avec maquettes, E cohérence transverse, F textes et exemples), constats relus par le chef.

Statut des constats : **Vérifié** = relu dans le code par le chef. **Rapporté** = cité par un agent avec preuve, non relu ligne à ligne. Aucun correctif appliqué.

## 1. Constats vérifiés (à corriger en priorité)

| # | Où | Constat | Source |
|---|---|---|---|
| V1 | `ui/map/ProcessSheet.tsx:97`, `domain/cartography.ts:107` | Le champ « Nom du processus » affiche `plainName(p.name)` qui fait `.trim()` : impossible de taper une espace finale, donc de saisir un nom de plusieurs mots au clavier. | B |
| V2 | `ui/map/ProcessSheet.tsx:93` | Le `<fieldset disabled>` désactive aussi les puces qui ouvrent les logigrammes : un lecteur ne peut pas les ouvrir depuis Identité et Entrées/sorties. | B |
| V3 | `domain/cartography.ts:544-560` | `soundProcess` ne contrôle ni `id`, ni `name`, ni `order`, ni `color`. Un `name` absent fait planter `plainName` (`registerProcesses`) à chaque rendu. | A |
| V4 | `domain/cartography.ts:486-497` | `flowDuplicates` ignore `all` : « Retirer les doublons » supprime une exigence « Tous les processus » écrite aussi dans un logigramme, donc elle disparaît des autres fiches. | A |
| V5 | `domain/mapSupport.ts:96-103` | `deleteCreated` ne supprime que l'enregistrement et les liens. Restent les valeurs et actions d'un indicateur, les ids d'équipement dans les pièces de rechange. Une instruction signée est supprimée sans l'avertissement habituel. | A, C, E |
| V6 | `domain/powersAll.ts:124` | L'alerte 4.1 « Processus sans fonction décrite » utilise `['P1'…'P5']` en dur : P6 et P7 jamais contrôlés, P3 supprimé signalé pour toujours. | E |
| V7 | `domain/mapExamples.ts:56` | `docs: ['04_RH_ADMINISTRATION/01_Plan_de_classement']` : le dossier réel est `04_RH_ORGANISATION` (`base.ts:38`), sans ce sous-dossier. | F |
| V8 | `ui/map/FlowBits.tsx:16`, `FlowEditor.tsx:214`, `ProcessSheet.tsx:56` | Le mot « bloc » reste dans les textes, contre la règle « étape ». | F |
| V9 | `ui/App.tsx:200-201` | Seul l'annuaire (1.3) lit `focus`. `nav.open('1.1', id)` et `nav.open('1.2', id)` ouvrent l'outil sans la fiche demandée (à confirmer côté 1.1 et 1.2 en testant dans le navigateur). | E |

## 2. Constats rapportés par les agents (par lot)

### Lot 1 – Pertes de données et bugs de fond (majeur)
- C : choix « garder les fiches » non mémorisé (`origin.stepId` reste), la suppression du logigramme les reproposera ; `restoreVersion` ne restaure pas la fiche du logigramme (objet, résultat, E/S, exigences) et n'appelle pas `pruneStepReqs` (A, C).
- C : changer le type d'une décision détruit les réponses nommées au-delà de la première, sans avertissement.
- A : trous « sans compétence » (matrice, `supportGaps`) ignorent `roleRef.kind === 'skill'` alors que `stepCover` le compte.
- A : `reassignProcess` déplace les logigrammes appelés selon une condition différente de `processUsage` (résultat dépendant de la présence d'un appel interne).
- A : `params.map` non assaini (droits invalides ou sans administrateur, `reviewMonths` négatif).
- E : valeurs par défaut `'P3'`, `'P4'`, `'P5'` en dur à environ 12 endroits (quality, receptions, feeds, commercial) ; `byProcess` de 5.2 perd les montants d'un processus inconnu.
- E : `registerProcesses` : `SHORT_DEFAULT` rattaché à l'id : un P2 renommé s'affiche « Commercial » (A, E).
- E : « Vue équipe » (`teamView`) ignorée par la fiche processus (cible confidentielle visible).
- B : un pilote parti est compté « Sans pilote » dans la tuile mais affiché normalement sur la carte.

### Lot 2 – Cohérence interne (mineur à majeur)
- Journal des modifications sans `flow`/`process` (affiche « (supprimé) »).
- `processUsage` ne compte pas `params.power.library[].process` ni `params.investigation[].process`.
- Cycle de sous-processus A→B→A non détecté (seul l'auto-appel l'est) ; trois contrôles manquants dans `flowIssues` (décision finale non reliée, plusieurs « Début », réponses en double).
- `withReqIds` : collision possible d'ids ; ids d'étape en double non dédoublonnés dans `soundFlow` ; logigramme dont le processus n'existe plus invisible.
- `exchanges` sensible à la casse et tri P10 avant P2 ; `localeCompare` sans `'fr'` dans `flowsOf` ; `linkLabel` reconstruit la liste à chaque appel ; `createKpi` sans `newId` ; `kpiId` orphelin lu comme « sans cible ».
- Doublons de code : `FlowUses`/`ToolFlows` recopient `window.open`, `EXAMPLE_COMPANY` copié 5 fois, `PersonSelect`/`PersonPick`, création de KPI dupliquée (1.1 et 1.4).
- `params.map` : une seule clé synchronisée, deux administrateurs peuvent s'écraser.
- Marques ambres : `reqGaps` (carte) et `stepCountFor` (fiche) comptent différemment.
- Aucun bouton « Voir un exemple traité » dans l'écran vide de 1.4.

### Lot 3 – Accessibilité et UX de l'éditeur
- C : sections `<details open={donnée}>` qui se referment pendant la saisie ; lien « ↗ » du schéma sans clavier ; focus perdu après Monter/Descendre ; sous 768 px le panneau d'étape reste éditable alors que le texte dit « consultation » ; le placeholder « Entrée : étape suivante » s'affiche aussi pour Fin.
- C : « Créer depuis l'étape » d'un indicateur crée l'enregistrement avant toute saisie ; lien posé par `setTimeout(80)` ; `alsoDelete` reste coché après annulation ; liens 1.4 sélectionnables dans `LinksEditor` ; bandeau `ToolFlows` ne compte pas les liens vers des fiches ; `scope="colgroup"` à `rowgroup` dans Matrix.
- B : « Relue, rien à changer » enregistre sans retour ni focus ; Entrée ne valide pas la fenêtre de revue ; états vides en doublon ; lien mort sans message ; « Nouveau logigramme » enregistre un logigramme vide ; onglets de la fiche sans `tabpanel` ni flèches ; renommage sans contrôle de doublon ni repli « (sans nom) ».

### Lot 4 – UX visuelle (audit D, maquettes dans le scratchpad)
Majeurs : fiche du logigramme ouverte avant le schéma (jusqu'à 4,5 écrans sur mobile), schéma à 714 px de large sur mobile, panneau d'étape avec « Ce qu'il faut pour la faire » à 477 px, 7 bandeaux jaunes empilés sur un processus incomplet, signaux contradictoires (« 100 % complet » avec 15 cases vides), carte mobile trop longue, droits en 33 lignes, revue : invite répétée 3 fois, boutons inactifs à 50 % d'opacité, contraste des badges P1 et P4 sous 4,5:1, cibles tactiles sous 44 px.
Mineurs : textes du schéma à 9,5 px (minimum 11 px), titres en capitales espacées, matrice (bleu hors palette), suppression du processus cachée dans la Revue, rangées de la liste sans chevron.
Hors sujet : pas de thème sombre dans l'app entière.

Maquettes : supprimées à la demande de l'utilisateur. Les corrections UX se font directement dans l'outil.
Périmètre : version ordinateur seulement. Tout ce qui touche smartphone, tablette, cibles tactiles de 44 px et mise en page mobile est écarté pour l'instant.

### Lot 5 – Textes et exemples
- Pluriels faux dans la suppression d'un processus (`Cartographie.tsx:185`), « 1 étapes » (3 endroits), « Étape 1 / Étape 2 » dans la suppression (conflit de vocabulaire), « Ouvrir et modifier instruction », « 2 manques », « administratrice d'office », « Revue annuelle » alors que le délai est réglable, « servi par », jargon « relais » et « supports ».
- Textes faux : « nom » dans les 9 points de complétude, « liste sous la carte ».
- Exemples : l'instruction `sop_demo_6` et la compétence `sk_demo_9` restent dans P1 alors que le flux 26 est dans P6 ; P4 parle encore de documents ; deux compétences sans rapport avec l'étape (flux 1c et 3b) ; commentaire « 23 » au lieu de 26 ; exigences d'exemple avec un libellé différent du catalogue.
- Typographie : aucune espace insécable avant `: ; ? !` (choix à faire pour toute l'app) ; mélange `'` et `’`.

### Lot 6 – Juridique (relecture par un juriste avant de vrais clients)
Catalogue `requirementSuggestions` (`cartography.ts:29-65`). Lignes à qualifier : visite médicale d'embauche (terme périmé), CGV, consentement aux messages commerciaux, garantie légale de conformité (consommateurs seulement), dépôt des comptes selon la forme juridique, plan de prévention, registre des accidents bénins (autorisation de la CPAM), « registre de sécurité » (ambigu), 4 lignes « (précisez) ». Ajouter une mention « liste indicative » sous le sélecteur. Placeholder « factures 10 ans » (`Editors.tsx:36`) à rendre générique. `MapSettings.tsx:25` promet une « connexion sécurisée mise en place par le cabinet » : peut être périmé avec le SaaS à comptes.

### Lot 7 – Tests
Aucun test d'interaction (glisser-déposer, changement de type, suppression avec choix, restauration de version, saisie rapide, rattachement). Absents aussi : `toolUses`, `adminCount`, `processName`, `reassignProcess` sur 12 collections, cycles, `dropFlowDuplicates` avec `all`, `soundProcess` sans `name`, renommage en frappe.

## 3. Décisions prises (2026-10-09)

1. Ordinateur seulement. Smartphone, tablette, 44 px tactile, mise en page mobile : écartés pour l'instant. Texte minimum 11 px conservé.
2. Notes d'un processus : visibles seulement par ceux qui ont les droits dessus (pilote, suppléant, administrateur). Le droit « Modifier ses processus » ne donne plus les notes des autres processus.
3. Défauts `'P3'`/`'P4'`/`'P5'` dans les autres outils : corrigés maintenant, dans ce chantier.
4. Espaces insécables : rien.
5. Maquettes : supprimées.
6. Phrase « connexion sécurisée » (`MapSettings.tsx:25`) : plus tard. Ne pas toucher.
7. Droits dans une clé unique `params.map` : on laisse.

## 4. Vague 2 prévue

G Robustesse (données anciennes, gros volumes, droits sur chaque bloc) et H Tests (écarts ci-dessus, suite complète).

## 5. Catalogue à relire par un juriste

Catalogue `requirementSuggestions` (`pilotage/src/domain/cartography.ts`). Il est présenté dans l'outil comme une « liste indicative, à adapter à l'activité et à la taille de l'entreprise, qui ne remplace pas une veille réglementaire ». Libellés reformulés au lot 6 (2026-10-09) : à faire valider avant de vrais clients.

### Lignes qualifiées au lot 6 (texte actuel à valider)

| Ligne | Texte actuel | Point à vérifier |
|---|---|---|
| Visite médicale | Visite d’information et de prévention, ou suivi médical renforcé selon le poste | Remplace « visite médicale d’embauche » (terme périmé) |
| Conditions générales de vente | Conditions générales de vente (communiquées selon le type de client) | Obligation selon professionnel ou consommateur |
| Prospection par message | Règles de prospection par message, selon le type de client | Remplace « consentement du client » (le consentement n’est pas toujours requis) |
| Garanties légales | Garanties légales applicables à la vente (selon le type de client) | Garantie de conformité (consommateurs) et garantie des vices cachés |
| Information précontractuelle | Information précontractuelle du client (selon le type de client) | Contenu et portée à préciser par type de client |
| Comptabilité | Tenue de la comptabilité et dépôt des comptes (selon la forme juridique) | Dépôt des comptes selon la forme et la taille |
| Gouvernance | Respect des règles de gouvernance de la société (selon la forme juridique) | |
| Registres légaux | Registres légaux de la société (selon la forme juridique) | |
| Entreprises extérieures | Coordination avec les entreprises extérieures qui interviennent (plan de prévention, selon les travaux et la durée) | Seuils de durée et nature des travaux |
| Accidents bénins | Registre des accidents bénins (si autorisé par la CPAM) | Autorisation préalable de la CPAM |
| Registre de contrôles | Registre des vérifications et contrôles obligatoires | Remplace « registre de sécurité et de contrôles » (ambigu) |
| Appareils de levage, machines | (si concerné) ajouté | |
| Normes | Groupe « Norme (volontaire sauf exigence du client) » | |

### Retirées du catalogue
- Les 4 lignes « (précisez) » (exigence propre à un client, obligations propres au secteur, référentiel d’un label, autre norme du secteur) : le bouton « Écrire une autre exigence » les remplace.
- « Obligations de vigilance sur les produits et substances » : trop vague, déjà couvert par « Gestion des produits chimiques » et par la réglementation environnementale.

### Encore à valider (non modifiées)
- Durées et délais cités : conservation « pendant la durée légale » (aucune durée chiffrée), délais de paiement, affichages et registres obligatoires, déclaration préalable à l’embauche, durée du travail et repos.
- Représentation du personnel (selon l’effectif) : seuils d’effectif.
- Prévention de la corruption et des conflits d’intérêts (selon la taille) : obligations selon la taille de l’entreprise.
- Règles de la commande publique, démarchage et publicité, étiquetage, marquage et déclaration de conformité, rappel ou retrait de produit.
- Droit d’accès des personnes à leurs données personnelles, protection des données personnelles.
- Libellés des normes ISO (paragraphes cités par sujet, sans numéro d’article).
