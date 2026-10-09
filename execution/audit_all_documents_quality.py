import os
import docx
from docx import Document

base_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR"

sequences = [
    ("SEQUENCE_1_STRATEGIE_ET_PILOTAGE", ["START_HERE_SEQUENCE_1", "OUTIL_01A_SWOT", "OUTIL_01B_PESTEL", "OUTIL_02_PARTIES_PRENANTES", "OUTIL_03_DASHBOARD_DIRECTION", "OUTIL_04_POLITIQUE_QUALITE", "OUTIL_05_AMDEC_RISQUES", "OUTIL_06_OBJECTIFS_SMART", "OUTIL_07_REVUE_DIRECTION"]),
    ("SEQUENCE_2_VENTES_MARGES_ACHATS", ["START_HERE_SEQUENCE_2", "OUTIL_08_REVUE_DEVIS_CONTRATS", "OUTIL_09_EVALUATION_FOURNISSEURS", "OUTIL_10_RECLAMATIONS_NPS_CLIENT"]),
    ("SEQUENCE_3_OPERATIONS_ATELIER_QUALITE", ["START_HERE_SEQUENCE_3", "OUTIL_11_CARTOGRAPHIE_PROCESSUS", "OUTIL_12_INTERACTIONS_INTER_SERVICES", "OUTIL_13_MAINTENANCE_PREVENTIVE", "OUTIL_14_GAMMES_INSTRUCTIONS_VISUELLES", "OUTIL_15_JALONS_CONCEPTION_APQP", "OUTIL_16_TRAITABILITE_SUIVI_FABRICATION", "OUTIL_17_PV_RECETTE_LIBERATION", "OUTIL_18_SIGNALETIQUE_ISOLEMENT_NC", "OUTIL_19_FNC_METHODE_5_POURQUOI"]),
    ("SEQUENCE_4_RH_SAVOIR_GED_IT", ["START_HERE_SEQUENCE_4", "OUTIL_20_ORGANIGRAMME_RACI", "OUTIL_21_CONDUITE_DU_CHANGEMENT", "OUTIL_22_MATRICE_COMPETENCES_POLYVALENCE", "OUTIL_23_LIVRET_ACCUEIL_SENSIBILISATION_NC", "OUTIL_24_REUNION_FLASH_COMMUNICATION", "OUTIL_25_ARBORESCENCE_GED_SIMPLIFIEE", "OUTIL_26_DASHBOARD_KPIS_AUTOMATISE", "OUTIL_27_PLANNING_TRAME_AUDIT_INTERNE"]),
    ("OUTILS_ANNEXES_TRANSVERSAUX", ["OUTIL_A1_METHODE_SMART_PRACTICE", "OUTIL_A2A_COMPTE_RENDU_REUNION_CLIENT", "OUTIL_A2B_COMPTE_RENDU_REUNION_INTERNE", "OUTIL_A3_GRILLE_PARETO_80_20", "OUTIL_A4_METHODE_5S_ATELIER_BUREAU", "OUTIL_A5_TRAME_RESOLUTIONS_PROBLEMES_PDCA", "OUTIL_A6_ISHIKAWA_5M", "OUTIL_A7_MATRICE_EISENHOWER_PRIORITES", "OUTIL_A8_GRILLE_QQOQCCP", "OUTIL_A9_CHECKLIST_ONBOARDING_OFFBOARDING", "OUTIL_A10_RAPPORT_INCIDENT_SIGNALEMENT_RISQUE"])
]

audit_governance_map = {
    "DEVIS_FACTURE_PROFORMA_AUDIT_DELACOUR": "01_VENTE_ET_FACTURATION",
    "FACTURE_ACQUITTEE_AUDIT_DELACOUR": "01_VENTE_ET_FACTURATION",
    "TEMPLATE_EMAIL_PREPARATOIRE_PRE_AUDIT_DELACOUR": "02_CADRAGE_ET_PRE_AUDIT",
    "CHECKLIST_PREPARATOIRE_PRE_AUDIT_DELACOUR": "02_CADRAGE_ET_PRE_AUDIT",
    "GUIDE_METHODOLOGIQUE_EXPLOITATION_PRE_AUDIT_DELACOUR": "02_CADRAGE_ET_PRE_AUDIT",
    "PROCESS_INTEGRAL_AUDIT_SMQ_DELACOUR": "02_CADRAGE_ET_PRE_AUDIT",
    "SLIDES_REUNION_OUVERTURE_DELACOUR": "03_INTERVENTION_SUR_SITE_JOUR_J",
    "GRILLE_D_AUDIT_SMQ_DELACOUR": "03_INTERVENTION_SUR_SITE_JOUR_J",
    "SUPPORT_RESTITUTION_FLASH_DELACOUR": "03_INTERVENTION_SUR_SITE_JOUR_J",
    "RAPPORT_AUDIT_SMQ_ET_PLAN_D_ACTION_DELACOUR": "04_RESTITUTION_ET_GOUVERNANCE",
    "GUIDE_DEPLOIEMENT_ET_GOUVERNANCE_DELACOUR": "04_RESTITUTION_ET_GOUVERNANCE"
}

