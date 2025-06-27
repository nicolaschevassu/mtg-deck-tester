# 🎴 MTG Deck Builder

Application web pour créer et gérer vos decks Magic The Gathering avec Vue.js et Supabase.

## ✨ Fonctionnalités

- 🔐 Authentification sécurisée avec Supabase
- 🎯 Recherche de cartes via l'API Scryfall
- 📝 Création et édition de decks
- 📊 Statistiques automatiques
- 📋 Import en bulk de listes de cartes
- 💾 Sauvegarde en temps réel

## 🚀 Installation

1. **Cloner le projet**
   ```bash
   git clone [url-du-repo]
   cd mtg-deck-builder

2. **Ouvrir dans VSCode**
bashcode .

Installer les extensions recommandées

VSCode vous proposera automatiquement d'installer les extensions


Lancer le serveur de développement

Clic droit sur index.html → "Open with Live Server"
Ou Ctrl+Shift+P → "Live Server: Open with Live Server"



🔧 Configuration Supabase

Créer un compte sur supabase.com
Créer un nouveau projet
Récupérer l'URL et la clé publique dans Settings → API
Exécuter le script SQL fourni dans l'interface
Configurer l'application avec vos identifiants

📁 Structure
mtg-deck-builder/
├── index.html          # Structure HTML principale
├── assets/
│   ├── css/
│   │   └── style.css   # Tous les styles
│   └── js/
│       └── app.js      # Logique Vue.js
├── .vscode/            # Configuration VSCode
├── package.json        # Métadonnées du projet
└── README.md          # Ce fichier
🛠️ Technologies

Vue.js 3 - Framework frontend
Supabase - Base de données et authentification
Scryfall API - Base de données de cartes Magic
Live Server - Serveur de développement

📝 License
MIT