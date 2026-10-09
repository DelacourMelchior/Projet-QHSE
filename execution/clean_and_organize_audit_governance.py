#!/usr/bin/env python3
"""
Script de Nettoyage et d'Organisation Impeccable du Dossier 00_AUDIT_ET_GOUVERNANCE
Règles :
1. Suppression de tous les fichiers temporaires/obsolètes à la racine (.html, .md loose, .DS_Store).
2. Suppression des sous-dossiers redondants (MD/, HTML/, DOCX/, EXCEL_CSV/).
3. Compartimentage propre des livrables clients dans 4 sous-dossiers thématiques officiels :
   - 01_VENTE_ET_FACTURATION
   - 02_CADRAGE_ET_PRE_AUDIT
   - 03_INTERVENTION_SUR_SITE_JOUR_J
   - 04_RESTITUTION_ET_GOUVERNANCE
"""

import os
import shutil

BASE_DIR = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE"

SUBFOLDERS = {
    "01_VENTE_ET_FACTURATION": [
        "DEVIS_FACTURE_PROFORMA_AUDIT_DELACOUR.docx",
        "FACTURE_ACQUITTEE_AUDIT_DELACOUR.docx"
    ],
    "02_CADRAGE_ET_PRE_AUDIT": [
        "PROCESS_INTEGRAL_AUDIT_SMQ_DELACOUR.docx",
        "TEMPLATE_EMAIL_PREPARATOIRE_PRE_AUDIT_DELACOUR.docx",
        "CHECKLIST_PREPARATOIRE_PRE_AUDIT_DELACOUR.docx",
        "GUIDE_METHODOLOGIQUE_EXPLOITATION_PRE_AUDIT_DELACOUR.docx"
    ],
    "03_INTERVENTION_SUR_SITE_JOUR_J": [
        "SLIDES_REUNION_OUVERTURE_DELACOUR.docx",
        "GRILLE_D_AUDIT_SMQ_DELACOUR.docx",
        "GRILLE_D_AUDIT_SMQ_DELACOUR.csv"
    ],
    "04_RESTITUTION_ET_GOUVERNANCE": [
        "SUPPORT_RESTITUTION_FLASH_DELACOUR.docx",
        "RAPPORT_AUDIT_SMQ_ET_PLAN_D_ACTION_DELACOUR.docx",
        "GUIDE_DEPLOIEMENT_ET_GOUVERNANCE_DELACOUR.docx",
        "PLANNING_GANTT_DEPLOIEMENT_DELACOUR.csv"
    ]
}

def clean_and_organize():
    if not os.path.exists(BASE_DIR):
        print(f"Erreur : Le dossier {BASE_DIR} n'existe pas.")
        return

    # 1. Ensure official subfolders exist
    for subfolder in SUBFOLDERS.keys():
        os.makedirs(os.path.join(BASE_DIR, subfolder), exist_ok=True)

    # 2. Remove redundant technical subfolders (MD/, HTML/, DOCX/, EXCEL_CSV/)
    redundant_dirs = ["MD", "HTML", "DOCX", "EXCEL_CSV"]
    for rdir in redundant_dirs:
        target_path = os.path.join(BASE_DIR, rdir)
        if os.path.exists(target_path):
            shutil.rmtree(target_path)
            print(f"🗑️ Dossier technique nettoyé : {rdir}/")

    # 3. Clean root files except START_HERE
    root_items = os.listdir(BASE_DIR)
    for item in root_items:
        item_path = os.path.join(BASE_DIR, item)
        if os.path.isfile(item_path):
            if item.startswith(".DS_Store"):
                os.remove(item_path)
            elif item != "START_HERE_00_AUDIT_ET_GOUVERNANCE.md" and not os.path.isdir(item_path):
                # Check if it's a file that belongs in a subfolder or should be removed
                filename = os.path.basename(item_path)
                moved = False
                for subfolder, files in SUBFOLDERS.items():
                    if filename in files:
                        target_file = os.path.join(BASE_DIR, subfolder, filename)
                        if not os.path.exists(target_file):
                            shutil.move(item_path, target_file)
                            print(f"📦 Rangé : {filename} ➔ {subfolder}/")
                        else:
                            os.remove(item_path)
                        moved = True
                        break
                if not moved:
                    os.remove(item_path)
                    print(f"🗑️ Fichier temporaire supprimé : {filename}")

    # 4. Remove any unwanted Gantt formats (.xlsx, .xls, .html, .docx) from 04_RESTITUTION_ET_GOUVERNANCE
    res_dir = os.path.join(BASE_DIR, "04_RESTITUTION_ET_GOUVERNANCE")
    if os.path.exists(res_dir):
        for f in os.listdir(res_dir):
            if f.startswith("PLANNING_GANTT_DEPLOIEMENT_DELACOUR") and not f.endswith(".csv"):
                os.remove(os.path.join(res_dir, f))
                print(f"🗑️ Gantt obsolète nettoyé : {f}")

    print("\n✨ Dossier 00_AUDIT_ET_GOUVERNANCE impeccablement nettoyé et structuré !")

if __name__ == "__main__":
    clean_and_organize()
