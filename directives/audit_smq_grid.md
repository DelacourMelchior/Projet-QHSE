# Directive : Grille d'Audit SMQ & Performance (ISO 9001 × 3 Piliers Delacour)

## Objectif
Générer et maintenir la grille d'audit du Système de Management de la Qualité (SMQ) fusionnant les exigences ISO 9001:2015 (Clauses 4 à 10) et les 3 Piliers du Cabinet Delacour (Risques, Processus, Data), structurée par **5 Sessions Métiers** et en **3 Temps** (Pré-audit 30%, Terrain 50%, Restitution 20%).

## Entrées
- Grille matricielle au format Markdown ([GRILLE_AUDIT_SMQ_DELACOUR.md](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/GRILLE_AUDIT_SMQ_DELACOUR.md)).
- Documents de pré-audit client (voir `directives/pre_audit_checklist.md`).
- Saisie des notes (0 à 3) par session métier lors des entretiens.

## Outils / Scripts à Utiliser
- `execution/generate_audit_grid.py` : Script Python générant le fichier `.csv` / `.xlsx` multi-onglets complet avec tri par Session Métier, indexation ISO 9001 et synthèse automatique par Pilier Delacour.

## 5 Sessions Métiers Terrain
1. **👔 Session 1 : Direction & Pilotage Stratégique** (Clauses 4.1, 4.3, 5.1, 5.2, 6.1, 6.2, 9.3).
2. **💼 Session 2 : Commercial, Offre & Approvisionnements** (Clauses 4.2, 8.2, 8.4, 9.1.2).
3. **⚙️ Session 3 : Opérations, Production & Qualité Terrain** (Clauses 7.1, 7.5, 8.1, 8.3, 8.5, 8.6, 8.7, 10.2).
4. **👥 Session 4 : RH, Compétences & Souveraineté du Savoir** (Clauses 5.3, 7.2, 7.3, 7.4).
5. **📊 Session 5 : Data, IT & Agilité Décisionnelle** (Clauses 4.4, 6.3, 9.1, 9.2, 10.1, 10.3).

## Sorties Attendues
- Fichier `.tmp/grille_audit_smq_delacour.csv` / `.xlsx` structuré pour une saisie directe sans double travail.
- Registre des Vulnérabilités Majeures ("Points Rouges 48h") et Synthèse par Pilier pour la séance de clôture.
