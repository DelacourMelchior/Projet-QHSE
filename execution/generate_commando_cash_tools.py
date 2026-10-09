# -*- coding: utf-8 -*-
"""
CABINET DELACOUR - SYSTEME COMMANDO 10 OUTILS CASH & RENTABILITE PME
Generateur maitre de l'ensemble des 10 outils (Templates + Guides) et de l'Index.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from commando_style import BASE_DIR, TEMPLATES_DIR, GUIDES_DIR
import generate_flux_1
import generate_flux_2
import generate_flux_3

def generate_index_markdown():
    index_path = os.path.join(BASE_DIR, "INDEX_DES_OUTILS.md")
    
    content = """# KIT COMMANDO 10 OUTILS CASH & RENTABILITE PME

> **Cabinet Delacour - Conseil de Direction, Performance Operationnelle & Rentabilite**  
> *"Fin des usines a gaz bureaucratiques et des classeurs ISO 9001 illisibles. Place a la recuperation directe de cash, a l'arret des fuites de marge et a la discipline d'atelier."*

---

## 🎯 Vision Strategique : Pourquoi ce Kit Commando ?

Dans 90% des PME industrielles et de services, la rentabilite ne fuit pas a cause d'un manque de savoir-faire technique, mais a cause de **micro-fuites invisibles quotidiennes** :
1. Des devis brades avec des options et avenants oraux offerts sans etre factures.
2. Des clients qui bloquent 100% de la facture pendant 60 jours pour une reserve mineure a 100 EUR.
3. Des avoirs financiers accordes avec trop de facilite par les commerciaux pour masquer un litige.
4. Des compagnons qui perdent 30 minutes par jour a chercher des outils ou des plans introuvables.
5. Des machines goulets qui tombent en panne faute d'une inspection sensorielle de 10 minutes.
6. Des reunions de 2 heures sans decision avec des cadres assis qui dissertent.
7. Des postes de production critiques dependants a 100% d'une seule personne.

Ce **Kit Commando 10 Outils** a ete concu pour eliminer chacune de ces fuites avec des outils d'une seule page, actionnables en 2 minutes sur le terrain, sans jargon ISO.

### 💰 Mesure Financiere des Gains Reels (Zero Chiffre Arbitraire)
Chaque outil du kit s'appuie sur une formule mathematique rigoureuse calculee a partir des donnees reelles de l'entreprise :
- **Marge Brute Preservee** : Facturation de 100% des heures d'avenants et maintien du taux de marge plancher sur chaque devis.
- **Tresorerie Liberee** : Baisse mesurable du DSO (delai de paiement) et encaissement sans blocage des factures finales.
- **Productivite Recuperee** : Elimination des heures improductives de recherche et de reunionite reinvesties dans la valeur ajoutee.

---

## 📂 Architecture des 10 Outils en 3 Flux

Chaque outil est scinde en **deux documents complementaires** :
- 📄 **Le Template Operationnel Vierge** (dans `01_TEMPLATES_VIERGES/`) : Formulaire 100% remplissable, pret a l'emploi, avec indicateur de suivi reel, zones de saisie guidees et visa de decision.
- 📘 **Le Guide Methodologique & Posture Terrain** (dans `02_GUIDES_METHODOLOGIQUES/`) : Conseil du consultant, cas pratiques chiffres avec ROI en euros, pieges a eviter et regle des 2 minutes.

### 🔎 00. DISPOSITIF D'AUDIT FLASH DISTANCIEL (LEVIER D'INVESTIGATION PREALABLE)

Avant de déployer les outils commando, le Cabinet Delacour mène l'**Audit de Robustesse & Rentabilité (100% Visio & Partage d'écran)** en 2 sessions de 2h pour traquer sur écran les fuites de cash et prescrire chirurgicalement les outils prioritaires :