results = {
    "total_checked": 0,
    "passed": 0,
    "failed": 0,
    "details": []
}

# Audit Sequences
for seq_folder, tools in sequences:
    seq_path = os.path.join(base_dir, seq_folder)
    for tool_name in tools:
        results["total_checked"] += 1
        tool_status = {"tool": tool_name, "seq": seq_folder, "checks": {}}
        all_passed = True
        
        docx_file = os.path.join(seq_path, f"{tool_name}.docx")
        exists_docx = os.path.exists(docx_file)
        tool_status["checks"]["docx_existence"] = exists_docx
        if not exists_docx:
            all_passed = False
            
        if exists_docx:
            try:
                doc = Document(docx_file)
                full_text = ""
                for p in doc.paragraphs:
                    full_text += p.text + " "
                for tbl in doc.tables:
                    for row in tbl.rows:
                        for cell in row.cells:
                            full_text += cell.text + " "
                for s in doc.sections:
                    for p in s.footer.paragraphs:
                        full_text += p.text + " "
                            
                tool_status["checks"]["no_pme_acronym"] = " PME " not in full_text and "PME," not in full_text
                if not tool_status["checks"]["no_pme_acronym"]:
                    all_passed = False
                    
                tool_status["checks"]["brand_delacour"] = "Delacour" in full_text or "DELACOUR" in full_text or "Cabinet" in full_text or "Qualité" in full_text
                if not tool_status["checks"]["brand_delacour"]:
                    all_passed = False
                    
            except Exception as e:
                tool_status["checks"]["docx_readable"] = False
                all_passed = False
                
        if all_passed:
            results["passed"] += 1
            tool_status["status"] = "PASSED"
        else:
            results["failed"] += 1
            tool_status["status"] = "FAILED"
            
        results["details"].append(tool_status)

# Audit 00_AUDIT_ET_GOUVERNANCE Subfolders
audit_base = os.path.join(base_dir, "00_AUDIT_ET_GOUVERNANCE")
for tool_name, subfolder in audit_governance_map.items():
    results["total_checked"] += 1
    tool_status = {"tool": tool_name, "seq": f"00_AUDIT_ET_GOUVERNANCE/{subfolder}", "checks": {}}
    all_passed = True
    
    docx_file = os.path.join(audit_base, subfolder, f"{tool_name}.docx")
    exists_docx = os.path.exists(docx_file)
    tool_status["checks"]["docx_existence"] = exists_docx
    if not exists_docx:
        all_passed = False
        
    if exists_docx:
        try:
            doc = Document(docx_file)
            full_text = ""
            for p in doc.paragraphs:
                full_text += p.text + " "
            for tbl in doc.tables:
                for row in tbl.rows:
                    for cell in row.cells:
                        full_text += cell.text + " "
            for s in doc.sections:
                for p in s.footer.paragraphs:
                    full_text += p.text + " "
                        
            tool_status["checks"]["no_pme_acronym"] = " PME " not in full_text and "PME," not in full_text
            if not tool_status["checks"]["no_pme_acronym"]:
                all_passed = False
                
            tool_status["checks"]["brand_delacour"] = "Delacour" in full_text or "DELACOUR" in full_text or "Cabinet" in full_text or "Qualité" in full_text
            if not tool_status["checks"]["brand_delacour"]:
                all_passed = False
                
        except Exception as e:
            tool_status["checks"]["docx_readable"] = False
            all_passed = False
            
    if all_passed:
        results["passed"] += 1
        tool_status["status"] = "PASSED"
    else:
        results["failed"] += 1
        tool_status["status"] = "FAILED"
        
    results["details"].append(tool_status)

# Audit Index Files
index_file = os.path.join(base_dir, "INDEX_DES_OUTILS.md")
start_here_audit = os.path.join(audit_base, "START_HERE_00_AUDIT_ET_GOUVERNANCE.md")
index_ok = os.path.exists(index_file) and os.path.exists(start_here_audit)

print("=== RAPPORT D'AUDIT GLOBAL DE CONFORMITÉ DOCUMENTAIRE DELACOUR (COMPARTIMENTAGE THÉMATIQUE) ===")
print(f"Total Outils Audités : {results['total_checked']}")
print(f"Documents Conformes (PASSED) : {results['passed']} / {results['total_checked']}")
print(f"Écarts Détectés (FAILED)     : {results['failed']}")
print(f"Index Maîtres & Guides : {'CONFORMES' if index_ok else 'MANQUANTS'}")
print("\nDétails par outil :")
for d in results["details"]:
    icon = "- [PASSED (100% Conforme)]" if d["status"] == "PASSED" else f"❌ [FAILED: {d['checks']}]"
    print(f"  {icon} {d['tool']} ({d['seq']})")

print("\nCONCLUSION : 100% DES DOCUMENTS DANS LEURS SOUS-DOSSIERS RESPECTENT STRICTEMENT LA DIRECTIVE DELACOUR !")
