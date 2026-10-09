#!/usr/bin/env python3
"""
Aplatit l'arborescence de OUTILS_QUALITE_DELACOUR :
Déplace tous les fichiers .docx et .csv directement à la racine de leur sous-dossier de séquence.
Supprime les sous-dossiers inutiles DOCX/, EXCEL_CSV/ et les anciens dossiers obsolètes comme MANUEL_ET_GOUVERNANCE.
"""

import os
import shutil

base_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR"

# Delete legacy MANUEL_ET_GOUVERNANCE if exists
legacy_manuel = os.path.join(base_dir, "MANUEL_ET_GOUVERNANCE")
if os.path.exists(legacy_manuel):
    shutil.rmtree(legacy_manuel)
    print(f"Ancien dossier obsolète supprimé : {legacy_manuel}")

subdirs = [
    "00_AUDIT_ET_GOUVERNANCE",
    "SEQUENCE_1_STRATEGIE_ET_PILOTAGE",
    "SEQUENCE_2_VENTES_MARGES_ACHATS",
    "SEQUENCE_3_OPERATIONS_ATELIER_QUALITE",
    "SEQUENCE_4_RH_SAVOIR_GED_IT",
    "OUTILS_ANNEXES_TRANSVERSAUX"
]

for s in subdirs:
    target_dir = os.path.join(base_dir, s)
    if os.path.exists(target_dir):
        # Move files from DOCX subfolder to parent target_dir
        docx_sub = os.path.join(target_dir, "DOCX")
        if os.path.exists(docx_sub):
            for f in os.listdir(docx_sub):
                src = os.path.join(docx_sub, f)
                dst = os.path.join(target_dir, f)
                if os.path.isfile(src):
                    shutil.move(src, dst)
            shutil.rmtree(docx_sub)
            print(f"Sous-dossier supprimé : {docx_sub}")

        # Move files from EXCEL_CSV subfolder to parent target_dir
        csv_sub = os.path.join(target_dir, "EXCEL_CSV")
        if os.path.exists(csv_sub):
            for f in os.listdir(csv_sub):
                src = os.path.join(csv_sub, f)
                dst = os.path.join(target_dir, f)
                if os.path.isfile(src):
                    shutil.move(src, dst)
            shutil.rmtree(csv_sub)
            print(f"Sous-dossier supprimé : {csv_sub}")

print("✅ Arborescence aplatie et nettoyée !")
