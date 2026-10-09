#!/usr/bin/env python3
"""
Nettoie l'espace OUTILS_QUALITE_DELACOUR en supprimant tous les dossiers et fichiers HTML et MD.
Ne conserve QUE les formats officiels Word (.docx) et Excel/CSV (.csv).
"""

import os
import shutil

base_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR"

# Directories to search and clean
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
        # Remove HTML, MD, MARKDOWN folders
        for folder_name in ["HTML", "MD", "MARKDOWN"]:
            fp = os.path.join(target_dir, folder_name)
            if os.path.exists(fp):
                shutil.rmtree(fp)
                print(f"Supprimé : {fp}")
        
        # Remove any loose .html or .md files inside subdirectories
        for f in os.listdir(target_dir):
            full_p = os.path.join(target_dir, f)
            if os.path.isfile(full_p):
                ext = os.path.splitext(f)[1].lower()
                if ext in [".html", ".md"]:
                    os.remove(full_p)
                    print(f"Fichier supprimé : {full_p}")

print("✅ Suppression des dossiers et fichiers HTML & MD effectuée avec succès !")
