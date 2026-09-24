# Guide de déploiement : Pilotage Delacour dans votre OneDrive ou SharePoint

Ce guide explique comment installer le tableau de pilotage mensuel (outil 1.1) et les Plans B (outil 1.2) dans le cloud Microsoft 365 de votre entreprise, pour que la direction et l'équipe travaillent sur les mêmes chiffres et le même plan d'actions.

**Principe** : l'application est un simple fichier. Vos données restent dans votre propre OneDrive ou SharePoint. Aucun serveur du Cabinet Delacour ni d'un tiers ne les reçoit, et l'application ne fait aucun appel à internet.

---

## 1. Ce que contient le dossier livré

| Élément | Rôle |
|---|---|
| `pilotage.html` | **Indicateurs (outil 1.1)** et **Plans B (outil 1.2)**, avec un plan d'actions commun |
| `index.html` | Page d'accueil qui liste tous les outils |
| `tool_page.html` | Les autres outils (2.1 à 5.3) |
| `GUIDE_DEPLOIEMENT_ONEDRIVE_SHAREPOINT.md` | Ce guide |

Le dossier `donnees` n'est pas livré : il est créé au premier lancement (étape 4).

## 2. Prérequis

- Microsoft 365 avec SharePoint ou OneDrive Entreprise.
- L'application de synchronisation OneDrive sur chaque poste Windows ou Mac (installée par défaut avec Microsoft 365).
- Le navigateur **Microsoft Edge** ou **Google Chrome**. Ce sont les seuls navigateurs qui permettent à l'application d'enregistrer dans un dossier. Safari et Firefox affichent l'application, mais les données restent alors sur le poste.

## 3. Mise en place (une fois, par la direction ou l'administrateur)

1. Dans un site SharePoint (par exemple celui de la direction), créez un dossier **Pilotage Delacour** dans une bibliothèque de documents.
2. Déposez-y les fichiers livrés.
3. Partagez le dossier **Pilotage Delacour** avec les personnes qui saisissent ou consultent les indicateurs (droit de modification).
4. Sur votre poste, cliquez sur **Synchroniser** dans la barre de la bibliothèque SharePoint. Le dossier apparaît dans l'Explorateur Windows (ou le Finder).

## 4. Premier lancement (direction)

