import os

md_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_3_OPERATIONS_ATELIER_QUALITE/MD"
os.makedirs(md_dir, exist_ok=True)

md_files_full = {
    "START_HERE_SEQUENCE_3.md": """# 🧭 GUIDE DE DÉMARRAGE CLIENT AUTONOME — SÉQUENCE 3 : OPÉRATIONS & QUALITÉ
> **Cabinet Delacour - Kit d'Outils Qualité & Performance Opérationnelle**

Bienvenue dans votre Kit d'Outils Qualité **Séquence 3**. Cette séquence structure le cœur opérationnel de votre entreprise : de la cartographie des processus et la maintenance préventive jusqu'au traitement des non-conformités par la méthode des 5 Pourquoi.

---

## 🎯 VOTRE PARCOURS EN 5 JOURS

### 📍 JOUR 1 : CARTOGRAPHIE & INTERACTIONS PROCESSUS (30 MIN)
- **Objectif** : Formaliser les processus métiers et la matrice des données inter-services.
- **Fichiers** : `OUTIL_11_CARTOGRAPHIE_PROCESSUS.docx` & `OUTIL_12_INTERACTIONS_INTER_SERVICES.docx`

### 📍 JOUR 2 : MAINTENANCE PRÉVENTIVE & GAMMES VISUELLES (25 MIN)
- **Objectif** : Établir le planning de révision des machines et les fiches réflexes au poste.
- **Fichiers** : `OUTIL_13_MAINTENANCE_PREVENTIVE.docx` & `OUTIL_14_GAMMES_INSTRUCTIONS_VISUELLES.docx`

### 📍 JOUR 3 : JALONS CONCEPTION APQP & TRAÇABILITÉ (25 MIN)
- **Objectif** : Mettre en place la grille de validation BE et les fiches de suivi de lot.
- **Fichiers** : `OUTIL_15_JALONS_CONCEPTION_APQP.docx` & `OUTIL_16_TRAITABILITE_SUIVI_FABRICATION.docx`

### 📍 JOUR 4 : PV DE RECETTE & LIBÉRATION CLIENT (20 MIN)
- **Objectif** : Mettre en œuvre la fiche de contrôle final et d'autorisation de livraison.
- **Fichier** : `OUTIL_17_PV_RECETTE_LIBERATION.docx`

### 📍 JOUR 5 : ISOLEMENT NC & MÉTHODE DES 5 POURQUOI (25 MIN)
- **Objectif** : Délimiter la zone de quarantaine et formaliser le traitement des FNC.
- **Fichiers** : `OUTIL_18_SIGNALETIQUE_ISOLEMENT_NC.docx` & `OUTIL_19_FNC_METHODE_5_POURQUOI.docx`
""",

    "OUTIL_11_CARTOGRAPHIE_PROCESSUS.md": """# 🗺️ OUTIL 11 : CARTOGRAPHIE MACRO DES PROCESSUS & FICHES D'IDENTITÉ
> **Clause ISO 9001:2015 - 4.4 — Question Q11**

## 💡 CONSEILS CONSULTANT
Définissez clairement l'enchaînement de vos activités en 3 familles : Pilotage, Réalisation et Support. Désignez un Pilote unique par processus responsable de la performance et de la mise à jour des indicateurs.

---

## 📊 REGISTRE DES PROCESSUS DE VOTRE ENTREPRISE

| Famille | Nom du Processus | Pilote Officiel | Données Entrantes | Données Sortantes | KPI Clé |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Pilotage** | Management Stratégique & SMQ | Directeur Général | Résultats, Audits | Politique Qualité, PV Revue | Taux Objectifs SMART (%) |
| **Réalisation** | Commercial & Relation Client | Resp. Commercial | Devis, Besoins | Devis signés, Commandes | Taux transformation & NPS |
| **Réalisation** | Bureau d'Études & Conception | Resp. BE | Cahier des charges | Plans Indice A, Nomenclatures | Respect jalons BE (%) |
| **Réalisation** | Achats & Approvisionnements | Resp. Achats | Besoins matières | Matières conformes à date | OTD Fournisseurs (%) |
| **Réalisation** | Fabrication & Atelier | Resp. Production | OF, Plans, Matières | Produits finis contrôlés | Taux conforme 1er coup (%) |
| **Support** | RH & Sécurité | Resp. RH | Besoins compétences | Salariés formés, Polyvalence | Heures formation dispensées |
| **Support** | Maintenance & Équipements | Resp. Maintenance | Demandes, Planning | Machines fonctionnelles | Taux disponibilité (%) |
""",

    "OUTIL_12_INTERACTIONS_INTER_SERVICES.md": """# 🔄 OUTIL 12 : FICHES D'INTERACTIONS INTER-SERVICES
> **Clauses ISO 9001:2015 - 4.4.1 & 8.5.1 — Question Q12**

## 💡 CONSEILS CONSULTANT
Les pertes de temps et les erreurs surviennent au passage de relais entre deux services. Clarifiez la donnée exacte transmise, son format et son délai d'engagement.

---

## 📊 MATRICE DES ÉCHANGES INTER-SERVICES

| Émetteur | Destinataire | Donnée Transmise | Format / Support | Délai Engagé | Critère de Conformité |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Commercial** | Bureau d'Études | Revue devis signée | Fichier PDF GED | Sous 24h | Spécifications complètes |
| **BE** | Achats & Prod | Nomenclature & Plans | Export ERP + STEP | J-15 avant prod | Références cataloguées |
| **Achats** | Production | AR Fournisseur & Matière | Statut ERP + Stock | 48h avant prod | Certificat 3.1 conforme |
| **Production** | Qualité/Expédition | Produit fini + Fiche Lot | Dossier émargé | H-4 avant livraison | 100% cotes contrôlées |
""",

    "OUTIL_13_MAINTENANCE_PREVENTIVE.md": """# 🛠️ OUTIL 13 : PLAN DE MAINTENANCE PRÉVENTIVE
> **Clauses ISO 9001:2015 - 7.1.3 & 8.5.1 — Question Q13**

## 💡 CONSEILS CONSULTANT
Ne subissez plus les pannes brutales ! Formalisez le calendrier de maintenance préventive pour chaque machine stratégique.

---

## 📋 PLANNING ET REGISTRE DE MAINTENANCE

| Code Machine | Nom de l'Équipement | Criticité | Opération Préventive | Périodicité | Prochaine Échéance | Statut |
| :--- | :--- | :-: | :--- | :-: | :-: | :-: |
| **MAC-01** | Centre Usinage 5 Axes CNC | Haute (A) | Vidange huile broche & filtres | Trimestrielle | 15/04/2026 | Conforme |
| **MAC-02** | Tour Numérique Bi-Broche | Haute (A) | Nettoyage arrosage & courroies | Mensuelle | 01/03/2026 | Conforme |
| **COMP-01** | Centrale Air Comprimé | Vitale (S) | Cartouches filtrantes & purge | Semestrielle | 10/05/2026 | Planifié |
| **PONT-01** | Pont Roulant Atelier 5T | Sécurité (S) | Contrôle réglementaire APAVE | Annuelle | 20/06/2026 | Conforme |
""",

    "OUTIL_14_GAMMES_INSTRUCTIONS_VISUELLES.md": """# 👁️ OUTIL 14 : GAMMES OPÉRATOIRES & INSTRUCTIONS VISUELLES
> **Clause ISO 9001:2015 - 8.5.1 — Question Q14**

## 💡 CONSEILS CONSULTANT
Rédigez des consignes visuelles courtes et synthétiques affichées directement au poste de travail (One Point Lesson).

---

## 📌 FICHE INSTRUCTION POSTE DE TRAVAIL (OPL)

| Code Fiche | Poste de Travail | Titre Instruction | Points Clés & Réglages | Visualisation OK/KO |
| :--- | :--- | :--- | :--- | :--- |
| **INS-01** | Usinage CNC 5 Axes | Bridage des Pièces Brut Aciers | Pression étau 80 bar exacts. Soufflette. | Photos OK (plaquage) / KO (copeau) |
| **INS-02** | Soudures TIG/MIG | Contrôle Visuel Cordon Soudure | Pénétration continue sans rochage. | Photos OK (cordon) / KO (porosité) |
| **INS-03** | Emballage / Expédition | Protection Portées de Joint Inox | Bouchon plastique + film étirable. | Photos OK (protégé) / KO (nu) |
""",

    "OUTIL_15_JALONS_CONCEPTION_APQP.md": """# 📐 OUTIL 15 : CHECKLIST DE JALONS DE CONCEPTION (APQP)
> **Clause ISO 9001:2015 - 8.3 — Question Q15**

## 💡 CONSEILS CONSULTANT
Ne lancez aucun produit nouveau en fabrication série sans avoir validé les 4 jalons de conception BE.

---

## 📊 CHECKLIST DE VALIDATION DES JALONS BE -> PROD

| N° Jalon | Nom du Jalon | Livrables Requis | Critère de Réussite | Visas BE / Prod / QSE | Statut |
| :-: | :--- | :--- | :--- | :-: | :-: |
| **Jalon 1** | Faisabilité & Chiffrage | Cahier des charges & Devis Outil 08 | Marge brute prévisionnelle ≥ 35% | Visé | Validé |
| **Jalon 2** | Validation 3D & AMDEC BE | Plans 3D Indice A & Cotation | Zéro interférence 3D | Visé | Validé |
| **Jalon 3** | Prototype & Métrologie | Rapport de contrôle 3D prototype | 100% cotes conformes | Visé | Validé |
| **Jalon 4** | Accord Client & Série | PV accord Échantillons Initiaux (EI) | Acceptation écrite client | Visé | Validé |
""",

    "OUTIL_16_TRAITABILITE_SUIVI_FABRICATION.md": """# 🏷️ OUTIL 16 : FICHE DE SUIVI DE FABRICATION & TRAÇABILITÉ
> **Clause ISO 9001:2015 - 8.5.2 — Question Q16**

## 💡 CONSEILS CONSULTANT
Garantissez une traçabilité totale : du numéro de coulée de la matière première au nom de l'opérateur final.

---

## 📋 DOSSIER DE LOT ET SUIVI DE FABRICATION

| N° Étape | Opération | Machine | N° Lot Matière / Coulée | Qté OK | Cotes Relevées | Opérateur & Date |
| :-: | :--- | :--- | :--- | :-: | :--- | :--- |
| **10** | Débit Tubes Inox | Scie S-01 | Coulée C-88492 (Certif 3.1) | 100 Pcs | L = 1200mm ± 0.5mm | M. DUPONT (10/02) |
| **20** | Usinage CNC Face A | CNC-05 | Coulée C-88492 | 99 Pcs | Ø 45.02mm (Conforme) | J. MARTIN (11/02) |
| **30** | Autocontrôle 3D | Métrologie | Coulée C-88492 | 99 Pcs | Fiche autocontrôle OK | R. QSE (12/02) |
| **40** | Conditionnement | Emballage | Lot LOT-2026-044 | 99 Pcs | Bouchons posés | P. LEROY (12/02) |
""",

    "OUTIL_17_PV_RECETTE_LIBERATION.md": """# ✅ OUTIL 17 : PV DE RECETTE, LIBÉRATION & AUTOCONTRÔLE FINAL
> **Clause ISO 9001:2015 - 8.6 — Question Q17**

## 💡 CONSEILS CONSULTANT
Ne laissez aucun produit quitter votre usine sans la signature du PV de libération finale.

---

## 📋 PROCÈS-VERBAL DE LIBÉRATION FINALE

| Point de Contrôle Final | Spécification Exigée | Valeur Relevée | Appareil Utilisé | Résultat | Visa |
| :--- | :--- | :--- | :--- | :-: | :-: |
| **1. Dimensionnel - Longueur** | 1 500 mm ± 0.2 mm | 1 500.08 mm | Pied à coulisse ER-04 | Conforme | V. QSE |
| **2. Dimensionnel - Alésage** | Ø 50.00 H7 (+0.025/0) | Ø 50.015 mm | Tampon P/NP ER-12 | Conforme | V. QSE |
| **3. Traitement Surface** | Épaisseur 15µm ± 3µm | 16.2 µm | Mesureur épaisseur ER-08 | Conforme | V. QSE |
| **4. Aspect & Ébavurage** | Zéro bavure & rayure | 100% Net | Contrôle sous loupe | Conforme | V. QSE |
""",

    "OUTIL_18_SIGNALETIQUE_ISOLEMENT_NC.md": """# 🛑 OUTIL 18 : SIGNALÉTIQUE & ZONE DE QUARANTAINE NC
> **Clause ISO 9001:2015 - 8.7 — Question Q18**

## 💡 CONSEILS CONSULTANT
Délimitez physiquement une zone rouge au sol avec des bacs rouges 'STOP NC' pour éviter tout mélange.

---

## 📋 REGISTRE DE ZONE DE QUARANTAINE NC

| N° Fiche NC | Date | Désignation Pièce | Quantité | Description Non-Conformité | Décision Commission NC | Visa |
| :--- | :-: | :--- | :-: | :--- | :--- | :-: |
| **NC-2026-12** | 02/02 | Axe Inox Ø 30 L=400 | 5 Pcs | Ø 29.85mm au lieu de 30.00mm | Rebut définitif (Mise au mille) | V. QSE |
| **NC-2026-13** | 05/02 | Carter Aluminium Moulé | 12 Pcs | Bavure sur face d'appui joint | Retouche usinage atelier | V. QSE |
| **NC-2026-14** | 10/02 | Support Acier Peint | 25 Pcs | Épaisseur peinture 60µm (attendu 80) | Dérogation acceptée par client | V. QSE |
""",

    "OUTIL_19_FNC_METHODE_5_POURQUOI.md": """# 🔍 OUTIL 19 : FICHE FNC & ANALYSE PAR LES 5 POURQUOI
> **Clause ISO 9001:2015 - 10.2 — Question Q19**

## 💡 CONSEILS CONSULTANT
Remontez jusqu'à la cause racine organisationnelle par la méthode des 5 Pourquoi pour éradiquer la récidive.

---

## 📋 TRAME DES 5 POURQUOI (ANALYSE DE CAUSE RACINE)

| Étape | Questionnement | Analyse Réelle / Cause Identifiée | Action Corrective Pérenne | Responsable |
| :--- | :--- | :--- | :--- | :--- |
| **Problème** | Quel est le défaut mesuré ? | Défaut cotation Ø 29.85mm sur 5 axes inox | Isolement immédiat en zone rouge | Chef Prod |
| **Pourquoi 1** | Pourquoi la cote est hors tolérance ? | Outil de coupe usé prématurément | Remplacement plaquette d'usinage | Opérateur |
| **Pourquoi 2** | Pourquoi l'outil s'est-il usé si vite ? | Vitesse de coupe programmée trop élevée | Correction du programme CNC | Tech. BE |
| **Pourquoi 3** | Pourquoi la vitesse était trop élevée ? | Paramètre acier doux utilisé au lieu d'inox | Mise à jour bibliothèque outils BE | Resp. BE |
| **Pourquoi 4** | Pourquoi l'erreur a eu lieu ? | Gamme n'indiquait pas la nuance exacte | Champ obligatoire nuance sur l'OF | Resp. QSE |
| **Pourquoi 5** | Pourquoi la gamme ne l'indiquait pas ? | Absence de revue de jalon BE/Prod (Outil 15) | Mise en œuvre Jalon 2 Outil 15 | Dir. Prod |
"""
}

for filename, content in md_files_full.items():
    with open(os.path.join(md_dir, filename), "w", encoding="utf-8") as f:
        f.write(content)

print("Successfully generated detailed Markdown files for Sequence 3!")
