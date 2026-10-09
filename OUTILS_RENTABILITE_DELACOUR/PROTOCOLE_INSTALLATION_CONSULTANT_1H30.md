# 🛠️ Protocole d'Intervention Consultant : Déploiement en 1h30
## Guide Pratique de Mission Terrain • Cabinet Delacour

> **Cabinet Delacour - Conseil de Direction, Performance Opérationnelle & SMQ**  
> Ce document est la trame d'intervention standard du consultant pour réaliser une installation fluide, professionnelle et sans accroc du Système Souverain chez un client PME/ETI.

---

## 🎯 Déroulé Chronologique de la Mission (1h30 Chrono)

```
00h00 ──────────────── 00h15 ──────────────── 00h45 ──────────────── 01h15 ──────────────── 01h30
 │ Connexion & Cadrage   │ Déploiement Teams    │ Injection Cockpit    │ Test Mobile Terrain  │ Bilan & Lancement
 │ Validation comptes M365│ Création des 5 canaux│ Paramétrage cibles N │ Scan QR Codes atelier│ Fixation Lundi 08h30
```

---

### Phase 1 : Préparation & Cadrage Préalable (15 min)

#### Ce qu'il faut demander au client avant l'intervention :
- Un compte utilisateur avec droits administrateur ou invité avec droits de création d'équipe sur son tenant **Microsoft 365**.
- Le logo officiel de l'entreprise au format PNG haute résolution (fond transparent).
- La liste des adresses emails professionnelles des 4 ou 5 personnes clés :
  1. Le Dirigeant (DG)
  2. Le Responsable Commercial
  3. Le Responsable de Production / Chef d'Atelier
  4. Le Responsable RH / Administratif
  5. Le Responsable Qualité / Sécurité

---

### Phase 2 : Déploiement Technique dans Microsoft 365 (30 min)

1. **Création de l'Équipe Teams** :
   - Nom : `[Entreprise] - Qualité & Pilotage`.
   - Ajout des 5 membres clés dans l'équipe.
   - Création des 5 canaux processus (`01_Direction`, `02_Commercial`, `03_Operations`, `04_RH`, `05_Qualite`).
2. **Dépôt du Cockpit Maître** :
   - Uploader `COCKPIT_PILOTAGE_ET_RENTABILITE_DELACOUR.xlsx` dans le canal Direction.
   - Épingler le fichier en onglet direct nommé **`🚀 COCKPIT LUNDI 08H30`**.
3. **Personnalisation minute du Cockpit** :
   - Remplacer le nom par la raison sociale du client en cellule A1.
   - Saisir les 5 cibles et seuils d'alerte validés lors de l'audit (Trésorerie plancher, Objectif de devis signés, Plafond de commandes en retard, Taux de présence visé, Plafond de rebuts).

---

### Phase 3 : Déploiement des Formulaires Mobiles & QR Codes (30 min)

1. **Création des 3 formulaires Forms** :
   - Formulaire Rebuts (Poste / Défaut / Photo / Quantité).
   - Formulaire Avenants (Client / Fournitures / Heures / Accord).
   - Formulaire Chiffre Hebdo du vendredi (Saisie 15s).
2. **Impression des fiches plastifiées pour l'Atelier** :
   - Télécharger le QR code du formulaire Rebut.
   - L'insérer dans le gabarit A4 d'affichage atelier.
   - L'imprimer sur place (ou faire imprimer en 2 exemplaires plastifiés).
   - Coller le premier au-dessus de la machine goulet et le second sur la zone de mise en quarantaine (Bac Rouge).

---

### Phase 4 : Le Test Terrain en Direct & Co-Animation (15 min)

1. **Le test réel du smartphone** :
   - Demander au chef d'atelier de sortir son propre téléphone (iPhone ou Android).
   - Lui faire scanner le QR code.
   - Prendre une photo d'une pièce test et cliquer sur *Envoyer*.
   - Constater ensemble en direct : l'alerte apparaît instantanément sur l'écran d'ordinateur du dirigeant !
   - *Impact psychologique* : Le client réalise instantanément que le système est simple, vivant et immédiatement opérationnel.
2. **Scellement du rituel du lundi** :
   - Créer la récurrence dans Outlook pour **tous les lundis matin de 08h30 à 08h45**.
   - Rappeler la règle d'or : *« Zéro débat technique, 15 minutes chrono debout, 1 seule décision ferme par semaine. »*
   - Confirmer la présence du consultant lors du premier lundi pour co-animer le lancement.

---

## 📋 Fiche Mémo des Réponses aux Objections Techniques

- **Objection** : *« Nos opérateurs ont de vieux téléphones personnels, est-ce que ça va marcher ? »*  
  👉 **Réponse** : *« Absolument. Le formulaire fonctionne sur n'importe quel smartphone avec appareil photo sorti depuis 10 ans. Zéro application à télécharger, zéro espace de stockage utilisé sur leur téléphone. »*
- **Objection** : *« Et si on n'a pas de réseau wifi dans l'atelier ? »*  
  👉 **Réponse** : *« La 4G standard suffit amplement. Alternativement, une tablette tactile à 120 € connectée en wifi au bureau d'atelier fait parfaitement l'affaire pour tout le secteur. »*
- **Objection** : *« Est-ce que mes salariés peuvent modifier les formules du Cockpit par erreur ? »*  
  👉 **Réponse** : *« Non. Les cellules de calcul sont verrouillées et protégées. Seules les cases de saisie hebdomadaires sont accessibles aux utilisateurs. »*
