# Prompt de départ : refaire pour l'outil 3.3 ce qui a été fait pour l'outil 3.2

Coller le texte ci-dessous dans une nouvelle conversation, dossier de travail `Projet-QHSE`.

```text
Je veux améliorer l'outil 3.3 « Maintenance » (routine du lundi et armoire de survie) de l'application Delacour, avec exactement le même processus que celui suivi pour l'outil 3.2 « Instructions visuelles au poste ». Réponds en français.

## Contexte
- Application : OUTILS_RENTABILITE_DELACOUR/pilotage (React 19, TypeScript, Vite, Tailwind, vitest). Un seul fichier HTML est produit par `python3 execution/build_outils_app.py` (à lancer depuis la racine du projet). Aperçu : serveur `outils-app` (port 8765, voir .claude/launch.json). Tests : `npx tsc --noEmit` et `npx vitest run` dans OUTILS_RENTABILITE_DELACOUR/pilotage.
- Je suis consultant qualité et je vends ces outils à des PME. Les utilisateurs sont des gens d'atelier : téléphone ou tablette, parfois avec des gants. Tout est en français. L'application sera hébergée en ligne (SaaS).
- Code de 3.3 : src/ui/operations/Maintenance.tsx, src/domain/operations.ts (3.3 et 3.4 y sont mélangés), operationsExamples.ts, operationsPdf.ts, types Equipment / Checkpoint / Inspection / SparePart dans src/domain/types.ts, tâches dans src/domain/tasks.ts (case 3.3), état dans status.ts, tests dans operations.test.ts.

## À lire d'abord
1. CLAUDE.md du projet et ma mémoire (MEMORY.md et les notes liées). Mes règles permanentes y sont : pas de chiffrage, de prix ni de marge ; « remplir une fois, garder vivant d'un tap » ; vocabulaire neutre (nommer l'action, pas le moyen), listes de choix terminées par « Autre, précisez » ; messages d'alerte = des faits, jamais des ordres au client ; pas d'export PDF ou CSV nouveau pour l'instant ; une seule langue ; chaque outil livré avec des données d'exemple fictives, y compris dans l'exemple déjà enregistré chez moi (marqueur d'exemple propre à l'outil, mis à niveau sans écraser mes saisies) ; règles de DESIGN dans OUTILS_RENTABILITE_DELACOUR/app/DESIGN_OUTILS.md (11 px minimum, pas d'emoji, statut = couleur + libellé, cibles tactiles de 44 px) ; code le plus court qui marche (mode Ponytail). Ne fais jamais de commit sans que je le demande.
2. OUTILS_RENTABILITE_DELACOUR/AMELIORATIONS_OUTIL_3_2.md : la liste maîtresse de 3.2, ses lots et sa méthode. C'est le modèle de ce que je veux obtenir pour 3.3.
3. Le code de 3.2 (src/domain/instructions.ts, src/ui/operations/Sop*.tsx, Instructions.tsx) : c'est le niveau de qualité attendu et la structure à reprendre (logique extraite dans son propre fichier, onglets, file « À faire », exemples complets, tests).
4. Tout le code de 3.3.

## Ce que 3.2 a déjà établi et que 3.3 doit réutiliser, pas réinventer
- Photos : une photo est une référence `photo:<empreinte>-<l>-<h>[~retouche]` ; les originaux vivent dans le magasin de photos (src/photo/store.ts, IndexedDB, jusqu'à 4K). Utiliser PhotoBox (prise et retouche), Pic (affichage, vectoriel) et PhotoEditor. Ne jamais mettre une photo en texte base64 dans un enregistrement.
- Fiche vivante : séparer ce que la personne tape (contenu) de ce qui vit à part (historique, relevés, journal, état), comme `takeLife` pour les fiches de 3.2, pour qu'un écran périmé n'écrase jamais un relevé fait entre-temps.
- Enregistrement : brouillon écrit au fil de la frappe, aussi à la fermeture, au changement d'outil, quand l'onglet passe en arrière-plan ; bandeau « Retiré · Annuler » pour tout retrait ; confirmation avant de perdre quoi que ce soit ; « Supprimer » seulement quand rien n'est perdu, sinon « Archiver ».
- Le store (`update`) est synchrone via `stateRef` ; Modal est dessinée dans un portail ; `fillEmptyCollections` pour les boutons « Voir un exemple traité » (ne remplace jamais ce que l'entreprise a) ; `usePrintOne` pour imprimer (attend les photos).
- Les sauvegardes .json emportent les photos.

## Le processus à suivre, dans l'ordre
Phase 1 : le besoin. Fais-moi une liste exhaustive de tout ce dont une PME a besoin pour cet outil. Elle doit être orientée opérations, fluide, intuitive et visuelle. Pense au terrain : qui fait la routine du lundi, sur quelle machine, avec quel téléphone ; ce que l'armoire de survie doit éviter (rupture d'une pièce critique) ; pannes, pièces, prestataires, consignes de sécurité, maintenance légale ; liens avec les autres outils (risques 1.2, annuaire 1.3, défauts du bac rouge 5.1, instructions de poste 3.2, fournisseurs 3.1). Vérifie dans le code le champ de coût des pannes au regard de ma règle « pas de chiffrage » et dis-moi ce que tu proposes. Montre la liste et ATTENDS mon feu vert avant de coder.

Phase 2 : tout mettre en place. Après mon accord, implémente tout ce qui est listé, avec des données d'exemple fictives complètes et un marqueur d'exemple propre à 3.3 (comme `sopExampleLevel`), des tests, et la mise à jour du README. Sors la logique de 3.3 de operations.ts dans son propre fichier de domaine.

Phase 3 : l'audit sans pitié. Lance une équipe de sous-agents, un par module (domaine et règles, écrans et ergonomie mobile, enregistrement et pertes de données, impression, exemples et migration, liens avec les autres outils, accessibilité et textes, performance, tests), tous en lecture seule, avec un chef d'orchestre intransigeant qui ne valide rien tant que tout ne lui semble pas parfait. Si la limite d'usage coupe les agents, relance-les par vagues. Sauve des rapports condensés dans le dossier scratchpad. Consolide en OUTILS_RENTABILITE_DELACOUR/AMELIORATIONS_OUTIL_3_3.md : chaque point classé (bloquant, majeur, mineur) avec sa correction proposée, puis regroupé en lots, avec en lot 0 « Plus aucune perte de données » (comme pour 3.2). Montre-moi la liste maîtresse et ATTENDS que je choisisse le lot à lancer.

Phase 4 : les lots. Traite les lots dans l'ordre que je choisis, du plus urgent au moins urgent. Pour chaque lot : code, tests, build, vérification dans le navigateur (téléphone 375 px compris), mise à jour du README et de la liste maîtresse (ce qui est fait).

Phase 5 : la synthèse. Fais-moi une synthèse « avant / maintenant » de 3.3 (code, fonctions, tests), claire et courte.

## Façon de travailler
- Va droit au but : pas de question sur ce qui a une réponse par défaut raisonnable ; dis quel défaut tu prends.
- Vérifie toi-même dans le navigateur (aperçu intégré) avant de me dire que c'est fait ; ne me demande pas de tester à ta place. Quand tu ne peux pas simuler un geste réel (glisser à la souris, pincement), dis-le.
- Dis-moi honnêtement ce qui n'est pas fait, ce qui a échoué et ce qui reste.
- Garde les réponses courtes ; les détails vont dans les fichiers.
```
