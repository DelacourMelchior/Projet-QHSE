# 📱 DELACOUR QUALITY OS | Guide de Prise en Main & Déploiement

> **Cabinet Delacour - Conseil de Direction, Performance Opérationnelle & Qualité**  
> Application Web & Mobile Universelle (Mac, PC, iPhone, Android, iPad)

---

## ⚡ 1. Comment Lancer l'Application sur votre Mac (Immédiat)

L'application est **100% autonome et prête à l'emploi**. Elle ne nécessite aucune installation de serveur ni abonnement tiers.

### Méthode 1 : En 1 Clic depuis votre Finder
1. Ouvrez votre Finder et rendez-vous dans le dossier :
   `OUTILS_RENTABILITE_DELACOUR/app/`
2. **Double-cliquez** simplement sur le fichier **`index.html`**.
3. L'application s'ouvre immédiatement dans votre navigateur par défaut (Safari, Google Chrome, Brave...).

### Méthode 2 : En 1 Ligne de Commande Terminal
Exécutez simplement :
```bash
open "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_RENTABILITE_DELACOUR/app/index.html"
```

---

## 📲 2. Comment l'Utiliser sur iPhone, iPad & Android (Mode App Native PWA)

L'application est conçue en **Mobile-First Responsive** : tous les formulaires (Rebut Flash, Avenant, Cockpit) sont optimisés pour smartphone.

### Sur iPhone / iPad (Safari) :
1. Envoyez-vous le lien ou hébergez le fichier `index.html` sur votre espace web / intranet.
2. Ouvrez la page dans **Safari**.
3. Appuyez sur l'icône **Partager** (le carré avec la flèche vers le haut).
4. Sélectionnez **« Sur l'écran d'accueil »** (Add to Home Screen).
5. L'icône Delacour apparaît sur l'écran d'accueil de votre iPhone : elle se lance en plein écran comme une vraie application de l'App Store !

### Sur Android (Chrome) :
1. Ouvrez la page dans **Google Chrome**.
2. Appuyez sur les **3 petits points** en haut à droite.
3. Sélectionnez **« Installer l'application »** ou **« Ajouter à l'écran d'accueil »**.

---

## 🛡️ 3. Sécurité, Souveraineté & Données RGPD (Local-First)

- **Zéro Cloud Tiers** : Aucune donnée confidentielle (noms des salariés, coûts de rebuts, réclamations) n'est envoyée sur des serveurs externes.
- **Stockage Local Sécurisé (`localStorage`)** : Vos saisies restent enregistrées dans votre navigateur, même si vous fermez l'onglet ou redémarrez votre ordinateur.
- **Sauvegarde & Restauration Client (Boutons en haut à droite)** :
  - **« Sauvegarder JSON »** : Exporte instantanément l'intégralité du dossier client sous forme de fichier `.json` horodaté (ex: `DELACOUR_OS_entreprise_demo_2026-09-15.json`).
  - **« Charger »** : Permet de basculer d'un client à l'autre en 2 secondes en chargeant son fichier JSON.
  - **« Imprimer / PDF »** : Génère une mise en page d'impression épurée pour les comités de direction.

---

## 🎛️ 4. Les 11 Outils Indispensables du Pack Essentiel (Zéro Doublon)

Le système a été condensé en **11 outils vitaux**, avec une numérotation continue et cohérente par macro-processus :

