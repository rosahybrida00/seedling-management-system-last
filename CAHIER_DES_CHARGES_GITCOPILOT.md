# Cahier des charges — version Git Copilot

## 1. Objet

Ce document décrit l’architecture fonctionnelle et technique cible du projet Seedling Management System, en tenant compte du schéma réellement déployé dans Supabase et des migrations déjà exécutées.

Il sert de référence de conception pour le développement, sans entrer en contradiction avec les tables et colonnes déjà présentes en production.

---

## 2. Principe de compatibilité

Le projet suit cette règle :

- le schéma réel en production prime sur les documents de conception idéalistes ;
- le cahier des charges décrit la logique métier et les fonctionnalités attendues ;
- les règles d’accès et les permissions peuvent rester provisoirement plus permissives pendant la phase de test ou de stabilisation ;
- les migrations exécutées et les tables réelles doivent rester cohérentes avec l’application.

En pratique :

- les tables existantes sont la source de vérité technique ;
- le cahier décrit le comportement attendu, pas des contraintes impossibles à appliquer sur la base actuelle ;
- les écarts entre le modèle cible et le modèle réel doivent être explicitement signalés.

---

## 3. Périmètre fonctionnel

### 3.1 Gestion des croisements

Le module de croisement doit permettre :

- de définir un couple parent (mère / pollen)
- de créer un lot de pollinisation unique par couple
- d’associer un type de pollen : frais ou conservé
- d’enregistrer une météo de pollinisation issue de l’historique quotidien
- de générer des fruits par fleur pollinisée
- de suivre l’état de chaque fruit : suivi, récolté, vide, avorté
- de comptabiliser les graines récoltées et leur traçabilité
- d’associer les graines à une serre ou à une parcelle selon le contexte

### 3.2 Gestion des semis et de la serre

Le module serre doit permettre :

- la création de serres et de tables internes
- l’ajout de plants issus du catalogue ou d’un semis
- l’association d’un plant à un emplacement précis
- le suivi de l’historique sanitaire et climatique
- la gestion des programmes et interventions
- l’intégration du module de sélection / phénotype

### 3.3 Gestion des parcelles

Le module parcelle doit permettre :

- la création de parcelles en plein air
- l’installation de variétés ou de semis dans une parcelle
- l’enregistrement d’observations terrain
- la gestion d’un agenda micro et macro
- le rattachement des traitements, fertilisations et rappels

### 3.4 Météo historique

Le système doit utiliser un historique météo quotidien, en particulier pour :

- la date de pollinisation
- l’observation du pistil
- la validation des conditions de croisement
- le contexte d’observations terrain

---

## 4. Structure de données attendue

### 4.1 Table `crosses`

Le module croisement s’appuie sur une table `crosses` représentant un lot de pollinisation.

Colonnes fonctionnelles clés :

- `id`
- `user_id`
- `seed_parent`
- `pollen_parent`
- `code`
- `base_syllable`
- `lot_letter`
- `pair_key`
- `pollination_date`
- `pollen_type`
- `pollen_lot_id`
- `pollen_quality`
- `flower_count`
- `status`
- `greenhouse_table_id`
- `parcelle_id`
- `climate_data`
- `remarks`

La logique métier attendue est :

- un lot est unique par couple et par lettre de lot
- le code de lot doit rester stable
- le nombre de fleurs doit être validé avant les fruits
- les données météo peuvent être stockées dans les structures JSON associées

### 4.2 Table `cross_fruits`

Cette table représente un fruit, donc une fleur pollinisée.

Colonnes fonctionnelles clés :

- `id`
- `cross_id`
- `fruit_name`
- `flower_index`
- `status`
- `seed_count`
- `harvest_date`
- `fruit_calibre`
- `maturation`
- `seed_extraction`
- `failure_causes`
- `checklist`
- `greenhouse_id`
- `greenhouse_table_id`

La règle métier centrale est :

- un fruit ne peut pas dépasser le nombre de fleurs validé pour le lot

