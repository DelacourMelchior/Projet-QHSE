# Delacour Quality OS : guide développeur et consultant

Application de 14 outils de pilotage pour PME (indicateurs, plans B, annuaire de crise, devis, réclamations, fournisseurs, compétences, non-qualité, 5 Pourquoi). Trois fichiers HTML (accueil, outils 1.1 à 1.3, outils 2.1 à 5.3), sans serveur.

## Structure

| Dossier | Contenu |
|---|---|
| `app/` | **Sources** : `index.html` (accueil), `tool_page.html` (outils 2.1 à 5.3, chargent Tailwind et SheetJS depuis un CDN) et `pilotage.html` (outils 1.1 à 1.3, copie générée depuis `pilotage/`). |
| `livrable/` | **Version à remettre au client**, générée : zéro appel externe, fonctionne hors connexion. Contient aussi le guide de déploiement client. |
| `build/` | Outils de construction (Tailwind, SheetJS) et tests de l'ancien code 1.1 encore présent dans `tool_page.html`. |
| `pilotage/` | **Outils 1.1 à 1.3** (React + TypeScript), livrés en `pilotage.html` (`#continuite` ouvre le 1.2, `#annuaire` le 1.3). Voir `pilotage/README.md`. `tool_page.html?tool=1.1`, `1.2` et `1.3` redirigent vers lui. |

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

- **Outils 1.1 à 1.3** (`livrable/pilotage.html`) : dossier partagé du client (OneDrive, SharePoint, Google Drive, Nextcloud…), un journal par personne, dossier `direction` séparé pour les montants confidentiels. Voir `livrable/GUIDE_DEPLOIEMENT_ONEDRIVE_SHAREPOINT.md`. Sans dossier connecté, ou sous Safari et Firefox, les données restent dans le navigateur du poste.
- **Outils 2.1 à 5.3** : navigateur du poste uniquement (`localStorage`), avec export et import `.json`.

Aucune donnée n'est envoyée au Cabinet Delacour ni à un tiers.

## Utilisation en rendez-vous

Voir `../SCENARIO_DEMO_OUTIL_1_1.md`. Pour afficher des données : **Mon entreprise**, puis **Charger l'exemple de démonstration** (ou le bouton **Voir un exemple** sur un tableau vide).

## Limites connues

- Les outils 2.1 à 5.3 ont reçu le nettoyage visuel de leurs écrans principaux (voir `DESIGN_OUTILS.md`), mais pas encore celui de leurs fenêtres (assistants, fiches imprimables) ni la passe de fiabilité des calculs de l'outil 1.1.
- Pas de connexion directe à Microsoft 365 ou Google (API) : le partage passe par le dossier synchronisé.
- La saisie sur téléphone n'est possible que pour les données locales du navigateur.
