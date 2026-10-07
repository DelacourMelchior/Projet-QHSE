# Règles visuelles de l'application Delacour Quality OS

Règles appliquées à l'outil 1.1 et à la fiche action (5 Pourquoi + 5M). Les suivre pour toute nouvelle écran ou retouche. Ce fichier concerne l'application d'outils, pas le site vitrine (qui a sa propre identité).

## Identité

- **Couleurs de marque** (classes Tailwind `delacour-*`) : vert Empire `#1B4D3E` (primaire, boutons principaux, en-tête), vert foncé `#11352A`, or `#C5A065` (accents, remplissages ; jamais un texte ni un anneau de focus sur fond clair : 2,4:1), or foncé `#9E7A3E` (anneau de focus sur fond clair, 4:1), or clair `#DFBF87` (focus dans l'en-tête vert), crème `#FDFBF7`.
- **Couleurs de statut**, avec le même sens partout : vert = conforme, orange = dérive, rouge = alerte ou action requise, gris = à saisir ou neutre. Un compteur à zéro reste gris, jamais rouge.
- **Polices système** uniquement (aucun appel à Google Fonts). Chiffres et valeurs en police à chasse fixe (`font-mono`), texte en sans-serif.

## Texte

- **11 px minimum** à l'écran (`text-[11px]`) ; 12 px (`text-xs`) dans les pièces communes et dans l'outil 3.4. Les tailles inférieures ne sont admises que sur les documents imprimés (A4, A5), en `pt`.
- **Casse normale** pour les titres, colonnes, badges et boutons. Pas de majuscules espacées (`uppercase tracking-wider`).
- **Ton factuel** : « Pilote à désigner », « Non-qualité au-dessus de la cible ». Pas de vocabulaire alarmiste (« hémorragie », « exigez »).
- Chaque message chiffré rappelle son hypothèse (« sur la base d'une marge nette de 5 % »).

## Icônes et symboles

- **Pas d'emoji dans l'interface.** Icônes dessinées en SVG (trait 2 px, style Lucide) : réglages, œil, téléchargement, annuler, rétablir, corbeille.
- Les statuts portent un **point de couleur** (pseudo-élément CSS des classes `badge-conforme`, `badge-surveiller`, `badge-alerte`).
- Les emojis présents dans les **données d'exemple** (ex. « 🟢 Clôturé » dans les registres) sont du contenu, pas de l'interface.

## Mise en page

- La **synthèse dirigeant** passe en premier, puis chaque processus : tableau, puis graphique d'évolution (affiché par défaut, masquable avec « Masquer le graphique »). Pas de mini-courbe dans les lignes du tableau.
- **Graphiques** : un indicateur à la fois en grand (240 px de haut, 200 px sur mobile), ou « Tous les indicateurs » en grille de petits graphiques (3, 2 ou 1 par ligne selon la largeur), chacun avec sa propre échelle. Pas de vue « base 100 ».
  - Zone conforme teintée en vert pâle du côté conforme de la cible ; cible en pointillé or, rappelée dans l'en-tête du graphique.
  - Points colorés selon le statut du mois (vert, orange, rouge) ; infobulle immédiate sur chaque point (survol, toucher ou clavier).
  - Étiquettes de valeur sur le dernier mois, le minimum et le maximum seulement ; mois actif surligné comme dans le tableau.
  - Axes en 11 px, polices système ; graduations arrondies ; taux entre 0 et 100 %.
  - KPI confidentiel en vue équipe : « Graphique réservé à la direction ».
- **Tendance** : moyenne glissante sur 3 mois en pointillé fin, de la couleur de la courbe, seulement à partir de 6 mois saisis. Sa lecture (« Tendance 3 mois : en baisse de 7 % ») figure dans la légende, en vert ou rouge selon le sens de l'objectif.
- Tableau : le nom du KPI reste visible (colonne figée à gauche). Les colonnes Bilan, Statut et Action sont figées à droite seulement à partir de 1280 px.
- **Mobile (< 640 px)** : une carte par KPI pour le mois actif à la place du tableau. Aucun défilement horizontal de la page.
- L'en-tête « Cabinet Delacour · Conseil de direction » (papier à en-tête) n'apparaît qu'à l'impression.

## Accessibilité

- Boutons d'icône : `aria-label` et `title`. Les éléments visibles au survol le sont aussi au focus clavier (`focus:opacity-100`).
- Aucune information portée par la couleur seule : chaque statut a aussi un libellé (« Dérive (−4 %) »).
- **Contrastes mesurés** : texte 4,5:1 (grand texte 3:1) ; bordure de champ 3:1 au moins (`inputCls` : `#7b8aa3`, 3,5:1) ; texte d'aide (`::placeholder`) `#5b6b82`, 5,4:1 ; anneau de focus 3:1 au moins sur le fond qu'il touche. Un bouton principal désactivé reste lisible (`disabled:bg-slate-200 disabled:text-slate-600`, 6:1, pleine opacité) et, quand la raison n'est pas évidente, une ligne de fait la dit à côté.
- **Un fait n'est pas un contrôle éteint** : un résultat signé, une libération faite, un contrôle clos se dessinent en pastille ou en ligne de lecture, en pleine opacité (couleur + icône + mot), jamais en boutons fanés.
- **Fenêtres et plein écran** : à l'ouverture le focus entre dans la fenêtre, le reste de la page est `inert` (ni tabulation ni lecteur d'écran), la fenêtre porte un nom (`aria-labelledby`), Échap la ferme et le focus revient à ce qui l'a ouverte (`Modal`, et `useDialogFocus` pour un plein écran qui n'en est pas un). Bouton Fermer de 44 px au tactile.
- **Mouvement réduit** : `prefers-reduced-motion` coupe les transitions (règle globale de `index.css`).
- **Écrans de terrain de l'outil 3.4** (registre, fiche, plein écran jalon et réception) : 12 px minimum (`text-xs`), 14 px et plus dans les plein écran ; l'émeraude est réservé à « conforme », « sans réserve », « libérée » (la navigation est verte de marque ou blanche) ; rouge = fait grave, jamais « pas encore fait ».