### 4.3 Table `harvested_seeds`

Cette table suit les graines issues d’un fruit.

Champs attendus :

- `id`
- `fruit_id`
- `cross_id`
- `seed_name`
- `seed_number`
- `status`
- `harvest_year`
- `greenhouse_id`
- `greenhouse_table_id`

### 4.4 Table `field_plantings`

Cette table représente qu’une variété ou un semis est installé dans un emplacement précis.

Champs attendus :

- `id`
- `user_id`
- `variety_id` ou `seedling_id`
- `greenhouse_table_id` ou `parcelle_id`
- `planted_at`
- `notes`
- `plant_count`
- `soil_type`
- `container_type`
- `location_type`

Règles métier :

- une plantation a exactement une source : variété ou semis
- une plantation a exactement un emplacement : serre ou parcelle

### 4.5 Table `field_observations`

Cette table recense les observations terrain.

Contrainte fonctionnelle critique : pour les observations standardisées du terrain, l’interface ne doit jamais proposer de texte libre pour les catégories de diagnostic, les ravageurs, les pathologies, les traitements et les réactions. Toutes les valeurs doivent provenir d’un vocabulaire unique, maîtrisé et partagé par l’équipe.

En pratique :

- les infections, ravageurs, climats, traitements et réactions sont des listes fermées normalisées ;
- les cases à cocher sont la forme d’entrée privilégiée ;
- les champs libres ne doivent servir qu’à des notes de contexte non métier, et jamais comme support principal de la donnée scientifique ;
- le moteur RAG doit exploiter des faits structurés, pas des listes de chaînes non homogènes.

Pour la persistance sous le capot, le modèle recommandé est un stockage par événements structurés et horodatés, par exemple :

- `id`
- `user_id`
- `planting_id` ou `seedling_id` ou `variety_id`
- `event_type` : infection, ravageur, climat, traitement, réaction, fertilisation, revue de culture
- `event_code` : code normalisé du vocabulaire partagé
- `event_label` : libellé canonique associé au code
- `observed_at` : date/heure exacte de l’événement
- `weather_daily_id` : lien météo du jour si pertinent
- `source_reference` : serre, parcelle, table, rang, pot, etc.
- `created_at`

L’objectif est d’obtenir un historique exploitable de manière fiable par le moteur RAG, croisé entre météo, traitements, pressions sanitaires et trajectoires génétiques.

Elle peut être utilisée en deux modes :

- mode plantation : rattachement à `planting_id`
- mode observatoire : rattachement à `seedling_id` / `variety_id` / `greenhouse_id` / `parcelle_id` + `weather_daily_id`

Le point important est que le mode “grille d’observation” ne doit pas consister en une simple liste de chaînes de caractères sauvées dans des `text[]` sans contrôle. Il doit être converti en faits métier normalisés et time-stamped, afin d’éviter les variations de vocabulaire, les doublons et les erreurs de lecture lors de l’analyse historique.

### 4.6 Table `field_programs`

Cette table contient les programmes :

- curatif
- preventif
- fertilisation

Chaque programme peut cibler :

- un plant précis
- une serre entière
- une parcelle entière

### 4.7 Table `field_interventions`

Elle contient les interventions calendaires associées à un programme.

---

## 5. Organisation exacte de l’interface utilisateur

### 5.1 L’écran d’accueil principal (`/dashboard` ou accueil)

L’accueil centralise les grands onglets globaux de navigation :

- Onglet Catalogue : consultation de l’ensemble des variétés de référence.
- Onglet Semis : suivi des lots de graines et des levées.
- Bouton ou onglet “Ajouter une Serre” : création d’une structure fermée.
- Bouton ou onglet “Ajouter une Parcelle” : création d’une zone en plein air.
- Liste visuelle : toutes les serres et parcelles créées doivent s’afficher sous forme de cartes cliquables pour accéder directement à leur page dédiée.

L’objectif est d’offrir une vue d’ensemble claire et rapide, sans répéter les parcours de gestion dans chaque page.

