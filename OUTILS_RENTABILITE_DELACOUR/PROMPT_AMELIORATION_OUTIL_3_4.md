# Prompt de départ : refaire pour l'outil 3.4 ce qui a été fait pour l'outil 3.2

Coller le texte ci-dessous dans une nouvelle conversation, dossier de travail `Projet-QHSE`.
Différence avec le prompt de 3.3 : la phase 2 (mise en place) est aussi confiée à une équipe de sous-agents.

```text
Je veux améliorer l'outil 3.4 « Réceptions » (jalons d'autocontrôle, procès-verbal de réception, règle 95/5) de l'application Delacour, avec exactement le même processus que celui suivi pour l'outil 3.2 « Instructions visuelles au poste ». Réponds en français.

## Contexte
- Application : OUTILS_RENTABILITE_DELACOUR/pilotage (React 19, TypeScript, Vite, Tailwind, vitest). Un seul fichier HTML est produit par `python3 execution/build_outils_app.py` (à lancer depuis la racine du projet). Aperçu : serveur `outils-app` (port 8765, voir .claude/launch.json). Tests : `npx tsc --noEmit` et `npx vitest run` dans OUTILS_RENTABILITE_DELACOUR/pilotage.
- Je suis consultant qualité et je vends ces outils à des PME. Les utilisateurs sont des gens d'atelier, de chantier et de bureau : téléphone ou tablette, parfois avec des gants, parfois chez le client au moment de la réception. Tout est en français. L'application sera hébergée en ligne (SaaS).
- Code de 3.4 : src/ui/operations/Receptions.tsx, src/domain/operations.ts (3.3 et 3.4 y sont mélangés : Delivery, Milestone, DEFAULT_MILESTONES, MILESTONE_TEMPLATES, deliveryState, deliveryInsights, split, liftDue), operationsExamples.ts, operationsPdf.ts (pvPdf), le type Delivery dans src/domain/types.ts, les tâches dans src/domain/tasks.ts (livraisons), l'état dans status.ts (case 3.4), les tests dans operations.test.ts. Liens existants à connaître : 2.4 (le bilan de fin créé depuis une réception : `deliveriesToAsk`, `feedbackFromDelivery`), 2.1 (le devis : `quoteId`, `amountFromQuote`), 5.1 (le défaut déclaré depuis une réserve), la signature au doigt (SignaturePad, `signCompany`, `signClient`), les photos du PV (`pvPhoto`, `liftPhoto`).

## À lire d'abord
1. CLAUDE.md du projet et ma mémoire (MEMORY.md et les notes liées). Mes règles permanentes y sont : pas de chiffrage, de prix, de marge ni de facturation ; « remplir une fois, garder vivant d'un tap » ; vocabulaire neutre (nommer l'action, pas le moyen), listes de choix terminées par « Autre, précisez » ; messages d'alerte = des faits, jamais des ordres au client ; pas d'export PDF ou CSV nouveau pour l'instant (le PV existant reste) ; une seule langue ; chaque outil livré avec des données d'exemple fictives, y compris dans l'exemple déjà enregistré chez moi (marqueur d'exemple propre à l'outil, mis à niveau sans écraser mes saisies) ; règles de DESIGN dans OUTILS_RENTABILITE_DELACOUR/app/DESIGN_OUTILS.md (11 px minimum, pas d'emoji, statut = couleur + libellé, cibles tactiles de 44 px) ; code le plus court qui marche (mode Ponytail). Ne fais jamais de commit sans que je le demande.
2. OUTILS_RENTABILITE_DELACOUR/AMELIORATIONS_OUTIL_3_2.md : la liste maîtresse de 3.2, ses lots et sa méthode. C'est le modèle de ce que je veux obtenir pour 3.4.
3. Le code de 3.2 (src/domain/instructions.ts, src/ui/operations/Sop*.tsx, Instructions.tsx) : c'est le niveau de qualité attendu et la structure à reprendre (logique extraite dans son propre fichier, onglets, file « À faire », exemples complets, tests).
4. Tout le code de 3.4 et celui de ses liens (2.4, 2.1, 5.1).

## Ce que 3.2 a déjà établi et que 3.4 doit réutiliser, pas réinventer
- Photos : une photo est une référence `photo:<empreinte>-<l>-<h>[~retouche]` ; les originaux vivent dans le magasin de photos (src/photo/store.ts, IndexedDB, jusqu'à 4K). Utiliser PhotoBox (prise et retouche), Pic (affichage, vectoriel) et PhotoEditor. Ne jamais mettre une photo en texte base64 dans un enregistrement.
- Fiche vivante : séparer ce que la personne tape (contenu) de ce qui vit à part (jalons validés, signatures, réception, journal, état), comme `takeLife` pour les fiches de 3.2, pour qu'un écran périmé n'écrase jamais une signature ou un jalon fait entre-temps.
- Enregistrement : brouillon écrit au fil de la frappe, aussi à la fermeture, au changement d'outil, quand l'onglet passe en arrière-plan ; bandeau « Retiré · Annuler » pour tout retrait ; confirmation avant de perdre quoi que ce soit ; « Supprimer » seulement quand rien n'est perdu, sinon « Archiver » (une réception signée ne se supprime pas).
- Le store (`update`) est synchrone via `stateRef` ; Modal est dessinée dans un portail ; `fillEmptyCollections` pour les boutons « Voir un exemple traité » (ne remplace jamais ce que l'entreprise a) ; `usePrintOne` pour imprimer (attend les photos).
- Les sauvegardes .json emportent les photos.

## Le processus à suivre, dans l'ordre
Phase 1 : le besoin. Fais-moi une liste exhaustive de tout ce dont une PME a besoin pour cet outil. Elle doit être orientée opérations, fluide, intuitive et visuelle. Pense au terrain : qui contrôle à chaque jalon (en atelier, avant expédition), qui réceptionne chez le client, avec quelle preuve (photos, signatures au doigt, PV lisible sur téléphone) ; les réserves et leur levée ; les refus ; les livraisons partielles ; les jalons propres à un métier ; les liens avec les autres outils (devis 2.1, bilan de fin 2.4, défauts 5.1, instructions de poste 3.2, fournisseurs 3.1, annuaire 1.3 pour le client et son représentant). Vérifie dans le code les montants et la retenue (`amount`, `amountFromQuote`, `retentionPct`, `split`, la règle 95/5) au regard de ma règle « pas de chiffrage ni de facturation » : dis-moi ce que tu proposes de garder (par exemple la règle, les dates et la levée de réserve), de transformer ou de retirer. Montre la liste et ATTENDS mon feu vert avant de coder.

Phase 2 : tout mettre en place, avec une équipe de sous-agents. Après mon accord :
a) Tu es le chef d'orchestre. Toi seul tranches l'architecture. Écris d'abord le contrat commun : découpage des fichiers (la logique de 3.4 sort de operations.ts dans son propre fichier de domaine, comme instructions.ts pour 3.2), types, noms des fonctions du domaine, marqueur d'exemple propre à 3.4 (comme `sopExampleLevel`), et attribue à chaque sous-agent des fichiers qui n'appartiennent qu'à lui, pour qu'ils ne se marchent jamais dessus.
b) Lance d'abord le sous-agent du domaine (règles, états, tâches, tests du domaine) et attends qu'il ait fini : les autres s'appuient sur lui.
c) Puis lance en parallèle les sous-agents des écrans (fiche de réception en onglets, liste, file « À faire », vue chantier ou client), de l'impression et du PV, des exemples fictifs complets avec leur mise à niveau dans les données déjà enregistrées, des liens avec les autres outils, et de la documentation (README, DESIGN). Chaque sous-agent reçoit la liste validée, le contrat, le niveau de qualité de 3.2, mes règles permanentes, ses fichiers, et la consigne de ne toucher à aucun autre fichier, de ne pas faire de commit, de lancer `npx tsc --noEmit` et `npx vitest run`, et de te rendre un compte rendu court : fichiers modifiés, ce qui est fait, ce qui ne l'est pas.
d) Si la limite d'usage coupe des agents, relance-les par vagues, en reprenant là où chacun s'est arrêté.
e) Quand tous ont rendu : toi, tu intègres, tu corriges les écarts entre modules, tu lances tsc, vitest et le build, et tu vérifies toi-même dans le navigateur (téléphone 375 px compris). Un sous-agent qui dit « c'est fait » n'est pas une preuve.
f) Un dernier sous-agent relecteur intransigeant, en lecture seule, compare le résultat à la liste validée et te rend les écarts ; tu les fais corriger avant de me présenter le résultat.

Phase 3 : l'audit sans pitié. Lance une équipe de sous-agents, un par module (domaine et règles, écrans et ergonomie mobile, enregistrement et pertes de données, impression et PV, signatures et preuves, exemples et migration, liens avec les autres outils, accessibilité et textes, performance, tests), tous en lecture seule, avec un chef d'orchestre intransigeant qui ne valide rien tant que tout ne lui semble pas parfait. Si la limite d'usage coupe les agents, relance-les par vagues. Sauve des rapports condensés dans le dossier scratchpad. Consolide en OUTILS_RENTABILITE_DELACOUR/AMELIORATIONS_OUTIL_3_4.md : chaque point classé (bloquant, majeur, mineur) avec sa correction proposée, puis regroupé en lots, avec en lot 0 « Plus aucune perte de données » (comme pour 3.2). Montre-moi la liste maîtresse et ATTENDS que je choisisse le lot à lancer.

Phase 4 : les lots. Traite les lots dans l'ordre que je choisis, du plus urgent au moins urgent. Pour chaque lot : code (avec des sous-agents aux fichiers distincts quand le lot est large), tests, build, vérification dans le navigateur (téléphone 375 px compris), mise à jour du README et de la liste maîtresse (ce qui est fait).

Phase 5 : la synthèse. Fais-moi une synthèse « avant / maintenant » de 3.4 (code, fonctions, tests), claire et courte.

## Façon de travailler
- Va droit au but : pas de question sur ce qui a une réponse par défaut raisonnable ; dis quel défaut tu prends.
- Vérifie toi-même dans le navigateur (aperçu intégré) avant de me dire que c'est fait ; ne me demande pas de tester à ta place. Quand tu ne peux pas simuler un geste réel (glisser à la souris, pincement, signature au doigt), dis-le.
- Dis-moi honnêtement ce qui n'est pas fait, ce qui a échoué et ce qui reste.
- Garde les réponses courtes ; les détails vont dans les fichiers.
```
