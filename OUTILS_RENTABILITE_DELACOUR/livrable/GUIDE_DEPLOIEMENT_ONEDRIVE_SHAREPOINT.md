# Guide de déploiement : Pilotage Delacour dans votre OneDrive ou SharePoint

Ce guide explique comment installer les 19 outils Delacour (pilotage, Plans B, annuaire, devis, avenants, réclamations, fournisseurs, instructions de poste, maintenance, réceptions, suppléances, polyvalence, accueil, classement, bac rouge, non-qualité, 5 Pourquoi, détrompeurs) dans le cloud Microsoft 365 de votre entreprise, pour que la direction et l'équipe travaillent sur les mêmes données et le même plan d'actions.

**Principe** : l'application est un simple fichier. Vos données restent dans votre propre OneDrive ou SharePoint. Aucun serveur du Cabinet Delacour ni d'un tiers ne les reçoit, et l'application ne fait aucun appel à internet.

---

## 1. Ce que contient le dossier livré

| Élément | Rôle |
|---|---|
| `pilotage.html` | **Les 19 outils**, rangés par processus (P1 Pilotage, P2 Commercial, P3 Opérations, P4 RH, P5 Qualité), avec un plan d'actions commun |
| `index.html` | Raccourci qui ouvre `pilotage.html` sur la liste des outils |
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
├─ index.html
└─ donnees/
   ├─ equipe/      fichiers lisibles par tous (indicateurs, valeurs non confidentielles, actions, risques, annuaire,
   │               devis sans leurs coûts, réclamations, bac rouge, fournisseurs, instructions de poste, compétences…)
   ├─ direction/   fichiers réservés : CA, marge, trésorerie, hypothèses financières, coût des arrêts, coûts et marges des devis,
   │               emplacement des codes d'accès et de l'enveloppe scellée (suppléances)
   └─ photos/      les photos des fiches (une image par fichier)
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
- **L'accueil** (le carré D en haut à gauche) montre les 19 outils, chacun avec ce qui demande attention aujourd'hui (devis à relancer, client à rappeler, pièce en quarantaine depuis plus de 24 h…).
- **Les processus**, sous le nom de l'entreprise : **Pilotage**, **Commercial**, **Opérations**, **RH**, **Qualité**. Chaque processus affiche ses outils en onglets, avec un compteur rouge ou orange quand il y a quelque chose à faire :
  - **Pilotage** : **Indicateurs** (synthèse, alertes, graphiques), **Saisie** (les chiffres du mois), **Plans B** (matrice de criticité, tests, fiches réflexes en PDF), **Annuaire** (numéros de crise) ;
  - **Commercial** : **Devis** (5 verrous, marge, visas, relance à 7 jours), **Avenants** (message à valider par « OK » avant de faire, puis facture), **Réclamations** (rappel sous 48 h, processus en cause), **Bilan de fin** (3 questions, facture sous 24 h) ;
  - **Opérations** : **Fournisseurs** (fiche de débit sous 48 h, note annuelle A, B, C), **Instructions** (fiche A4 avec photos, versions, personnes habilitées), **Maintenance** (routine du lundi, armoire de survie), **Réceptions** (jalons, PV de réception, retenue de 5 % au plus) ;
  - **RH** : **Suppléances** (2 suppléants entraînés, enveloppe des accès), **Polyvalence** (matrice 0 à 4, homme-clé), **Accueil** (parcours de 15 jours, test en 3 questions), **Classement** (nom des fichiers, plan de classement, test des 30 secondes) ;
  - **Qualité** : **Bac rouge** (étiquette, décision sous 24 h), **Non-qualité** (coût du mois par processus), **5 Pourquoi** (cause racine sans coupable), **Détrompeurs** (contrôle sur le terrain à J+30).
