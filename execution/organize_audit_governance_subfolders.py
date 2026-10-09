#!/usr/bin/env python3
"""
Organise le dossier 00_AUDIT_ET_GOUVERNANCE en 4 sous-dossiers thématiques très clairs :
1. 01_VENTE_ET_FACTURATION
2. 02_CADRAGE_ET_PRE_AUDIT
3. 03_INTERVENTION_SUR_SITE_JOUR_J
4. 04_RESTITUTION_ET_GOUVERNANCE
Génère également un fichier index d'orientation START_HERE_00_AUDIT_ET_GOUVERNANCE.md.
"""

import os
import shutil

audit_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE"

folder_map = {
    "01_VENTE_ET_FACTURATION": [
        "DEVIS_FACTURE_PROFORMA_AUDIT_DELACOUR.docx",
        "FACTURE_ACQUITTEE_AUDIT_DELACOUR.docx"
    ],
    "02_CADRAGE_ET_PRE_AUDIT": [
        "TEMPLATE_EMAIL_PREPARATOIRE_PRE_AUDIT_DELACOUR.docx",
        "CHECKLIST_PREPARATOIRE_PRE_AUDIT_DELACOUR.docx",
        "GUIDE_METHODOLOGIQUE_EXPLOITATION_PRE_AUDIT_DELACOUR.docx",
        "PROCESS_INTEGRAL_AUDIT_SMQ_DELACOUR.docx"
    ],
    "03_INTERVENTION_SUR_SITE_JOUR_J": [
        "SLIDES_REUNION_OUVERTURE_DELACOUR.docx",
        "GRILLE_D_AUDIT_SMQ_DELACOUR.docx",
        "GRILLE_D_AUDIT_SMQ_DELACOUR.csv",
        "SUPPORT_RESTITUTION_FLASH_DELACOUR.docx"
    ],
    "04_RESTITUTION_ET_GOUVERNANCE": [
        "RAPPORT_AUDIT_SMQ_ET_PLAN_D_ACTION_DELACOUR.docx",
        "GUIDE_DEPLOIEMENT_ET_GOUVERNANCE_DELACOUR.docx"
    ]
}

# Create subfolders and move files
for subfolder, files in folder_map.items():
    subpath = os.path.join(audit_dir, subfolder)
    os.makedirs(subpath, exist_ok=True)
    for filename in files:
        src = os.path.join(audit_dir, filename)
        dst = os.path.join(subpath, filename)
        if os.path.exists(src):
            shutil.move(src, dst)
            print(f"Déplacé : {filename} -> {subfolder}/")
        elif not os.path.exists(dst):
            print(f"⚠️ Fichier non trouvé : {filename}")

# Generate START_HERE_00_AUDIT_ET_GOUVERNANCE.md at root of 00_AUDIT_ET_GOUVERNANCE
start_here_content = """# 🏛️ DOSSIER MAÎTRE : AUDIT, DIAGNOSTIC & GOUVERNANCE SMQ
> **Cabinet Delacour - Kit Complet d'Intervention Audit High-Ticket (11 Livrables Maîtres)**

Ce dossier regroupe l'ensemble des supports nécessaires pour vendre, préparer, exécuter et restituer un Audit SMQ selon la méthode du Cabinet Delacour.

---

## 📂 ORGANISATION THÉMATIQUE DES SOUS-DOSSIERS :

### 💳 **[`01_VENTE_ET_FACTURATION/`](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/01_VENTE_ET_FACTURATION/)**
- [📄 Devis & Facture Pro Forma (100% à la commande)](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/01_VENTE_ET_FACTURATION/DEVIS_FACTURE_PROFORMA_AUDIT_DELACOUR.docx)
- [📄 Facture Définitive Acquittée (Après virement)](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/01_VENTE_ET_FACTURATION/FACTURE_ACQUITTEE_AUDIT_DELACOUR.docx)

### 📋 **[`02_CADRAGE_ET_PRE_AUDIT/`](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/02_CADRAGE_ET_PRE_AUDIT/)**
- [📄 Email Universel de Cadrage (Sans pièce jointe)](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/02_CADRAGE_ET_PRE_AUDIT/TEMPLATE_EMAIL_PREPARATOIRE_PRE_AUDIT_DELACOUR.docx)
- [📄 Checklist Préparatoire Client (5 pièces clés)](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/02_CADRAGE_ET_PRE_AUDIT/CHECKLIST_PREPARATOIRE_PRE_AUDIT_DELACOUR.docx)
- [📄 Guide d'Exploitation Off-Site Consultant](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/02_CADRAGE_ET_PRE_AUDIT/GUIDE_METHODOLOGIQUE_EXPLOITATION_PRE_AUDIT_DELACOUR.docx)
- [📄 Processus d'Intervention Audit (4 Phases)](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/02_CADRAGE_ET_PRE_AUDIT/PROCESS_INTEGRAL_AUDIT_SMQ_DELACOUR.docx)

### ⏱️ **[`03_INTERVENTION_SUR_SITE_JOUR_J/`](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/03_INTERVENTION_SUR_SITE_JOUR_J/)**
- [📄 Diaporama Réunion d'Ouverture (08h30)](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/03_INTERVENTION_SUR_SITE_JOUR_J/SLIDES_REUNION_OUVERTURE_DELACOUR.docx)
- [📄 Grille d'Audit SMQ & Diagnostic (Word)](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/03_INTERVENTION_SUR_SITE_JOUR_J/GRILLE_D_AUDIT_SMQ_DELACOUR.docx)
- [📊 Grille d'Audit & Calculs CNQ (CSV)](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/03_INTERVENTION_SUR_SITE_JOUR_J/GRILLE_D_AUDIT_SMQ_DELACOUR.csv)
- [📄 Support Restitution Flash à chaud (14h30)](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/03_INTERVENTION_SUR_SITE_JOUR_J/SUPPORT_RESTITUTION_FLASH_DELACOUR.docx)

### 📊 **[`04_RESTITUTION_ET_GOUVERNANCE/`](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/04_RESTITUTION_ET_GOUVERNANCE/)**
- [📄 Rapport d'Audit Complet & Plan d'Action (J+5)](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/04_RESTITUTION_ET_GOUVERNANCE/RAPPORT_AUDIT_SMQ_ET_PLAN_D_ACTION_DELACOUR.docx)
- [📄 Manuel de Déploiement & Gouvernance SMQ](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/04_RESTITUTION_ET_GOUVERNANCE/GUIDE_DEPLOIEMENT_ET_GOUVERNANCE_DELACOUR.docx)
"""

start_here_path = os.path.join(audit_dir, "START_HERE_00_AUDIT_ET_GOUVERNANCE.md")
with open(start_here_path, 'w', encoding='utf-8') as f:
    f.write(start_here_content)

print("✅ Dossier 00_AUDIT_ET_GOUVERNANCE compartimenté en 4 sous-dossiers thématiques avec succès !")
