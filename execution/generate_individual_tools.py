import os

# 1. Delete old combined files if they exist
old_md = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/KIT_OUTILS_QUALITE_DELACOUR.md"
old_html = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/.tmp/KIT_OUTILS_QUALITE_DELACOUR.html"

if os.path.exists(old_md):
    os.remove(old_md)
    print(f"Deleted {old_md}")

if os.path.exists(old_html):
    os.remove(old_html)
    print(f"Deleted {old_html}")

# Directories for individual tools
out_dir_md = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/outils_qualite"
out_dir_html = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/.tmp/outils_qualite"

os.makedirs(out_dir_md, exist_ok=True)
os.makedirs(out_dir_html, exist_ok=True)

# Definition of the 25 individual tools
tools_data = [
    {
        "num": "01",
        "code": "SWOT_PESTEL",
        "title": "Matrice SWOT / PESTEL Chiffrée",
        "clause": "Clause 4.1",
        "q_num": "Q1",
        "utility": "Identifier les risques extérieurs (hausse des prix, crise) qui menacent vos bénéfices et préparer la riposte.",
        "instructions": "Remplir 2 menaces réelles, évaluer l'impact potentiel en euros (€) et nommer un responsable d'action préventive.",
        "content_md": """| Type | Événement ou Risque Identifié | Impact Financier Estimé (€) | Action Préventive à Mettre en Place | Responsable |
| :--- | :--- | :-: | :--- | :--- |
| **Menace Extérieure** | Hausse du coût des matières premières (+15%) | - 45 000 € / an | Indexer les devis sur le cours des matières + révision trimestrielle | Resp. Commercial |
| **Menace Extérieure** | Départ du sous-traitant principal de découpe | - 30 000 € (Arrêt prod) | Homologuer un 2ème sous-traitant de secours sous 30 jours | Resp. Achats |
| **Opportunité** | Nouveau marché régional disponible | + 80 000 € / an | Lancer une campagne d'appels ciblée sur 20 prospects clés | Dir. Commercial |""",
        "content_type": "table"
    },
    {
        "num": "02",
        "code": "PARTIES_PRENANTES",
        "title": "Cartographie des Parties Prenantes",
        "clause": "Clause 4.2",
        "q_num": "Q2",
        "utility": "Recenser les exigences obligatoires de vos clients stratégiques et partenaires pour éviter les litiges financiers et ruptures de contrat.",
        "instructions": "Lister la partie prenante, son exigence clé, le risque en cas d'échec et le document de contrôle associé.",
        "content_md": """| Partie Prenante | Exigence Critique Non Négociable | Risque Majeur si Non Respecté | Preuve ou Outil de Contrôle |
| :--- | :--- | :--- | :--- |
| **Clients Grands Comptes** | Livraison sous 48h maxi avec certificat de conformité | Pénalité de retard de 5%/jour + risque de perte de compte | Bon de livraison émargé + PV de contrôle joint |
| **Banque / Investisseurs** | Transmission des bilans financiers certifiés au 30 avril | Blocage des lignes de crédit de roulement | Tableau de bord de trésorerie mensuel |
| **Organisme Certification** | Réalisation de l'audit annuel ISO 9001 sans écart majeur | Perte de la certification ISO (condition d'appel d'offre) | Planning d'audit interne respecté à 100% |""",
        "content_type": "table"
    },
    {
        "num": "03",
        "code": "DASHBOARD_DIRECTION",
        "title": "Tableau de Bord de Pilotage Direction",
        "clause": "Clause 5.1 & 9.1",
        "q_num": "Q3 & Q26",
        "utility": "Piloter votre PME aux faits avec 5 chiffres vitaux plutôt que par intuition ou réactions tardives.",
        "instructions": "Renseigner les 5 indicateurs une fois par mois (temps de remplissage : 10 min/mois).",
        "content_md": """| Indicateur Clé (KPI) | Objectif Visé | Mois M-1 | Mois M (En cours) | Écart / Alerte | Action Corrective si Objectif Non Atteint |
| :--- | :-: | :-: | :-: | :-: | :--- |
| **Chiffre d'Affaires (€)** | 350 000 € | 340 000 € | **362 000 €** | 🟢 +12 000 € | Ras (Objectif atteint) |
| **Marge Brute Globale (%)** | ≥ 38 % | 36.5 % | **34.2 %** | 🔴 -3.8 % | Bloquer la signature des devis sous 35% de marge |
| **Taux de Service / Délais (%)** | ≥ 95 % | 92.0 % | **96.5 %** | 🟢 +1.5 % | Ras |
| **Coût de Non-Qualité (€)** | ≤ 3 000 € | 5 400 € | **4 100 €** | 🟠 +1 100 € | Analyser les 2 plus grosses FNC du mois (5 Pourquoi) |
| **Satisfaction Client (NPS)** | ≥ 45 | 42 | **48** | 🟢 +3 | Ras |""",
        "content_type": "table"
    },
    {
        "num": "04",
        "code": "POLITIQUE_QUALITE",
        "title": "Charte Politique Qualité & Performance",
        "clause": "Clause 5.2",
        "q_num": "Q4",
        "utility": "Exprimer en 1 page simple l'engagement clair de la Direction pour la rentabilité, le zéro gaspillage et la satisfaction client.",
        "instructions": "Personnaliser le nom de la société, signer et afficher à l'accueil et dans l'atelier.",
        "content_md": """=================================================================================
             ENGAGEMENT DE LA DIRECTION : POLITIQUE QUALITÉ & PERFORMANCE
=================================================================================
Société : [Nom de votre Entreprise]
Date : [Date du jour]

Notre démarche Qualité a un objectif simple et pragmatique : garantir la pérennité 
de notre entreprise, protéger nos marges et assurer la satisfaction totale de nos clients.

Nos 3 Engagements Inviolables :
1. ZÉRO GASPILLAGE : Stopper les coûts cachés en faisant bien du premier coup.
2. CHASSE AUX DÉLAIS : Respecter 100% de nos engagements de livraison envers nos clients.
3. SOUVERAINETÉ DU SAVOIR : Clarifier les rôles de chacun pour travailler dans la sérénité.

Chaque collaborateur est l'acteur principal de cette réussite au quotidien.

Signature de la Direction Générale : [Nom & Prénom du DG]
=================================================================================""",
        "content_type": "text"
    },
    {
        "num": "05",
        "code": "AMDEC_RISQUES",
        "title": "Registre des Risques & Opportunités (AMDEC)",
        "clause": "Clause 6.1",
        "q_num": "Q5",
        "utility": "Calculer la gravité des risques opérationnels (Fréquence 1-3 x Gravité 1-3) et concentrer vos efforts sur les urgences (Score ≥ 4).",
        "instructions": "Noter la Fréquence x Gravité. Si le score est ≥ 4, l'action préventive est obligatoire.",
        "content_md": """| Risque Identifié | Fréquence (1-3) | Gravité (1-3) | Score (F x G) | Action de Neutralisation Recommandée | Budget / ROI Estimé | Responsable |
| :--- | :-: | :-: | :-: | :--- | :-: | :--- |
| Erreur de cote sur devis sur mesure | 2 | 3 | **6 (🔴 Majeur)** | Créer une grille de double validation devis > 10k€ | ROI : Évite 15k€ de retouches | Resp. BE |
| Panne de la machine de découpe Laser | 1 | 3 | **3 (🟠 Moyen)** | Souscrire un contrat de maintenance préventive | Coût : 1 200€ / an | Resp. Atelier |
| Perte de données suite à un virus IT | 1 | 3 | **3 (🟠 Moyen)** | Mettre en place des sauvegardes Cloud quotidiennes | Coût : 40€ / mois | Resp. IT |""",
        "content_type": "table"
    },
    {
        "num": "06",
        "code": "OBJECTIFS_SMART",
        "title": "Feuille de Route d'Objectifs SMART",
        "clause": "Clause 6.2",
        "q_num": "Q6",
        "utility": "Donner à chaque responsable d'équipe 1 à 2 objectifs clairs, mesurables par des chiffres et datés.",
        "instructions": "Compléter la trame en début d'année et vérifier les résultats chaque trimestre.",
        "content_md": """| Service | Objectif Amélioration (SMART) | Chiffre / Formule de Mesure | Valeur Cible | Échéance | Responsable |
| :--- | :--- | :--- | :-: | :-: | :--- |
| **Commercial** | Réduire le taux de devis refusés pour prix trop cher | (Devis perdus / Total devis) x 100 | ≤ 20 % | 30 Juin | Dir. Commercial |
| **Production** | Diviser par deux le taux de rebuts en atelier | (Valeur pièces jetées / CA produit) x 100 | ≤ 1.5 % | 31 Décembre | Chef d'Atelier |
| **Achats** | Obtenir 100% de livraisons fournisseurs dans les temps | (Commandes reçues à l'heure / Total) x 100 | ≥ 98 % | 30 Septembre | Resp. Achats |""",
        "content_type": "table"
    },
    {
        "num": "07",
        "code": "REVUE_DIRECTION",
        "title": "Trame de PV de Revue de Direction",
        "clause": "Clause 9.3",
        "q_num": "Q7",
        "utility": "Animer la réunion annuelle d'arbitrage de la Direction en 1 heure chrono et consigner les décisions financières.",
        "instructions": "Parcourir l'ordre du jour à 5 points et remplir directement les décisions prises.",
        "content_md": """=================================================================================
                      PROCÈS-VERBAL DE REVUE DE DIRECTION
=================================================================================
Date : [Date] | Présents : [DG, Responsable Qualité, Responsable Opérations]

1. BILAN DES PERFORMANCES ET RENTABILITÉ :
   - Chiffre d'affaires annuel : [XXX €] (Objectif atteint : Oui/Non)
   - Taux de satisfaction client : [XX %]

2. ANOMALIES ET COÛTS DE NON-QUALITÉ DU PERIODE :
   - Coût total des retouches/rebuts : [XXX €]
   - Principale cause identifiée : [Rupture d'approvisionnement / Erreur de saisie]

3. DÉCISIONS ET ARBITRAGES BUDGETAIRES DE LA DIRECTION :
   - Décision 1 : Achat d'une nouvelle laveuse industrielle (Budget : 12 000 €)
   - Décision 2 : Formation de 2 opérateurs au contrôle dimensionnel (Échéance : Mars)

4. VALIDATION ET CONCLUSION :
   Le Système de Management de la Qualité est déclaré conforme et efficace.

Signature du DG : _____________________   Signature QSE : _____________________
=================================================================================""",
        "content_type": "text"
    },
    {
        "num": "08",
        "code": "REVUE_DEVIS_CONTRATS",
        "title": "Fiche de Revue de Devis / Contrats Toxiques",
        "clause": "Clause 8.2",
        "q_num": "Q8",
        "utility": "Interdire la signature d'affaires à perte ou techniquement irréalisables dans les délais demandés.",
        "instructions": "Remplir la fiche avant de transmettre tout devis > 10 000 €. Si une case est NON, la signature est bloquée.",
        "content_md": """=================================================================================
                      FICHE DE REVUE DE CONTRAT / DEVIS > 10 K€
=================================================================================
Client : [Nom du Client] | N° Devis : [DEV-2026-042] | Montant HT : [24 500 €]

POINTS DE CONTRÔLE PRÉALABLES :
[ Oui ]  1. Le besoin du client est-il 100% clair et documenté ?
[ Oui ]  2. Avons-nous les machines et compétences pour fabriquer ?
[ Oui ]  3. Le délai exigé par le client est-il réalisable sans heures sup. explosives ?
[ Oui ]  4. La MARGE BRUTE prévisionnelle est-elle ≥ 35% ? (Marge calculée : 38.5%)

ARBITRAGE :
[ X ] DEVIS VALIDÉ POUR ENVOI CLIENT
[   ] DEVIS REFUSÉ / À CORRIGER (Raison : ________________________________________)

Date & Signature du Responsable Commercial : [Signature]
=================================================================================""",
        "content_type": "text"
    },
    {
        "num": "09",
        "code": "EVALUATION_FOURNISSEURS",
        "title": "Grille d'Évaluation des Fournisseurs",
        "clause": "Clause 8.4",
        "q_num": "Q9",
        "utility": "Évaluer vos 5 fournisseurs critiques une fois par an pour éviter la réception de produits défectueux.",
        "instructions": "Noter chaque critère sur 5. Si la note globale est inférieure à 12/20, un plan d'action est exigé.",
        "content_md": """| Nom du Fournisseur / Sous-Traitant | Qualité des Livraisons (/5) | Respect des Délais (/5) | Compétitivité Prix (/5) | Service & Réactivité (/5) | Note Totale (/20) | Décision & Statut |
| :--- | :-: | :-: | :-: | :-: | :-: | :--- |
| **Fournisseur A (Acier & Métaux)** | 5 | 4 | 4 | 4 | **17 / 20** | 🟢 Agrée (Excellente qualité) |
| **Sous-traitant B (Peinture)** | 2 | 3 | 3 | 3 | **11 / 20** | 🔴 Sous réserve (Plan de progrès requis) |
| **Prestataire C (Transporteur)** | 4 | 4 | 3 | 4 | **15 / 20** | 🟢 Agréé |""",
        "content_type": "table"
    },
    {
        "num": "10",
        "code": "RECLAMATIONS_NPS_CLIENT",
        "title": "Registre des Réclamations & NPS Client",
        "clause": "Clause 9.1.2",
        "q_num": "Q10",
        "utility": "Enregistrer chaque mécontentement client et garantir une prise en charge sous 24h pour stopper le départ des clients.",
        "instructions": "Inscrire la réclamation le jour même et valider la clôture une fois le client satisfait.",
        "content_md": """| N° | Date | Nom du Client | Description du Problème Remonté | Action Immédiate sous 24h | Action Corrective Définitive | Statut |
| :-: | :-: | :--- | :--- | :--- | :--- | :-: |
| **REC-01** | 12/02 | Société ALFA | Colis reçu avec 2 pièces rayées | Renvoi express de 2 pièces neuves sous 24h | Modification du carton d'emballage de protection | 🟢 Clôturé |
| **REC-02** | 14/02 | Client BETA | Retard de livraison de 3 jours | Appel téléphonique du DG pour s'excuser + geste commercial | Changement de transporteur sur cette ligne | 🟢 Clôturé |""",
        "content_type": "table"
    },
    {
        "num": "11",
        "code": "CARTOGRAPHIE_PROCESSUS",
        "title": "Cartographie Macro des Processus",
        "clause": "Clause 4.3",
        "q_num": "Q11",
        "utility": "Offrir à tous les salariés une vision claire en 5 étapes du fonctionnement de l'entreprise.",
        "instructions": "Afficher la trame ci-dessous dans l'entreprise avec le nom du pilote de chaque étape.",
        "content_md": """=================================================================================
                 CARTOGRAPHIE DES PROCESSUS : [Nom de l'Entreprise]
=================================================================================

  [ 1. VENDRE ]  ──►  [ 2. CONCEVOIR ]  ──►  [ 3. ACHETER ]  ──►  [ 4. FABRIQUER ]  ──►  [ 5. LIVRER ]
  Pilote : Com.       Pilote : BE             Pilote : Achats       Pilote : Prod.          Pilote : Log.

---------------------------------------------------------------------------------
  PROCESSUS DE SOUTIEN :  [ RH & Compétences ]   -   [ IT & GED ]   -   [ Maintenance Équipements ]
  PROCESSUS DE DIRECTION : [ Stratégie, Budget & Amélioration Continue ]
=================================================================================""",
        "content_type": "text"
    },
    {
        "num": "12",
        "code": "INTERACTIONS_INTERSERVICES",
        "title": "Fiche d'Interactions Inter-Services",
        "clause": "Clause 4.4",
        "q_num": "Q12",
        "utility": "Supprimer les blocages et quiproquos entre le bureau d'études, les ventes et l'atelier.",
        "instructions": "Lister les 3 livrables vitaux que chaque service doit donner au service suivant.",
        "content_md": """| Service Émetteur | Service Destinataire | Information ou Document Obligatoire Transmis | Format Exigé | Délai Garanti |
| :--- | :--- | :--- | :--- | :--- |
| **Commercial** | **Bureau d'Études** | Cahier des charges client validé + Devis signé | Fiche projet GED | Sous 24h après signature |
| **Bureau d'Études** | **Atelier / Prod** | Plan de fabrication à jour (Indice v2) + Nomenclature | Fiche GED imprimée | 48h avant lancement prod |
| **Atelier / Prod** | **Expéditions** | Bon de fabrication signé + PV d'autocontrôle | Papier émargé | Dès fin d'assemblage |""",
        "content_type": "table"
    },
    {
        "num": "13",
        "code": "MAINTENANCE_PREVENTIVE",
        "title": "Plan de Maintenance Préventive Équipements",
        "clause": "Clause 7.1",
        "q_num": "Q13",
        "utility": "Programmer l'entretien régulier des machines et outils pour éviter les pannes subites coûteuses.",
        "instructions": "Cocher la case une fois la maintenance réalisée et inscrire la date.",
        "content_md": """| Équipement / Machine | Opération de Maintenance Préventive | Fréquence | Prochaine Échéance | Intervenant | Statut |
| :--- | :--- | :-: | :-: | :--- | :-: |
| **Presse Plieuse N°1** | Vidange huile hydraulique + changement filtres | Annuel | 15 Mars 2026 | Technicien Extérieur | 🟢 Programmé |
| **Compresseur d'Air** | Purge des condensats et contrôle des courroies | Mensuel | 1er de chaque mois | Agent Maintenance Interne | 🟢 Réalisé |
| **Pont Roulant 5T** | Contrôle réglementaire de sécurité obligatoire | Annuel | 10 Juin 2026 | Organisme Agréé (Apave) | 🟢 Programmé |""",
        "content_type": "table"
    },
    {
        "num": "14",
        "code": "INSTRUCTION_VISUELLE_ONE_POINT_LESSON",
        "title": "Instruction Visuelle One Point Lesson",
        "clause": "Clause 8.1",
        "q_num": "Q14",
        "utility": "Expliquer en 1 photo et 3 consignes simples la bonne façon de réaliser un réglage ou une tâche au poste.",
        "instructions": "Imprimer et afficher directement au poste de travail concerné.",
        "content_md": """=================================================================================
             INSTRUCTION VISUELLE DE POSTE : REGLAGE DU SERRAGE
=================================================================================
Poste de Travail : Assemblage Final | Réf Instruction : INS-PROD-04

  [ PHOTO : BON POSITIONNEMENT ]              [ PHOTO : MAUVAIS POSITIONNEMENT ]
       🟢 À FAIRE : Clé alignée                  🔴 À NE PAS FAIRE : Clé de biais
   

3 RÈGLES D'OR À RESPECTER :
1. Toujours régler la clé dynamométrique à 45 Nm avant de démarrer.
2. Appliquer le serrage en croix sur les 4 vis.
3. Marquer au feutre bleu chaque vis serrée et contrôlée.
=================================================================================""",
        "content_type": "text"
    },
    {
        "num": "15",
        "code": "JALONS_CONCEPTION_APQP",
        "title": "Checklist de Jalons de Conception APQP",
        "clause": "Clause 8.3",
        "q_num": "Q15",
        "utility": "Valider le passage d'un nouveau projet d'étape en étape sans fabriquer des produits irréalisables.",
        "instructions": "Cocher les 4 validations obligatoires avant d'autoriser le lancement de la fabrication en série.",
        "content_md": """=================================================================================
                CHECKLIST DE VALIDATION DE JALON DE CONCEPTION
=================================================================================
Nom du Projet : [Nouveau Produit X] | Chef de Projet : [Nom du Concepteur]

JALON DE PASSAGE EN PRODUCTION :
[ Oui ] 1. Les plans 3D et 2D sont-ils validés et archivés en GED ?
[ Oui ] 2. Un prototype ou essai atelier a-t-il été fabriqué avec succès ?
[ Oui ] 3. Le coût de revient réel calculé est-il inférieur au budget cible ?
[ Oui ] 4. Le chef d'atelier a-t-il été formé et validé la gamme de fabrication ?

ARBITRAGE :
[ X ] PASSAGE EN PRODUCTION SÉRIE ACCORDÉ
[   ] PROJET BLOQUÉ (Motif : ____________________________________________________)

Date & Signature du Responsable BE : [Signature]
=================================================================================""",
        "content_type": "text"
    },
    {
        "num": "16",
        "code": "ORDRE_FABRICATION_TRACABILITE",
        "title": "Ordre de Fabrication & Traçabilité",
        "clause": "Clause 8.5",
        "q_num": "Q16",
        "utility": "Accompagner chaque lot de fabrication pour enregistrer qui a fait quoi et supprimer les erreurs de montage.",
        "instructions": "L'opérateur signe et indique la date à chaque étape de réalisation.",
        "content_md": """=================================================================================
                     DOSSIER DE FABRICATION ET DE TRAÇABILITÉ
=================================================================================
N° d'Ordre (OF) : [OF-2026-889] | Client : [Société DUPONT] | Qte : [50 pièces]

ÉTAPES DE FABRICATION :
1. Découpe & Débitage    | Qte : [50] | Operateur : [Jean P.] | Date : [10/02] 🟢
2. Usinage & Perçage     | Qte : [50] | Operateur : [Marc L.] | Date : [11/02] 🟢
3. Assemblage & Soudure  | Qte : [50] | Operateur : [Luc D.]  | Date : [12/02] 🟢
4. Contrôle Final        | Qte : [50] | Controleur : [QSE]   | Date : [13/02] 🟢

VISA FINAL DE TRAÇABILITÉ : Lot 100% Conforme et prêt pour expédition.
=================================================================================""",
        "content_type": "text"
    },
    {
        "num": "17",
        "code": "PV_RECETTE_LIBERATION",
        "title": "Procès-Verbal (PV) de Libération Final",
        "clause": "Clause 8.6",
        "q_num": "Q17",
        "utility": "Interdire le départ d'un produit chez le client sans qu'un contrôle final ait été signé factuellement.",
        "instructions": "Cocher les contrôles, signer et agrafer une copie au Bon de Livraison client.",
        "content_md": """=================================================================================
                     CERTIFICAT DE LIBÉRATION ET CONTRÔLE FINAL
=================================================================================
N° de Commande : [CMD-451] | Client : [Client MARTINEZ] | Date : [14/02/2026]

CONTRÔLES EFFECTUÉS AVANT EXPÉDITION :
[ Conforme ] 1. Contrôle visuel de surface (absence de rayures / peinture OK)
[ Conforme ] 2. Contrôle dimensionnel (Côtes principales vérifiées au pied à coulisse)
[ Conforme ] 3. Contrôle du conditionnement et de l'étiquetage carton

DÉCISION DE LIBÉRATION :
[ X ] PRODUIT LIBÉRÉ ET AUTORISÉ À L'EXPÉDITION
[   ] PRODUIT BLOQUÉ (Mise en quarantaine sous fiche FNC-XXX)

Nom & Signature du Contrôleur Qualité : [Signature]
=================================================================================""",
        "content_type": "text"
    },
    {
        "num": "18",
        "code": "QUARANTAINE_NON_CONFORME",
        "title": "Fiche d'Isolement Quarantaine NC",
        "clause": "Clause 8.7",
        "q_num": "Q18",
        "utility": "Étiqueter immédiatement toute pièce défectueuse pour éviter qu'un opérateur ne l'utilise par erreur.",
        "instructions": "Imprimer sur papier rouge, remplir et scotcher directement sur la pièce ou le bac rouge.",
        "content_md": """=================================================================================
                  🔴 ÉTIQUETTE DE QUARANTAINE - PRODUIT NON CONFORME
=================================================================================
                     ⚠️ INTERDICTION STRICTE D'UTILISER ⚠️

Date d'isolement : [14/02/2026] | Détecté par : [Pierre M. - Atelier]
Référence Pièce / Lot : [Lot B-442 / Carter moteur]
Quantité bloquée : [4 pièces]

DESCRIPTION DE LA DEFECTUOSITE :
[Trou de perçage décalé de 3mm - Pièce non assemblable en l'état]

ZONE DE STOCKAGE OBLIGATOIRE : [Bac Rouge Quarantaine Atelier 2]
=================================================================================""",
        "content_type": "text"
    },
    {
        "num": "19",
        "code": "FICHE_FNC_5_POURQUOI",
        "title": "Fiche FNC & Méthode des 5 Pourquoi",
        "clause": "Clause 10.2",
        "q_num": "Q19",
        "utility": "Résoudre un problème grave en remontant à la VRAIE cause profonde pour qu'il ne se reproduise plus JAMAIS.",
        "instructions": "Poser 5 fois de suite la question Pourquoi ? jusqu'à trouver la cause racine organisationnelle.",
        "content_md": """=================================================================================
             FICHE DE RESOLUTION DE PROBLEME (FNC & 5 POURQUOI)
=================================================================================
N° FNC : [FNC-2026-08] | Date : [14/02] | Problème : [Livraison de 10 mauvaises vis]

RECHERCHE DE LA CAUSE RACINE (MÉTHODE DES 5 POURQUOI) :
1. Pourquoi le client a reçu de mauvaises vis ? ──► Car le carton contenait la réf B au lieu de A.
2. Pourquoi le carton contenait la réf B ?     ──► Car le bac de stock contenait les 2 références.
3. Pourquoi le bac contenait les 2 réf ?       ──► Car l'opérateur a mélangé les reliquats.
4. Pourquoi a-t-il mélangé les reliquats ?     ──► Car les bacs ne sont pas étiquetés clairement.
5. Pourquoi les bacs ne sont pas étiquetés ?   ──► CAUSE RACINE : Absence de règle de rangement.

ACTION CORRECTIVE DÉFINITIVE (CAPA) :
- Action : Séparer physiquement les bacs et coller une étiquette code-barres par référence.
- Responsable : Chef de Magasin | Échéance : 20/02 | Statut : 🟢 En cours
=================================================================================""",
        "content_type": "text"
    },
    {
        "num": "20",
        "code": "MATRICE_RACI",
        "title": "Organigramme & Matrice RACI",
        "clause": "Clause 5.3",
        "q_num": "Q20",
        "utility": "Supprimer la dépendance exclusive aux cadres hommes-clés en clarifiant exactement qui fait quoi.",
        "instructions": "Utiliser les lettres : R (Réalise), A (Approuve), C (Consulté), I (Informé).",
        "content_md": """| Tâche ou Activité Clé de l'Entreprise | Dir. Général | Resp. Qualité | Chef d'Atelier | Resp. Commercial |
| :--- | :-: | :-: | :-: | :-: |
| Validation des devis > 10 K€ | **A** | I | I | **R** |
| Traitement d'une réclamation client urgente | I | **A** | C | **R** |
| Lancement d'un ordre de fabrication en atelier | I | I | **R / A** | I |
| Réalisation de l'audit interne annuel | **A** | **R** | C | C |""",
        "content_type": "table"
    },
    {
        "num": "21",
        "code": "CONDUITE_DU_CHANGEMENT",
        "title": "Checklist de Conduite du Changement",
        "clause": "Clause 6.3",
        "q_num": "Q21",
        "utility": "Réussir un changement d'organisation ou d'outil informatique sans bloquer l'activité ni créer de stress.",
        "instructions": "Cocher les 5 étapes dans l'ordre avant de déployer un changement majeur.",
        "content_md": """=================================================================================
                CHECKLIST DE PRÉPARATION D'UN CHANGEMENT MAJEUR
=================================================================================
Projet de Changement : [Mise en place du nouvel ERP Comptable / Gestion]

CHECKLIST D'EXÉCUTION :
[ Oui ] 1. L'objectif et les gains du changement ont-ils été expliqués aux équipes ?
[ Oui ] 2. Les risques de dysfonctionnement ont-ils été identifiés et anticipés ?
[ Oui ] 3. Les utilisateurs ont-ils été formés sur l'outil avant le jour J ?
[ Oui ] 4. Un mode opératoire de secours (papier/excel) est-il prévu en cas de bug ?
[ Oui ] 5. Un bilan à 30 jours est-il planifié avec les utilisateurs ?

VALIDATION DIRECTION : Changement autorisé pour déploiement.
=================================================================================""",
        "content_type": "text"
    },
    {
        "num": "22",
        "code": "MATRICE_COMPETENCES_POLYVALENCE",
        "title": "Matrice des Compétences & Polyvalence",
        "clause": "Clause 7.2",
        "q_num": "Q22",
        "utility": "Visualiser immédiatement qui sait faire quoi et organiser les binômes pour remplacer un absent.",
        "instructions": "Noter de 1 à 4 : 1 = Débutant, 2 = Autonome, 3 = Expert, 4 = Formateur.",
        "content_md": """| Nom du Collaborateur | Poste Découpe Laser | Poste Montage & Soudure | Contrôle Final & Recette | Conduite Chariot Elevateur |
| :--- | :-: | :-: | :-: | :-: |
| **Martin Philippe** | **3 (Expert)** | 2 (Autonome) | 1 (Débutant) | **4 (Formateur)** |
| **Dubois Marc** | 1 (Débutant) | **3 (Expert)** | **2 (Autonome)** | 1 (Débutant) |
| **Leroy Sophie** | 2 (Autonome) | 1 (Débutant) | **4 (Formateur)** | 2 (Autonome) |""",
        "content_type": "table"
    },
    {
        "num": "23",
        "code": "LIVRET_SENSIBILISATION_COUTS_NC",
        "title": "Livret de Sensibilisation aux Coûts NC",
        "clause": "Clause 7.3",
        "q_num": "Q23",
        "utility": "Faire comprendre dès l'embauche que chaque erreur ou jet de pièce coûte directement de l'argent à la société.",
        "instructions": "Faire lire et signer par tout nouveau salarié lors de sa première semaine d'intégration.",
        "content_md": """=================================================================================
             SENSIBILISATION QUALITÉ : COMPRENDRE L'IMPACT DE NOS ERREURS
=================================================================================
Bienvenue chez [Nom de la Société]. Notre qualité est notre meilleure garantie d'emploi.

LE SAVIEZ-VOUS ?
- 1 pièce jetée à la poubelle = La marge de 5 pièces vendues qui s'envole !
- 1 retard de livraison = 1 client mécontent qui peut partir chez le concurrent.
- 1 heure perdue à chercher un outil = 1 heure de production en moins pour l'équipe.

VOTRE RÔLE AU QUOTIDIEN :
1. En cas de doute sur une pièce ──► Arrêter et poser la question au Chef d'Atelier.
2. Si vous voyez un problème ──► Le signaler immédiatement (pas de cache-cache !).

Nom & Signature du Salarié : [Nom & Prénom] | Date : [Date]
=================================================================================""",
        "content_type": "text"
    },
    {
        "num": "24",
        "code": "REUNION_FLASH_5MIN",
        "title": "Trame de Réunion Flash 5 Minutes",
        "clause": "Clause 7.4",
        "q_num": "Q24",
        "utility": "Réaliser un point quotidien debout de 5 minutes chaque matin pour régler les problèmes sans réunionite.",
        "instructions": "Le responsable anime la réunion debout devant le tableau d'affichage à 08h00 pile.",
        "content_md": """=================================================================================
                 RITUEL DE RÉUNION FLASH DU MATIN (5 MIN CHRONO)
=================================================================================
Horaire : 08h00 - 08h05 | Lieu : Tableau d'affichage Atelier | Animateur : Chef Prod

3 POINTS SYSTEMATIQUES À ABORDER :
1. 🛡️ SÉCURITÉ & PROPRETÉ (1 min) : Aucun accident hier ? Zone de passage dégagée ?
2. 📊 BILAN DE LA VEILLE (2 min) : Objectif de pièces atteint hier ? (Oui : 120/120)
3. 🚀 PRIORITÉS DU JOUR (2 min) : Focus sur la commande urgente Client X à sortir à 14h.

RÈGLE D'OR : Les gros sujets techniques sont traités APRÈS la réunion avec les personnes concernées.
=================================================================================""",
        "content_type": "text"
    },
    {
        "num": "25",
        "code": "PLAN_CLASSEMENT_GED",
        "title": "Plan de Classement GED 30 Secondes",
        "clause": "Clause 7.5",
        "q_num": "Q25",
        "utility": "Structurer le serveur informatique de l'entreprise pour que tout le monde trouve un fichier en moins de 30 secondes.",
        "instructions": "Appliquer cette arborescence exacte à 5 dossiers racines sur votre réseau ou Cloud.",
        "content_md": """S:\\SERVEUR_ENTREPRISE\\
├── 📁 01_DIRECTION_STRATEGIE\\       (SWOT, Revues Direction, Risques)
├── 📁 02_COMMERCIAL_CLIENTS\\       (Devis, Contrats, Enquêtes Satisfaction)
├── 📁 03_ACHATS_FOURNISSEURS\\       (Evaluations, Tarifs, Grilles Qualité)
├── 📁 04_OPERATIONS_PRODUCTION\\    (Gammes opératoires, OF, PV Recette, FNC)
└── 📁 05_RH_COMPETENCES\\           (Matrice RACI, Polyvalence, Livret d'accueil)""",
        "content_type": "text"
    },
    {
        "num": "26",
        "code": "AUDIT_INTERNE_ROBUSTESSE",
        "title": "Trame d'Audit Interne de Robustesse",
        "clause": "Clause 9.2",
        "q_num": "Q27",
        "utility": "Auto-évaluer un service de l'entreprise en 30 minutes une fois par an pour repérer les dysfonctionnements.",
        "instructions": "Poser les 4 questions ci-dessous au responsable du service et consigner 2 pistes de progrès.",
        "content_md": """=================================================================================
                 RAPPORT D'AUDIT INTERNE FLASH DE ROBUSTESSE
=================================================================================
Service Audité : [Achats & Approvisionnements] | Date : [14/02] | Auditeur : [QSE]

CONSTATS DE L'AUDITEUR :
[ Conforme ] 1. Les dossiers du service sont-ils classés selon la GED 30s ?
[ Conforme ] 2. Les fournisseurs clés sont-ils évalués au moins 1 fois/an ?
[ Écart    ] 3. Les réclamations fournisseurs sont-elles saisies (Manque 2 fiches) ?

POINTS FORTS : Très bonne réactivité de l'équipe et prix bien négociés.
AXE DE PROGRÈS : Systématiser la saisie des fiches de non-conformité fournisseurs.

Signature Auditeur : [Signature] | Signature Audité : [Signature]
=================================================================================""",
        "content_type": "text"
    }
]

