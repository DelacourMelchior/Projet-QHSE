import os

md_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_2_VENTES_MARGES_ACHATS/MD"
os.makedirs(md_dir, exist_ok=True)

start_here_md = """# 🧭 GUIDE DE DÉMARRAGE CLIENT AUTONOME — SÉQUENCE 2 : VENTES, MARGES & ACHATS
> **Cabinet Delacour - Kit d'Outils Qualité & Performance**

Bienvenue dans votre Kit d'Outils Qualité **Séquence 2**. Cette séquence sécurise le cœur financier de votre entreprise : la rentabilité brute de vos devis et la fiabilité de vos fournisseurs et sous-traitants.

---

## 🎯 VOTRE PARCOURS EN 3 JOURS

### 📍 JOUR 1 : SÉCURISATION DES DEVIS & CONTRATS (25 MIN)
- **Objectif** : Imposer une revue systématique des offres > 10k€ pour ne signer aucune affaire à perte.
- **Fichier à utiliser** : `OUTIL_08_REVUE_DEVIS_CONTRATS.docx`

### 📍 JOUR 2 : HOMOLOGATION & ÉVALUATION FOURNISSEURS (20 MIN)
- **Objectif** : Noter vos 3 principaux fournisseurs et sous-traitants d'achats critiques sur des faits réels.
- **Fichier à utiliser** : `OUTIL_09_EVALUATION_FOURNISSEURS.docx`

### 📍 JOUR 3 : TRAITEMENT RÉCLAMATIONS & ENQUÊTE NPS (20 MIN)
- **Objectif** : Accuser réception de toute réclamation sous 24h et mesurer votre score NPS client.
- **Fichier à utiliser** : `OUTIL_10_RECLAMATIONS_NPS_CLIENT.docx`

---

## 📂 ARCHIVAGE GED
Enregistrer vos grilles complétées et signées dans votre arborescence sous `02_VENTES_MARGES_ACHATS/`.
"""

outil_08_md = """# 📋 OUTIL 08 : GRILLE DE REVUE DE DEVIS, OFFRES & CONTRATS
> **Clause ISO 9001:2015 - 8.2 — Question Q8**

## 💡 CONSEILS CONSULTANT
Exigez une validation formelle avant la signature de tout devis > 10 000 € ou présentant une exigence technique spécifique. Ne signez aucune affaire en dessous de votre seuil de marge brute cible (35%).

---

## 🔍 CHECKLIST DE VALIDATION OBLIGATOIRE (PRÊTE À REMPLIR)

| N° | Point de Contrôle Stratégique | Exigence / Seuil de Sécurité Target | Validé (Oui/Non) | Risque Identifié si Non Conforme | Action Corrective / Révision | Responsable |
| :-: | :--- | :--- | :-: | :--- | :--- | :--- |
| **1** | **Seuil de Marge Brute Minimum** | Marge Brute HT ≥ 35 % du montant total | Oui | Vente à perte, dégradation EBE | Réviser chiffrage ou refuser | Dir. Commercial |
| **2** | **Faisabilité Technique BE/Atelier** | Outillage disponible & tolérances réalisables | Oui | Rebuts massifs, impasse prod | Validation formelle BE/Prod | Chef Prod |
| **3** | **Délais de Livraison Promis** | Planning machines & heures atelier disponibles | Oui | Pénalités de retard (5%/jour) | Ajuster la date promise (+15j) | Resp. Planning |
| **4** | **Conditions de Paiement & Acompte** | Acompte 30% à la commande + encours sain | Oui | Trou de trésorerie, impayé | Conditionner le lancement | RAF / DG |
| **5** | **Exigences Spécifiques & Pénalités** | Certificats 3.1 & pénalités plafonnées ≤5% | Oui | Pénalités illimitées, blocage | Négocier plafonnement pénalités | Dir. Commercial |

---

## 📊 REGISTRE DES DEVIS ET CONTRATS REVUS & VALIDÉS

| N° Devis | Nom Client | Montant HT (€) | Marge Brute % | Faisabilité Validée | Visa Commercial | Visa Prod / DG | Statut Affaire |
| :--- | :--- | :-: | :-: | :--- | :--- | :--- | :--- |
| **DEV-2026-089** | Client Grand Compte ALFA | 45 000 € | 38.5 % | Conforme BE | V. Commercial | V. Dir. Prod | Validé & Signé |
| **DEV-2026-092** | Client Groupe BETA | 18 500 € | 32.0 % | Sous réserve | V. Commercial | Attente Acompte | En révision tarif |
| **DEV-2026-095** | Client Société GAMMA | 62 000 € | 41.0 % | Conforme BE | V. Commercial | V. DG | Validé & Signé |
"""

