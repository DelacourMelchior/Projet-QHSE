import os

md_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_4_RH_SAVOIR_GED_IT/MD"
os.makedirs(md_dir, exist_ok=True)

md_files_full = {
    "START_HERE_SEQUENCE_4.md": """# 🧭 GUIDE DE DÉMARRAGE CLIENT AUTONOME — SÉQUENCE 4 : RH, GED, IT & AMÉLIORATION
> **Cabinet Delacour - Kit d'Outils Qualité & Performance Opérationnelle**

Bienvenue dans votre Kit d'Outils Qualité **Séquence 4**. Cette séquence protège le capital humain de votre entreprise, élimine la dépendance aux hommes-clés et déploie le pilotage automatique par la data.

---

## 🎯 VOTRE PARCOURS EN 5 JOURS

### 📍 JOUR 1 : ORGANIGRAMME & MATRICE RACI (30 MIN)
- **Objectif** : Définir les rôles et attribuer les responsabilités RACI.
- **Fichier** : `OUTIL_20_ORGANIGRAMME_RACI.docx`

### 📍 JOUR 2 : CONDUITE DU CHANGEMENT & POLYVALENCE (25 MIN)
- **Objectif** : Établir la matrice des compétences et le plan de transition.
- **Fichiers** : `OUTIL_21_CONDUITE_DU_CHANGEMENT.docx` & `OUTIL_22_MATRICE_COMPETENCES_POLYVALENCE.docx`

### 📍 JOUR 3 : LIVRET ACCUEIL & RÉUNIONS FLASH 5 MIN (25 MIN)
- **Objectif** : Sensibiliser aux coûts NC et lancer le rituel d'équipe.
- **Fichiers** : `OUTIL_23_LIVRET_ACCUEIL_SENSIBILISATION_NC.docx` & `OUTIL_24_REUNION_FLASH_COMMUNICATION.docx`

### 📍 JOUR 4 : ARBORESCENCE GED & DASHBOARD KPIS (25 MIN)
- **Objectif** : Normaliser le plan de classement et les indicateurs.
- **Fichiers** : `OUTIL_25_ARBORESCENCE_GED_SIMPLIFIEE.docx` & `OUTIL_26_DASHBOARD_KPIS_AUTOMATISE.docx`

### 📍 JOUR 5 : PROGRAMME & TRAME D'AUDIT INTERNE (25 MIN)
- **Objectif** : Planifier le programme annuel d'audit et la grille.
- **Fichier** : `OUTIL_27_PLANNING_TRAME_AUDIT_INTERNE.docx`
""",

    "OUTIL_20_ORGANIGRAMME_RACI.md": """# 👥 OUTIL 20 : ORGANIGRAMME FONCTIONNEL & MATRICE RACI GLOBALE
> **Clause ISO 9001:2015 - 5.3 — Question Q20**

## 💡 CONSEILS CONSULTANT
Supprimez les zones d'ombre sur la responsabilité des tâches métiers ! Utilisez la matrice RACI (Responsible, Accountable, Consulted, Informed) pour désigner un Approbateur unique (A) par tâche.

---

## 📊 MATRICE RACI GLOBALE DES PROCESSUS MÉRIRS

| Tâche Métier / Processus | DG | Resp. Commercial | Resp. BE | Resp. Achats | Resp. Prod | Resp. QSE |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: |
| **1. Revue & Signature Devis > 10k€** | **A** | **R** | C | I | C | I |
| **2. Validation Plans 3D & Jalons BE** | I | I | **A / R** | C | C | C |
| **3. Évaluation & Agrément Fournisseurs** | I | I | I | **A / R** | C | C |
| **4. Lancement Fabrication & Suivi OF** | I | I | I | I | **A / R** | I |
| **5. Libération Produit & PV Recette** | I | I | I | I | R | **A** |
| **6. Traitement Réclamation & FNC** | I | C | C | C | R | **A** |
| **7. Revue de Direction & Objectifs** | **A / R** | C | C | C | C | R |
""",

    "OUTIL_21_CONDUITE_DU_CHANGEMENT.md": """# 🚀 OUTIL 21 : PLAN DE CONDUITE DU CHANGEMENT
> **Clause ISO 9001:2015 - 6.3 — Question Q21**

## 💡 CONSEILS CONSULTANT
Anticipez les risques humains, techniques et organisationnels lors des évolutions d'outils ERP, réorganisations d'ateliers ou déménagements.

---

## 📋 GRILLE DE PILOTAGE DU PLAN DE CONDUITE DU CHANGEMENT

| Axe de Changement | Description de l'Évolution | Risque Identifié / Frein Humain | Action d'Accompagnement & Formation | Responsable | Échéance | Statut |
| :--- | :--- | :--- | :--- | :--- | :-: | :-: |
| **Outil IT** | Déploiement du nouvel ERP Prod | Peur de la complexité de saisie | Formation 4h + Tuteur dédié | Resp. IT / Prod | 15/03/2026 | En cours |
| **Organisation** | Passage au rituel Réunion Flash | Perception de perte de temps | Animation par exemple DG + Fiche | Resp. QSE | 01/02/2026 | Validé |
| **Atelier** | Zone Quarantaine NC | Refus d'avouer les pièces NC | Sensibilisation zéro punition | Chef Prod | 10/02/2026 | Validé |
""",

    "OUTIL_22_MATRICE_COMPETENCES_POLYVALENCE.md": """# 🎓 OUTIL 22 : MATRICE DES COMPÉTENCES & POLYVALENCE
> **Clause ISO 9001:2015 - 7.2 — Question Q22**

## 💡 CONSEILS CONSULTANT
Supprimez définitivement la vulnérabilité liée à l'homme-clé ! Évaluez la polyvalence sur chaque poste stratégique et organisez des binômes formés.

---

## 📊 MATRICE CROISÉE DE POLYVALENCE ET GESTION DES BINÔMES

| Nom du Salarié | Poste Principal | Usinage CNC | Soudure TIG | Prog. BE | Contrôle 3D | Binôme Référent Désigné |
| :--- | :--- | :-: | :-: | :-: | :-: | :--- |
| **M. DUPONT Jean** | Opérateur Usinage | **Niveau 4** | Niveau 1 | Niveau 2 | **Niveau 3** | Binôme avec J. MARTIN |
| **J. MARTIN Paul** | Opérateur Usinage | **Niveau 3** | Niveau 1 | Niveau 1 | Niveau 2 | Binôme avec M. DUPONT |
| **R. QSE Pierre** | Resp. Qualité | Niveau 1 | Niveau 1 | Niveau 2 | **Niveau 4** | Binôme avec M. DUPONT |
| **L. SOUDURE Marc** | Soudeur TIG | Niveau 1 | **Niveau 4** | Niveau 1 | Niveau 2 | **FORMATION REQUISE (Homme-Clé)** |
""",

    "OUTIL_23_LIVRET_ACCUEIL_SENSIBILISATION_NC.md": """# 📘 OUTIL 23 : LIVRET D'ACCUEIL SALARIÉ & SENSIBILISATION NC
> **Clause ISO 9001:2015 - 7.3 — Question Q23**

## 💡 CONSEILS CONSULTANT
Sensibilisez immédiatement chaque nouveau collaborateur dès son premier jour à l'impact financier direct des erreurs et du gaspillage.

---

## 📋 ATTESTATION DE REMISE DU LIVRET ET CAUSERIE COÛTS NC

| Nom du Salarié | Poste Occupé | Date d'Arrivée | Tuteur Désigné | Causerie Coûts NC | Consignes Sécurité | Visas |
| :--- | :--- | :-: | :--- | :-: | :-: | :-: |
| **M. NOUVEAU Thomas** | Opérateur Usinage CNC | 01/02/2026 | M. DUPONT Jean | Oui (Causerie 30 min) | Oui (EPI remis) | Visé |
| **J. INTERIM Lucas** | Agent d'Expédition | 10/02/2026 | P. LEROY | Oui (Causerie 30 min) | Oui (EPI remis) | Visé |
""",

    "OUTIL_24_REUNION_FLASH_COMMUNICATION.md": """# ⏱️ OUTIL 24 : TRAME DE RÉUNION FLASH (5 MIN) & COMMUNICATION
> **Clause ISO 9001:2015 - 7.4 — Question Q24**

## 💡 CONSEILS CONSULTANT
Instaurez le rituel de la Réunion Flash de 5 minutes debout chaque lundi matin pour transmettre l'information essentielle sans bruits de couloir.

---

## 📋 COMPTE-RENDU FLASH ET RELEVÉ DE DÉCISIONS

| Date Réunion | Animateur | Point Sécurité | Point Qualité & NC | Objectifs Prod | Action Retenue | Responsable |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: |
| **02/02/2026** | Chef Prod | Lunettes lors du meulage | RC-2026-01 : vigilance bavure | 120 Pcs à expédier | Loupe au poste ébavurage | Resp. QSE |
| **09/02/2026** | Chef Prod | Rangement câbles au sol | 0 Réclamation cette semaine | 150 Pcs affaire ALFA | Nettoyage arrosage MAC-02 | J. MARTIN |
""",

    "OUTIL_25_ARBORESCENCE_GED_SIMPLIFIEE.md": """# 📁 OUTIL 25 : PLAN DE CLASSEMENT & ARBORESCENCE GED SIMPLIFIÉE
> **Clause ISO 9001:2015 - 7.5 — Question Q25**

## 💡 CONSEILS CONSULTANT
Normalisez le classement de vos fichiers sur votre serveur ou Cloud ! Tout document doit pouvoir être retrouvé en moins de 30 secondes.

---

## 📊 PLAN DE CLASSEMENT STANDARD DE L'ARBORESCENCE GED

| Dossier Racine GED | Sous-Dossier | Contenu & Fichiers Autorisés | Pilote Responsable | Droits d'Accès |
| :--- | :--- | :--- | :--- | :--- |
| **01_DIRECTION_STRATEGIE/** | POLITIQUE_ET_OBJECTIFS/ | SWOT, PESTEL, Politique, PV Revue | Directeur Général | Lecture Tous / Modif DG |
| **02_VENTES_MARGES_ACHATS/** | DEVIS_ET_FOURNISSEURS/ | Revue Devis, Fournisseurs, NPS | Resp. Commercial / Achats | Lecture Tous / Modif Com |
| **03_OPERATIONS_PRODUCTION/** | ATELIER_ET_QUALITE/ | Plans 3D, Gammes, Traçabilité, PV, FNC | Resp. Prod / QSE | Lecture Tous / Modif Prod |
| **04_RH_SAVOIR_GED_IT/** | RH_ET_SYSTEME/ | Organigramme, RACI, Compétences, Audits | Resp. RH / QSE | Lecture Tous / Modif RH |
""",

    "OUTIL_26_DASHBOARD_KPIS_AUTOMATISE.md": """# 📊 OUTIL 26 : SPÉCIFICATIONS & DASHBOARD KPIS AUTOMATISÉ
> **Clause ISO 9001:2015 - 9.1.3 — Question Q26**

## 💡 CONSEILS CONSULTANT
Connectez vos KPIs directement aux données d'origine (Excel dynamique, PowerBI ou ERP) pour un pilotage factuel automatisé.

---

## 📋 SPÉCIFICATIONS DES KPIS AUTOMATISÉS DU DASHBOARD

| Nom KPI | Processus Rattaché | Source de Donnée | Formule de Calcul Exacte | Fréquence | Seuil Vert | Seuil Rouge | Responsable |
| :--- | :--- | :--- | :--- | :-: | :-: | :-: | :-: |
| **1. Marge Brute Globale (%)** | Direction | Export ERP Ventes | (CA HT - Coûts Directs) / CA HT | Mensuelle | ≥ 35 % | < 30 % | RAF / DG |
| **2. Taux de Service OTD (%)** | Logistics | Système Livraisons | (Nb livraisons à date / Total) x 100 | Hebdo | ≥ 95 % | < 90 % | Resp. Log. |
| **3. Conformité Produit (%)** | Fabrication | Registre Autocontrôle | (Nb pièces OK 1er coup / Total) x 100 | Hebdo | ≥ 98 % | < 95 % | Chef Prod |
| **4. NPS Satisfaction Client** | Commercial | Baromètre NPS | % Promoteurs - % Détracteurs | Trimestrielle | ≥ +50 | < +20 | Resp. Com. |
| **5. Résolution FNC < 30j (%)** | Qualité | Registre FNC | (Nb FNC closes < 30j / Total) x 100 | Mensuelle | ≥ 90 % | < 75 % | Resp. QSE |
""",

    "OUTIL_27_PLANNING_TRAME_AUDIT_INTERNE.md": """# 🔍 OUTIL 27 : PROGRAMME ANNUEL & TRAME D'AUDIT INTERNE SMQ
> **Clause ISO 9001:2015 - 9.2 — Question Q27**

## 💡 CONSEILS CONSULTANT
Réalisez un audit interne rigoureux une fois par an pour vérifier la robustesse de votre organisation avant l'audit de certification ISO 9001.

---

## 📋 PROGRAMME ANNUEL DES AUDITS INTERNES DU SMQ

| N° Audit | Processus / Clause Audité | Période Planifiée | Auditeur Désigné | Constats / Écarts | Plan d'Action Correctif | Statut |
| :-: | :--- | :-: | :--- | :--- | :--- | :-: |
| **AUD-2026-01** | Direction & Management (4.1 à 6.2) | Mars 2026 | Auditeur Externe / QSE | 0 NC Majeure / 1 Piste | Optimiser Réunion Flash | Planifié |
| **AUD-2026-02** | Ventes & Achats (8.2 & 8.4) | Mai 2026 | Auditeur Interne Formé | 1 NC Mineure (Fournisseur) | Renseigner Outil 09 | Planifié |
| **AUD-2026-03** | Production & Qualité (8.5 & 8.7) | Septembre 2026 | Auditeur Externe / QSE | 1 NC Mineure (Quarantaine) | Vider zone rouge hebdo | Planifié |
"""
}

for filename, content in md_files_full.items():
    with open(os.path.join(md_dir, filename), "w", encoding="utf-8") as f:
        f.write(content)

print("Successfully generated detailed Markdown files for Sequence 4!")
