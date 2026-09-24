# Delacour Quality OS : guide développeur et consultant

Application de 13 outils de pilotage pour PME (indicateurs, plans B, devis, réclamations, fournisseurs, compétences, non-qualité, 5 Pourquoi). Deux fichiers HTML, sans serveur.

## Structure

| Dossier | Contenu |
|---|---|
| `app/` | **Sources** : `index.html` (accueil) et `tool_page.html` (les 13 outils). Chargent Tailwind et SheetJS depuis un CDN, pour éditer vite. |
| `livrable/` | **Version à remettre au client**, générée : zéro appel externe, fonctionne hors connexion. Contient aussi le guide de déploiement client. |
| `build/` | Outils de construction (Tailwind, SheetJS) et tests des calculs de l'outil 1.1. |

## Construire le livrable

```bash
cd OUTILS_RENTABILITE_DELACOUR/build && npm install   # une seule fois
python3 execution/build_outils_app.py                 # depuis la racine du projet
```

Le script compile Tailwind, intègre SheetJS, retire les polices Google et ajoute une règle de sécurité (Content-Security-Policy) qui bloque toute requête réseau. Il échoue si une référence externe subsiste.

## Tester les calculs de l'outil 1.1

```bash
node --test OUTILS_RENTABILITE_DELACOUR/build/test_outil_1_1.test.js
```

Les tests couvrent la lecture des nombres, les statuts (mois actif, cible à zéro), les bilans annuels, le cumul de l'année, l'efficacité des actions, la ventilation des réclamations par mois et le stockage partagé.

## Stockage des données

- **Outil 1.1** : dossier partagé du client (OneDrive, SharePoint, Google Drive, Nextcloud…), un journal par personne, dossier `direction` séparé pour les montants confidentiels. Voir `livrable/GUIDE_DEPLOIEMENT_ONEDRIVE_SHAREPOINT.md`. Sans dossier connecté, ou sous Safari et Firefox, les données restent dans le navigateur du poste.
- **Outils 1.2 à 5.3** : navigateur du poste uniquement (`localStorage`), avec export et import `.json`.

Aucune donnée n'est envoyée au Cabinet Delacour ni à un tiers.

## Utilisation en rendez-vous

Voir `../SCENARIO_DEMO_OUTIL_1_1.md`. Pour afficher des données : **Mon entreprise**, puis **Charger l'exemple de démonstration** (ou le bouton **Voir un exemple** sur un tableau vide).

## Limites connues

- Les outils 1.2 à 5.3 n'ont pas encore reçu la passe de fiabilité et de nettoyage visuel de l'outil 1.1.
- Pas de connexion directe à Microsoft 365 ou Google (API) : le partage passe par le dossier synchronisé.
- La saisie sur téléphone n'est possible que pour les données locales du navigateur.