| Macro-Processus | Outils Conservés & Rôle Métier | Réf. SOP |
| :--- | :--- | :--- |
| **P1 Direction** | **1.1** Cockpit des Indicateurs Clés & Pilotage Hebdo (08h30)<br>**1.2** Plan de Continuité & Solutions de Repli (Plan B sous 2h) | DELACOUR-SOP-P1-01<br>DELACOUR-SOP-P1-02 |
| **P2 Commercial** | **2.1** Grille de Faisabilité & Marge Devis (Calcul automatique %)<br>**2.2** Fiche Réflexe Avenant & Accord Client Signé<br>**2.3** Registre Réclamations & Alerte 48h | DELACOUR-SOP-P2-01<br>DELACOUR-SOP-P2-02<br>DELACOUR-SOP-P2-03 |
| **P3 Opérations** | **3.1** Notation Fournisseurs & Fiche Débit (Export Word 1 clic)<br>**3.2** Barrière Autocontrôle & Libération 95/5 *(ex-3.4)* | DELACOUR-SOP-P3-01<br>DELACOUR-SOP-P3-02 |
| **P4 RH & Org.** | **4.1** Matrice des Suppléances d'Urgence (Doublures sous 1h)<br>**4.2** Matrice de Polyvalence (0 à 4) & Alerte Homme-Clé | DELACOUR-SOP-P4-01<br>DELACOUR-SOP-P4-02 |
| **P5 Qualité** | **5.1** Protocole Quarantaine Bac Rouge (Isolement < 5 min)<br>**5.2** Chiffrage Coût Non-Qualité (€ réels via taux horaire atelier) | DELACOUR-SOP-P5-01<br>DELACOUR-SOP-P5-02 |

---

## 📄 5. Le Générateur & Studio A4 Multi-Instances

Chacun des **11 outils indispensables** dispose dans l'application d'un **générateur de documents A4 opérationnels** :
1. **Saisie Ultra-Simple & Enregistrement Direct** : Modification directe des cellules avec auto-enregistrement temps réel dans le navigateur.
2. **Archivage & Historisation Multi-Fiches** : Possibilité de créer des fiches vierges (`+ Nouvelle Fiche`), de dupliquer des fiches existantes, d'archiver sous un nom personnalisé et de comparer les écarts (`📊 Écart`).
3. **Calculs Automatisés en Direct** : Marge brute et seuils de rentabilité sur le Devis 2.1, Coût de non-qualité valorisé en € sur le 5.2.
4. **Exports Officiels Multi-Formats** : Export Excel (.xlsx), Document Word (.doc), Synthèse Mail/Slack en 1 clic, et Lettre de Débit fournisseur officielle sur l'Outil 3.1.

---

## ⚙️ 6. Paramétrage Cloud Discret (Effectué 1 Seule Fois)

Conformément aux exigences de sobriété opérationnelle :
- Les boutons encombrants de connexion Cloud ont été **retirés de l'écran principal**.
- La configuration se fait **une seule fois** via le bouton discret **`⚙️ Paramètres & Connexion Cloud`** situé tout en bas de la barre latérale gauche.
- Une fois configuré (avec l'ID de votre classeur Google Sheets ou Microsoft Excel SharePoint), l'application synchronise vos données de manière invisible en tâche de fond, avec un indicateur vert discret dans le bandeau supérieur.

---

## 💼 7. Utilisation en Rendez-Vous Client (Démo Consultant)

Pour impressionner un dirigeant de PME lors d'un audit de cadrage ou d'un premier entretien :
1. Ouvrez l'application sur votre MacBook ou iPad (`index.html`).
2. Allez sur **« Audit SMQ (20 Questions) »** et cochez les notes en direct avec lui.
3. Montrez-lui le **Radar de maturité qui s'ajuste en temps réel** et les 3 chantiers prioritaires qui s'affichent automatiquement.
4. Allez sur **« Coût Non-Qualité »**, saisissez ses heures de retouche et montrez-lui le **CA compensatoire qu'il perd chaque mois**.
5. Allez sur **« Studio des 20 Outils »**, sélectionnez un outil (ex: Fiche Avenant 2.2 ou Débit Fournisseur 3.1), saisissez 3 chiffres et cliquez sur **« Générer le Document Officiel A4 »** : le dirigeant voit immédiatement le document juridique prêt à être signé et archivé.
6. Effet d'impact garanti dès les 10 premières minutes !