outil_09_md = """# 🚚 OUTIL 09 : GRILLE D'ÉVALUATION & HOMOLOGATION DES FOURNISSEURS
> **Clause ISO 9001:2015 - 8.4 — Question Q9**

## 💡 CONSEILS CONSULTANT
Évaluez vos fournisseurs sur des critères factuels mesurés (Taux de respect des délais OTD et Taux de non-conformité FNC). Un fournisseur non évalué est une menace directe sur votre chaîne de fabrication.

---

## 📊 BARÈME D'ÉVALUATION & REGISTRE DES FOURNISSEURS AGRÉÉS

| Nom Fournisseur / Sous-Traitant | Famille d'Achat | Note Qualité /8 | Note Délais /8 | Note Service /4 | Note Totale /20 | Statut d'Agrément | Plan d'Action Exigé | Responsable |
| :--- | :--- | :-: | :-: | :-: | :-: | :---: | :--- | :--- |
| **Fournisseur Métaux ACIER-X** | Matières Premières Aciers | 7.8 | 7.6 | 3.6 | **19.0 / 20** | **Agréé (A)** | Maintenir le volume d'achat | Resp. Achats |
| **Sous-traitant Usinage USIN-PRO** | Usinage Spécifique BE | 6.2 | 5.8 | 2.5 | **14.5 / 20** | **Sous Surveillance (B)** | Audit sur site sous 30j | Resp. QSE / Achats |
| **Transporteur CHRONO-EXPRESS** | Transport & Logistique | 7.5 | 7.4 | 3.5 | **18.4 / 20** | **Agréé (A)** | Renouvellement contrat | Resp. Logistique |
"""

outil_10_md = """# 🎯 OUTIL 10 : REGISTRE DES RÉCLAMATIONS CLIENTS & ENQUÊTE NPS
> **Clauses ISO 9001:2015 - 8.2.1 & 9.1.2 — Question Q10**

## 💡 CONSEILS CONSULTANT
Une réclamation client prise en charge et résolue sous 24 heures transforme un client mécontent en ambassadeur fidèle de votre entreprise. Ne masquez pas les litiges : traitez-les avec rigueur !

---

## 📋 REGISTRE CENTRALISÉ DES RÉCLAMATIONS CLIENTS

| N° RC | Date | Nom Client | Description du Litige | Coût (€) | Accusé <24h | Action Corrective Déployée | Clôture | Responsable |
| :--- | :-: | :--- | :--- | :-: | :-: | :--- | :-: | :--- |
| **RC-2026-01** | 12/01 | Client Grand Compte ALFA | Défaut de bavure lot 500 pcs | 1 200 € | Oui (H+4) | Reprise atelier + remplacement 48h | Oui | Resp. QSE / Prod |
| **RC-2026-02** | 28/01 | Client Groupe BETA | Retard livraison 24h transporteur | 0 € | Oui (H+2) | Changement de transporteur | Oui | Resp. Logistique |
| **RC-2026-03** | 05/02 | Client Société GAMMA | Erreur étiquetage carton | 350 € | Oui (H+6) | Étiquette code-barres automatique | Oui | Resp. Expédition |

---

## 📈 SUIVI DU NET PROMOTER SCORE (NPS CLIENT)

| Période / Trimestre | Nb Envois | Nb Réponses | Promoteurs (9-10) | Neutres (7-8) | Détracteurs (0-6) | Score NPS Net | Plan d'Amélioration Associé |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :--- |
| **Trimestre 1 (T1 2026)** | 45 | 32 | 20 (62.5%) | 9 (28.1%) | 3 (9.4%) | **+ 53** | Optimiser les délais de chiffrage |
| **Trimestre 2 (T2 2026)** | 50 | 38 | 26 (68.4%) | 9 (23.7%) | 3 (7.9%) | **+ 60** | Objectif NPS > 50 maintenu |
"""

with open(os.path.join(md_dir, "START_HERE_SEQUENCE_2.md"), "w", encoding="utf-8") as f:
    f.write(start_here_md)

with open(os.path.join(md_dir, "OUTIL_08_REVUE_DEVIS_CONTRATS.md"), "w", encoding="utf-8") as f:
    f.write(outil_08_md)

with open(os.path.join(md_dir, "OUTIL_09_EVALUATION_FOURNISSEURS.md"), "w", encoding="utf-8") as f:
    f.write(outil_09_md)

with open(os.path.join(md_dir, "OUTIL_10_RECLAMATIONS_NPS_CLIENT.md"), "w", encoding="utf-8") as f:
    f.write(outil_10_md)

print("Successfully updated detailed Markdown files for Sequence 2!")
