# Outil 3.4 « Réceptions » : avant / maintenant (2026-10-07)

Détail des constats : `AMELIORATIONS_OUTIL_3_4.md` (191 constats sur 204 traités). Revue de design : `REVUE_DESIGN_OUTIL_3_4.md`. Besoin validé : `BESOIN_OUTIL_3_4.md`.

## Avant
- Un registre de commandes avec contrôle à quelques jalons, une libération, une réception et un PV imprimé.
- Code : 4 fichiers de domaine (≈ 480 lignes) et un écran de 223 lignes ; 10 tests.
- Montants et notion de facturation dans l'outil ; PV réécrivable après signature sans trace ; aucune preuve d'intégrité ; une signature pouvait disparaître à la fusion de deux copies ; écran de terrain pensé pour un bureau.

## Maintenant
**Fonctions** : commande avec modèle de jalons, contrôle jalon par jalon en plein écran (mesures et bornes, photos, second contrôleur), libération par une personne nommée ou par dérogation motivée, contrôle de départ, livraisons partielles (lots clos), réserves avec échéance et levée prouvée, réception sur place en 6 étapes avec signature du client puis de l'entreprise, PV signé et scellé (SHA-256) que seule la correction motivée peut changer, PV à l'écran, en impression et en PDF, fiche suiveuse à QR, dossier de preuve, file « À faire », registre à filtres et recherche, liens avec 2.1, 2.3, 2.4, 5.1, 1.3, 3.3 et 3.2, exemple fictif qui se renouvelle sans écraser le travail de l'entreprise. Aucun montant ; la règle 95/5 reste une simple mention de clause.
**Preuve** : gestes de preuve toujours rattachés à une personne ; journal dont les lignes de preuve ne sont jamais rognées ; scellé modifié visible partout ; fusion de deux copies sans perdre une signature ; numéros de PV qui ne redescendent jamais, doublons dits en faits.
**Terrain** : réponses fixes en bas de l'écran, annulation au pouce, brouillons enregistrés (fermeture, changement d'outil, arrière-plan), fenêtres qui prennent le focus, textes à 12 px et plus, cibles de 44 px, un mot par notion.
**Vitesse** : une frappe dans les réglages de 236 à 4 ms, la recherche de 37 à 4,8 ms, une écriture à 300 commandes de 117 à 15 ms.
**Code** : 10 fichiers de domaine ≈ 2 400 lignes et 17 fichiers d'écran ≈ 4 600 lignes (avant : 4 et 1, ≈ 700 lignes), plus aucun import d'écran vers 3.3 ou 3.2 ; quatre lectures du domaine de ces outils restent déclarées (`sopCfg`, `sopPhase`, `calibrationsDue`, `kindOf`) ; cycle d'imports cassé.
**Tests** : ≈ 950 tests pour 3.4 (avant : 10), 2 656 pour l'application ; tests d'interface joués dans un DOM simulé ; mutations vérifiées sur les règles de preuve.

## Pas fait, ou pas vérifiable
- Données personnelles (G-16) : aucun code, question juridique en attente.
- T-12 (ESLint), T-13 (indices stricts), T-14 (tests comme barrière de build), T-15 (fichiers longs), A-20 (annulation de 8 s commune à 3.2 et 3.3), F-13 (fichier unique de 2 Mo), F-14 (hypothèse non mesurée) : volontairement laissés. E-17 (textes de cartes plus grands encore) et E-19 (une seule trame fiche / plein écran) : à décider.
- Non vérifiés : vrai doigt, gants, appareils réels (Safari iOS, clavier virtuel), lecteurs d'écran, papier réel, dossier partagé en navigateur réel (couvert par tests sur dossier simulé), RGPD.
- Rien n'est commité.
