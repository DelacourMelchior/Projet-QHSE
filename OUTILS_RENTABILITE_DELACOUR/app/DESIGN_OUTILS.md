# Règles visuelles de l'application Delacour Quality OS

Règles appliquées à l'outil 1.1 et à la fiche action (5 Pourquoi + 5M). Les suivre pour toute nouvelle écran ou retouche. Ce fichier concerne l'application d'outils, pas le site vitrine (qui a sa propre identité).

## Identité

- **Couleurs de marque** (classes Tailwind `delacour-*`) : vert Empire `#1B4D3E` (primaire, boutons principaux, en-tête), vert foncé `#11352A`, or `#C5A065` (accents, focus), crème `#FDFBF7`.
- **Couleurs de statut**, avec le même sens partout : vert = conforme, orange = dérive, rouge = alerte ou action requise, gris = à saisir ou neutre. Un compteur à zéro reste gris, jamais rouge.
- **Polices système** uniquement (aucun appel à Google Fonts). Chiffres et valeurs en police à chasse fixe (`font-mono`), texte en sans-serif.

## Texte

- **11 px minimum** à l'écran (`text-[11px]`). Les tailles inférieures ne sont admises que sur les documents imprimés (A4, A5), en `pt`.
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
