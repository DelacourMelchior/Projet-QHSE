# Critique impeccable de l'outil 3.3 « Maintenance » et des fiches équipement

Method: dual-agent (A : revue de design · B : détecteur et mesures navigateur), mode Operate, build du 2026-10-07 10:17, largeurs 1280 / 768 / 390 / 360 / 320 px, exemple traité (9 équipements, 12 pièces). Rapports complets et 95 captures + scripts : session de travail (`reports/critique/A.md`, `B.md`), résumé ici. Autorité de design : `app/DESIGN_OUTILS.md`.

## Note de santé du design : 28 / 40 (bon, bas de bande)

| # | Heuristique | Note | Faille principale |
|---|---|---|---|
| 1 | État du système | 3 | Bandeau de la fiche vert pour un équipement en danger |
| 2 | Langage du métier | 3 | « bac rouge », « Plan B », « goulet » expliqués seulement en 11 px gris ; « tap » ×4 |
| 3 | Contrôle et liberté | 3 | Un seul « Annuler » pour tout l'outil ; arrêt en un toucher sans confirmation |
| 4 | Cohérence | 2 | Un même état dit trois choses ; quatre libellés pour « routine plein écran » ; pastilles sous 44 px |
| 5 | Prévention des erreurs | 3 | « Équipement à l'arrêt » à 8 px de « Suivant » ; danger signalé sans nom |
| 6 | Reconnaissance | 3 | L'action la plus fréquente (faire la routine) est une icône grise sans mot |
| 7 | Efficacité | 3 | « Rien à signaler » seulement dans la fiche ; la recherche n'ouvre rien à Entrée |
| 8 | Minimalisme | 2 | 24 contrôles avant la première carte ; même fait écrit trois fois ; pied de fiche de 266 px |
| 9 | Récupération d'erreur | 3 | Très soigné ; erreurs de la fiche en 11 px loin du champ |
| 10 | Aide | 3 | Exemple traité, indices, méthode ; rien dans les écrans de terrain |

**Spécificité :** écrit pour ce métier sur les écrans de terrain (routine plein écran avec la photo de ce qui est normal, bande des 12 périodes, armoire de survie) ; générique à l'accueil et dans la fiche de bureau, comme voulu en mode Operate. **Détecteur :** 1 constat sur 20 fichiers, faux positif (survol de la croix, 5,91:1) ; tout le reste vient des mesures. **Console :** 0 message, décalage de mise en page 0, 0 `id` en double, 0 contrôle sans nom, ordre de tabulation logique.

## Points forts
1. **Routine plein écran** : un point par écran, photo de référence, trois réponses à 64 px (icône, mot, couleur), brouillon repris, garde contre le double toucher.
2. **Un statut n'est jamais seul** dans les fiches : symbole + couleur + libellé (bande des périodes, badges, matrice).
3. **Phrases de faits + un geste + « Annuler » nommé** : l'onglet Contrôles et les gestes de la file.

## Problèmes à corriger (aucun P0)

**P1**
1. **Routine plein écran, téléphone** : les 3 boutons de réponse sont hors écran sur 7 points sur 15 à 390 × 844 (15 sur 15 à 360 × 640) ; pied fixe de 161 px ; « Suivant » grisé à 1,15:1. (B M-01)
2. **Pied de la fiche, téléphone** : 266 px sur 844, « Faire la routine » caché dessous ; cinq actions d'administration en permanence. (A P1-1)
3. **Bandeau de la fiche** vert « En service » pendant que la carte dit « Danger » en rouge (`EqSheet.tsx:35`). (A P1-2)
4. **Cibles tactiles** sous 44 px : pastilles de filtre 27 px, « Voir les 21 autres messages » 17 px, épingles du plan 36 px, croix 38 px. (A P1-3, B M-04)
5. **Registre sous la ligne de flottaison** : première carte à y = 859 / 1056 / 1409 ; le même fait écrit trois fois (message, tâche, carte) ; « 2 / 6 » inexpliqué. (A P1-4)
6. **Signaler un problème** : la gravité (seule saisie obligatoire) vient après la photo et 7 natures ; un danger part sans nom (« anonyme a signalé ») et sans dire qui prévenir ; l'infobulle « Annuler » recouvre « Fermer ». (A P1-5)
7. **Focus des fenêtres** : la routine plein écran laisse sortir le focus au 8e Tab, Signaler au 20e, rien ne le rend à la fermeture. `Modal` déjà corrigé dans le source. (B M-02)

**P2**
8. Plan : la page déborde de 17 px à 390 px (`ul.grid` sans `grid-cols-1`) ; la pose d'une épingle est impossible au clavier. (A P2-12, B M-03, M-14)
9. Équipement retiré encore sollicité (fiche à 67 %, « Faire la routine » actif, « 0 période sur 12 (80 %) »). (A P2-6)
10. « Équipement à l'arrêt » en un toucher, sans confirmation. (A P2-7)
11. Fiche d'une pièce : l'identité avant le stock et la commande, 700 px plus haut. (A P2-8)
12. Le rouge perd son sens : 12 tâches rouges sur 25 ; tuile « Anomalies » rouge pour une simple anomalie orange sur la carte. (A P2-9)
13. Onglet Routine : réglage et éditeur de 5 points avant l'état et l'historique ; « Qui s'en occupe » = 39 boutons. (A P2-10)
14. Une action, quatre libellés ; trois boutons « problème » côte à côte. (A P2-11)
15. Contraste : placeholder 2,54:1, anneau de focus 2,44:1, bordures de champ 1,48:1 (déjà corrigés dans le source, à confirmer au build) ; icônes `slate-400` 2,56:1 ; `!` blanc sur ambre 3,19:1 ; boutons désactivés à 1,15:1. (B M-05, M-06, M-10)
16. Chiffre de l'anneau sous 11 px (8,3 px en liste) ; dates coupées par `truncate` (carte, liste, plan) ; « Commencer » dépasse de 18 px à 320 px. (B M-07, M-08, M-09)

**P3** : statut par la couleur seule sur les épingles, les points de la file et les tuiles ; pas de `h1`, titres imbriqués ; « Retirer la commande » sans nom de pièce ; pas de lien d'évitement ; pas de verrou de défilement derrière les fenêtres.

## Signaux d'alerte par persona
- **Alex (responsable, 8 machines)** : « Rien à signaler » seulement dans la fiche ; la file de 25 tâches ne se filtre pas ; Entrée n'ouvre rien dans la recherche.
- **Jordan (première fois)** : six nombres qui se recoupent au-dessus de la première carte ; jargon défini en 11 px gris ; « Commencer » reste vert quand la routine est faite.
- **Sam (accessibilité)** : fenêtres sans nom ni focus dans le build (corrigé dans le source pour `Modal`) ; épingles du plan sans symbole.
- **Opérateur d'atelier (gants, téléphone)** : pastilles à 27 px, réponses hors écran, arrêt à 8 px de « Suivant », texte de la zone photo en 11 px, aucun retour sonore ni vibration.

## Questions laissées ouvertes (décisions du propriétaire, non traitées ici)
1. Sous 640 px, ouvrir l'outil sur « Les routines à faire aujourd'hui » (une machine par ligne) et passer la synthèse en vue du responsable ?
2. Séparer la fiche en trois onglets de lecture et un mode « Modifier la fiche » ?
3. Un bouton « Appeler le responsable » dans la confirmation d'un danger : un fait ou un ordre ? (Pris par défaut : fait + lien d'appel, voir lot de correction.)

Questions skipped : le propriétaire veut des réponses courtes et des défauts pris sans question ; les trois ci-dessus restent à trancher.
