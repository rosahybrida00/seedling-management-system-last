# Cahier des Charges Fonctionnel & Modèle Métier : Seedling Management System

---

## 1. Architecture, Authentification & Profils Professionnels

* **Authentification Professionnelle (Supabase Auth)** :
  * Connexion / Inscription par **E-mail professionnel + Mot de passe fort**[cite: 1].
  * *Exclusion stricte des connexions tiers pour garantir la confidentialité[cite: 1].*
  * **UX d'Authentification Intelligente** :
    * Prise en charge native de la saisie semi-automatique (`autocomplete="email"`)[cite: 1].
    * Navigation au clavier fluide : la touche « Entrée » bascule le curseur sur le mot de passe[cite: 1].
    * Bouton « Afficher / Masquer » le mot de passe[cite: 1].
    * Récupération sécurisée par e-mail[cite: 1].
* **Sécurité & Isolation des Données (RLS)** :
  * **Catalogue Général Rosa Hybrida** : Consultation publique, édition restreinte[cite: 1].
  * **Espace Personnel Hybrideur** : Isolation totale des données privées (croisements, lots, évaluations) liées au `user_id`[cite: 1].

---

## 2. Routage SPA & Correction des Accès (Pages Directes)

* **Résolution des Erreurs de Routage** :
  * Élimination totale de la nécessité de taper manuellement les URL pour accéder aux sous-pages[cite: 1].
  * Navigation instantanée par clics sur le menu supérieur sans rechargement complet (gestion SPA transparente)[cite: 1].

---

## 3. Bandeau Météo Universel & Intégration Serre (IoT)

* **Détection Automatique (GPS)** : Récupération des données météo locales en temps réel[cite: 1].
* **Fallback Sécurisé** : Utilisation de la **Ville / Code Postal** du profil utilisateur si le GPS est inactif[cite: 1].
* **Indicateurs Clés & IoT** : Température, humidité, UV, nuages, et connexion optionnelle aux capteurs physiques de serre[cite: 1].

---

## 4. Structure de Navigation & Menu Supérieur

1. **Accueil / Catalogue Général** (grille visuelle, recherche instantanée, outils de gestion)[cite: 1]
2. **Croisement** (suivi des pollinisations, lots et fruits)[cite: 1]
3. **Serre / Semis** (saisie rapide et évaluation des individus)[cite: 1]
4. **Catalogue des Semis** (2e catalogue dédié, positionné juste après la serre)[cite: 1]
5. **Météo & Capteurs**[cite: 1]

---

## 5. Nomenclature & Traçabilité Stricte des Croisements

* **Génération Automatique du Code Unique** : 
  $$\mathbf{[SyllabesParents]-[LotMAJ]-[FleursMin]-[Graines]-[Année]}$$
  *(Exemple : `blagra-A-b-12-2026`)*[cite: 1]. Suppression totale de la saisie manuelle[cite: 1].
* **Règles d'Attribution** :
  * **Syllabes phonétiques dynamiques** : Extraction algorithmique des syllabes réelles des parents (ex: *Black Baccara* $\times$ *Grande Amore* = `blagra`), sans limite fixe de 3 lettres[cite: 1].
  * **Lot (Majuscule)** : $1^{\text{er}}$ croisement d'un couple = `A`, $2^{\text{e}}$ croisement = `B`, etc[cite: 1].
  * **Fleurs (Minuscule)** : Lettre correspondant au nombre de fleurs pollinisées (`a` = 1, `b` = 2, `c` = 3...)[cite: 1].
  * **Suivi par fruit** : Enregistrement distinct pour chaque fleur/fruit du lot (quantité de graines récoltées ou motif d'avortement précis)[cite: 1].

---

## 6. Base de Données Supabase & Correction des Erreurs HTTP 400

* **Synchronisation des Tables** : Vérification, création et alignement des structures pour `crosses`, `fruits`, `germinations`, et `seedlings`[cite: 1].
* **Stabilité des Requêtes** : Correction de toutes les erreurs HTTP 400 lors des insertions et mises à jour[cite: 1].
* **Réinitialisation de Formulaire** : Vidage automatique des champs après un enregistrement réussi pour enchaîner les saisies en série[cite: 1].

---

## 7. Second Catalogue : Catalogue des Semis

* **Flux Automatique** : Dès qu'une graine est déclarée « levée » dans la serre, elle est injectée automatiquement dans ce second catalogue[cite: 1].
* **Identité Visuelle** : 100% identique au Catalogue Général (mêmes cartes, grilles et composants de design)[cite: 1].
* **Remplissage et Traits (`lib/domain/description-traits.ts`)** :
  * **Cases à cocher contextuelles** : Critères de type de port, feuillage, rusticité, type de sol, label ADR[cite: 1].
  * **Saisie manuelle** : Hauteur, largeur / envergure, diamètre de la fleur, et nom de la variété[cite: 1].
  * **Automatisation profil** : Le nom de l'obtenteur se remplit seul en récupérant le nom d'utilisateur ou de société du profil[cite: 1].
  * **Champ libre** : Zone de description textuelle pour les notes personnelles de l'hybrideur[cite: 1].

---

## 8. Bilans Automatisés & Rapports

* **Indicateurs Clés** : Calcul automatique des taux d'avortement, des volumes totaux de graines, des taux de levée et des moyennes par fruit et par lot[cite: 1].