# Scénario de démonstration : outil 1.1 en 5 minutes

Usage interne (consultant). Objectif : qu'un dirigeant de PME se voie piloter son entreprise avec l'outil, et comprenne que ses données restent chez lui.

## Préparation (la veille)

1. Construire le livrable : `python3 execution/build_outils_app.py`.
2. Ouvrir `livrable/tool_page.html?tool=1.1` dans Edge ou Chrome.
3. **Mon entreprise**, puis **Charger l'exemple de démonstration** (année 2026 complète, 13 actions).
4. Facultatif, pour montrer le partage : connecter un dossier OneDrive de test contenant `donnees/`, et avoir un second navigateur ou un collègue connecté au même dossier.

## Déroulé

**1. La synthèse (1 min) : « Où en est-on ? »**
- Quatre chiffres : CA cumulé comparé à l'objectif à date, marge, trésorerie, KPI en alerte.
- Question au dirigeant : « Combien de temps vous faut-il aujourd'hui pour avoir ces 4 chiffres ? »
- Montrer que les hypothèses (objectif annuel, marge nette, montant moyen d'un devis) sont les siennes : **Mon entreprise**.

**2. Une alerte (1 min) : « Où agir ? »**
- Badge rouge sur P2, ligne « Prise de commandes » en dérive.
- Règle du cabinet : pas de dérive sans pilote nommé ni date. Montrer le message « sans pilote ».

**3. La fiche action (1 min 30) : « Qui fait quoi, pour quand ? »**
- Cliquer sur **Action requise** : 5 pourquoi, puis le plan 5M (main-d'œuvre, méthode, matériel, matière, milieu) avec les suggestions en un clic.
- Pilote principal obligatoire, échéance à J+7.
- Enregistrer : l'action apparaît aussitôt dans la ligne du KPI et dans le Plan d'actions global.

**4. L'efficacité (30 s) : « Est-ce que ça a marché ? »**
- Plan d'actions global : efficacité mesurée sur le mois qui suit la clôture, « récidive » si le KPI repasse sous la cible.
- Argument ISO 9001 §10.2 : preuve d'efficacité prête pour l'auditeur.

**5. La souveraineté (1 min) : « Où sont mes données ? »**
- « L'application est un fichier. Vos chiffres restent dans votre OneDrive ou SharePoint, pas chez nous ni chez un éditeur de logiciel. »
- Montrer le dossier `donnees` : un journal par personne, le dossier `direction` protégé par les droits SharePoint.
- Montrer l'historique des versions SharePoint d'un journal.
- « Aucun abonnement logiciel : ni pour vous, ni pour nous. »

## Ne pas promettre

- La saisie sur téléphone (pas encore disponible avec le dossier partagé).
- Le temps réel : il faut compter quelques secondes à quelques minutes de synchronisation.
- Le partage des outils 1.2 à 5.3 : seul l'outil 1.1 utilise le dossier partagé pour l'instant.