### 5.2 La page dédiée d’une serre ou d’une parcelle

Dès qu’un utilisateur clique sur une serre ou une parcelle, il accède à sa page dédiée, qui contient 4 zones de travail indispensables.

#### A. La barre de recherche intégrée (moteur d’ajout)

- située en haut de la page ;
- permet de piocher instantanément dans le Catalogue (variétés) ou dans les Semis existants ;
- permet d’implanter directement un plant ou un lot dans la serre ou la parcelle sélectionnée.

#### B. La gestion des emplacements (tables, rangées, planches)

- espace visuel pour structurer l’intérieur de la serre ou de la parcelle ;
- possibilité de créer et organiser des tables, rangées ou planches ;
- chaque variété ou semis ajouté est assigné à un emplacement précis ;
- chaque plant reçoit une identité unique selon son emplacement et son contexte (pot, pleine terre, table, rangée, etc.) ;
- en cliquant sur un nom dans la serre ou la parcelle, l’utilisateur ouvre la vraie fiche de la variété ou du semis, avec ses caractéristiques, photos et historique, plutôt qu’un simple libellé brut.

#### C. L’agenda général (pilote macro & météo)

- intégré directement dans la page de la serre ou de la parcelle ;
- affiche l’historique météo de la structure, les capteurs et les alertes automatiques ;
- permet de planifier ou valider les actions collectives (traitements de masse, fertilisations, interventions globales) ;
- les actions validées remontent ensuite dans les agendas individuels des plants concernés sous forme de rappels ou d’éléments cascades.

#### D. Le journal / agenda individuel & saisie terrain

- pour chaque plant ou lot, accès au suivi chronologique en journal ;
- présence des tiroirs d’observations à cocher : ravageurs, infections, comportement face au climat ;
- présence des listes d’interventions : traitements de synthèse, produits biologiques, remèdes traditionnels, etc. ;
- gestion des réactions de la plante face à un traitement, avec historique identifiable.

### 5.3 Principe de conception UI cible

### 5.4 Norme d’interface : données métier standardisées

Les données qui pilotent le suivi des cultures, les filtres, les bilans et les rapports doivent être saisies à partir de listes fermées standardisées, principalement avec des cases à cocher. Cela concerne notamment les diagnostics, ravageurs, comportements climatiques, traitements, fertilisations et réactions.

- toutes les observations terrain sont saisies via des listes fermées standardisées ;
- les valeurs sont choisies parmi un vocabulaire unique partagé sur le terrain ;
- aucune donnée de diagnostic, de traitement, de réaction ou de pression sanitaire ne doit être saisie librement sous forme de texte libre ;
- une note libre contextuelle peut être proposée lorsqu’elle est utile, mais elle reste facultative et ne remplace jamais une sélection standardisée ;
- les notes libres ne sont pas prises en compte dans les calculs, filtres, bilans ou rapports, sauf décision ultérieure explicite.

Cette règle est essentielle pour garantir :

- un vocabulaire homogène entre les équipes et les saisons ;
- une surveillance fiable des tendances sanitaires ;
- des bilans et rapports comparables, alimentés par des données structurées ;
- un historique de traitements et de réactions cohérent et réutilisable pour l’analyse.

Le modèle de données doit conserver les sélections comme des faits ou événements structurés, normalisés et horodatés. Les notes contextuelles, si elles existent, doivent rester clairement séparées de ces données métier.

### 5.5 Priorité actuelle et rôle futur de la page Bilan

La priorité actuelle du développement est de structurer et fiabiliser les pages Serre et Parcelle : emplacements, plantations, observations standardisées, interventions et historique associé. La page Bilan n’est pas le chantier fonctionnel prioritaire à cette étape.

Toute donnée métier enregistrée dans les modules doit néanmoins conserver son contexte et son historique afin de pouvoir alimenter ultérieurement la page Bilan. Cette page accueillera un moteur RAG et pourra produire des synthèses à partir des historiques structurés, notamment en croisant les observations, la météo, les traitements, les résultats et les liens de traçabilité génétique. Les notes libres ne sont pas une source fiable pour ces analyses et ne doivent pas remplacer les données standardisées.

