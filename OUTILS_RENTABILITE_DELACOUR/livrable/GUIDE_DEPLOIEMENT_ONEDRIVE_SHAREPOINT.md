# Guide de déploiement : Pilotage Delacour dans votre OneDrive ou SharePoint

Ce guide explique comment installer l'outil de pilotage (outil 1.1, tableau de suivi des indicateurs) dans le cloud Microsoft 365 de votre entreprise, pour que la direction et l'équipe travaillent sur les mêmes chiffres.

**Principe** : l'application est un simple fichier. Vos données restent dans votre propre OneDrive ou SharePoint. Aucun serveur du Cabinet Delacour ni d'un tiers ne les reçoit, et l'application ne fait aucun appel à internet.

---

## 1. Ce que contient le dossier livré

| Élément | Rôle |
|---|---|
| `index.html` | Page d'accueil qui liste les outils |
| `tool_page.html` | L'application (les 13 outils) |
| `GUIDE_DEPLOIEMENT_ONEDRIVE_SHAREPOINT.md` | Ce guide |

Le dossier `donnees` n'est pas livré : il est créé au premier lancement (voir étape 4).

## 2. Prérequis

- Microsoft 365 avec SharePoint ou OneDrive Entreprise.
- L'application de synchronisation OneDrive sur chaque poste Windows ou Mac (installée par défaut avec Microsoft 365).
- Le navigateur **Microsoft Edge** ou **Google Chrome**. Ce sont les seuls navigateurs qui permettent à l'application d'enregistrer dans un dossier. Safari et Firefox affichent l'application, mais les données restent alors sur le poste.

## 3. Mise en place (une fois, par la direction ou l'administrateur)

1. Dans un site SharePoint (par exemple le site de la direction), créez un dossier **Pilotage Delacour** dans une bibliothèque de documents.
2. Déposez-y `index.html`, `tool_page.html` et ce guide.
3. Partagez le dossier **Pilotage Delacour** avec les personnes qui doivent saisir ou consulter les indicateurs (droit de modification).
4. Sur votre poste, cliquez sur **Synchroniser** dans la barre de la bibliothèque SharePoint. Le dossier apparaît dans l'Explorateur Windows (ou le Finder), sous le nom de votre entreprise.

## 4. Premier lancement (direction)

1. Dans le dossier synchronisé, faites un clic droit sur `index.html`, puis **Ouvrir avec** et **Microsoft Edge** (ou Chrome).
2. Ouvrez l'outil **1.1 Tableau de suivi des indicateurs**.
3. Cliquez sur **Mon entreprise** (en haut à droite), puis, dans **Partage des données** :
   - saisissez votre nom : il signe toutes vos saisies ;
   - cliquez sur **Choisir le dossier de données** ;
   - dans la fenêtre qui s'ouvre, créez un dossier **donnees** dans **Pilotage Delacour**, sélectionnez-le, puis autorisez la modification.
4. L'application propose de créer les sous-dossiers `equipe` et `direction` : acceptez. Elle y publie les données déjà présentes sur votre poste (hypothèses, KPI, valeurs, actions).

Le dossier ressemble alors à ceci :

```
Pilotage Delacour/
├─ index.html
├─ tool_page.html
└─ donnees/
   ├─ equipe/      journaux lisibles par tous (KPI, valeurs non confidentielles, actions)
   └─ direction/   journaux réservés : CA, marge, trésorerie, hypothèses financières
```

## 5. Protéger le dossier direction (recommandé)

La confidentialité repose sur les droits SharePoint, pas sur l'application.

1. Dans SharePoint, ouvrez `donnees`, puis sélectionnez le dossier **direction**.
2. Ouvrez **Gérer l'accès**, puis les paramètres avancés, et **arrêtez l'héritage des autorisations**.
3. Ne laissez que les membres de la direction (ou un groupe « Direction »).

Une personne sans accès à `direction` ne reçoit pas ce dossier sur son poste. Son application affiche la vue équipe, sans aucun montant confidentiel. Elle ne peut pas non plus écrire de montant confidentiel par erreur.

## 6. Installer un collaborateur

1. Le collaborateur clique sur **Synchroniser** dans la bibliothèque SharePoint (étape 3.4).
2. Il ouvre `index.html` avec Edge ou Chrome, puis l'outil 1.1.
3. Dans **Mon entreprise**, il saisit son nom, clique sur **Choisir le dossier de données** et sélectionne le dossier `donnees` existant.

Conseil : sur chaque poste, faites un clic droit sur le dossier `donnees`, puis **Toujours conserver sur cet appareil**. Les fichiers sont ainsi toujours disponibles, même hors connexion.

## 7. Au quotidien

- **À chaque ouverture**, le navigateur redemande l'accès au dossier : cliquez sur **Reconnecter le dossier** (en haut à droite). C'est une protection du navigateur.
- **Chacun saisit librement.** Chaque personne écrit dans son propre fichier (`journal-<nom>.json`) : deux personnes ne peuvent pas s'écraser mutuellement, et OneDrive ne crée pas de copies en conflit.
- **Les chiffres des collègues arrivent** au bout de quelques secondes à quelques minutes, selon la synchronisation OneDrive. L'application relit le dossier quand vous revenez sur l'onglet ; le bouton **Actualiser** force la relecture.
- **Si deux personnes modifient la même valeur**, c'est la modification la plus récente qui est conservée.

## 8. Sauvegarde et historique

- SharePoint conserve l'historique des versions de chaque fichier : en cas d'erreur, restaurez la version précédente d'un journal depuis SharePoint.
- **Mon entreprise**, puis **Exporter une sauvegarde (.json)**, produit une copie complète à archiver.

## 9. Limites actuelles

- Seul l'outil **1.1** partage ses données par le dossier. Les autres outils (1.2 à 5.3) enregistrent encore sur le poste de chaque utilisateur.
- Pas de saisie depuis un téléphone : un navigateur mobile n'a pas accès au dossier synchronisé.
- L'écriture dans le dossier nécessite Edge ou Chrome.

## 10. Dépannage

| Symptôme | Solution |
|---|---|
| « Le dossier choisi ne contient pas de sous-dossier equipe » | Vous avez choisi `Pilotage Delacour` au lieu de `donnees` : recommencez en sélectionnant `donnees`. |
| « Données sur ce poste » en haut à droite | Aucun dossier n'est connecté : **Mon entreprise**, puis **Choisir le dossier de données**. |
| Les chiffres d'un collègue n'apparaissent pas | Vérifiez que l'icône OneDrive indique « à jour », puis cliquez sur **Actualiser**. |
| Montants affichés « Confidentiel » ou vides | Vous n'avez pas accès au dossier `direction` : c'est voulu (étape 5). |
| Bouton « Choisir le dossier » sans effet | Vous utilisez Safari ou Firefox : ouvrez le fichier avec Edge ou Chrome. |