| Document d'Audit | Format & Objet | Accès Direct | Rôle dans la Mission |
| :--- | :--- | :--- | :--- |
| **Grille d'Audit de Robustesse (.docx)** | Référentiel Word 21 questions oralisées, scoring cash 0 à 3 | [📘 Ouvrir le Document Word](./00_AUDIT_ROBUSTESSE_ET_RENTABILITE/GRILLE_AUDIT_ROBUSTESSE_ET_RENTABILITE_DELACOUR.docx) | Trame d'animation visio et support d'investigation sur écran |
| **Grille d'Audit de Robustesse (.md)** | Référentiel Markdown complet avec protocole visio | [📄 Consulter la Version Markdown](./00_AUDIT_ROBUSTESSE_ET_RENTABILITE/GRILLE_AUDIT_ROBUSTESSE_ET_RENTABILITE_DELACOUR.md) | Synthèse des 5 modules, scripts oraux et scoring sur 63 pts |

---

### FLUX 1 : VENTES & TRESORERIE (Securisation des Marges & Encaissement Rapide)

| Outil | Nom & Enjeu Financier | Template Vierge (.docx) | Guide Methodologique (.docx) | Metrique Cle & Formule du Gain Reel |
| :--- | :--- | :--- | :--- | :--- |
| **OUTIL 01** | **Cadrage Devis & Marge**<br>Verrouillage de la marge plancher et facturation des avenants a 100%. | [📄 Ouvrir le Template](./01_TEMPLATES_VIERGES/OUTIL_01_CADRAGE_DEVIS_ET_MARGE_TEMPLATE.docx) | [📘 Ouvrir le Guide](./02_GUIDES_METHODOLOGIQUES/OUTIL_01_CADRAGE_DEVIS_ET_MARGE_GUIDE.docx) | **Marge preservee (€)** = (Heures d'avenants facturees x Taux horaire) + Marge sauvegardee |
| **OUTIL 02** | **PV de Recette & Facturation**<br>Emission facture finale sous 24h. Facturation immediate des 95% sans blocage. | [📄 Ouvrir le Template](./01_TEMPLATES_VIERGES/OUTIL_02_PV_RECETTE_ET_FACTURATION_TEMPLATE.docx) | [📘 Ouvrir le Guide](./02_GUIDES_METHODOLOGIQUES/OUTIL_02_PV_RECETTE_ET_FACTURATION_GUIDE.docx) | **Tresorerie liberee (€)** = (Gain en jours de DSO / 365) x CA Annuel |
| **OUTIL 03** | **Chasse aux Avoirs & Litiges**<br>Encadrement strict des avoirs et recours systematique contre les tiers. | [📄 Ouvrir le Template](./01_TEMPLATES_VIERGES/OUTIL_03_CHASSE_AUX_AVOIRS_ET_LITIGES_TEMPLATE.docx) | [📘 Ouvrir le Guide](./02_GUIDES_METHODOLOGIQUES/OUTIL_03_CHASSE_AUX_AVOIRS_ET_LITIGES_GUIDE.docx) | **Resultat net preserve (€)** = Baisse des avoirs accordes + Remboursements partenaires sous 48h |

---

### FLUX 2 : ATELIER & TERRAIN (Productivite, Zero Rebut & Disponibilite Outils)

| Outil | Nom & Enjeu Financier | Template Vierge (.docx) | Guide Methodologique (.docx) | Metrique Cle & Formule du Gain Reel |
| :--- | :--- | :--- | :--- | :--- |
| **OUTIL 04** | **5S Flash Organisation & GED**<br>Regle des 30 secondes : retrouver tout fichier ou outil en < 30 sec. | [📄 Ouvrir le Template](./01_TEMPLATES_VIERGES/OUTIL_04_5S_FLASH_ATELIER_ET_GED_TEMPLATE.docx) | [📘 Ouvrir le Guide](./02_GUIDES_METHODOLOGIQUES/OUTIL_04_5S_FLASH_ATELIER_ET_GED_GUIDE.docx) | **Temps utile gagne (€)** = (Minutes gagnees / 60) x Effectif x Taux horaire x 220j |
| **OUTIL 05** | **Instructions Visuelles au Poste**<br>Fiches reflexes mono-page 80% visuel. Autonomie formellement validee. | [📄 Ouvrir le Template](./01_TEMPLATES_VIERGES/OUTIL_05_INSTRUCTIONS_VISUELLES_POSTE_TEMPLATE.docx) | [📘 Ouvrir le Guide](./02_GUIDES_METHODOLOGIQUES/OUTIL_05_INSTRUCTIONS_VISUELLES_POSTE_GUIDE.docx) | **Economie non-qualite (€)** = Heures de retouches evitees + Baisse erreurs integration |
| **OUTIL 06** | **Maintenance Preventive & Goulets**<br>Surveillance de l'outil strategique et armoire 3 composants de survie. | [📄 Ouvrir le Template](./01_TEMPLATES_VIERGES/OUTIL_06_MAINTENANCE_PREVENTIVE_1ER_NIVEAU_TEMPLATE.docx) | [📘 Ouvrir le Guide](./02_GUIDES_METHODOLOGIQUES/OUTIL_06_MAINTENANCE_PREVENTIVE_1ER_NIVEAU_GUIDE.docx) | **Pertes d'arret evitees (€)** = Heures d'indisponibilite evitees x Cout horaire interruption |
| **OUTIL 07** | **Fiche Anti-Erreurs & 5 Pourquoi**<br>Chiffrage financier immediat en euros et verrouillage anti-recidive. | [📄 Ouvrir le Template](./01_TEMPLATES_VIERGES/OUTIL_07_FICHE_ANTI_REBUTS_ET_5_POURQUOI_TEMPLATE.docx) | [📘 Ouvrir le Guide](./02_GUIDES_METHODOLOGIQUES/OUTIL_07_FICHE_ANTI_REBUTS_ET_5_POURQUOI_GUIDE.docx) | **Economie directe (€)** = Reduction de la valeur financiere des rebuts/reprises sur 12 mois |

---

### FLUX 3 : MANAGEMENT & ORGANISATION (Rythme Operationnel, Competences & Pilotage)

| Outil | Nom & Enjeu Financier | Template Vierge (.docx) | Guide Methodologique (.docx) | Metrique Cle & Formule du Gain Reel |
| :--- | :--- | :--- | :--- | :--- |
| **OUTIL 08** | **Rituel des Reunions Efficaces**<br>Stand-up 5 min debout. 1 probleme = 1 responsable = 1 delai. | [📄 Ouvrir le Template](./01_TEMPLATES_VIERGES/OUTIL_08_RITUEL_REUNIONS_EFFICACES_TEMPLATE.docx) | [📘 Ouvrir le Guide](./02_GUIDES_METHODOLOGIQUES/OUTIL_08_RITUEL_REUNIONS_EFFICACES_GUIDE.docx) | **Temps libere (€)** = Heures de reunionite supprimees x Cout horaire moyen des participants |
| **OUTIL 09** | **Polyvalence & Postes Cles**<br>Suppression de la vulnerabilite homme-cle. Doublement des competences. | [📄 Ouvrir le Template](./01_TEMPLATES_VIERGES/OUTIL_09_POLYVALENCE_ET_SECURITE_COMPETENCES_TEMPLATE.docx) | [📘 Ouvrir le Guide](./02_GUIDES_METHODOLOGIQUES/OUTIL_09_POLYVALENCE_ET_SECURITE_COMPETENCES_GUIDE.docx) | **Securite exploitation** = 100% des activites critiques couvertes par au moins 2 personnes formees |
| **OUTIL 10** | **Tableau de Bord 5 KPIs Hebdo**<br>Le cockpit du lundi 8h30 en 15 min et previsionnel de tresorerie glissant. | [📄 Ouvrir le Template](./01_TEMPLATES_VIERGES/OUTIL_10_TABLEAU_DE_BORD_5_KPIS_HEBDO_TEMPLATE.docx) | [📘 Ouvrir le Guide](./02_GUIDES_METHODOLOGIQUES/OUTIL_10_TABLEAU_DE_BORD_5_KPIS_HEBDO_GUIDE.docx) | **Marge nette securisee (€)** = Detection precoce des derives d'exploitation avant cloture |

---

## ⚡ Chronologie de Deploiement Commando en 30 Jours

### Semaine 1 : Stop aux Fuites de Tresorerie (Flux 1)
- Activer l'**Outil 01** : marge plancher obligatoire sur les devis et bloc d'avenants papier pour les chefs de chantier.
- Activer l'**Outil 02** : consigne stricte de faire signer le PV contradictoire sur site et facturation sous 24h.
- Activer l'**Outil 03** : blocage des avoirs > 150 EUR sans visa de direction.

### Semaine 2 : Discipline d'Atelier & Goulet (Flux 2)
- Vendredi apres-midi : operation commando 4h sur l'**Outil 04 (5S Flash)** pour liberer l'espace.
- Lancer l'**Outil 06** : premier quart d'heure de maintenance preventive sensorielle sur la machine goulet.
- Afficher l'**Outil 07** : premier bac rouge de rebut chiffre en euros au milieu de l'atelier.

### Semaine 3 : Autonomie & Efficacite des Hommes (Flux 2 & 3)
- Realiser les 2 premieres fiches visuelles plastifiees avec l'**Outil 05** sur les postes a defauts.
- Supprimer la grande reunion du lundi et instaurer l'**Outil 08 (Stand-up 5 min debout)** a 8h30.
- Dresser la matrice de l'**Outil 09** et reperer les 2 postes en alerte rouge (1 seul expert).

### Semaine 4 : Ancrage du Pilotage Hebdomadaire (Flux 3)
- Lancer le premier rituel du lundi avec l'**Outil 10 (Tableau de bord 5 KPIs)**.
- Cloturer le mois en mesurant les premiers euros de cash sauves et les partager avec les equipes.

---

## 🛡️ Respect des Normes & Standards Cabinet Delacour
Tous les documents Word generes respectent a la lettre la charte graphique et technique du Cabinet :
- **Banniere HD Retina** vectorisee officielle en en-tete de page.
- **Typographie universelle sans conflit** : `Georgia` pour les titres et `Arial` pour le corps et les tableaux.
- **Palette officielle** : Vert Foret `#1B4D3E`, Vert Sombre `#152822`, Dore Noble `#C5A065`, Cremerie `#F9F9F7`.
- **Zero faute d'encodage** (0 caractere mojibake, compatibilite parfaite macOS Pages & Microsoft Word Windows).
- **Pied de page natif OpenXML** avec pagination dynamique `Page X / Y` et contacts professionnels.

---
*Cabinet Delacour - Tous droits reserves. Systeme reserve a l'accompagnement strategique et operationnel des PME.*
"""
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated: {index_path}")

def main():
    print("===============================================================")
    print("CABINET DELACOUR - GENERATION SYSTEME COMMANDO 10 OUTILS CASH")
    print("===============================================================")
    
    print("\n--- 1. GENERATION DU FLUX 1 : VENTES & TRESORERIE ---")
    generate_flux_1.generate_tool_01_template()
    generate_flux_1.generate_tool_01_guide()
    generate_flux_1.generate_tool_02_template()
    generate_flux_1.generate_tool_02_guide()
    generate_flux_1.generate_tool_03_template()
    generate_flux_1.generate_tool_03_guide()
    
    print("\n--- 2. GENERATION DU FLUX 2 : ATELIER & TERRAIN ---")
    generate_flux_2.generate_tool_04_template()
    generate_flux_2.generate_tool_04_guide()
    generate_flux_2.generate_tool_05_template()
    generate_flux_2.generate_tool_05_guide()
    generate_flux_2.generate_tool_06_template()
    generate_flux_2.generate_tool_06_guide()
    generate_flux_2.generate_tool_07_template()
    generate_flux_2.generate_tool_07_guide()
    
    print("\n--- 3. GENERATION DU FLUX 3 : MANAGEMENT & ORGANISATION ---")
    generate_flux_3.generate_tool_08_template()
    generate_flux_3.generate_tool_08_guide()
    generate_flux_3.generate_tool_09_template()
    generate_flux_3.generate_tool_09_guide()
    generate_flux_3.generate_tool_10_template()
    generate_flux_3.generate_tool_10_guide()
    
    print("\n--- 4. GENERATION DU MASTER INDEX DES OUTILS ---")
    generate_index_markdown()
    
    print("\n>>> GENERATION TOTALE TERMINEE AVEC SUCCES (20 DOCX + 1 INDEX MD) <<<")

if __name__ == "__main__":
    main()