- **Mes tâches** (en haut à droite) : tout ce que chacun a à faire dans les 19 outils, par échéance. **Agenda** produit un fichier à ouvrir dans Outlook ou Google Agenda ; **Semaine (PDF)** une liste à imprimer.
- **Rapport du mois** (accueil) : chiffres clés et état de chaque outil pour la réunion de direction.
- **Saisie depuis un téléphone** : les saisies restent sur le téléphone ; exportez la sauvegarde dans OneDrive, puis sur un poste connecté : **Réglages, Fusionner un fichier de saisies**.
- **Droits** : dans Réglages, choisir les outils réservés à la direction et si l'équipe peut supprimer des fiches ; le journal montre qui a modifié quoi.
- **Un seul plan d'actions** : l'onglet Actions de chaque processus montre les actions créées depuis ses outils ; le filtre permet de tout afficher.
- **Les outils se complètent** : une réclamation ouvre une fiche du bac rouge et un atelier 5 Pourquoi, un défaut fournisseur devient une fiche de débit, le coût de chaque fiche remonte dans la non-qualité. Les chiffres calculés (coût de non-qualité, réclamations, devis, postes doublés) sont proposés dans l'écran **Saisie** du tableau de pilotage : un clic sur **Reprendre** les recopie.
- **Imprimer** : chaque outil produit ses documents (PDF ou impression A4) : étiquettes du bac rouge, fiche de débit, bon pour accord d'un avenant, PV de réception, instruction de poste, feuille de routine d'une machine, parcours d'accueil, charte de classement.
- **Cotez les risques ensemble** : Plans B, **Coter les risques**, puis gravité et probabilité de chaque risque (les définitions sont affichées ; montants et textes réglables dans Réglages). Les risques proposés par l'outil arrivent sans cotation.
- **Fiches réflexes** : Plans B, **Fiches réflexes (PDF)**. Imprimez-les et gardez-en une copie papier près des postes : le jour d'une panne informatique, l'application peut être inaccessible.
- **Annuaire** : chaque numéro n'est saisi qu'une fois et sert à toutes les fiches réflexes. Deux vues : **En cas de crise** (organigramme interne avec « si absent », et chaînes d'appel de l'extérieur : qui appeler si ça ne répond pas, imprimable en A4 paysage) et **Liste et saisie** (second numéro, horaires, référence à donner à l'appel, contact vital, relais, rattachement). La consigne ou le mot de passe à dire à l'appel reste dans le dossier `direction`. Remplissez l'adresse du site et l'accès pour les secours. **Vers les contacts du téléphone** crée un fichier .vcf à ouvrir sur le téléphone ; **Carte de poche** imprime 4 cartes à découper avec les numéros vitaux. Chaque mois, 4 numéros à vérifier arrivent dans « Mes tâches ». Préférez les numéros professionnels et prévenez les personnes concernées (RGPD).
- **Chacun saisit librement.** Chaque personne écrit dans son propre fichier (`pilotage-<nom>.json`) : deux personnes ne peuvent pas s'écraser mutuellement, et OneDrive ne crée pas de copies en conflit.
- **Les chiffres des collègues arrivent** en quelques secondes à quelques minutes, selon la synchronisation OneDrive. L'application relit le dossier quand vous revenez sur la fenêtre ; **Réglages → Actualiser** force la relecture.
- **Si deux personnes modifient la même valeur**, la modification la plus récente est conservée.

## 8. Sauvegarde et historique

- SharePoint conserve l'historique des versions de chaque fichier : en cas d'erreur, restaurez la version précédente depuis SharePoint.
- **Réglages → Exporter une sauvegarde (.json)** produit une copie complète des 19 outils, à archiver. Les sauvegardes de l'ancienne version de l'outil 1.1 peuvent être restaurées.

## 9. Reprise de l'ancienne version

- Données restées sur un poste : au premier lancement de `pilotage.html` dans le même navigateur, le bouton **Reprendre mes données** apparaît.
- Risques de l'ancien outil 1.2 restés sur un poste : ouvrez **Plans B** dans le même navigateur ; la cartographie vide propose **Reprendre les risques de l'ancienne version**. Complétez ensuite chaque fiche (gravité, probabilité, fiche réflexe, test).
- Tableaux des anciens outils 2.1 à 5.3 restés sur un poste (devis, avenants, réclamations, fournisseurs, autocontrôle, suppléances, polyvalence, bac rouge, coût de non-qualité, ateliers 5 Pourquoi) : ouvrez **Réglages** dans le même navigateur ; la section **Ancienne version des outils 2 à 5** indique ce qui a été trouvé et propose **Reprendre ces données**. Rien n'est effacé ; vérifiez ensuite chaque outil. L'ancienne « fiche de poste » (3.3) n'a pas d'équivalent : ses informations se retrouvent dans les instructions de poste (3.2) et la polyvalence (4.2).
- Dossier partagé déjà utilisé par l'ancienne version (fichiers `journal-*.json`) : ils sont lus et convertis automatiquement à la première connexion, puis republiés au nouveau format (`pilotage-*.json`). Les anciens fichiers ne sont ni modifiés ni supprimés.

## 10. Limites actuelles

- Pas de saisie depuis un téléphone sur les données partagées : un navigateur mobile n'a pas accès au dossier synchronisé.
- L'écriture dans le dossier nécessite Edge ou Chrome.
- Les photos des instructions de poste alourdissent les fichiers partagés (environ 60 Ko par photo) : quelques photos par poste suffisent.

## 11. Dépannage

| Symptôme | Solution |
|---|---|
| « Ce dossier ne contient pas de sous-dossier equipe » | Vous avez choisi `Pilotage Delacour` au lieu de `donnees` : recommencez en sélectionnant `donnees`. |
| « Sur ce poste » en haut à droite | Aucun dossier n'est connecté : **Réglages → Choisir le dossier de données**. |
| Les chiffres d'un collègue n'apparaissent pas | Vérifiez que l'icône OneDrive indique « à jour », puis **Réglages → Actualiser**. |
| Montants « Masqué » et bouton Vue direction grisé | Vous n'avez pas accès au dossier `direction` : c'est voulu (étape 5). |
| Bouton « Choisir le dossier » absent | Vous utilisez Safari ou Firefox : ouvrez le fichier avec Edge ou Chrome. |
