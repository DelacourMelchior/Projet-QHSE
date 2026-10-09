# Revue de design de l'outil 3.4 « Réceptions » (2026-10-07)

Revue faite avec le skill Impeccable : deux évaluations isolées (A : revue de design lue sur le code et sur le rendu réel à 375, 768, 1024 et 1280 px et en paysage téléphone ; B : détecteur et 105 mesures dans un vrai navigateur, 21 écrans × 5 tailles). Mode : « Operate » (la tâche prime). Autorité visuelle : `app/DESIGN_OUTILS.md`.

## Avant

Score 27/40 (haut de « Acceptable »). Aucun bloquant, 6 majeurs, 4 mineurs. Le socle était propre : 0 constat du détecteur dans les fichiers de 3.4, 0 débordement horizontal, 0 texte sous 11 px, 0 erreur de console. Les défauts étaient d'usage.

## Ce qui a été corrigé

| Gravité | Constat | Correction |
|---|---|---|
| Majeur | Signature de l'entreprise inerte après celle du client, sans raison | Le pad et le bouton restent actifs ; une ligne de fait dit que le PV est verrouillé et que la signature de l'entreprise ajoute un scellé |
| Majeur | Le moment de la signature n'avait ni confirmation ni garde | Ligne « Vous signez : résultat · quantité » avant ; après : titre « PV signé », bandeau « PV-… signé par …, date. Contenu verrouillé. », défilement remonté ; « Voir le PV » secondaire ; pad client de 1 271 à 966 px du haut de l'étape |
| Majeur | Photo de référence : la mesure passait sous le pli | « Valeur mesurée » de y 720 à 415 (375×812) ; vignette de 96 px à côté du point ; deux colonnes en paysage |
| Majeur | « Annuler » à 690 px du pouce, l'écran avait déjà avancé | Barre d'annulation juste au-dessus des deux réponses ; annuler ramène au jalon |
| Majeur | PV au scellé modifié invisible au registre | Constat, tâche « Vérifier le PV-… de CMD-… », badge rouge « Scellé modifié » sur la carte et la ligne, badge de l'outil (commande et lots clos) |
| Majeur | Fenêtres sans focus ni nom ; piège de focus des plein écran troué | Focus dans la fenêtre, reste de la page `inert`, focus rendu à l'ouverture, `aria-labelledby` ; 0 sortie sur 14 Tab (avant : 5) |
| Mineur | Un fait verrouillé dessiné comme un contrôle éteint (1,56:1) | Pastille de lecture en pleine opacité, autres choix masqués ; boutons principaux désactivés à 6:1 (avant 1,77:1) |
| Mineur | Contrastes de base : focus 2,4:1, champs 1,5:1, aide 2,5:1 | Focus 4:1, bordure de champ 3,5:1, aide 5,4:1 ; mouvement réduit respecté |
| Mineur | Orientation à 375 px | « Nouvelle commande » de y 791 à y 203 ; filtres sur plusieurs lignes (29 à 41 % étaient hors écran) ; toucher une tuile défile vers la liste ; onglet actif ramené dans la barre ; titres sur deux lignes |
| Mineur | « Fermer » à 26×26 px au tactile | 44×44 px |
| Confort | Textes de 11 px (53 à 70 % des textes à 375 px) | 12 px dans les pièces communes et dans 3.4 ; plein écran à 14 px et plus |
| Confort | Vocabulaire et couleurs | « Un tap », « au doigt », « plein écran » retirés des textes ; l'émeraude réservé à conforme, sans réserve et libérée ; l'anneau de progression n'est plus jamais rouge ; une seule personne choisie par fiche (« Vous : X · changer ») |
| Confort | PV | Un seul titre de niveau 1 ; la ligne « Au contrôle du … : exigence » ne s'imprime que si l'exigence a changé (CMD-2026-052 : 4 pages A4 → 3) |

Fichiers communs touchés : `src/ui/common.tsx` (Modal, `useDialogFocus`, champs, boutons, 12 px), `src/index.css` (focus, aide, mouvement réduit), `src/ui/App.tsx` (onglet actif). Les autres outils en profitent (focus géré dans toutes les fenêtres) : leurs tests restent verts.

## Après (mesuré)

Suite complète : 2 050 tests verts ; `tsc` propre hors fichiers de 3.3 ; détecteur à 0 constat sur les fichiers retouchés. En navigateur à 375 px : registre sans coupure, « Nouvelle commande » dans le premier écran, plein écran jalon avec réponses espacées de 24 px, annulation au pouce, `#root` rendu `inert` sous un plein écran, scellé falsifié → onglet 4 → 5 et tâche « Vérifier le PV-2026-009 de CMD-2026-052 ».

## Pas fait, ou pas vérifiable

- Vrai doigt, gants, appareils réels (Safari iOS, clavier virtuel), lecteurs d'écran réels, papier réel : non vérifiés.
- Schéma sombre : toute l'application est claire ; non traité.
- En-tête collant du shell (126 px à 375 px, puces P1 à P5 de 18 px de haut) : global, laissé tel quel ; à reprendre avec le lot « global » (7).
- Un tampon visible du scellé sur chaque ligne du registre et sur chaque page (proposition de la revue) : non fait, à décider.
- Dates à deux formats à l'écran (« 5 oct. 10 h 11 » et « 04/10/2026 ») : à unifier (lot 8).
- Archive de la critique : `.impeccable/critique/` dans `pilotage/` (non versionné).
