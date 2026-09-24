# 🔷 Guide d'Intégration & Connexion Microsoft 365 (Temps Réel)
## Synchronisation Bidirectionnelle entre « DELACOUR QUALITY OS » et le Classeur Excel SharePoint

> **Cabinet Delacour - Conseil de Direction, Performance Opérationnelle & Qualité**  
> Architecture Souveraine Temps Réel : Zéro Cloud Tiers • 100% Hébergé dans le Tenant Client

---

## 🎯 1. Pourquoi cette Architecture est Révolutionnaire

Cette connexion résout le plus grand dilemme des entreprises en matière de transformation digitale :

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             LE DOUBLE ACCÈS « MIROIR » DELACOUR                                   │
├──────────────────────────────────────────────────┬───────────────────────────────────────────────┤
│ 📱 CÔTÉ TERRAIN & DIRIGEANTS                     │ 💻 CÔTÉ GESTION & COMPTABILITÉ                │
│ • Interface moderne « DELACOUR QUALITY OS »      │ • Le classeur Excel habituel sur Teams        │
│ • Feux 🟢🟡🔴, photos des rebuts, signature      │ • Tableaux croisés dynamiques, filtres        │
│ • Utilisable sur smartphone, tablette et Mac     │ • Confort bureautique sur PC Windows          │
└──────────────────────────────────────────────────┴───────────────────────────────────────────────┘
                                   ▲                                 ▲
                                   └───────────────┬─────────────────┘
                                                   │
                                      API MICROSOFT GRAPH (M365)
                                          SYNCHRO EN DIRECT
```

1. **Une Source Unique de Vérité** :
   Le classeur Excel `COCKPIT_PILOTAGE_ET_RENTABILITE_DELACOUR.xlsx` stocké dans SharePoint est la base de données centrale.
2. **Temps Réel Collaboratif** :
   Dès qu'un opérateur valide un rebut à l'atelier sur son iPhone, la ligne s'écrit dans Excel et apparaît sur le tableau de bord du dirigeant.
3. **Souveraineté & Sécurité RGPD Totales** :
   Les données ne passent par **aucun serveur externe**. La communication se fait exclusivement entre le navigateur de l'utilisateur et le compte Microsoft 365 de l'entreprise.

---

## ⚡ 2. Comment Tester la Synchronisation Immédiatement (Mode Démo)

Dans l'application [index.html](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_RENTABILITE_DELACOUR/app/index.html) :

1. En haut à droite, cliquez sur le bouton bleu **« Connecteur M365 »** (ou sur la pilule verte **« Synchro M365 : En Direct »**).
2. La fenêtre de configuration s'ouvre.
3. Cliquez sur **« Tester le flux »** : l'application vérifie la latence et confirme la liaison avec le classeur `COCKPIT_PILOTAGE.xlsx`.
4. À chaque fois que vous modifiez un chiffre dans le Cockpit, déclarez un rebut ou signez un avenant, un badge de notification apparaît :
   *« Classeur Excel Synchronisé : modifications transmises en temps réel sur SharePoint »*.

---

## 🛠️ 3. Configuration Express dans le Tenant Microsoft 365 du Client (3 min)

Pour connecter l'application au tenant de production d'un client lors d'un déploiement :

### Étape 1 : Enregistrer l'Application dans Microsoft Entra ID (Azure AD)
1. L'administrateur informatique du client se rend sur [portal.azure.com](https://portal.azure.com) > **Microsoft Entra ID** > **Inscriptions d'applications** > **Nouvelle inscription**.
2. **Nom** : `Delacour Quality OS`.
3. **Types de comptes pris en charge** : *Comptes dans cet annuaire organisationnel uniquement (Locataire unique)*.
4. **URI de redirection** : Sélectionner *Application monopage (SPA)* et renseigner l'URL locale ou intranet de l'application (ex: `https://qualite.entreprise.fr` ou `http://localhost`).
5. Cliquer sur **Inscrire**.

### Étape 2 : Déclarer les Autorisations Microsoft Graph
1. Dans le menu de gauche, aller sur **Autorisations d'API** > **Ajouter une autorisation** > **Microsoft Graph** > **Autorisations déléguées**.
2. Cocher :
   - `Files.ReadWrite` (permet de lire et d'écrire dans les classeurs Excel du SharePoint).
   - `User.Read` (permet d'afficher le nom du collaborateur connecté).
3. Cliquer sur **Accorder le consentement de l'administrateur**.

### Étape 3 : Renseigner les Identifiants dans l'Application
1. Copier l'**ID d'application (client)** et l'**ID de l'annuaire (locataire)**.
2. Dans l'application Delacour, ouvrir la modale **Connecteur M365** et coller ces 2 identifiants.
3. Cliquer sur **Enregistrer les Paramètres**.

---

## 📂 4. Cartographie des Flux de Données (Onglet par Onglet)

| Module dans l'Application | Onglet Cible dans le Classeur Excel M365 | Type d'Action |
| :--- | :--- | :--- |
| **Cockpit Hebdo 08h30** | `01_COCKPIT_HEBDO` (Cellules C8:G8) | Lecture & Écriture instantanée des 5 taux réels |
| **Arbitrage Majeur** | `01_COCKPIT_HEBDO` (Lignes 14-16) | Enregistrement de la décision, pilote et date butoir |
| **Suivi 10 KPIs** | `02_SUIVI_ANNUEL_M01_M12` | Actualisation des 5 Moteurs et 5 Garde-Fous |
| **Bac Rouge / Rebuts** | `04_COUT_NON_QUALITE_EUR` (Tableau Rebuts) | Ajout automatique d'une ligne horodatée avec coût calculé |
| **Matrice RH** | `03_MATRICE_COMPETENCES_RH` | Synchronisation des niveaux 0 à 4 et alertes Homme-Clé |
| **Avenant Client** | Équipe Teams / Canal Commercial / Avenants | Archivage du bon pour accord signé et horodaté |

---

## 💡 5. Alternative Hors-Ligne : Le Glisser-Déposer Direct

Si vous intervenez chez un client sans accès Internet ou sur un poste isolé :
1. Ouvrez la modale **« Connecteur M365 »**.
2. Glissez-déposez simplement le fichier [COCKPIT_PILOTAGE_ET_RENTABILITE_DELACOUR.xlsx](file:///Users/delacourmelchior/Site%20Internet%20Cabinet%20Delacour/Projet-QHSE/OUTILS_RENTABILITE_DELACOUR/COCKPIT_PILOTAGE_ET_RENTABILITE_DELACOUR.xlsx) dans la zone dédiée.
3. L'application lit directement le fichier localement grâce au moteur intégré `SheetJS`.
4. Le bouton **« Télécharger en .xlsx »** vous permet d'exporter le fichier mis à jour à la fin de la séance de travail.
