# CAHIER DES CHARGES FONCTIONNEL ET TECHNIQUE

## Module : Gestion des Serres, Parcelles et Agendas (Hybridation des Rosiers)

### 1. Architecture Spatiale et Hiérarchie

- **Création illimitée** : L'utilisateur peut créer un nombre infini de Serres ou de Parcelles.

- **Navigation par Page** : Chaque Serre ou Parcelle s'ouvre comme une page de travail isolée et complète regroupant son propre écosystème.

- **Découpage Interne** : Possibilité de diviser chaque serre ou parcelle en rangées, planches ou tables pour assurer une géolocalisation chirurgicale de chaque plant.




### 2. Le Moteur de Recherche Polyvalent et Intégration du Catalogue

- **Barre de recherche intégrée** : Présente sur chaque page de serre ou parcelle.

- **Double source** : Permet de piocher directement dans le Catalogue Général comportant les 1059 variétés ou dans les Semis.

- **Ouverture et Standardisation de la Carte (Variétés et Semis)** :

  - Qu'il s'agisse d'une variété issue du catalogue ou d'un semis ayant levé, l'enregistrement ouvre rigoureusement la même carte complète et identique : photo de la plante, ensemble des champs informatifs du catalogue (port, couleur, caractéristiques botaniques), ainsi que les nouveaux champs de suivi spécifique en serre et l'historique complet.

  - Nombre total de plants en possession.

  - Répartition par contenant ou emplacement, incluant le nombre exact en pot versus le nombre exact en pleine terre.




- **Génération d'ID uniques** : Le système attribue automatiquement un numéro unique et séquentiel à chaque plant individuel de la même variété, rattaché à son emplacement précis tel que Serre 01, Rangée 2, Pot numéro 12.




### 3. La Fiche Individuelle de la Plante

Chaque plant, qu'il provienne du catalogue ou d'un semis levé, possède son propre dossier individuel persistant regroupant :

- Sa date d'ajout dans la structure.

- Sa photo et l'intégralité de sa carte descriptive partagée.

- Son historique climatique lié aux relevés de la serre.

- Son historique sanitaire et ses observations chronologiques.

- Son historique d'amendements et de fertilisation.

- Son historique de croisement garantissant une traçabilité généalogique complète si le plant a servi de parent, qu'il soit mâle ou pollen, ou femelle ou graine.




### 4. Le Système de Double Agenda Chronologique

L'agenda est scindé en deux niveaux parfaitement interconnectés pour éviter les doubles saisies tout en garantissant une finesse de suivi absolue :

#### A. L'Agenda Général de Niveau Serre ou Parcelle pour le Pilotage Macro

- **Rôle** : Gérer les programmes collectifs de traitements ou de fertilisations de masse pour toute une serre ou une rangée.

- **Connexions** : Relié à l'historique météo et aux capteurs de la serre, avec un système d'alertes automatiques sur seuils critiques.

- **Effet de cascade** : Lorsqu'un traitement collectif est validé à cette échelle, il descend automatiquement et s'inscrit comme un rappel dans l'agenda individuel de chaque plant concerné.




#### B. L'Agenda Individuel de Niveau Plant pour le Pilotage Micro

- **Rôle** : Suivi chirurgical et mémorisation plant par plant.

- **Contenu** : Affiche l'historique des rappels collectifs de la serre plus les actions et observations propres au plant.

- **Format de saisie** : Chaque action ou observation enregistre automatiquement sa date sous forme de ligne d'agenda.




### 5. Standardisation des Listes de Saisie de Matière Brute

Pour garantir une saisie rapide et fluide sur le terrain sans saturer l'interface, les options fonctionnent via un affichage progressif par listes déroulantes :

#### Bloc 1 : Observations et Constats

- **Ravageurs** :

  - Pucerons

  - Cochenilles

  - Thrips

  - Araignées rouges

  - Altises

  - Autre avec champ libre