# HTML Template Wrapper
html_template = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Outil {num} - {title} | Cabinet Delacour</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
  :root {{
    --sb-green-dark: #152822;
    --sb-green-light: #4A6C5C;
    --sb-beige: #F0EAD6;
    --sb-cream: #F9F9F7;
    --sb-black: #0A1210;
    --sb-accent: #E2DCCC;
    --gold: #C5A065;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    background-color: var(--sb-cream);
    color: var(--sb-green-dark);
    font-family: 'Montserrat', sans-serif;
    line-height: 1.618;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
  }}
  .container {{
    max-width: 900px;
    margin: 40px auto;
    background: #ffffff;
    padding: 40px;
    border: 1px solid var(--sb-accent);
    box-shadow: 0 10px 30px rgba(10, 18, 16, 0.05);
  }}
  .header-brand {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--gold);
    padding-bottom: 20px;
    margin-bottom: 30px;
  }}
  .brand-logo-title {{
    display: flex;
    align-items: center;
    gap: 15px;
  }}
  .logo-svg {{ width: 48px; height: 42px; }}
  .brand-text h1 {{
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
    color: var(--sb-green-dark);
    margin: 0;
  }}
  .brand-text p {{
    font-size: 11px;
    color: var(--sb-green-light);
    margin: 2px 0 0 0;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-weight: 600;
  }}
  .header-tag {{
    background: var(--sb-green-dark);
    color: var(--sb-beige);
    padding: 6px 14px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    border-radius: 2px;
  }}
  .tool-title-box {{
    background: var(--sb-cream);
    border: 1px solid var(--sb-accent);
    padding: 25px;
    margin-bottom: 30px;
    border-left: 5px solid var(--gold);
  }}
  .tool-title-box h2 {{
    font-family: 'Playfair Display', serif;
    font-size: 24px;
    color: var(--sb-green-dark);
    margin: 0 0 8px 0;
  }}
  .tool-clause {{
    display: inline-block;
    background: var(--sb-green-dark);
    color: var(--gold);
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 2px;
    margin-bottom: 12px;
  }}
  .notice-box {{
    background: #ffffff;
    border: 1px solid var(--sb-accent);
    padding: 15px 20px;
    margin-bottom: 25px;
    font-size: 13px;
  }}
  .notice-box p {{ margin: 4px 0; }}
  .notice-box strong {{ color: var(--sb-green-dark); }}
  
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
    font-size: 12.5px;
  }}
  th {{
    background-color: var(--sb-green-dark);
    color: #ffffff;
    padding: 10px;
    text-align: left;
    font-weight: 600;
    border: 1px solid var(--sb-green-dark);
  }}
  td {{
    padding: 10px;
    border: 1px solid var(--sb-accent);
    vertical-align: top;
  }}
  tr:nth-child(even) td {{ background-color: var(--sb-cream); }}

  pre.template-box {{
    background: #fdfdfd;
    border: 1px solid var(--sb-accent);
    border-left: 4px solid var(--gold);
    padding: 20px;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    margin: 0;
    color: #152822;
  }}
  .footer {{
    text-align: center;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid var(--sb-accent);
    font-size: 11px;
    color: var(--sb-green-light);
  }}
  @media print {{
    body {{ background: #ffffff; }}
    .container {{ border: none; box-shadow: none; padding: 0; margin: 0; max-width: 100%; }}
  }}
</style>
</head>
<body>

<div class="container">

  <!-- Header Branding -->
  <div class="header-brand">
    <div class="brand-logo-title">
      <svg class="logo-svg" viewBox="0 0 100 87" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 3L97 84H3L50 3Z" stroke="#152822" stroke-width="5" stroke-linecap="square" stroke-linejoin="miter"/>
        <path d="M50 25L78 74H22L50 25Z" stroke="#152822" stroke-width="4" stroke-linecap="square" stroke-linejoin="miter"/>
        <path d="M50 49L52 55L58 57L52 59L50 65L48 59L42 57L48 55L50 49Z" fill="#C5A065"/>
      </svg>
      <div class="brand-text">
        <h1>CABINET DELACOUR</h1>
        <p>Stratégie & Performance QHSE - ISO 9001</p>
      </div>
    </div>
    <div class="header-tag">Outil Métier N°{num}</div>
  </div>

  <!-- Title Box -->
  <div class="tool-title-box">
    <span class="tool-clause">{clause} - Question {q_num}</span>
    <h2>Outil {num} : {title}</h2>
  </div>

  <!-- Instructions Notice -->
  <div class="notice-box">
    <p><strong>💡 Utilité Business :</strong> {utility}</p>
    <p><strong>📝 Mode d'emploi Rapide :</strong> {instructions}</p>
  </div>

  <!-- Tool Content Body -->
  <div class="tool-body">
    {body_content}
  </div>

  <!-- Footer -->
  <div class="footer">
    Cabinet Delacour - Consultant Expert Stratégie & Performance QHSE - ISO 9001<br>
    Document Métier Prêt à l'Emploi N°{num}
  </div>

</div>

</body>
</html>
"""

# Generate files for each tool
for tool in tools_data:
    filename_md = f"OUTIL_{tool['num']}_{tool['code']}.md"
    filename_html = f"OUTIL_{tool['num']}_{tool['code']}.html"
    
    path_md = os.path.join(out_dir_md, filename_md)
    path_html = os.path.join(out_dir_html, filename_html)
    
    # Write Markdown file
    md_text = f"""# 🧰 OUTIL {tool['num']} : {tool['title']}

> **Cabinet Delacour — Outil Prêt à l'Emploi**
> **ISO 9001** : {tool['clause']} - **Question d'Audit** : {tool['q_num']}

---

## 💡 UTILITÉ & MODE D'EMPLOI RAPIDE

* **Utilité Business** : {tool['utility']}
* **Mode d'emploi** : {tool['instructions']}

---

## 📝 LE MODÈLE PRÊT À L'EMPLOI

{tool['content_md']}
"""
    with open(path_md, "w", encoding="utf-8") as f:
        f.write(md_text)
        
    # Write HTML file
    if tool['content_type'] == 'text':
        body_content = f"<pre class=\"template-box\">{tool['content_md']}</pre>"
    else:
        # Convert markdown table lines to HTML table
        lines = tool['content_md'].strip().split("\n")
        table_html = "<table>\n"
        # Header
        headers = [h.strip() for h in lines[0].split("|")[1:-1]]
        table_html += "  <tr>\n" + "".join([f"    <th>{h}</th>\n" for h in headers]) + "  </tr>\n"
        # Rows (skip separator line lines[1])
        for row in lines[2:]:
            cells = [c.strip() for c in row.split("|")[1:-1]]
            table_html += "  <tr>\n" + "".join([f"    <td>{c}</td>\n" for c in cells]) + "  </tr>\n"
        table_html += "</table>"
        body_content = table_html
        
    final_html = html_template.format(
        num=tool['num'],
        title=tool['title'],
        clause=tool['clause'],
        q_num=tool['q_num'],
        utility=tool['utility'],
        instructions=tool['instructions'],
        body_content=body_content
    )
    
    with open(path_html, "w", encoding="utf-8") as f:
        f.write(final_html)

print(f"Successfully generated {len(tools_data)} individual Markdown tools in {out_dir_md}")
print(f"Successfully generated {len(tools_data)} individual HTML tools in {out_dir_html}")