La disposition suivante est la référence fonctionnelle du produit :

1. Accueil et navigation globale par onglets ;
2. Page Serre / Parcelle avec moteur d’ajout intégré ;
3. Gestion des emplacements et des fiches détaillées ;
4. Agenda général météo / macro ;
5. Journal et suivi individuel micro ;
6. Consultation des détails cliquables de chaque plante ou lot.

Cette structure doit être la base de l’ergonomie du produit, afin de rendre l’application fluide, rapide et efficace sur le terrain.

---

## 6. Règles métier à préserver

### 5.1 Règles de croisement

- Une paire de parents doit être identifiable de manière stable.
- Un lot doit rester unique pour un couple et un lot letter donné.
- Le code du lot doit être généré automatiquement.
- Le nombre de fleurs pollinisées doit être validé avant la génération des fruits.
- Un fruit est un objet unique associé à une fleur.
- Les graines sont générées à partir des fruits récoltés.

### 5.2 Règles de serre et parcelle

- Une variété ou un semis ne peut être rattaché qu’à un seul emplacement principal.
- Un plant doit conserver son historique sanitaire et gestionnaire.
- Un programme collectif de serre/parcelle doit pouvoir s’appliquer sans duplication inutile.
- Les observations doivent rester rattachées à des dates réelles et à un contexte précis.

### 5.3 Règles de météo

- La météo doit être prise depuis l’historique quotidien du système.
- La date de pollinisation ou d’observation doit être associée à la météo du jour concerné.
- L’application ne doit pas dépendre de requêtes météo ad hoc à chaque interaction si le système a déjà l’historique.

---

## 6. Règles d’accès et sécurité

### 6.1 Statut actuel

Les permissions RLS sont actuellement plus permissives que le cahier de vision ne le prévoit, notamment pour les tables sensibles comme les croisements ou les données d’usage personnel.

Ce point est fonctionnellement acceptable dans une phase d’évolution rapide, sous réserve de :

- distinguer clairement “provisoire” et “cible” ;
- documenter qu’il s’agit d’une période de test ou de stabilisation ;
- prévoir ensuite un resserrement des droits.

### 6.2 Position cible

Le modèle cible est :

- le `user_id` est le périmètre de sécurité principal ;
- chaque utilisateur ne peut lire et modifier que ses propres données de croisements, parcellaires, semis et observables ;
- les données publics du catalogue restent distinctes des données privées utilisateur.

---

## 7. État actuel du projet vs cible

### 7.1 État actuel

Le projet a déjà atteint un niveau fonctionnel élevé :

- module de croisements actif
- module pollen actif
- module serre/serres et parcelles fonctionnel
- module météo intégré
- historique de migration et de correctifs enrichis

### 7.2 État cible souhaité

Le projet cible est un système :

- cohérent entre les modules
- traçable
- aligné avec le schéma réel de production
- sécurisé par RLS dès que la phase de validation est stabilisée
- plus simple à maintenir grâce à une architecture explicite et documentée

---

## 8. Recommandation finale

Le cahier des charges doit être lu comme un document de référence fonctionnelle, pas comme un fichier SQL “source de vérité”.

En pratique :

- le code et les migrations doivent être cohérents avec la base live ;
- le cahier doit refléter la logique métier et l’architecture cible ;
- les écarts de sécurité ou de schéma doivent être clairement signalés comme provisoires.

Cela évite les conflits entre :

- le besoin produit,
- le modèle construit,
- la réalité Supabase,
- et la sécurité applicative.

---

## 9. Synthèse

Le projet est globalement cohérent avec son cahier des charges, à condition de garder une distinction claire entre :

- architecture cible,
- architecture réelle,
- correctifs de migration,
- permissions provisoires.

Cette séparation évite les conflits une fois le projet stabilisé.
