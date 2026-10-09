#!/usr/bin/env python3
"""
Générateur du Planning Gantt CSV — Colonne "Pilote (Interlocuteur PME)" (Cabinet Delacour)
- PLANNING_GANTT_DEPLOIEMENT_DELACOUR.csv (Format CSV Universel UTF-8 avec BOM)

Spécifications Explicites :
- Remplacement de la colonne Binôme par "Pilote (Interlocuteur PME)" : La personne/rôle à solliciter dans l'entreprise pour réaliser l'action.
"""

import os
import csv

ALL_29_GANTT_ITEMS = [
    # SESSION 1 : DIRECTION & PILOTAGE STRATÉGIQUE (5 items)
    {"type": "section", "title": "SESSION 1 : DIRECTION & PILOTAGE STRATÉGIQUE"},
    {"ref": "Réf 1.1", "task": "Analyse du marché & Matrice SWOT (Outil 01)", "priority": "🟠 Court Terme (Mois 2-3)", "duration": "2.5h", "status_tracker": "⬜ À Faire", "weeks": [5], "pilot": "Dirigeant PME"},
    {"ref": "Réf 1.2", "task": "Charte de Politique Qualité Direction (Outil 02)", "priority": "🟢 Moyen Terme (Mois 4)", "duration": "2h", "status_tracker": "⬜ À Faire", "weeks": [13], "pilot": "Dirigeant PME"},
    {"ref": "Réf 1.3", "task": "Grille d'objectifs qualité par service (Outil 03)", "priority": "🔴 Immédiat (Mois 1)", "duration": "2h", "status_tracker": "⬜ À Faire", "weeks": [3], "pilot": "Managers de Service"},
    {"ref": "Réf 1.4", "task": "Registre des Risques & Opportunités PME (Outil 04)", "priority": "🔴 Immédiat (Mois 1)", "duration": "3h", "status_tracker": "⬜ À Faire", "weeks": [4], "pilot": "Responsable QSE / Qualité"},
    {"ref": "Réf 1.5", "task": "Bilan & Revue de Direction Stratégique (Outil 05)", "priority": "🟢 Moyen Terme (Mois 4)", "duration": "2h", "status_tracker": "⬜ À Faire", "weeks": [15], "pilot": "Dirigeant & CODIR"},

    # SESSION 2 : COMMERCIAL, OFFRE & APPROVISIONNEMENTS (6 items)
    {"type": "section", "title": "SESSION 2 : COMMERCIAL, OFFRE & APPROVISIONNEMENTS"},
    {"ref": "Réf 2.1", "task": "Baromètre de Satisfaction Client PME (Outil 06)", "priority": "🟠 Court Terme (Mois 2-3)", "duration": "2h", "status_tracker": "⬜ À Faire", "weeks": [9], "pilot": "Responsable Commercial"},
    {"ref": "Réf 2.2", "task": "Secourisme de Marge : Validation Devis (Outil 08)", "priority": "🔴 Immédiat (Mois 1)", "duration": "2h", "status_tracker": "⬜ À Faire", "weeks": [1], "pilot": "Responsable Commercial & Devis"},
    {"ref": "Réf 2.3", "task": "Procédure d'Avenant Commandes Client (Outil 07)", "priority": "🟠 Court Terme (Mois 2-3)", "duration": "1.5h", "status_tracker": "⬜ À Faire", "weeks": [6], "pilot": "Responsable ADV"},
    {"ref": "Réf 2.4", "task": "Évaluation initiale des Sous-Traitants (Outil 09)", "priority": "🟠 Court Terme (Mois 2-3)", "duration": "2.5h", "status_tracker": "⬜ À Faire", "weeks": [6], "pilot": "Responsable Achats"},
    {"ref": "Réf 2.5", "task": "Dashboard de Suivi Fournisseurs (Outil 10)", "priority": "🟠 Court Terme (Mois 2-3)", "duration": "2h", "status_tracker": "⬜ À Faire", "weeks": [10], "pilot": "Responsable Achats"},
    {"ref": "Réf 2.6", "task": "Procès-Verbal de Réception Achats (Outil 11)", "priority": "🟠 Court Terme (Mois 2-3)", "duration": "1.5h", "status_tracker": "⬜ À Faire", "weeks": [7], "pilot": "Responsable Stock & Réception"},

    # SESSION 3 : OPÉRATIONS, PRODUCTION & QUALITÉ TERRAIN (8 items)
    {"type": "section", "title": "SESSION 3 : OPÉRATIONS, PRODUCTION & QUALITÉ TERRAIN"},
    {"ref": "Réf 3.1", "task": "Gammes opératoires visuelles d'atelier (Outil 14)", "priority": "🔴 Immédiat (Mois 1)", "duration": "3h", "status_tracker": "⬜ À Faire", "weeks": [2], "pilot": "Chef d'Atelier & Opérateurs"},
    {"ref": "Réf 3.2", "task": "Fiche de Traçabilité des Lots de Fabrication (Outil 12)", "priority": "🔴 Immédiat (Mois 1)", "duration": "2.5h", "status_tracker": "⬜ À Faire", "weeks": [4], "pilot": "Responsable Production"},
    {"ref": "Réf 3.3", "task": "Registre de Préservation des Biens Client (Outil 13)", "priority": "🟠 Court Terme (Mois 2-3)", "duration": "1.5h", "status_tracker": "⬜ À Faire", "weeks": [10], "pilot": "Responsable Logistique"},
    {"ref": "Réf 3.4", "task": "Guide de Stockage & Manutention (Outil 15)", "priority": "🟠 Court Terme (Mois 2-3)", "duration": "2h", "status_tracker": "⬜ À Faire", "weeks": [11], "pilot": "Chef Magasinier"},
    {"ref": "Réf 3.5", "task": "Fiche de Suivi SAV & Interventions (Outil 16)", "priority": "🟠 Court Terme (Mois 2-3)", "duration": "2h", "status_tracker": "⬜ À Faire", "weeks": [11], "pilot": "Responsable SAV"},
    {"ref": "Réf 3.6", "task": "Attestation de Libération Produit/Chantier (Outil 17)", "priority": "🟠 Court Terme (Mois 2-3)", "duration": "1.5h", "status_tracker": "⬜ À Faire", "weeks": [7], "pilot": "Responsable Qualité"},
    {"ref": "Réf 3.7", "task": "Isolement Zone Rebuts & Fiche Identité NC (Outil 18)", "priority": "🔴 Immédiat (Mois 1)", "duration": "2h", "status_tracker": "⬜ À Faire", "weeks": [3], "pilot": "Chef d'Atelier"},
    {"ref": "Réf 3.8", "task": "Analyse 5 Pourquoi & Plan Action (Outil 19)", "priority": "🟠 Court Terme (Mois 2-3)", "duration": "2h", "status_tracker": "⬜ À Faire", "weeks": [8], "pilot": "Responsable Qualité"},

    # SESSION 4 : RH, COMPÉTENCES & SOUVERAINETÉ DU SAVOIR (5 items)
    {"type": "section", "title": "SESSION 4 : RH, COMPÉTENCES & SOUVERAINETÉ DU SAVOIR"},
    {"ref": "Réf 4.1", "task": "Matrice RACI & Fiches de Poste (Outil 20)", "priority": "🔴 Immédiat (Mois 1)", "duration": "3h", "status_tracker": "⬜ À Faire", "weeks": [1], "pilot": "Responsable RH / Dirigeant"},
    {"ref": "Réf 4.2", "task": "Plan de Polyvalence & Suppléance Hommes-Clés (Outil 21)", "priority": "🟢 Moyen Terme (Mois 4)", "duration": "2.5h", "status_tracker": "⬜ À Faire", "weeks": [13], "pilot": "Responsable RH"},
    {"ref": "Réf 4.3", "task": "Matrice Compétences & Habilitations (Outil 22)", "priority": "🟠 Court Terme (Mois 2-3)", "duration": "2h", "status_tracker": "⬜ À Faire", "weeks": [12], "pilot": "Responsable RH"},
    {"ref": "Réf 4.4", "task": "Support de Sensibilisation Qualité (Outil 23)", "priority": "🟠 Court Terme (Mois 2-3)", "duration": "1.5h", "status_tracker": "⬜ À Faire", "weeks": [12], "pilot": "Responsable RH & Encadrement"},
    {"ref": "Réf 4.5", "task": "Guide de Capitalisation du Savoir-Faire (Outil 24)", "priority": "🟢 Moyen Terme (Mois 4)", "duration": "2.5h", "status_tracker": "⬜ À Faire", "weeks": [14], "pilot": "Experts Métiers Seniors"},

    # SESSION 5 : DATA, IT & AGILITÉ DÉCISIONNELLE (5 items)
    {"type": "section", "title": "SESSION 5 : DATA, IT & AGILITÉ DÉCISIONNELLE"},
    {"ref": "Réf 5.1", "task": "Charte Informatique & Plan Sauvegardes IT (Outil 25)", "priority": "🔴 Immédiat (Mois 1)", "duration": "2h", "status_tracker": "⬜ À Faire", "weeks": [2], "pilot": "Référent Informatique / IT"},
    {"ref": "Réf 5.2", "task": "Registre d'Étalonnage des Appareils (Outil 26)", "priority": "🟠 Court Terme (Mois 2-3)", "duration": "1.5h", "status_tracker": "⬜ À Faire", "weeks": [12], "pilot": "Technicien Métrologie"},
    {"ref": "Réf 5.3", "task": "Arborescence GED Standard d'Entreprise (Outil 27)", "priority": "🟢 Moyen Terme (Mois 4)", "duration": "2h", "status_tracker": "⬜ À Faire", "weeks": [14], "pilot": "Référent Informatique / IT"},
    {"ref": "Réf 5.4", "task": "Dashboard KPIs Temps Réel (Annexes A1-A5)", "priority": "🟢 Moyen Terme (Mois 4)", "duration": "3h", "status_tracker": "⬜ À Faire", "weeks": [15], "pilot": "Dirigeant & Référent IT"},
    {"ref": "Réf 5.5", "task": "Planning & Trame Audit Blanc (Annexes A6-A10)", "priority": "🟢 Moyen Terme (Mois 4)", "duration": "7h", "status_tracker": "⬜ À Faire", "weeks": [16], "pilot": "Dirigeant PME"}
]

