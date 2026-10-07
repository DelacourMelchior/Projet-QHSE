# Outil 4.1 « Suppléances d'urgence » : ce dont une PME a besoin (phase 1)

Établi le 2026-10-07 après lecture de tout le code de 4.1 et de ses liens (1.1, 1.2, 1.3, 3.2, 4.2, Mes tâches, accueil), de la fiche papier d'origine (`04_PROCESSUS_4_…/OUTIL_4.1_MATRICE_SUPPLEANCES_URGENCE.docx`), de la grille d'audit (question 4.1) et du modèle 3.4 (`BESOIN_OUTIL_3_4.md`). **Rien n'est codé.** Ce document attend le feu vert avant la phase 2.

Niveaux : **E** essentiel (sans lui l'outil ne tient pas sur le terrain), **U** utile, **O** option (à retirer sans regret si le périmètre est trop gros).

Règles du propriétaire appliquées partout : aucun chiffrage, prix, marge ni facturation (donc aucun « coût d'une absence ») ; remplir une fois et garder vivant d'un tap ; vocabulaire neutre (nommer l'action, pas le moyen), listes terminées par « Autre, précisez », aucun mot d'atelier dans les listes de départ ; messages d'alerte = des faits, jamais des ordres ; aucun export PDF ou CSV nouveau, aucun envoi ; une seule langue ; exemples fictifs complets avec marqueur propre à 4.1 ; `DESIGN_OUTILS.md` (12 px sur les écrans de terrain, pas d'emoji, statut = couleur + libellé, cibles de 44 px, boutons vers un autre outil en nouvel onglet) ; code le plus court qui marche.

Ancrage ISO 9001:2015 (de mémoire, la norme n'a pas été relue) : 5.3 rôles, responsabilités et autorités (communiqués et compris) ; 7.1.2 personnes ; 7.1.6 connaissances organisationnelles (la perte de savoir liée au renouvellement du personnel y est visée) ; 7.2 compétence, avec des informations conservées comme preuve (la pratique réelle) ; 6.1 risques (l'absence d'une personne clé) ; 8.1 et 8.5.1 maîtrise de la réalisation par des personnes désignées et compétentes ; 8.5.6 maîtrise des modifications (un suppléant qui tient l'acte à la place du titulaire) ; 7.5.3 protection des informations documentées (accès, enveloppe) ; 9.3.2 revue de direction (adéquation des ressources) ; 10.2 action corrective quand un cas réel révèle un trou.

---

## 0. Ce que fait l'outil aujourd'hui (constats dans le code)

- **Taille et âge.** Un écran de 172 lignes (`ui/team/Suppleances.tsx`), une soixantaine de lignes de logique dans `domain/team.ts` (mêlée à 4.2, 4.3 et 4.4), **3 tests de logique, aucun test d'écran**. Dernière évolution le 2026-09-27 : 4.1 n'a pas reçu la remise à niveau de 3.2, 3.3 et 3.4.
- **Le modèle.** Un pouvoir : processus, acte, titulaire, deux suppléants et d'autres, date de dernière pratique de chacun, accès (texte), rythme, prochaine pratique, deux cases (délégation signée, banque ou organisme informé). Une enveloppe unique : lieu, date et auteur de la dernière vérification.
- **Les personnes sont du texte libre.** Titulaire et suppléants sont des noms tapés (liste de suggestions `knownPeople`), pas des liens vers le personnel (4.2) ni vers l'annuaire (1.3) : ni téléphone, ni congé, ni départ ne peuvent être lus ; un renommage casse la correspondance ; un suppléant extérieur s'écrit « Nom (Société) ».
- **Aucune validation.** La même personne peut être titulaire et suppléante, ou occuper les deux places de suppléant ; `powerState` compte des places remplies, pas des personnes : deux fois « A », pratiqué, donne « Suppléance prête ».
- **« Qui remplace X »** : un menu en bas d'écran, titulaires seulement, qui donne des noms **sans téléphone, sans lieu des accès, sans durée**. Les absences saisies en 4.2 ne sont lues nulle part dans 4.1 : un suppléant en congé compte comme prêt.
- **La pratique** : une date écrasée à chaque fois (aucun historique, donc aucune preuve sur plusieurs années), sans « validée par » ni constat. Pour l'inscrire : ouvrir la fiche, « Aujourd'hui », Enregistrer. **Mes tâches** : tous les suppléants d'un pouvoir non prêt reçoivent « Faire l'acte en suppléant », **même ceux déjà à jour**, avec l'échéance du jour par défaut (donc toujours « pour aujourd'hui », jamais réglée tant que le pouvoir n'est pas prêt) ; rien pour l'enveloppe ; `nextPracticeAt` est unique par pouvoir.
- **Délégation** : deux cases pour tous les pouvoirs, mais l'alerte ne vise que P1 et son message parle de signature et de banque.
- **Enveloppe** : un lieu et une date. Ni contenu, ni personnes du double visa, ni liste de ce que la vérification contrôle, **aucune trace d'ouverture**, aucun rappel de changer les codes après une ouverture. C'est un enregistrement unique : en dossier partagé, « le dernier qui écrit gagne » (comme `params`). L'auteur de la vérification est le nom libre de l'appareil.
- **Écran** : tableau de 6 colonnes forcé à 820 px (défilement horizontal sur téléphone), ni filtre, ni recherche, tri par processus seulement, pas de file « À faire ». Messages écrits en ordres (« nommer un second suppléant », « codes à jour ? suppléants toujours à l'aise… ? »). `window.confirm` natif pour fermer et supprimer, sans annulation. La fiche écrit l'enregistrement entier à l'enregistrement (pas de `takeLife`) : elle écraserait une pratique ou un état inscrits ailleurs entre-temps.
- **Liens existants** : 1.2 (bouton « Inscrire le risque » sans suppléant ; le risque est retrouvé par **texte**, `resource.includes(power)`, cassé au premier renommage), actions (« Planifier l'entraînement », `ref: power`), annuaire (la fiche d'une personne dit « Pouvoir sans suppléant », jamais « suppléant de… »), Mes tâches, accueil (`status.ts`). **Non reliés** : 1.1 (aucun chiffre proposé ; l'indicateur `kpi_suppleance` porte la source « Matrice Suppléances 4.1 » mais est calculé par 4.2, `coveragePct`), 3.2 (mode opératoire), 4.2 (niveaux, absences, personnes parties), 4.4.
- **Exemples** : 6 pouvoirs fictifs, partagés avec 4.2 à 4.4 par un seul bouton (`applyTeamExample`) ; **aucun marqueur propre** : une entreprise fictive enregistrée avant une mise à jour ne la reçoit pas. L'état « un seul suppléant » n'y apparaît pas (le pouvoir 1 compte un suppléant extérieur).
- **Cohérence documentaire** : `INDEX_DES_OUTILS.md` annonce « Alerte 90 j » ; l'outil et la fiche papier disent une pratique par an (365 j).
- **Ce qui est bon et se garde** : la vue équipe qui masque les codes (dossier direction, `poweraccess|`), le suppléant extérieur, le rythme par pouvoir, l'action « Entraîner le suppléant », la reprise des anciens fichiers (`legacyTools.ts`), le bouton vers 1.2.

---

## 1. Deux moments d'usage, trois gestes

**Le calme** : poser la liste, nommer, formaliser, entraîner une fois par an, vérifier l'enveloppe deux fois par an. **La crise** : quelqu'un manque ce matin ; en 30 secondes, sur un téléphone, savoir qui prend quoi, comment l'appeler, où sont les accès, ce qui n'est pas couvert. Aujourd'hui l'outil sert surtout le calme, et la crise à peine.

**Scénario de référence** (la fiche papier, cas réel d'une PME de 15 salariés) : le dirigeant est hospitalisé deux semaines, personne n'a les codes bancaires ni les accès aux devis. L'outil doit répondre à cette situation sans que personne ait à réfléchir, **et dire ce qui n'est pas couvert**.

**Trois gestes en trois taps au plus** : inscrire une pratique, vérifier l'enveloppe, dire « X est absent ».

**Ce qui se tape une fois** : les pouvoirs, les personnes, les formalités, l'enveloppe. **Ce qui se fait d'un tap** : une pratique, une vérification, une absence, une revue. **Ce qui se déduit** : états, disponibilité du jour, tâches, chiffres du tableau de pilotage, « et si… ».

---

## 2. La liste du besoin

### A. Le pouvoir vital (la fiche)

- **A1 E** Un pouvoir se décrit en trois lignes : **l'acte** (« Signer les virements »), **ce qui s'arrête sans lui**, **combien de temps l'entreprise peut attendre** (le jour même · 3 jours · 1 semaine · plus · Autre, précisez). Le délai sert à trier (un pouvoir sans suppléant qui ne peut pas attendre passe devant) et à dire en faits ce qui tombe pendant une absence.
- **A2 E** **Bibliothèque de pouvoirs vitaux neutre**, par processus, ajout en un tap (remplace les 5 phrases en dur de `DEFAULT_POWERS`, où figurent « fabrications », « atelier », « bac rouge »). La liste de départ se modifie dans **les réglages de l'outil** (renommer, ajouter, retirer), comme les motifs de 2.3 ; une suggestion déjà prise est grisée.
- **A3 E** **Plusieurs pouvoirs par processus sans friction**, groupés par processus avec un compteur ; un processus sans pouvoir décrit se dit en fait (« P3 : aucun pouvoir vital décrit »).
- **A4 E** **Comment le faire** : lien vers l'instruction de poste de 3.2 (nouvel onglet) ou, à défaut, quelques lignes de texte ; affiché dans « Qui remplace qui » (F2). Un suppléant sans mode opératoire ne peut pas pratiquer « pour de vrai ».
- **A5 U** **Personnes et organismes à connaître pour cet acte** (conseiller bancaire, société d'alarme, expert-comptable), pris dans l'annuaire 1.3 avec leur téléphone, repris dans la fiche d'urgence.
- **A6 U** **Limites de la suppléance** en une ligne libre (« dans la limite de… », « jamais seul pour… ») : du texte, aucun montant calculé.
- **A7 U** **Lien avec une compétence de 4.2** : le niveau de chaque suppléant sur cette compétence se lit dans la fiche (« niveau 2 : autonome sur le courant »), rien n'est écrit dans 4.2 sans un tap.
- **A8 U** **Pouvoir lié à un risque de 1.2 par identifiant** (plus par texte) : un renommage ne casse plus le lien ; le risque de 1.2 propose les suppléants du pouvoir.
- **A9 U** **Archiver** un pouvoir (activité arrêtée) sans perdre son historique de pratique ; **supprimer** seulement s'il est vide.

### B. Titulaire et suppléants : de vraies personnes

- **B1 E** Titulaire et suppléants **choisis dans la liste du personnel** (4.2, déjà confondue avec l'annuaire par `syncStaff`) en pastilles ou recherche ; **personne extérieure** (expert-comptable, associé, prestataire) choisie dans l'annuaire 1.3 ou saisie, avec « Ajouter à l'annuaire » en un tap. Les anciens noms restent lisibles ; un nom qui correspond exactement à une personne se relie à la lecture.
- **B2 E** **Validation** : une même personne ne peut être à la fois titulaire et suppléante d'un pouvoir, ni occuper les deux places ; le refus dit le fait (« Hélène R. est déjà titulaire »). L'état compte des **personnes distinctes**.
- **B3 E** **Téléphone visible et appelable** sous chaque nom (numéro de l'annuaire, appel en un tap, copie de l'e-mail comme en 1.3) ; « numéro manquant » dit en fait.
- **B4 E** **Personne partie ou inactive** : une personne marquée inactive en 4.2, ou dont le poste est « à pourvoir » en 1.3, encore citée sur un pouvoir : fait affiché sur le pouvoir et dans la synthèse (« 2 pouvoirs citent Marc M., sorti du personnel le… ») ; sa place est comptée vide.
- **B5 E** **Disponibilité** : une personne absente aujourd'hui ou dans les 30 jours (absences de 4.2) se voit sur sa ligne (« absent du 14 au 28/07 ») ; un suppléant absent aujourd'hui ne compte pas dans « disponibles aujourd'hui » (fait séparé de l'état structurel : « 1 suppléant sur 2 disponible »).
- **B6 E** **Ordre d'appel** : suppléant 1, puis 2, puis les autres, dit clairement ; passer le 2e en 1er d'un tap.
- **B7 U** **Proposition de suppléants** (« qui pourrait ? ») : candidats classés par niveau 4.2 sur la compétence liée, même équipe ou processus, pas déjà chargés, pas absents en même temps que le titulaire ; chaque raison dite en fait ; rien n'est nommé seul.
- **B8 U** **Charge d'un suppléant** : une personne suppléante de plus de N pouvoirs (réglage, 3 par défaut) = fait affiché ; remplace le seuil en dur de `overloaded`, qui ne compte que les titulaires.
- **B9 U** **Acceptation** : « a accepté d'être suppléant le… » par suppléant (case et date).
- **B10 O** **E-mail préparé** pour informer une personne qu'elle est nommée suppléante (modèle modifiable, copier ou ouvrir la messagerie, comme 2.4) ; jamais envoyé par l'outil.

### C. Pratique réelle et rythme annuel

- **C1 E** **« A fait l'acte »** en un tap sur la ligne ou la carte, par suppléant ; date du jour modifiable, annulable 8 s ; plus besoin d'ouvrir la fiche.
- **C2 E** **Historique conservé** : chaque pratique est une ligne (date, suppléant, validée par, constat libre « ce qui a bloqué ») ; la dernière date se calcule. Preuve de compétence sur plusieurs années (7.2). Un constat non vide propose une action en un tap.
- **C3 E** **Validée par** le titulaire ou la direction (pastilles) ; une pratique sans validation s'affiche « déclarée », pas « prête ».
- **C4 E** **Échéance par suppléant** = dernière pratique + rythme du pouvoir ; états en faits (« reste 25 j », « en retard de 12 j »). Remplace l'échéance unique `nextPracticeAt` qui servait à tous.
- **C5 E** **Tâches justes** (Mes tâches, accueil, file) : une tâche par suppléant **dont la pratique approche ou est échue**, au bon jour, au bon nom ; aucune pour un suppléant à jour ; une tâche « vérifier l'enveloppe » ; une tâche « revoir la liste » à la date de la revue annuelle.
- **C6 U** **Pratique planifiée** avec le titulaire comme formateur : date, durée (demi-journée par défaut) ; une journée peut regrouper plusieurs pouvoirs du même titulaire.
- **C7 U** **Une absence réelle vaut pratique** : un suppléant qui a tenu le pouvoir pendant un épisode du journal F7 voit la pratique inscrite (à confirmer d'un tap).
- **C8 U** **Rythme dans les réglages de l'outil** (365 j par défaut) et par pouvoir (plus court pour un poste à risque).
- **C9 O** **Exercice sans le titulaire** : une journée où le titulaire n'intervient pas, notée comme pratique de tous ses suppléants.

### D. Délégations et formalités

- **D1 E** **Formalités par pouvoir, liste modifiable** dans les réglages de l'outil (au lieu de deux cases fixes dont une dit « banque ») : par défaut « Délégation écrite signée », « Acceptée par le suppléant », « Limites précisées », « Organisme concerné informé (banque, assureur, autorité…) », « Accès ouverts au nom du suppléant », « Autre, précisez » ; chacune se coche **avec sa date** ; un pouvoir peut en écarter (« sans objet »).
- **D2 E** **Toute formalité incomplète se dit, pour tous les processus** (pas seulement P1), en faits (« 2 formalités sur 4 faites : Signature bancaire »).
- **D3 E** **Accès au nom du suppléant**, par suppléant (case et date), pour que l'enveloppe ne serve qu'aux cas extrêmes ; sinon fait affiché « accès par l'enveloppe seulement ».
- **D4 U** **Référence du document** (« Délégation du 12/03/2026, classeur Direction ») en texte libre, avec renvoi à la charte de nommage de 4.4 ; aucun fichier stocké.
- **D5 U** **Revue de la délégation** (date prévue : changement de poste, départ, 12 mois) ; échue = fait affiché.
- **D6 U** **Honnêteté** : l'outil suit l'existence et la date des documents ; leur valeur juridique relève du juriste ou de l'expert-comptable (une ligne dans la méthode, aucun effet juridique revendiqué).

### E. Accès et enveloppe scellée

- **E1 E** **Aucun mot de passe dans l'outil, jamais** : seulement où il est (règle écrite à l'écran). « Où sont les accès » reste réservé à la direction (dossier direction).
- **E2 E** **Une ou plusieurs enveloppes** (coffre, site) : lieu, **contenu listé** (« Mots de passe maîtres de la banque », « Code d'alarme », « Clés du local »), **les deux personnes du double visa**, date de mise sous pli. L'enveloppe actuelle devient la première.
- **E3 E** **Vérification semestrielle guidée** : quatre contrôles à cocher (scellé intact · accès encore valides · contenu conforme à la liste · suppléants encore à l'aise avec les outils), date et personne **prises dans la liste du personnel** (pas un nom libre d'appareil) ; une case non cochée donne un fait et propose une action.
- **E4 E** **Journal des ouvertures** : date, personne absente, motif, qui a ouvert et qui a visé, ce qui a été utilisé, **date de remise sous pli et de changement des codes** ; une enveloppe ouverte non remise sous pli se dit en fait. Réservé à la direction.
- **E5 E** **Départ d'une personne** : les accès qu'elle connaissait se disent (« Marc M. a quitté le personnel le… : accès qu'il détenait : bureau d'études ») ; une tâche « changer les accès » ; vient de B4.
- **E6 U** **Qui détient la clé du coffre** ; une seule personne qui détient tout = fait affiché.
- **E7 U** **Suppléant sans accès** : un pouvoir dont un suppléant n'a ni accès à son nom ni enveloppe = fait affiché.

### F. Quand quelqu'un manque : « Qui remplace qui »

- **F1 E** **Bouton « Quelqu'un est absent »** en haut de l'écran (et lien depuis l'accueil) : choisir la personne (liste du personnel, absents du jour en tête) et la période (aujourd'hui → une date, ou inconnue) ; le résultat tient en une page.
- **F2 E** **Pour chaque pouvoir qu'elle détient** : les suppléants **disponibles** (congés pris en compte), dans l'ordre d'appel, avec **téléphone cliquable**, pratique à jour ou non (en fait), où sont leurs accès, formalités manquantes, comment faire (A4), personnes à prévenir (A5). Un pouvoir sans suppléant disponible est en rouge (« personne de disponible du 14 au 21/07 »).
- **F3 E** **Pouvoirs dont l'absent est suppléant** : la redondance perdue se lit (« Hélène R. est l'un des 2 suppléants de… : il n'en reste qu'un »).
- **F4 E** **Règle de l'enveloppe selon la durée** : en dessous du seuil (24 h par défaut, réglable) les suppléants agissent avec leurs accès ; au-dessus, l'enveloppe s'ouvre sous double visa : dit en fait avec le lieu et les deux personnes.
- **F5 E** **Enregistrer l'absence** en un tap : l'inscrit dans la liste du personnel (visible en 4.2, en 1.3 et sur l'organigramme) ; sans ce tap, c'est une simulation.
- **F6 E** **Bandeau du jour** en tête de l'écran et sur l'accueil quand une personne est absente aujourd'hui : « Laurent B. absent jusqu'au 12/10 : 2 pouvoirs couverts, 1 sans suppléant disponible ».
- **F7 U** **Journal de suppléance** (un épisode réel, pas un pouvoir) : absent, dates, pouvoirs tenus par qui, enveloppe ouverte oui ou non, **ce qui a manqué** ; **prérempli par F1 en un tap** ; un manque devient une action corrective en un tap (10.2) ; vaut pratique (C7).
- **F8 U** **Fin d'absence** : liste de reprise (le titulaire reprend ; accès temporaires retirés ; enveloppe remise sous pli et codes changés si elle a été ouverte ; point de retour d'expérience) ; une tâche.
- **F9 U** **Fiche d'urgence A4** (impression du navigateur, une page, aucun PDF) : pouvoirs, titulaires, suppléants avec téléphones, lieu de l'enveloppe, personnes à prévenir ; **sans aucun accès ni code** ; remplace « Imprimer » (`window.print` de tout l'écran).
- **F10 O** **Fiche de poche d'un suppléant** (A5) : « vos suppléances », actes à tenir, pratique à refaire, comment faire.
- **F11 O** **QR code** de la fiche d'urgence, collé sur le coffre ou à l'accueil (après l'hébergement).

### G. Vue d'ensemble : concentration, départs, absences à venir

- **G1 E** **« Et si… » pour tout le monde en une table** : par personne, le nombre de pouvoirs détenus, ceux dont elle est suppléante, **ce qui tombe sans suppléant disponible si elle manque** ; tri sur les plus fragiles. Remplace le menu à une personne à la fois.
- **G2 E** **Absences à venir (90 jours)**, lues de 4.2 : titulaire et suppléants absents en même temps, dit en dates (« du 14 au 28/07 : Signature bancaire, aucun suppléant disponible »). Même rôle que `absenceGaps` pour les compétences de 4.2.
- **G3 U** **Dépendances croisées** : deux pouvoirs avec la même paire de suppléants, ou les deux suppléants d'un pouvoir qui sont aussi titulaires d'autres pouvoirs vitaux : fait affiché.
- **G4 U** **Vue par processus** (P1 à P5, une ligne de synthèse chacun) : processus sans pouvoir, avec un seul suppléant, etc. ; compteurs sur les filtres.
- **G5 O** **Grille personne × pouvoir** (qui est quoi) en une page imprimable.

### H. L'écran : registre, file « À faire », téléphone

- **H1 E** **Registre en cartes lisibles à 375 px** (fin du tableau de 820 px) et tableau large sur ordinateur ; une ligne = un pouvoir : acte, état, titulaire, deux suppléants avec téléphone et pratique, « A fait l'acte » en un tap, statut en couleur **et** en lettres.
- **H2 E** **Filtres en pastilles avec compteurs** (Tous · Sans suppléant · Un seul · Pratique à faire · Prêts), **recherche**, tri par urgence (état, puis délai toléré, puis échéance) ou par processus ; composant `Chips`.
- **H3 E** **File « À faire »** (modèle `SopQueue`, `EqQueue`, `RcQueue`) : suppléant sans pratique, pratique échue ou proche, enveloppe à vérifier, formalité manquante, revue annuelle, départ à traiter ; triée par ton puis échéance ; chaque ligne a son action en un tap.
- **H4 E** **Fiche d'un pouvoir** en sections courtes (l'acte · les personnes · la pratique · les formalités · les accès), **enregistrement au fil de la frappe**, bandeau « Retiré · Annuler », fin du `window.confirm`, pastille « ce qui manque » en faits.
- **H5 E** **Tuiles de synthèse** : *Suppléance prête* (x / n), *Suppléants à entraîner*, *Enveloppe*, *Sans suppléant disponible aujourd'hui* ; messages en faits, une ligne par message (comme 3.1).
- **H6 U** **« Mes suppléances »** : je choisis qui je suis (mémorisé sur l'appareil) et je vois mes pouvoirs, ceux dont je suis suppléant, ma prochaine pratique, comment faire ; la file se filtre sur ma personne.
- **H7 U** **Boutons vers un autre outil** (4.2, 1.2, 1.3, 3.2) : nouvel onglet, icône `NewTab`, enregistrement avant l'ouverture (règle du 2026-10-07).
- **H8 U** **État vide** : une carte, trois boutons (« Partir de la bibliothèque », « Ajouter un pouvoir », « Voir un exemple traité »).

### I. Mise en route et revue annuelle (remplir une fois, garder vivant)

- **I1 E** **Assistant de départ** (une seule fois, interruptible, sans perte) : 1. choisir les pouvoirs dans la bibliothèque ou en écrire ; 2. pour chacun, toucher le titulaire puis deux suppléants ; 3. récapitulatif des manques, un lien direct sur chacun. Objectif : cinq minutes.
- **I2 E** **Revue annuelle en un écran** : chaque pouvoir en carte avec « Toujours juste » ou « À modifier » ; date de revue enregistrée ; rappel quand elle a plus de 12 mois (réglage) ; c'est la mise à jour « à chaque clôture » voulue pour les outils à remplir une fois.
- **I3 E** **Déclencheurs de revue** : départ, changement de poste, arrivée (4.2, 4.3) : fait affiché « à revoir : Marc M. cité sur 2 pouvoirs ».
- **I4 U** **Bilan de la revue** (une ligne : date, par qui, nombre de pouvoirs, ce qui a changé), lisible en revue de direction.

### J. Enregistrement et pertes de données (reprise du lot 0 de 3.2 et 3.3)

- **J1 E** **Fiche vivante** : séparer le contenu (acte, personnes, limites) de la vie (pratiques, vérifications, ouvertures, formalités cochées, absences), comme `takeLife` en 3.2 et 3.3 ; une fiche ouverte longtemps n'écrase plus un « A fait l'acte » donné ailleurs.
- **J2 E** **Enveloppe en collection** (une enveloppe = un enregistrement, une ouverture = une ligne jamais écrasée) au lieu d'un enregistrement unique « le dernier écrit gagne » ; fusion champ par champ pour les pouvoirs, sur le modèle de `maintenanceMerge.ts`.
- **J3 E** **Annuler** (8 s) pour tout retrait et toute pratique saisie ; archive plutôt que suppression quand un historique existe.
- **J4 E** **Droits** : les accès restent dans le dossier direction ; lieux et contenus d'enveloppe, journal des ouvertures et accès par suppléant lui sont aussi réservés ; la vue équipe ne voit ni n'écrase rien de cela (la règle de `commit` s'étend).
- **J5 E** **Lecture tolérante des anciennes données** : pouvoirs d'avant (noms seuls, deux cases, une enveloppe) lus tels quels, champs absents = défauts, fichier illisible gardé en copie.
- **J6 U** Brouillon écrit à la fermeture, au changement d'outil, quand l'onglet passe en arrière-plan.

### K. Exemples fictifs et migration

- **K1 E** **Marqueur propre** `Params.powerExampleLevel` et mise à niveau sans écraser (`completePowerExamples`) ; 4.1 sort de `applyTeamExample` partagé.
- **K2 E** **Exemple qui montre tous les états** : aucun suppléant · un seul · pratique à refaire · à planifier · prête ; un suppléant absent aujourd'hui (« 1 sur 2 disponible ») ; une personne partie encore citée ; formalités à moitié faites ; enveloppe à vérifier et une ouverture passée ; un épisode de suppléance dans le journal ; un suppléant extérieur pris dans l'annuaire ; des pratiques avec constat.
- **K3 E** **Aucune fausse alerte ailleurs** : l'exemple ne déclenche rien en 4.2, 1.3, 1.2 ni au tableau de pilotage (règle du 2026-09-30), vérifié sur l'exemple déjà enregistré dans le navigateur.
- **K4 E** « Voir un exemple traité » propre à 4.1 (`applyPowerExample`), collections vides seulement.
- **K5 U** « Retirer l'exemple » sans toucher aux données de l'entreprise.

### L. Chiffres proposés au tableau de pilotage 1.1

- **L1 U** **Proposés, jamais écrits en silence** : *pouvoirs vitaux à suppléance prête* (%), *suppléants pratiqués dans l'année* (%), *enveloppe vérifiée dans les 6 mois* (oui ou non) ; un rôle d'indicateur `suppleances` ajouté aux modèles comme l'a été la satisfaction de 2.4. `kpi_suppleance` reste calculé par 4.2 ; sa source affichée « Matrice Suppléances 4.1 » est corrigée.
- **L2 U** L'exemple du tableau de pilotage n'a aucune valeur pour le dernier mois clos ni pour le mois en cours (pas de fausse dérive).

### M. Textes, accessibilité, droits

- **M1 E** **Messages en faits**, jamais en ordres (« Pouvoir sans suppléant : Signature bancaire », « Enveloppe vérifiée il y a 8 mois ») ; une phrase d'aide dit ce que « vital » veut dire ; vocabulaire neutre, listes terminées par « Autre, précisez ».
- **M2 E** 12 px sur les écrans de terrain, cibles de 44 px, focus et `inert` des fenêtres, statut en couleur + libellé, pas d'emoji (`DESIGN_OUTILS.md`).
- **M3 U** Entrées 4.1 au glossaire de l'accueil (pouvoir vital, suppléant, enveloppe, pratique).

### N. Papier et hébergement

- **N1 U** Adresse stable pour les liens ; avertissement « adresse locale » à l'impression (même règle que 3.2).
- **N2 O** Fiche d'urgence lisible hors connexion (cache), à traiter avec l'hébergement.
- **N3 O** Identité authentifiée pour « validée par » et pour le double visa (après l'hébergement).

---

## 3. Ce que je ne propose pas (volontairement)

Coût ou chiffrage d'une absence (règle du propriétaire) · mots de passe stockés · avis juridique sur une délégation · planning d'astreinte ou de remplacement (autre sujet, 1.3 tient déjà « joignable 24 h/24 » et l'autre numéro) · gestion des congés (4.2 les tient) · notation des personnes · suppléance désignée automatiquement sans validation humaine · export PDF ou CSV · envoi de messages par l'outil.

---

## 4. Liens avec les autres outils

| Outil | Lien proposé |
|---|---|
| 1.1 Pilotage | Chiffres proposés (L1) ; bandeau d'accueil du jour (F6). |
| 1.2 Plans B | Pouvoir ↔ risque par identifiant (A8) ; le risque reprend les suppléants ; « Inscrire le risque » ouvre 1.2 en nouvel onglet. |
| 1.3 Annuaire | Personnes et extérieurs choisis dans l'annuaire (B1) ; téléphones (B3) ; personnes à prévenir (A5) ; la fiche d'une personne dit « suppléant de… » en plus de « pouvoir sans suppléant ». |
| 3.2 Instructions | Mode opératoire du pouvoir (A4). |
| 4.2 Polyvalence | Personnel, absences, personnes inactives (B4, B5, G2) ; niveau d'un suppléant (A7) ; tutorat (C6) ; enregistrer une absence (F5). |
| 4.3 Accueil | Une arrivée déclenche une revue (I3). |
| 4.4 Classement | Référence du document de délégation (D4). |
| Actions | Constat d'une pratique (C2), manque d'un épisode (F7), case non cochée de l'enveloppe (E3) : un seul lien `ref: power`. |
| Mes tâches, accueil, agenda | Tâches justes (C5), bandeau du jour (F6). |

---

## 5. Architecture proposée (comme 3.2, 3.3 et 3.4)

- **Domaine** : `src/domain/powers.ts` (règles, états, disponibilité, « qui remplace qui », enveloppes, tâches, `takeLife`, journal) sort de `team.ts`, qui garde 4.2 à 4.4 ; `powers.test.ts` ; `powersExamples.ts` ; `powersFeeds.ts`. Les imports de `tasks.ts`, `status.ts`, `contacts.ts`, `feeds.ts`, `legacyTools.ts`, `refs.ts` sont mis à jour.
- **Types** (`types.ts`) : `Power` étendu, **tous champs facultatifs** (identifiants de personnes, délai toléré, limites, compétence, instruction, risque, pratiques, formalités, revue, archivage), `Envelope` étendue (identifiant, contenu, double visa, ouvertures) et passée en collection, journal de suppléance (collection), `PowerSettings` (`Params.power` : rythme, rythme de l'enveloppe, seuil de longue absence, formalités, bibliothèque, seuil de charge), `Params.powerExampleLevel`, rôle d'indicateur `suppleances`.
- **Écrans** (`src/ui/team/`) : `Suppleances.tsx` (écran), `PwQueue.tsx`, `PwCards.tsx`, `PwSheet.tsx`, `PwAbsent.tsx` (« Qui remplace qui »), `PwEnvelope.tsx`, `PwReview.tsx` (assistant et revue), `PwSettings.tsx`, `PwPrint.tsx` (fiche d'urgence).
- **Magasin** : `store/flat.ts` (clés `envelope|…` et `cover|…`), `migrate.ts` (collections), `SettingsData.tsx` (sauvegardes).
- **Tâches, accueil, rapport** : `tasks.ts`, `status.ts`, `feeds.ts`, `contacts.ts` (`staffInfo`).

---

## 6. Défauts que je prends (dites non à ceux qui ne conviennent pas)

1. **Personnes** : liens par identifiant avec repli sur le nom exact ; les anciens noms restent lisibles.
2. **État d'un pouvoir** : « prêt » = deux personnes **distinctes**, pratique à jour **et validée** ; la disponibilité du jour est un fait à part, elle ne change pas l'état.
3. **Rythmes** : pratique 365 j (je corrige l'index qui dit « 90 j »), enveloppe 6 mois, longue absence 24 h, revue annuelle 12 mois, charge d'un suppléant 3 pouvoirs ; tous réglables dans l'outil.
4. **Enveloppes** : plusieurs ; l'actuelle devient la première.
5. **Journal de suppléance** : gardé, optionnel, prérempli en un tap.
6. **Absence enregistrée depuis 4.1** : écrite dans la liste du personnel, donc visible en 4.2 et 1.3.
7. **Aucun nouvel export, aucun envoi** ; l'impression du navigateur seulement (fiche d'urgence A4), pas de PDF.
8. **Aucun montant, aucun mot de passe.**
9. **Vocabulaire** : « pouvoir vital », « suppléant », « enveloppe », « pratique » restent (mots de la fiche papier) ; « acte » pour décrire.
10. **Tous les niveaux E et U sont faits** ; les O seulement si vous le dites.

## 7. Décisions que seul le propriétaire peut prendre

1. **Fiche d'urgence A4 (F9)** : vous avez dit « on s'en fout pour l'instant » pour l'impression de 3.3. Ici le papier est la raison d'être de la fiche d'origine (coffre, panne de réseau). Défaut : je la fais, une page, sans PDF.
2. **Enregistrer une absence depuis 4.1 (F5)** : deux écrans (4.1 et 4.2) écriraient le même champ. Défaut : oui, sinon l'outil de crise oblige à changer d'écran.
3. **Journal de suppléance (F7, F8, C7)** : une ligne par épisode réel, utile à la preuve et à l'amélioration, mais c'est une saisie de plus. Défaut : gardé, optionnel.
4. **Nouvel indicateur du tableau de pilotage (L1)** : ajouté aux modèles de 1.1. Défaut : oui.
5. **Bibliothèque de départ neutre (A2)** : « Lancement des fabrications », « bac rouge » disparaissent des suggestions (la liste reste modifiable). Défaut : oui.

## 8. Critères de réussite (pour l'audit de la phase 3)

1. Un dirigeant remplit 5 pouvoirs avec titulaire et deux suppléants en moins de 5 minutes avec l'assistant (I1).
2. De « Quelqu'un est absent » au téléphone du suppléant : 3 taps au plus sur un téléphone (F1, F2).
3. Inscrire une pratique : 2 taps au plus (C1) ; vérifier l'enveloppe : 3 taps au plus (E3).
4. Aucun état « prêt » faux : un doublon, un titulaire placé suppléant, une personne partie ne peuvent jamais donner « Suppléance prête » (B2, B4).
5. Aucune donnée perdue : une fiche ouverte sur un appareil n'écrase ni une pratique, ni une vérification, ni une ouverture inscrites sur un autre (J1, J2).
6. L'exemple montre chaque état et ne déclenche aucune alerte hors de 4.1 (K2, K3).
7. Aucun message d'ordre, aucun mot d'atelier dans les listes de départ, aucun mot de passe en clair (M1, A2, E1).

## 9. Décompte

**E : 50 · U : 31 · O : 7** (88 points, hors liens). Les points E de J (enregistrement) et K (exemples) sont la base ; ceux de B, C, F et H font l'outil de terrain ; ceux de D, E et I font la formalisation et la mise à jour annuelle.

---

## 10. Avancement (2026-10-07)

Demande du propriétaire : « fais tout sauf les fiches d'impressions et les pdf », avec le skill Impeccable pour l'ergonomie. Fait par le fil principal, sans équipe de sous-agents ; la relecture de fin est celle de l'agent d'Impeccable. Rien n'est commité.

**Fait** : tous les points E et U, sauf ceux ci-dessous. Le code est dans `src/domain/powers.ts`, `powersAll.ts`, `powersFeeds.ts`, `powersExamples.ts` et `src/ui/team/` (`Suppleances.tsx` et les `Pw*.tsx`) ; 86 tests nouveaux (domaine et écrans), toute la suite est verte.

**Volontairement pas fait** : la fiche d'urgence A4 (F9), la fiche de poche (F10), la grille imprimable (G5), l'avertissement d'adresse à l'impression (N1) et tout PDF, par décision du propriétaire ; les points O (B10 e-mail préparé, C9 exercice sans le titulaire, F11 QR du coffre, N2 hors ligne, N3 identité authentifiée).

**Faits en partie** :
- A3 : les pouvoirs se trient par processus et le processus sans pouvoir se dit en fait ; pas de compteur par processus.
- A8 : le risque de 1.2 est lié par identifiant quand il est inscrit depuis 4.1, et retrouvé par ses mots quand il date de la première version ; le risque qui reprend les suppléants du pouvoir n'est pas fait (il toucherait 1.2).
- E5 : la tâche de départ dit « accès à changer » ; pas de tâche propre à une enveloppe.
- G3 : « Les deux mêmes suppléants » est dit ; le cas des deux suppléants qui sont aussi titulaires d'autres pouvoirs ne l'est pas (trop fréquent dans une petite entreprise pour être un constat).
- G4 : filtres et compteurs de l'écran ; pas de synthèse de deux lignes par processus.
- I3 : le départ d'une personne déclenche la revue ; l'arrivée (4.3) non.

**Non fait** : D5 (revue de la délégation à date prévue) : la relecture annuelle du pouvoir en tient lieu.

**Écarts avec ce document** (pris pour garder le code court et la donnée sûre) :
- les personnes restent des **noms** lus dans le personnel (4.2) et l'annuaire (1.3) par nom exact, pas des liens par identifiant : un renommage en 4.2 se voit en fait (« pas dans la liste du personnel ») ;
- la **vie** de l'outil est faite d'enregistrements séparés (`practices`, `covers`, `vaults`, `vlogs`, une clé chacun) au lieu de listes dans le pouvoir : deux personnes n'écrasent jamais la ligne l'une de l'autre, sans fusion champ par champ ; les enveloppes et leur journal sont dans le dossier direction ;
- les formalités par défaut sont trois (délégation signée, limites précisées, organisme informé) ; « a accepté d'être suppléant » et « accès à son nom » sont par suppléant (B9, D3) ;
- le premier tap sur « A fait l'acte » ouvre un petit formulaire (suppléant, jour, qui l'a vu, ce qui a bloqué) : deux taps, pas un, pour que la validation reste un acte.

**Où le voir** : dans l'exemple fictif (« Voir un exemple traité », ou l'exemple déjà enregistré, mis à niveau une fois par `Params.powerExampleLevel`), les six états sont là : aucun suppléant (CNC), un seul (déclarations, avec une personne sortie), pratique à refaire (signature bancaire), à valider (offres), à planifier (lancement), prête ; Thomas M. est absent aujourd'hui, Karim T. le sera dans trois semaines sans suppléant disponible, deux enveloppes (une à vérifier, une vérifiée), une absence close et une en cours.
