Voici le cahier des charges complet, totalement corrigé, sans piège de vocabulaire, et intégrant l'ensemble de tes exigences avec tous les détails :

---

# CAHIER DES CHARGES FONCTIONNEL ET TECHNIQUE

## Module : Gestion des Serres, Parcelles et Agendas (Hybridation des Rosiers)

> **Périmètre d'application :** ce cahier modifie uniquement le contenu affiché après le clic sur l'onglet existant « Serres & parcelles », situé entre « Croisement » et « Météo ». Il ne modifie ni l'accueil général, ni le composant de navigation, ni l'ordre ou les destinations des autres onglets.

---

### 1. Navigation et Organisation des Serres et Parcelles

* **Ouverture par l'onglet** : Un clic sur l'onglet "Serres et Parcelles" déploie l'interface de travail dédiée, qui présente :
* Les boutons d'action : **Ajouter une Serre** et **Ajouter une Parcelle**.
* La liste visuelle de toutes les structures créées sous forme de cartes cliquables.


* **La Page Propre de chaque Serre ou Parcelle** :
* Chaque serre ou parcelle ajoutée ouvre **sa propre page de travail isolée et complète**.
* Sur cette page dédiée, on trouve obligatoirement :
1. **La barre de recherche intégrée** : C'est le point de contact unique permettant de piocher directement dans le **Catalogue Général (les variétés)** ou dans le **Catalogue des Semis** afin d'implanter les plants dans la structure.
2. **L'agenda général de travail** (pilotage macro).
3. **L'organisation des emplacements** :
* Les serres sont structurées par tables ou rangées.
* Les parcelles sont structurées par planches, rangées ou zones libres au choix de l'utilisateur.







---

### 2. Le Moteur de Recherche, Intégration du Catalogue et Affichage des Fiches

* **Barre de recherche intégrée** : Présente sur chaque page de serre ou parcelle.
* **Double source** : Permet de piocher directement parmi les deux types de plants : **les variétés** (issues du catalogue général) ou **les semis**.
* **Affichage des cartes complètes** : La sélection d'une variété ou d'un semis via la recherche **doit obligatoirement ouvrir la carte complète et détaillée** (photo de la plante, ensemble des champs botaniques de référence comme le port ou la couleur, suivis spécifiques et historique complet, et non un simple libellé brut).
* **Gestion des lots et des individus uniques** :
* Les plants proviennent soit d'une variété du catalogue, soit d'un lot de graines/semis.
* Toute plantation enregistre un numéro unique pour chaque individu du lot afin d'assurer un suivi à la fois collectif et individuel.
* *Exemple de traçabilité* :
* Pour un plant issu du catalogue : `Serre 01, Rangée 2, lot de la variété X, Pot n°12`.
* Pour un plant issu de graines : les identifiants existent déjà sous forme de lot et de numéro de graine/semis unitaire.





---

### 3. Liberté d'Implantation et Mobilité du Vivant

* **Liberté totale pour les lots de graines** : L'utilisateur est totalement libre de planter ses graines où il le souhaite (sur une planche en parcelle, en serre, en pot ou en pleine terre). Il n'y a aucune contrainte technique rigide limitant les lots de graines uniquement aux serres.
* **Mobilité des plants** :
* Les graines, après la levée et leur transformation en semis à repiquer, peuvent être transférées vers des serres ou des parcelles.
* Les variétés en possession peuvent également bouger et être déplacées d'un emplacement à un autre au cours de leur cycle de vie.



---

### 4. La Fiche Individuelle de la Plante

Chaque plant (qu'il s'agisse d'une variété ou d'un semis) possède son propre dossier individuel persistant regroupant :

* Sa date d'ajout et son emplacement précis.
* Sa photo et sa carte descriptive complète.
* Son historique climatique lié aux relevés de la structure.
* Son historique sanitaire et ses observations chronologiques.
* Son historique d'amendements et de fertilisation.
* Son historique de croisement garantissant une traçabilité généalogique complète (qu'il soit parent mâle/pollen ou femelle/graine, rosier de sélection, rosier de labo ou rosier à éliminer).

Les fiches restent individuelles même lorsqu'elles appartiennent au même lot. Chaque fait daté conserve ses liens vers l'individu, le lot, l'emplacement et, lorsque disponible, le relevé météo du jour. Les déplacements sont historisés sans réécrire les emplacements déjà enregistrés sur les événements passés.

---

### 5. Le Système de Double Agenda Chronologique

#### A. L'Agenda Général de Niveau Serre ou Parcelle (Pilotage Macro)

* **Rôle** : Gérer les programmes collectifs de traitements ou de fertilisations de masse pour toute une structure ou une zone.
* **Connexions** : Relié à l'historique météo et aux capteurs, avec alertes automatiques.
* **Effet de cascade** : Un traitement validé à cette échelle descend automatiquement sous forme de rappel dans l'agenda individuel de chaque plant concerné.

#### B. L'Agenda Individuel de Niveau Plant (Pilotage Micro)

* **Rôle** : Suivi chirurgical plant par plant.
* **Format de saisie** : Chaque action ou observation enregistre sa date sous forme de ligne d'agenda.

---

### 6. Standardisation des valeurs métier et conservation des champs libres

Pour garantir une saisie rapide et un vocabulaire homogène, les catégories d'observation, traitements et réactions reposent sur des listes fermées standardisées. Les champs de saisie libre existants restent disponibles pour les utilisateurs : ils sont conservés dans l'historique, mais exclus des filtres, calculs, bilans et futures analyses RAG. Seules les valeurs structurées et leurs relations sont exploitées par ces analyses.

* **Bloc 1 : Observations et Constats**
* **Ravageurs** : Pucerons, Cochenilles, Thrips, Araignées rouges, Altises (+ champ libre contextuel optionnel).
* **Infections et Pressions Sanitaires** : Oïdium, Mildiou, Marsonia / taches noires, Rouille, Botrytis (+ champ libre).
* **Comportement face au climat** : Brûlures foliaires dues au soleil, Stress hydrique ou sécheresse, Sensibilité à l'humidité ou asphyxie, Rétention ou chlorose, Résistance avérée.


* **Bloc 2 : Interventions et Réactions**
* **Type de traitement appliqué** : Bicarbonate de sodium, Soufre, Bouillie bordelaise, Insecticide biologique, Fongicide biologique, Remède phytothérapeutique traditionnel (préparations naturelles), Produit chimique de synthèse, Autre (+ champ libre).
* **Réaction de la plante** : Tolérance parfaite, Phytotoxicité légère avec jaunissement, Phytotoxicité forte avec brûlure, Efficacité rapide, Aucune efficacité.



---

### 7. Cycle de Vie et Stratification des Semis

* **Stratification** : Enregistrement des paramètres de repos hivernal (dates de début/fin, méthode : sable/perlite au réfrigérateur, stratification extérieure, etc.).
* **Regroupement initial** : Maintien de la cohésion du lot de graines d'un même cynorhodon ou d'un même lot dans un conteneur ou une portion de planche commune pendant la phase de germination.
* **Levée et Unification** : Validation individuelle de chaque graine germée comme plant vivant, héritant de la carte complète unifiée et de son numéro d'individu unique.