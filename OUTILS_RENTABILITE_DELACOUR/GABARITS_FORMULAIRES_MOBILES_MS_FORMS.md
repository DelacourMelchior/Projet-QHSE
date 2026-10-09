# 📱 Gabarits des 3 Micro-Formulaires Mobiles (Microsoft Forms)
## Le Système Terrain en 3 Clics • Smartphone & Tablette (iOS & Android)

> **Cabinet Delacour - Système Souverain de Management de la Qualité & de la Rentabilité**  
> Objectif : Zéro saisie lourde, zéro mot de passe pour les compagnons, déclenchement flash sur smartphone en 30 secondes chrono.

---

## 🎯 Architecture des 3 Micro-Formulaires

Les 3 formulaires sont créés dans le **Microsoft Forms** de l'entreprise cliente (inclus gratuitement dans son abonnement Microsoft 365) :
1. **Formulaire A : Déclaration Flash Rebut & Bac Rouge (30 secondes)** ➔ Atelier / Chantier (QR code sur machine).
2. **Formulaire B : Fiche Réflexe Avenant & Bon pour Accord (1 minute)** ➔ Commerciaux / Conducteurs de travaux sur mobile.
3. **Formulaire C : Saisie Flash du Chiffre Hebdo du Vendredi (15 secondes)** ➔ Les 5 pilotes de processus avant 17h00.

---

## 🔴 FORMULAIRE A : DÉCLARATION FLASH REBUT & BAC ROUGE (30s)

*Accessible via QR code plastifié au-dessus de chaque bac rouge ou machine.*

| N° | Libellé de la Question | Type de Champ | Options / Valeurs | Règle Opérationnelle |
| :-: | :--- | :---: | :--- | :--- |
| **Q1** | **Photo de la pièce défectueuse** | 📷 **Chargement de fichier** *(Caméra directe)* | 1 photo max (capture instantanée avec le smartphone) | **Obligatoire** : permet au responsable qualité de voir le défaut sans se déplacer immédiatement. |
| **Q2** | **Poste, machine ou chantier concerné** | 📋 **Menu déroulant** | • 01 - Découpe & Débit<br>• 02 - Usinage CNC<br>• 03 - Pliage & Tôlerie<br>• 04 - Soudure & Assemblage<br>• 05 - Finition & Peinture<br>• 06 - Montage Chantier<br>• 07 - Autre | Sélection en 1 clic. |
| **Q3** | **Nature du défaut constaté** | 🔘 **Choix unique** | • Cote hors tolérance plan<br>• Rayure / Défaut d'aspect visuel<br>• Pièce cassée / Fissure matière<br>• Oubli perçage / Usinage incomplet<br>• Mauvaise référence matière utilisée<br>• Erreur de plan / Incompréhension BE<br>• Autre anomalie | Cible immédiatement la famille de cause. |
| **Q4** | **Nombre de pièces suspectes isolées** | 🔢 **Nombre entier** | Chiffre (ex: 1, 5, 25) | Quantité immédiatement confinée dans le bac rouge. |
| **Q5** | **Nom ou prénom de l'opérateur** | ✍️ **Texte court** | Prénom ou matricule | Responsabilisation bienveillante sans blâme. |

### ⚡ Automatisation associée (Microsoft Teams)
- Dès validation du formulaire, une notification automatique est envoyée dans le canal Teams **`05 - Qualité & Amélioration`** :
  > *« 🚨 NOUVEAU REBUT SIGNALÉ : 3 pièces isolées au poste Usinage CNC par Thomas (Motif : Cote hors tolérance). Photo disponible. »*
- La photo et les données alimentent automatiquement le fichier Excel du Coût de Non-Qualité.

---

## ✍️ FORMULAIRE B : FICHE RÉFLEXE AVENANT CLIENT (1 min)

*Utilisé par les commerciaux, métreurs et chefs de chantier sur smartphone pour verrouiller la rentabilité avant d'exécuter un supplément.*

