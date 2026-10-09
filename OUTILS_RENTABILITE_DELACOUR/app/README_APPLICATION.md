# Outils Delacour : guide développeur et consultant

Les 19 outils de pilotage pour PME (un par question de l'audit des 5 processus, plus l'annuaire de crise) forment une seule application, livrée en un seul fichier HTML, sans serveur et sans appel à internet.

## Structure

| Dossier | Contenu |
|---|---|
| `pilotage/` | **Les sources** (React + TypeScript). Voir `pilotage/README.md`. |
| `app/` | Copie de revue : `pilotage.html` (l'application) et `index.html` (qui l'ouvre sur la liste des outils), plus `DESIGN_OUTILS.md`, les règles visuelles. |
| `livrable/` | **Version à remettre au client** : les mêmes deux fichiers et le guide de déploiement OneDrive / SharePoint. |

## Construire le livrable

```bash
cd OUTILS_RENTABILITE_DELACOUR/pilotage && npm install   # une seule fois
python3 execution/build_outils_app.py                    # depuis la racine du projet
```

Le script vérifie les types, construit le fichier unique, contrôle la présence de la règle de sécurité (Content-Security-Policy, qui bloque toute requête réseau) et copie le résultat dans `app/` et `livrable/`.

## Tester

```bash
cd OUTILS_RENTABILITE_DELACOUR/pilotage && npm test
```

Les tests couvrent les calculs de chaque outil (statuts, délais, coûts, marges, classes, efficacité), les exemples, les documents PDF, le stockage partagé et la reprise des données de l'ancienne version.

## Stockage des données

Dossier partagé du client (OneDrive, SharePoint, Google Drive, Nextcloud…) : un fichier par personne, dossier `direction` séparé pour les montants confidentiels. Voir `livrable/GUIDE_DEPLOIEMENT_ONEDRIVE_SHAREPOINT.md`. Sans dossier connecté, ou sous Safari et Firefox, les données restent dans le navigateur du poste. Aucune donnée n'est envoyée au Cabinet Delacour ni à un tiers.

## Utilisation en rendez-vous

Voir `../SCENARIO_DEMO_OUTIL_1_1.md`. Pour afficher des données : premier lancement, **Voir un exemple** (une entreprise fictive avec des données dans les 19 outils), ou **Réglages**, onglet **Données**, **Charger l'exemple de démonstration**. Chaque outil vide propose aussi **Voir un exemple traité**.

## Limites connues

- Pas de connexion directe à Microsoft 365 ou Google (API) : le partage passe par le dossier synchronisé.
- Enregistrer dans le dossier partagé demande Microsoft Edge ou Google Chrome ; sur téléphone, les données restent sur l'appareil.
- Les QR codes imprimés (instruction de poste 3.2, routine 3.3, fiche suiveuse de commande 3.4) portent l'adresse de l'application : imprimés depuis l'adresse d'un ordinateur, ils ne s'ouvrent pas sur les autres téléphones (l'outil le signale), et ce qu'un téléphone enregistre (contrôles, réception et signatures de 3.4) reste sur ce téléphone : exporter la sauvegarde, puis la fusionner sur un poste connecté (la fusion reprend aussi les contrôles et les PV signés d'une commande déjà présente, sans jamais défaire une signature ; un numéro de PV porté par deux commandes est dit en fait).
- 3.4 Réceptions ne calcule ni n'affiche aucun montant : la règle 95/5 y est une mention de clause (coche, pourcentage maximum, délai de levée, réglages de l'outil) recopiée sur le PV, sans facturation ; les anciennes valeurs de montant restent dans les données sans être lues.
- Les photos des instructions de poste alourdissent les fichiers partagés (environ 60 Ko par photo) : quelques photos par poste suffisent.