- **Infections et Pressions Sanitaires** :

  - Oïdium

  - Mildiou

  - Marsonia ou taches noires

  - Rouille

  - Botrytis

  - Autre avec champ libre




- **Comportement face au climat** :

  - Brûlures foliaires dues au soleil

  - Stress hydrique ou sécheresse

  - Sensibilité à l'humidité ou asphyxie

  - Rétention ou chlorose

  - Résistance avérée




#### Bloc 2 : Interventions et Réactions

- **Type de traitement appliqué** :

  - Soude caustique

  - Soufre

  - Bouillie bordelaise

  - Insecticide biologique

  - Fongicide biologique

  - Remède phytothérapeutique traditionnel désignant les préparations naturelles 

  - Produit chimique de synthèse

  - Autre avec champ libre




- **Réaction et Comportement de la plante face au traitement** :

  - Tolérance parfaite

  - Phytotoxicité légère avec jaunissement

  - Phytotoxicité forte avec brûlure

  - Efficacité rapide

  - Aucune efficacité




### 6. Cycle de Vie, Regroupement des Lots et Unification des Fiches

#### 1. L'Arrivée du Lot de Graines dans la Serre ou Parcelle

Dès la récolte issue du module de croisement, le lot de graines trié par fruit ou cynorhodon est assigné par l'utilisateur à une Serre ou une Parcelle de son choix. Il s'affiche dans cette page de serre comme un lot en attente de germination.

#### 2. La Gestion de la Stratification sur la Fiche du Lot

Pour chaque lot de graines enregistré dans la serre, l'utilisateur renseigne les paramètres de stratification repos hivernal et de froid :

- Date de début de stratification

- Date de fin de stratification, qu'elle soit prévue ou effective

- Méthode de stratification telle que le réfrigérateur en sable ou perlite, la stratification extérieure, ou autres variantes.




#### 3. La Plantation et le Regroupement par Lot de Croisement (Guide Opérationnel)

Pour structurer et organiser l'espace sans complexité excessive, les semis sont gérés et regroupés en blocs physiques de la manière suivante :
graine individuelle ou lot de graines d un fruit ou lot de fruits d un croisement

- **Maintien de la cohésion du lot** : L'interface permet de regrouper visuellement et logistiquement toutes les graines d'un même cynorhodon ou d'un même lot dans un conteneur ou une portion de planche commune pendant toute la phase de germination. Cela évite l'éparpillement prématuré et garantit un suivi collectif fluide de la levée.




#### 4. La Levée, l'Héritage et l'Unification de la Carte (Variétés vs Semis)

Lorsque les graines germent au sein de ce bloc regroupé :

- **Enregistrement de la levée** : Chaque graine qui germe est validée individuellement par l'utilisateur comme un nouveau plant vivant.

- **Unification stricte des fiches** : Le semis levé ne bénéficie pas d'un traitement au rabais : il hérite exactement de la même structure de carte que les variétés du catalogue général (photographie de la plante, port, couleur, et l'ensemble des caractéristiques botaniques de référence), auxquelles s'ajoutent les nouveaux champs propres au suivi de serre, à la localisation et à l'historique de croissance.

- **ID unique d'individu** : Le système lui attribue automatiquement un numéro unique d'individu rattaché à son emplacement précis dans le bloc (par exemple : Serre 02, Table 2, Semis nom de semis).




#### 5. L'Entrée dans le Système d'Agenda

Une fois doté de sa fiche unifiée complète et de ses photos, le plant intégré au groupe bénéficie du double niveau d'agenda :

- Il reçoit les rappels des traitements collectifs de la serre ou de la table via l'agenda général.

- Il gère son propre agenda individuel (ravageurs, infections, climat, traitements, réactions) pour assurer son suivi personnel jusqu'au stade de rosier adulte testé et validé dans une categorie rosier de selction rosier de labo ou rosier a eleminer .