| N° | Libellé de la Question | Type de Champ | Options / Valeurs | Règle Opérationnelle |
| :-: | :--- | :---: | :--- | :--- |
| **Q1** | **Client & Affaire / Chantier concerné** | ✍️ **Texte court** | Ex: *« Client Alpha - Affaire BAT-2026-44 »* | Identification immédiate. |
| **Q2** | **Description de la prestation supplémentaire demandée** | 📝 **Texte long** | Ex: *« Ajout d'une goulotte technique et renfort d'ossature non prévus au devis initial »* | Description précise des travaux non prévus. |
| **Q3** | **Fournitures & matières à racheter (€ HT)** | 🔢 **Nombre (€)** | Ex: *`180`* (0 si aucune fourniture supplémentaire) | Chiffrage minute des achats. |
| **Q4** | **Temps de main-d'œuvre supplémentaire estimé (heures)** | 🔢 **Nombre (H)** | Ex: *`3.5`* | Nombre d'heures MO à valoriser à 55 €/h. |
| **Q5** | **Impact estimé sur le délai promis au client** | 🔘 **Choix unique** | • Zéro impact délai<br>• Décalage de +24h à +48h<br>• Décalage de +1 semaine<br>• Délai à renégocier impérativement | Empêche de subir les pénalités de retard. |
| **Q6** | **Montant HT total proposé au client (€ HT)** | 🔢 **Nombre (€)** | Ex: *`480`* | Montant à faire valider par le client. |
| **Q7** | **Preuve de l'accord client obtenue** | 🔘 **Choix unique** | • Bon pour accord signé par email<br>• SMS de validation client reçu<br>• Devis papier tamponné & signé<br>• Accord oral (confirmation écrite demandée) | **Règle d'or** : « Si c'est pas signé, c'est pas commencé ». |

### ⚡ Automatisation associée (Microsoft Teams)
- Notification instantanée dans le canal **`02 - Commercial & Clients`** et alerte au chef d'atelier pour autoriser le lancement de l'extra.

---

## ⏱️ FORMULAIRE C : SAISIE FLASH DU CHIFFRE HEBDO (15s)

*Rempli chaque vendredi avant 17h00 par les 5 pilotes de macro-processus pour préparer le Cockpit du lundi matin.*

| N° | Libellé de la Question | Type de Champ | Options / Valeurs | Règle Opérationnelle |
| :-: | :--- | :---: | :--- | :--- |
| **Q1** | **Macro-processus que vous mettez à jour** | 📋 **Menu déroulant** | • P1 Direction (Trésorerie nette disponible)<br>• P2 Commercial (Taux transformation devis)<br>• P3 Opérations (Commandes en retard > 48h)<br>• P4 RH (Taux de présence effectif)<br>• P5 Qualité (Coût des rebuts de la semaine) | 1 choix par responsable. |
| **Q2** | **Valeur constatée de votre indicateur cette semaine** | 🔢 **Nombre** | Ex: *`68500`* (€), *`38`* (%), *`1`* (retard), *`1250`* (€) | Valeur brute sans calcul. |
| **Q3** | **Tendance constatée par rapport à la semaine passée** | 🔘 **Choix unique** | • En hausse ↗<br>• Stable ➔<br>• En baisse ↘ | Analyse visuelle immédiate. |
| **Q4** | **Alerte ou point d'attention pour le lundi matin** | ✍️ **Texte court** | Max 1 phrase (ex: *« Attente livraison outillage mardi »*) | Évite les débats en séance. |

---

## 🖨️ Gabarit du Panneau Atelier A4 Plastifié (Affichage QR Code)

*À imprimer et coller au poste de travail ou sur chaque Bac Rouge :*

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                      CABINET DELACOUR  •  QUALITÉ TERRAIN              │
│                                                                        │
│                  🚨 DÉCLARATION FLASH DE NON-CONFORMITÉ                │
│                                                                        │
│   UNE PIÈCE DOUTEUSE ? UN REBUT ?                                      │
│   RÈGLE D'OR : « ON ISOLE SOUS 5 MINUTES SANS JUGER L'OPÉRATEUR »      │
│                                                                        │
│                   ┌───────────────────────────────┐                    │
│                   │                               │                    │
│                   │         █████████████         │                    │
│                   │         ██  QR CODE █         │                    │
│                   │         ██ FORMULAIRE         │                    │
│                   │         ██   REBUT  █         │                    │
│                   │         █████████████         │                    │
│                   │                               │                    │
│                   └───────────────────────────────┘                    │
│                                                                        │
│   1. Visez ce QR Code avec l'appareil photo de votre smartphone        │
│   2. Prenez 1 photo du défaut                                          │
│   3. Cliquez sur "Envoyer"                                             │
│                                                                        │
│   ⏱️ 30 SECONDES CHRONO  •  ZÉRO MOT DE PASSE  •  ZÉRO LOGICIEL LOURD   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```
