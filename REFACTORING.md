# Refactoring MTG Deck Builder

## Vue d'ensemble

Ce document explique la refactorisation du fichier `app.js` (1335 lignes) en modules spécialisés pour améliorer la maintenabilité et l'organisation du code.

## Nouvelle Structure

```
assets/js/
├── mixins/               # Mixins Vue.js par métier
│   ├── auth.mixin.js            # Authentification et Supabase
│   ├── deck.mixin.js            # Gestion des decks
│   └── card-search.mixin.js     # Recherche et manipulation des cartes
├── game/                 # Moteur de jeu Commander
│   ├── commander-engine.js      # Logique de jeu principal
│   └── mulligan-system.js       # Système de mulligan
├── modules/              # Modules utilitaires
│   ├── ui-state.js             # Gestion état interface
│   ├── error-handler.js        # Gestion centralisée des erreurs
│   └── card-utils.js           # Utilitaires pour les cartes
├── services/             # Services existants (inchangés)
├── utils/                # Utilitaires existants (inchangés)
└── app.new.js           # Nouveau point d'entrée modulaire
```

## Métiers Identifiés

### 1. **Authentication** (`mixins/auth.mixin.js`)
- Configuration Supabase
- Connexion/Inscription/Déconnexion
- Gestion des formulaires d'authentification

### 2. **Deck Management** (`mixins/deck.mixin.js`)
- Création, édition, sauvegarde des decks
- Duplication et export
- Recommandations et statistiques

### 3. **Card Search** (`mixins/card-search.mixin.js`)
- Recherche de cartes via Scryfall
- Ajout/Suppression de cartes
- Ajout en bloc
- Gestion des images et tooltips

### 4. **Game Engine** (`game/commander-engine.js`)
- Moteur de jeu Commander
- Gestion des zones (main, battlefield, graveyard, etc.)
- Actions de jeu (pioche, mana, dés, tours)

### 5. **Mulligan System** (`game/mulligan-system.js`)
- Système de mulligan spécialisé
- Drag & Drop pour organiser la main
- Gestion des zones temporaires

### 6. **UI State** (`modules/ui-state.js`)
- État global de l'interface
- Navigation entre vues
- Synchronisation d'état

### 7. **Error Handling** (`modules/error-handler.js`)
- Gestion centralisée des erreurs
- Vérifications des services
- Messages d'erreur uniformes

### 8. **Card Utils** (`modules/card-utils.js`)
- Calculs sur les cartes (créatures, sorts, terrains)
- Formatage des dates
- Utilitaires de deck

## Migration

### Pour utiliser la nouvelle version :

1. **Remplacer l'import dans `index.html` :**
   ```html
   <!-- Ancien -->
   <script src="assets/js/app.js"></script>

   <!-- Nouveau -->
   <script src="assets/js/app.new.js" type="module"></script>
   ```

2. **La structure HTML reste inchangée**

3. **Les services existants sont préservés**

### Points d'attention :

- Les modules utilisent ES6 modules (`import/export`)
- Le navigateur doit supporter les modules ES6
- Pour les anciens navigateurs, utiliser un bundler (Webpack, Vite, etc.)

## Avantages

- **Maintenabilité** : Code organisé par responsabilité
- **Réutilisabilité** : Mixins réutilisables
- **Lisibilité** : Fichiers plus petits et spécialisés
- **Testabilité** : Modules isolés plus faciles à tester
- **Évolutivité** : Ajout de fonctionnalités plus simple

## Prochaines Étapes

1. **Tests** : Valider que toutes les fonctionnalités marchent
2. **Optimisation** : Regrouper certains mixins si nécessaire
3. **Multiplayer** : Ajouter les modules pour le jeu multijoueur
4. **Build Process** : Mettre en place un système de build pour la production

## Structure Recommandée pour le Multiplayer

```
assets/js/
├── multiplayer/
│   ├── room-manager.js         # Gestion des salles de jeu
│   ├── player-sync.js          # Synchronisation entre joueurs
│   ├── game-state.js           # État de jeu partagé
│   └── network-handler.js      # Communication réseau
```

Cette refactorisation prépare le terrain pour l'ajout du mode multijoueur Commander jusqu'à 4 joueurs.