# 🟢 Guide d'Intégration & Connexion Google Workspace (Méthode B)
## Synchronisation Bidirectionnelle Officielle Google Identity (OAuth 2.0) & Google Sheets API v4

> **Cabinet Delacour - Conseil de Direction, Performance Opérationnelle & Qualité**  
> Architecture Multi-Cloud Souveraine : 100% Hébergée dans le Domaine Google Workspace du Client

---

## 🎯 1. Principes de Fonctionnement de la Méthode B

La **Méthode B** s'appuie sur les standards officiels de sécurité Google pour les entreprises :

1. **Google Identity Services (GIS - OAuth 2.0)** :
   Le collaborateur ou dirigeant clique sur **« 🔴 Se connecter avec Google »** avec son adresse professionnelle (`nom@entreprise.fr`).
   Aucun mot de passe n'est stocké dans l'application : Google délivre un jeton d'accès sécurisé temporaire.
2. **API Google Sheets v4 en Temps Réel** :
   L'application lit et écrit directement dans les cellules de la feuille Google Sheets partagée sur le Google Drive de l'entreprise.
3. **Miroir Parfait Terrain / Bureautique** :
   - Sur smartphone/Mac : l'application visuelle **DELACOUR QUALITY OS** avec ses feux tricolores, son radar et son pavé tactile.
   - Sur PC bureautique : la feuille **Google Sheets** consultable et modifiable en direct par la comptabilité ou la qualité.

---

## ⚡ 2. Comment Tester la Synchronisation Immédiatement (Mode Démo)

Dans l'application [index.html](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_RENTABILITE_DELACOUR/app/index.html) :

1. Dans la barre supérieure, vérifiez que le sélecteur est positionné sur **« Google Workspace »** (bouton vert actif).
2. Cliquez sur le bouton vert **« Connecteur Google »** (ou sur la pilule verte de statut).
3. Cliquez sur **« Se connecter avec Google »** :
   - L'application simule ou valide l'authentification OAuth 2.0.
   - Le bouton affiche désormais : `Connecté : contact@entreprise-demo.fr ✓`.
4. Cliquez sur **« Tester le flux »** : l'application confirme la liaison REST avec l'API Google Sheets (latence : 35ms).
5. Modifiez un chiffre dans le Cockpit ou déclarez un rebut au Bac Rouge :  
   Une notification verte confirme en direct :  
   *« Synchronisé avec Google Sheets : cellules mises à jour en temps réel sur Google Sheets »*.

---

## 🛠️ 3. Configuration en Production dans le Domaine Google du Client (3 min)

Pour connecter l'application au domaine Google Workspace d'un client lors d'un déploiement :

### Étape 1 : Créer un Projet Google Cloud
1. L'administrateur Google Workspace du client se rend sur [console.cloud.google.com](https://console.cloud.google.com).
2. Crée un nouveau projet : `Delacour Quality OS - [Nom Entreprise]`.

### Étape 2 : Activer l'API Google Sheets
1. Dans le menu de gauche, aller sur **API et services** > **Bibliothèque**.
2. Rechercher **« Google Sheets API »** et cliquer sur **Activer**.

### Étape 3 : Configurer l'Écran de Consentement OAuth
1. Aller sur **API et services** > **Écran de consentement OAuth**.
2. Sélectionner **Interne** (réservé aux utilisateurs du domaine de l'entreprise `@entreprise.fr` : aucune validation publique de Google requise !).
3. Nom de l'application : `Delacour Quality OS`.
4. Renseigner l'e-mail d'assistance et enregistrer.

### Étape 4 : Créer les Identifiants OAuth 2.0
1. Aller sur **Identifiants** > **Créer des identifiants** > **ID client OAuth**.
2. Type d'application : **Application Web**.
3. **Origines JavaScript autorisées** : renseigner l'adresse où l'application est consultée (ex: `https://qualite.entreprise.fr` ou `http://localhost` en local).
4. Cliquer sur **Créer** et copier le **Client ID** généré (ex: `123456789-abc.apps.googleusercontent.com`).

### Étape 5 : Renseigner le Spreadsheet ID dans l'Application
1. Sur Google Drive, ouvrez le classeur Google Sheets du Cockpit Delacour.
2. Copiez l'identifiant présent dans l'URL :
   `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`**`/edit`
3. Dans l'application Delacour, ouvrez la modale **Connecteur Google** et collez :
   - Le **Client ID Google Cloud**
   - Le **Spreadsheet ID**
4. Cliquez sur **Enregistrer les Paramètres**. C'est terminé !

---

## 📊 4. Cartographie des Cellules Synchronisées dans Google Sheets

| Module Applicatif Delacour | Feuille Google Sheets Cible | Plage de Cellules REST |
| :--- | :--- | :--- |
| **P1 Direction (Trésorerie/CA)** | `01_COCKPIT_HEBDO` | `C8` |
| **P2 Commercial (Transfo Devis)** | `01_COCKPIT_HEBDO` | `D8` |
| **P3 Opérations (Livraisons OTD)** | `01_COCKPIT_HEBDO` | `E8` |
| **P4 RH (Absentéisme)** | `01_COCKPIT_HEBDO` | `F8` |
| **P5 Qualité (Rebuts %)** | `01_COCKPIT_HEBDO` | `G8` |
| **Arbitrage Hebdo (Décision)** | `01_COCKPIT_HEBDO` | `C14:E16` |
| **Déclarations Rebuts Flash** | `04_COUT_NON_QUALITE_EUR` | `A4:F50` (Append Row) |
| **Matrice Compétences RH** | `03_MATRICE_COMPETENCES` | `A4:E20` |

---

## 🛡️ 5. Garantie de Souveraineté & RGPD

- **Zéro Intermédiaire** : Les flux REST transitent directement entre le navigateur de l'utilisateur et les serveurs sécurisés de Google Workspace.
- **Droits d'Accès Gérés par le Client** : L'administrateur Google Workspace contrôle précisément qui dans l'entreprise a le droit de lire ou d'éditer la feuille Google Sheets via les partages standards Google Drive.
- **Historique des Versions** : Grâce à Google Sheets, chaque modification faite depuis l'application est versionnée et traçable dans l'historique de la feuille.
