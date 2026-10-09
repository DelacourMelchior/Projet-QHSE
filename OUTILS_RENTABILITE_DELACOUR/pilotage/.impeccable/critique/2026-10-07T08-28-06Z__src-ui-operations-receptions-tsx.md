---
target: outil 3.4 Réceptions et ses fiches
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 6
target_identity: "file:/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_RENTABILITE_DELACOUR/pilotage/src/ui/operations/Receptions.tsx"
target_fingerprint: "sha256:2d00e7ef671aa6f18d1d7533e2d1aa6657360e94b7399edbe42d0d00be5d071b"
target_path: /Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_RENTABILITE_DELACOUR/pilotage/src/ui/operations/Receptions.tsx
timestamp: 2026-10-07T08-28-06Z
slug: src-ui-operations-receptions-tsx
---
Method: dual-agent (A: aa0e51f66df539cee · B: ab011eb6b0ff8e00e)

# Critique de l'outil 3.4 « Réceptions » et de ses fiches (2026-10-07)

Mode : Operate. Autorité visuelle : `app/DESIGN_OUTILS.md`. Score : 27/40 (Acceptable, haut de bande). 0 P0, 6 P1, 4 P2.

## Verdict de spécificité
Structure faite pour ce produit (une décision par écran, réponses 64 px en bas, file « À faire », PV scellé, fiche suiveuse à QR). Surface interchangeable (slate sur blanc, pastilles émeraude/ambre/rouge, or de la marque seulement en anneau de focus). Le scellé, seule preuve du produit, n'a aucun visage.

Détecteur : 0 constat dans les fichiers 3.4 ; 3 faux positifs ailleurs (3.2, 3.3). Mesures : 0 erreur console, 0 débordement horizontal, 0 texte < 11 px, 0 contraste actif sous seuil sur 105 mesures.

## Heuristiques
1 État du système 3 · 2 Langage du réel 3 · 3 Contrôle et liberté 3 · 4 Cohérence 2 · 5 Prévention des erreurs 3 · 6 Reconnaissance 3 · 7 Flexibilité 3 · 8 Minimalisme 2 · 9 Récupération 3 · 10 Aide 2 = 27/40.

## Problèmes prioritaires
- P1 Signature entreprise inerte après celle du client, sans raison (RcReception.tsx:418,528,532). Correction : `readyCo` sans `ro`, ligne de fait sous le pad.
- P1 Moment de la signature sans confirmation ni garde (RcReception.tsx:445-536). Correction : bandeau « PV-… signé… » en tête d'étape + remontée, ligne « Vous signez : … », « Voir le PV » secondaire tant que non signé.
- P1 Photo de référence pousse la mesure sous le pli ; paysage téléphone gaspillé (RcMilestone.tsx:389,392,433).
- P1 « Annuler » en haut, à 690 px du pouce, l'écran a déjà avancé (RcMilestone.tsx:156,316-327).
- P1 Scellé modifié invisible au registre (constat, tâche « Vérifier », badge sur la carte).
- P1 Fenêtres communes sans focus ni nom accessible (common.tsx:49-70) ; piège de focus des plein écran troué (RcMilestone.tsx:57).
- P2 Fait verrouillé dessiné comme contrôle éteint ; boutons principaux désactivés à 1,77:1.
- P2 Focus doré 2,44:1, placeholders 2,54:1, bordures de champs 1,48:1 ; tuiles toutes teintées ; anneau rouge sur commande neuve ; vert de navigation = vert de « Conforme ».
- P2 Orientation à 375 px : tuile sans défilement, filtres coupés, onglet actif hors champ, en-tête collant 126 px, titres tronqués.
- P2 « Fermer » des fenêtres : 26×26 en tactile dès 640 px.
- P3 53 à 70 % des textes à 11 px ; transitions non coupées en mouvement réduit ; schéma sombre non géré ; dates mixtes ; « Un tap », « au doigt » ; exigence du jalon répétée sur le PV.

## Personnes types
Casey (gants, poste) : réponses séparées de 12 px, mesure sous le pli, annulation hors de portée. Réceptionnaire pressé : « Suivant » grisé sans raison visible, même personne demandée deux fois, pad entreprise mort. Sam (clavier) : focus 2,44:1, pas de voie clavier pour signer pour l'entreprise, fenêtres sans nom.

## Questions
Si le papier signé est le chemin fréquent, pourquoi le tracé a-t-il 700 px de cérémonie ? À quoi ressemblerait un tampon visible du scellé ? Un seul système typographique qui grandit selon le contexte ?

Captures et mesures : scratchpad `crit_a/`, `crit_b/`.