def generate_csv(output_path):
    with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f, delimiter=';')
        writer.writerow(["PLANNING GANTT DE DÉPLOIEMENT SMQ - CABINET DELACOUR (4 MOIS / 16 SEMAINES)"])
        writer.writerow(["Cadre : Co-Construction en Atelier - Suivi Opérationnel & Déploiement"])
        writer.writerow([])
        writer.writerow(["TOTAL ACTIONS: 29 RECOMMANDATIONS", "DURÉE: 4 MOIS (16 SEMAINES)", "CUMUL INTERVENTION: 66.5 HEURES", "ACCOMPAGNEMENT DELACOUR"])
        writer.writerow(["LÉGENDE ET MODE D'EMPLOI:", "████ = Semaine d'Atelier Dédiée (1.5h à 3h)", "⬜ À Faire = En attente", "🟡 En Cours = Atelier réalisé / Rédaction", "🟢 Terminé = Outil validé PME"])
        writer.writerow([])
        
        headers = [
            "Ref", 
            "Action & Outil Delacour", 
            "Priorité (Horizon Temporel)", 
            "Durée Atelier (Heures Fixes)", 
            "Avancement", 
            "Pilote (Interlocuteur PME)"
        ] + [f"S{w}" for w in range(1, 17)]
        
        writer.writerow(headers)
        
        for item in ALL_29_GANTT_ITEMS:
            if item.get("type") == "section":
                writer.writerow([])
                writer.writerow([item["title"]])
            else:
                weeks_flag = ["████" if w in item["weeks"] else "" for w in range(1, 17)]
                writer.writerow([
                    item["ref"], 
                    item["task"], 
                    item["priority"], 
                    item["duration"], 
                    item["status_tracker"], 
                    item["pilot"]
                ] + weeks_flag)

def main():
    dest_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/00_AUDIT_ET_GOUVERNANCE/04_RESTITUTION_ET_GOUVERNANCE"
    os.makedirs(dest_dir, exist_ok=True)

    csv_path = os.path.join(dest_dir, "PLANNING_GANTT_DEPLOIEMENT_DELACOUR.csv")
    generate_csv(csv_path)

    print("✅ Planning Gantt CSV mis à jour avec la colonne 'Pilote (Interlocuteur PME)' !")

if __name__ == "__main__":
    main()