## Outils 2.1 à 5.4 : une même forme

- **En-tête** : les 5 processus sous le nom de l'entreprise, puis les outils du processus en onglets (numéro en or, libellé court), avec un compteur rouge (alerte) ou orange (à faire), et l'onglet Actions du processus.
- **Écran d'un outil**, dans cet ordre : la synthèse (une question en titre, 4 chiffres clés, messages d'analyse, 4 visibles puis « Voir les autres »), le registre (filtres en pastilles avec leur nombre, une ligne par enregistrement : référence en police à chasse fixe, titre, détail, responsable et échéance à droite, statut en badge), les chiffres proposés au tableau de pilotage quand l'outil en calcule, puis « Méthode en 3 étapes », fermée par défaut.
- **Outil vide** : une carte qui explique l'outil en deux phrases, le bouton principal, et « Voir un exemple traité ».
- **Fiche d'un enregistrement** : sections numérotées dans l'ordre du travail réel (constat, décision, coût, suite) ; les boutons vers un autre outil portent son numéro (« Ouvrir un atelier 5 Pourquoi », « Réclamer au fournisseur ») ; ils ouvrent l'outil dans un **nouvel onglet** du navigateur (la fiche où l'on était reste ouverte) et le disent par l'icône « lien externe » placée après le libellé (composant `NewTab`, qui ajoute aussi « s'ouvre dans un nouvel onglet » pour les lecteurs d'écran) ; l'enregistrement concerné est écrit avant l'ouverture (`nav.open`) ; seuls l'accueil, « Mes tâches » et les sauts à l'intérieur d'un même outil remplacent la page (`nav.tool`) ; les documents à imprimer et les actions rares (retirer, supprimer, dupliquer) sont dans un bloc replié « Autres actions » au-dessus du pied, qui ne garde que l'état d'enregistrement et « Fermer ».
- **Délais** : le temps restant en orange (« reste 12 h »), le retard en rouge (« en retard de 12 h »), toujours en toutes lettres.
- **Couleurs de choix** : vert pour conforme ou oui, rouge pour non conforme ou non, orange pour une réserve ; texte blanc seulement sur les teintes foncées (700 et plus), texte foncé sur les teintes claires.
- **Choisir une personne** (outil 4.1, `PersonField`) : un champ de saisie dont les suggestions (le personnel, puis l'annuaire) s'affichent **sous** le champ et poussent la page, jamais par-dessus (une fenêtre qui défile coupe une liste flottante) ; un nom tapé reste valable ; ce qui est refusé se dit en fait sous le champ (« Hélène R. est déjà titulaire de ce pouvoir. »), et rien n'est écrit tant que le nom est refusé.
- **Un numéro de téléphone est un lien d'appel** (`PhoneLink`, 44 px au tactile) ; sur une page de crise, le bouton principal est l'appel de la première personne à joindre. Sur téléphone, une carte de registre tient en une ligne (titre, état, qui est dessus) et s'ouvre d'un tap sur ses personnes et ses boutons.
- **Une page de l'outil, pas une fenêtre**, pour ce qui se consulte en urgence (« Qui remplace qui ? », la revue de la liste, l'assistant de départ) : elle remplace le registre avec « Retour aux pouvoirs » et son adresse (`#4.1~absent:…`) se partage ; les fenêtres restent pour ce qui demande toute l'attention (la fiche, la pratique, la vérification d'une enveloppe).
- **Documents imprimés** : PDF écrits par l'application (bande de titre colorée, tableaux, cases de signature) ; instruction de poste et charte de classement en impression A4 portrait du navigateur, seules sur la page. La fiche suiveuse de commande (jalons à cocher, QR code de la commande) et le PV de réception de l'outil 3.4 passent aussi par l'impression A4 du navigateur, photos et signatures dessinées comprises ; le PV existe aussi en PDF. Aucun montant ni mot de facturation sur ces documents.