1. Dans le dossier synchronisé, faites un clic droit sur `pilotage.html`, puis **Ouvrir avec** et **Microsoft Edge** (ou Chrome).
2. Choisissez **Démarrer mon tableau** : votre métier, 8 à 10 indicateurs, leurs cibles et vos hypothèses (objectif de CA, marge nette, montant moyen d'un devis). Comptez environ 5 minutes.
3. Ouvrez **Réglages** (icône en haut à droite), section **Partage des données** :
   - saisissez votre nom : il signe toutes vos saisies ;
   - cliquez sur **Choisir le dossier de données** ;
   - dans la fenêtre qui s'ouvre, créez un dossier **donnees** dans **Pilotage Delacour**, sélectionnez-le, puis autorisez la modification.
4. L'application propose de créer les sous-dossiers `equipe` et `direction` : acceptez. Elle y publie les données de votre poste.

```
Pilotage Delacour/
├─ pilotage.html
├─ index.html, tool_page.html
└─ donnees/
   ├─ Classeur-de-crise.pdf   fiches réflexes et numéros d'urgence (créé par le bouton Classeur de crise)
   ├─ equipe/      fichiers lisibles par tous (indicateurs, valeurs non confidentielles, actions, risques, annuaire de crise)
   └─ direction/   fichiers réservés : CA, marge, trésorerie, hypothèses financières, coût des arrêts
```

## 5. Protéger le dossier direction (recommandé)

La confidentialité repose sur les droits SharePoint, pas sur l'application.

1. Dans SharePoint, ouvrez `donnees`, puis sélectionnez le dossier **direction**.
2. Ouvrez **Gérer l'accès**, puis les paramètres avancés, et **arrêtez l'héritage des autorisations**.
3. Ne laissez que les membres de la direction (ou un groupe « Direction »).

Une personne sans accès à `direction` ne reçoit pas ce dossier sur son poste : son application passe d'office en **vue équipe**, sans aucun montant confidentiel, et ne peut pas en écrire.

## 6. Installer un collaborateur

1. Le collaborateur clique sur **Synchroniser** dans la bibliothèque SharePoint (étape 3.4).
2. Il ouvre `pilotage.html` avec Edge ou Chrome et choisit **Rejoindre le dossier partagé** : il saisit son nom, puis sélectionne le dossier `donnees` existant.

Conseil : sur chaque poste, faites un clic droit sur le dossier `donnees`, puis **Toujours conserver sur cet appareil**.

## 7. Au quotidien

- **À chaque ouverture**, le navigateur redemande l'accès au dossier : cliquez sur **Reconnecter le dossier** (en haut à droite). C'est une protection du navigateur.
- **Deux outils**, choisis sous le nom de l'entreprise :
  - **Indicateurs** : **Piloter** (synthèse, alertes, graphiques), **Saisir** (les chiffres du mois), **Agir** (plan d'actions et efficacité) ;
  - **Plans B** : **Cartographie** (matrice de criticité, risques à coter, annuaire et classeur de crise), **Tests** (tous les 6 mois en zone rouge, chaque année en zone orange), **Agir**.
- **Un seul plan d'actions** : l'écran Agir réunit les actions correctives des indicateurs et les actions de préparation des Plans B. Filtrez par origine si besoin.
- **Cotez les risques ensemble** : Plans B, **Coter les risques**, puis gravité et probabilité de chaque risque (les définitions sont affichées ; montants et textes réglables dans Réglages). Les risques proposés par l'outil arrivent sans cotation.
- **Classeur de crise** : Plans B, **Classeur de crise**, **Enregistrer dans le dossier partagé**. Le PDF (fiches réflexes, numéros d'urgence, sommaire) est déposé dans `donnees`. Sur chaque téléphone concerné, dans l'application OneDrive, ouvrez-le et choisissez **Rendre disponible hors connexion**. Imprimez-le aussi et rangez-le à l'accueil et près des postes : le jour d'une panne informatique, l'application peut être inaccessible. La cartographie signale quand il faut le refaire (fiche ou numéro modifié).
- **Annuaire de crise** : chaque numéro n'est saisi qu'une fois et sert à toutes les fiches. Préférez les numéros professionnels et prévenez les personnes concernées (RGPD). Cochez **Contacts vérifiés** lors d'un test : la date de vérification se met à jour.
- **Chacun saisit librement.** Chaque personne écrit dans son propre fichier (`pilotage-<nom>.json`) : deux personnes ne peuvent pas s'écraser mutuellement, et OneDrive ne crée pas de copies en conflit.
- **Les chiffres des collègues arrivent** en quelques secondes à quelques minutes, selon la synchronisation OneDrive. L'application relit le dossier quand vous revenez sur la fenêtre ; **Réglages → Actualiser** force la relecture.
- **Si deux personnes modifient la même valeur**, la modification la plus récente est conservée.

## 8. Sauvegarde et historique

- SharePoint conserve l'historique des versions de chaque fichier : en cas d'erreur, restaurez la version précédente depuis SharePoint.
- **Réglages → Exporter une sauvegarde (.json)** produit une copie complète à archiver. Les sauvegardes de l'ancienne version de l'outil 1.1 peuvent être restaurées.

## 9. Reprise de l'ancienne version des outils 1.1 et 1.2

- Données restées sur un poste : au premier lancement de `pilotage.html` dans le même navigateur, le bouton **Reprendre mes données** apparaît.
- Risques de l'ancien outil 1.2 restés sur un poste : ouvrez **Plans B** dans le même navigateur ; la cartographie vide propose **Reprendre les risques de l'ancienne version**. Complétez ensuite chaque fiche (gravité, probabilité, fiche réflexe, test).
- Dossier partagé déjà utilisé par l'ancienne version (fichiers `journal-*.json`) : ils sont lus et convertis automatiquement à la première connexion, puis republiés au nouveau format (`pilotage-*.json`). Les anciens fichiers ne sont ni modifiés ni supprimés.

## 10. Limites actuelles

- Seuls les outils **1.1 et 1.2** partagent leurs données par le dossier. Les autres outils (2.1 à 5.3) enregistrent encore sur le poste de chaque utilisateur.
- Pas de saisie depuis un téléphone sur les données partagées : un navigateur mobile n'a pas accès au dossier synchronisé.
- L'écriture dans le dossier nécessite Edge ou Chrome.

## 11. Dépannage

| Symptôme | Solution |
|---|---|
| « Ce dossier ne contient pas de sous-dossier equipe » | Vous avez choisi `Pilotage Delacour` au lieu de `donnees` : recommencez en sélectionnant `donnees`. |
| « Sur ce poste » en haut à droite | Aucun dossier n'est connecté : **Réglages → Choisir le dossier de données**. |
| Les chiffres d'un collègue n'apparaissent pas | Vérifiez que l'icône OneDrive indique « à jour », puis **Réglages → Actualiser**. |
| Montants « Masqué » et bouton Vue direction grisé | Vous n'avez pas accès au dossier `direction` : c'est voulu (étape 5). |
| Bouton « Choisir le dossier » absent | Vous utilisez Safari ou Firefox : ouvrez le fichier avec Edge ou Chrome. |
