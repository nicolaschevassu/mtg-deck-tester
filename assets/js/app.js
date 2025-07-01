/**
 * MTG Deck Builder - Application principale Vue.js
 * Version robuste avec gestion d'erreurs complète
 */

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            // Store global
            store: null,

            // État de l'interface
            loading: false,
            isInitialized: false,
            supabaseConfigured: false,
            isConnected: false,
            isAuthenticated: false,
            currentUser: null,
            authMode: 'login',
            authLoading: false,
            authError: '',
            authSuccess: '',
            currentView: 'decks',
            showCreateDeck: false,

            // Formulaires d'authentification
            loginForm: {
                email: '',
                password: ''
            },
            registerForm: {
                email: '',
                password: '',
                confirmPassword: ''
            },
            supabaseConfig: {
                url: '',
                anonKey: ''
            },

            // Decks
            userDecks: [],
            currentDeck: null,
            newDeckName: '',
            decksLoading: false,
            deckLoading: false,

            // Recherche de cartes
            searchQuery: '',
            searchResults: [],
            searchLoading: false,
            bulkAddText: '',
            bulkLoading: false,

            // Playtester Commander
            // État du jeu
            playerLife: 40,
            currentTurn: 1,
            commanderTax: 0,
            commander: null,

            // Zones de jeu
            playerHand: [],
            playerBattlefield: [],
            playerGraveyard: [],
            playerExile: [],
            playerLibrary: [],
            commandZone: [],

            // Compteurs
            manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
            lastRoll: { d6: null, d20: null },

            // Mulligan
            openingHand: [],
            mulliganCount: 0,
            bottomOfLibrary: [],
            exileFromMulligan: [],
            draggedCard: null,
            draggedIndex: null,

            // Placeholder pour cartes
            cardPlaceholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2OCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2OCIgZmlsbD0iIzM0NDk1ZSIgc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI2MCIgeT0iODQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiPk1URzwvdGV4dD48L3N2Zz4='
        };
    },

    async mounted() {
        console.log('🚀 Initialisation de l\'application MTG Deck Builder');

        try {
            this.loading = true;

            // Vérifier que tous les services sont disponibles
            this.checkRequiredServices();

            // Initialiser le store
            this.store = new AppStore();
            this.store.subscribe(this.updateLocalState.bind(this));

            await this.store.initialize();

            // Vérifier les méthodes
            this.checkRequiredMethods();

            console.log('✅ Application initialisée avec succès');

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this.authError = `Erreur d'initialisation: ${error.message}`;
        } finally {
            this.loading = false;
        }
    },

    methods: {
        // === VÉRIFICATIONS ET DIAGNOSTICS ===

        checkRequiredServices() {
            const requiredServices = [
                'SupabaseConfig', 'AuthService', 'DeckService',
                'ScryfallService', 'AppStore', 'Helpers', 'CardCache'
            ];

            const missing = requiredServices.filter(service => !window[service]);

            if (missing.length > 0) {
                throw new Error(`Services manquants: ${missing.join(', ')}`);
            }

            console.log('✅ Tous les services requis sont disponibles');
        },

        checkRequiredMethods() {
            const requiredMethods = [
                'getTotalCardsFromDeckData', 'formatRelativeDate',
                'getTotalCards', 'getCreatureCount', 'getSpellCount', 'getLandCount'
            ];

            const missing = requiredMethods.filter(method => typeof this[method] !== 'function');

            if (missing.length > 0) {
                console.warn('⚠️ Méthodes manquantes:', missing);
            } else {
                console.log('✅ Toutes les méthodes requises sont disponibles');
            }
        },

        // === SYNCHRONISATION ÉTAT ===

        updateLocalState(newState) {
            if (!newState || typeof newState !== 'object') {
                console.warn('updateLocalState: newState invalide', newState);
                return;
            }

            try {
                Object.keys(newState).forEach(key => {
                    const hasProperty = key in this ||
                        Object.prototype.hasOwnProperty.call(this, key) ||
                        (this.$data && key in this.$data);

                    if (hasProperty) {
                        this[key] = newState[key];
                    }
                });
            } catch (error) {
                console.error('Erreur dans updateLocalState:', error);
                this.updateKnownProperties(newState);
            }
        },

        updateKnownProperties(newState) {
            const knownProperties = [
                'loading', 'authLoading', 'deckLoading', 'decksLoading', 'searchLoading', 'bulkLoading',
                'isAuthenticated', 'currentUser', 'userDecks', 'currentDeck', 'currentView',
                'authError', 'authSuccess', 'isConnected', 'supabaseConfigured',
                'searchResults', 'searchQuery'
            ];

            knownProperties.forEach(prop => {
                if (newState.hasOwnProperty(prop)) {
                    this[prop] = newState[prop];
                }
            });
        },

        // === GESTION D'ERREURS ===

        handleError(error, context = 'Opération') {
            console.error(`❌ Erreur dans ${context}:`, error);

            const errorMessage = error.message || 'Erreur inconnue';
            this.authError = `${context}: ${errorMessage}`;

            // Auto-effacement après 10 secondes
            setTimeout(() => {
                if (this.authError === `${context}: ${errorMessage}`) {
                    this.authError = '';
                }
            }, 10000);
        },

        // === CONFIGURATION SUPABASE ===

        async configureSupabase() {
            if (!this.supabaseConfig.url || !this.supabaseConfig.anonKey) {
                this.handleError(new Error('URL et clé Supabase requis'), 'Configuration Supabase');
                return;
            }

            try {
                this.authLoading = true;
                this.authError = '';

                if (!this.store) {
                    this.handleError(new Error('Store non initialisé'), 'Configuration Supabase');
                    return;
                }

                await this.store.configureSupabase(
                    this.supabaseConfig.url,
                    this.supabaseConfig.anonKey
                );

                console.log('✅ Supabase configuré avec succès');
            } catch (error) {
                this.handleError(error, 'Configuration Supabase');
            } finally {
                this.authLoading = false;
            }
        },

        // === AUTHENTIFICATION ===

        async login() {
            if (!this.store) {
                this.handleError(new Error('Application non initialisée'), 'Connexion');
                return;
            }

            try {
                this.authLoading = true;
                this.authError = '';

                await this.store.login(
                    this.loginForm.email,
                    this.loginForm.password
                );

                this.loginForm = { email: '', password: '' };
                console.log('✅ Connexion réussie');

            } catch (error) {
                this.handleError(error, 'Connexion');
            } finally {
                this.authLoading = false;
            }
        },

        async register() {
            if (!this.store) {
                this.handleError(new Error('Application non initialisée'), 'Inscription');
                return;
            }

            if (this.registerForm.password !== this.registerForm.confirmPassword) {
                this.handleError(new Error('Les mots de passe ne correspondent pas'), 'Inscription');
                return;
            }

            try {
                this.authLoading = true;
                this.authError = '';

                await this.store.register(
                    this.registerForm.email,
                    this.registerForm.password,
                    this.registerForm.confirmPassword
                );

                this.registerForm = { email: '', password: '', confirmPassword: '' };
                this.authMode = 'login';
                this.authSuccess = 'Inscription réussie ! Vous pouvez maintenant vous connecter.';

                console.log('✅ Inscription réussie');

            } catch (error) {
                this.handleError(error, 'Inscription');
            } finally {
                this.authLoading = false;
            }
        },

        async logout() {
            if (!this.store) {
                this.handleError(new Error('Application non initialisée'), 'Déconnexion');
                return;
            }

            try {
                await this.store.logout();
                this.authSuccess = 'Déconnexion réussie !';
                console.log('✅ Déconnexion réussie');
            } catch (error) {
                this.handleError(error, 'Déconnexion');
            }
        },

        // === GESTION DES DECKS ===

        async createDeck() {
            if (!this.store) {
                this.handleError(new Error('Application non initialisée'), 'Création de deck');
                return;
            }

            if (!this.newDeckName.trim()) {
                this.handleError(new Error('Le nom du deck est requis'), 'Création de deck');
                return;
            }

            try {
                this.deckLoading = true;
                this.authError = '';

                await this.store.createDeck(this.newDeckName.trim());

                this.newDeckName = '';
                this.showCreateDeck = false;
                this.authSuccess = 'Deck créé avec succès !';

                console.log('✅ Deck créé avec succès');

            } catch (error) {
                this.handleError(error, 'Création de deck');
            } finally {
                this.deckLoading = false;
            }
        },

        async saveDeck() {
            if (!this.store || !this.currentDeck) {
                this.handleError(new Error('Deck non disponible'), 'Sauvegarde');
                return;
            }

            try {
                this.deckLoading = true;
                this.authError = '';

                await this.store.saveDeck(this.currentDeck);
                this.authSuccess = 'Deck sauvegardé !';

                console.log('✅ Deck sauvegardé avec succès');

            } catch (error) {
                this.handleError(error, 'Sauvegarde');
            } finally {
                this.deckLoading = false;
            }
        },

        async openDeck(deck) {
            if (!this.store) {
                this.handleError(new Error('Application non initialisée'), 'Ouverture de deck');
                return;
            }

            try {
                this.deckLoading = true;
                this.authError = '';

                await this.store.openDeck(deck);
                console.log('✅ Deck ouvert avec succès');

            } catch (error) {
                this.handleError(error, 'Ouverture de deck');
            } finally {
                this.deckLoading = false;
            }
        },

        goBackToDecks() {
            try {
                this.currentView = 'decks';
                this.currentDeck = null;
                this.searchQuery = '';
                this.searchResults = [];
                this.bulkAddText = '';
            } catch (error) {
                console.warn('Erreur lors du retour aux decks:', error);
            }
        },

        // === RECHERCHE DE CARTES ===

        async searchCards() {
            if (!this.store) {
                console.warn('Store non disponible pour la recherche');
                return;
            }

            if (!this.searchQuery || this.searchQuery.length < 2) {
                this.searchResults = [];
                return;
            }

            try {
                this.searchLoading = true;
                await this.store.searchCards(this.searchQuery);
            } catch (error) {
                this.handleError(error, 'Recherche de cartes');
                this.searchResults = [];
            } finally {
                this.searchLoading = false;
            }
        },

        async addCardToDeck(card) {
            if (!this.store || !this.currentDeck) {
                this.handleError(new Error('Deck non disponible'), 'Ajout de carte');
                return;
            }

            try {
                await this.store.addCardToDeck(card, 1);
                console.log(`✅ ${card.name} ajoutée au deck`);
            } catch (error) {
                this.handleError(error, 'Ajout de carte');
            }
        },

        async addCardToDeckById(cardId) {
            if (!this.store || !this.currentDeck) {
                this.handleError(new Error('Deck non disponible'), 'Ajout de carte');
                return;
            }

            try {
                const card = this.store.cardCache.get(cardId);
                if (card) {
                    await this.store.addCardToDeck(card, 1);
                } else {
                    throw new Error('Carte non trouvée dans le cache');
                }
            } catch (error) {
                this.handleError(error, 'Ajout de carte');
            }
        },

        async removeCardFromDeck(cardId) {
            if (!this.store || !this.currentDeck) {
                this.handleError(new Error('Deck non disponible'), 'Suppression de carte');
                return;
            }

            try {
                const currentQuantity = this.currentDeck.cards[cardId] || 0;
                this.store.setCardQuantity(cardId, currentQuantity - 1);
            } catch (error) {
                this.handleError(error, 'Suppression de carte');
            }
        },

        async processBulkAdd() {
            if (!this.store || !this.currentDeck) {
                this.handleError(new Error('Deck non disponible'), 'Ajout en bloc');
                return;
            }

            if (!this.bulkAddText.trim()) {
                this.handleError(new Error('Liste de cartes vide'), 'Ajout en bloc');
                return;
            }

            try {
                this.bulkLoading = true;
                this.authError = '';

                await this.store.processBulkAdd(this.bulkAddText);

                this.bulkAddText = '';
                this.authSuccess = 'Cartes ajoutées avec succès !';

                console.log('✅ Cartes ajoutées en bloc avec succès');

            } catch (error) {
                this.handleError(error, 'Ajout en bloc');
            } finally {
                this.bulkLoading = false;
            }
        },

        // === ACTIONS AVANCÉES ===

        async duplicateDeck(deck) {
            if (!this.store) {
                this.handleError(new Error('Application non initialisée'), 'Duplication de deck');
                return;
            }

            try {
                this.deckLoading = true;
                this.authError = '';

                const newName = `${deck.name} (copie)`;
                const newDeck = await this.store.createDeck(newName);

                if (newDeck && deck.cards) {
                    newDeck.cards = { ...deck.cards };
                    await this.store.saveDeck(newDeck);
                }

                this.authSuccess = 'Deck dupliqué avec succès !';
                console.log('✅ Deck dupliqué avec succès');

            } catch (error) {
                this.handleError(error, 'Duplication de deck');
            } finally {
                this.deckLoading = false;
            }
        },

        async exportDeck() {
            if (!this.currentDeck || !this.store) {
                this.handleError(new Error('Aucun deck à exporter'), 'Export');
                return;
            }

            try {
                const exportText = this.store.deckService.exportDeckToText(
                    this.currentDeck,
                    this.store.cardCache.getAll()
                );

                const blob = new Blob([exportText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.currentDeck.name}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.authSuccess = 'Deck exporté avec succès !';

            } catch (error) {
                this.handleError(error, 'Export de deck');
            }
        },

        async copyDeckToClipboard() {
            if (!this.currentDeck || !this.store) {
                this.handleError(new Error('Aucun deck à copier'), 'Copie');
                return;
            }

            try {
                const exportText = this.store.deckService.exportDeckToText(
                    this.currentDeck,
                    this.store.cardCache.getAll()
                );

                await navigator.clipboard.writeText(exportText);
                this.authSuccess = 'Liste copiée dans le presse-papiers !';

            } catch (error) {
                this.handleError(error, 'Copie vers presse-papiers');
            }
        },

        // === FONCTIONS UTILITAIRES ===

        getCardById(cardId) {
            try {
                if (!this.store?.cardCache) return null;
                return this.store.cardCache.get(cardId);
            } catch (error) {
                console.warn('Erreur getCardById:', error);
                return null;
            }
        },

        getTotalCards() {
            try {
                if (!this.currentDeck?.cards) return 0;
                return Object.values(this.currentDeck.cards).reduce((sum, qty) => sum + qty, 0);
            } catch (error) {
                console.warn('Erreur getTotalCards:', error);
                return 0;
            }
        },

        getTotalCardsFromDeckData(cardsData) {
            try {
                if (!cardsData || typeof cardsData !== 'object') return 0;
                return Object.values(cardsData).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
            } catch (error) {
                console.warn('Erreur getTotalCardsFromDeckData:', error);
                return 0;
            }
        },

        getCreatureCount() {
            try {
                if (!this.currentDeck?.cards || !this.store?.cardCache) return 0;

                return Object.entries(this.currentDeck.cards).reduce((count, [cardId, quantity]) => {
                    const card = this.store.cardCache.get(cardId);
                    if (card?.type_line?.includes('Creature')) {
                        return count + quantity;
                    }
                    return count;
                }, 0);
            } catch (error) {
                console.warn('Erreur getCreatureCount:', error);
                return 0;
            }
        },

        getSpellCount() {
            try {
                if (!this.currentDeck?.cards || !this.store?.cardCache) return 0;

                return Object.entries(this.currentDeck.cards).reduce((count, [cardId, quantity]) => {
                    const card = this.store.cardCache.get(cardId);
                    if (card?.type_line && (card.type_line.includes('Instant') || card.type_line.includes('Sorcery'))) {
                        return count + quantity;
                    }
                    return count;
                }, 0);
            } catch (error) {
                console.warn('Erreur getSpellCount:', error);
                return 0;
            }
        },

        getLandCount() {
            try {
                if (!this.currentDeck?.cards || !this.store?.cardCache) return 0;

                return Object.entries(this.currentDeck.cards).reduce((count, [cardId, quantity]) => {
                    const card = this.store.cardCache.get(cardId);
                    if (card?.type_line?.includes('Land')) {
                        return count + quantity;
                    }
                    return count;
                }, 0);
            } catch (error) {
                console.warn('Erreur getLandCount:', error);
                return 0;
            }
        },

        formatRelativeDate(dateString) {
            try {
                if (!dateString) return 'Date inconnue';
                if (window.Helpers?.formatRelativeDate) {
                    return window.Helpers.formatRelativeDate(dateString);
                }
                return new Date(dateString).toLocaleDateString('fr-FR');
            } catch (error) {
                console.warn('Erreur formatRelativeDate:', error);
                return 'Date invalide';
            }
        },

        showCardImage(event, card) {
            const tooltip = document.getElementById('card-tooltip');
            const tooltipImage = document.getElementById('card-tooltip-image');

            if (!tooltip || !tooltipImage || !card) return;

            // Image de la carte ou placeholder
            const imageUrl = card.image_uris?.normal ||
                card.image_uris?.large ||
                card.image_uris?.small ||
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI3OSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI3OSIgZmlsbD0iI2YwZjBmMCIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSIxMDAiIHk9IjE0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNjY2Ij5NVEc8L3RleHQ+PC9zdmc+';

            tooltipImage.src = imageUrl;
            tooltipImage.alt = card.name;

            // Position du tooltip
            this.positionTooltip(event, tooltip);

            // Afficher le tooltip
            tooltip.classList.add('show');
        },

        /**
         * Cacher l'image de la carte
         */
        hideCardImage() {
            const tooltip = document.getElementById('card-tooltip');
            if (tooltip) {
                tooltip.classList.remove('show');
            }
        },

        /**
         * Positionner le tooltip selon la position de la souris
         */
        positionTooltip(event, tooltip) {
            const margin = 20;
            const tooltipRect = tooltip.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let left = event.clientX + margin;
            let top = event.clientY + margin;

            // Éviter que le tooltip sorte de l'écran à droite
            if (left + tooltipRect.width > viewportWidth) {
                left = event.clientX - tooltipRect.width - margin;
            }

            // Éviter que le tooltip sorte de l'écran en bas
            if (top + tooltipRect.height > viewportHeight) {
                top = event.clientY - tooltipRect.height - margin;
            }

            // S'assurer que le tooltip ne sort pas en haut ou à gauche
            left = Math.max(margin, left);
            top = Math.max(margin, top);

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        },
        /**
    * Démarrer le playtest d'un deck
    */
        startPlaytest() {
            if (!this.currentDeck || !this.currentDeck.cards) {
                this.handleError(new Error('Aucun deck sélectionné'), 'Démarrage playtest');
                return;
            }

            try {
                this.currentView = 'playtester';
                this.setupCommanderGame();
                this.authSuccess = 'Playtest démarré ! Bon jeu ! 🎮';

                setTimeout(() => {
                    this.authSuccess = '';
                }, 3000);

            } catch (error) {
                this.handleError(error, 'Démarrage playtest');
            }
        },

        /**
         * Configurer une partie Commander
         */
        setupCommanderGame() {
            this.resetGameState();

            // Préparer les cartes du deck
            const allCards = [];
            Object.entries(this.currentDeck.cards).forEach(([cardId, quantity]) => {
                const card = this.store.cardCache.get(cardId);
                if (card) {
                    // Ajouter les copies de chaque carte
                    for (let i = 0; i < quantity; i++) {
                        allCards.push({
                            ...card,
                            instanceId: `${cardId}_${i}`, // ID unique pour chaque instance
                            tapped: false,
                            counters: 0
                        });
                    }
                }
            });

            // Identifier le commandant (première legendary creature trouvée)
            const commanderCard = allCards.find(card =>
                card.type_line &&
                (card.type_line.includes('Legendary Creature') ||
                    card.type_line.includes('Legendary Planeswalker'))
            );

            if (commanderCard) {
                this.commander = commanderCard;
                this.commandZone = [commanderCard];

                // Retirer le commandant du deck principal
                const commanderIndex = allCards.findIndex(card =>
                    card.instanceId === commanderCard.instanceId
                );
                if (commanderIndex > -1) {
                    allCards.splice(commanderIndex, 1);
                }
            }

            // Mélanger le deck et distribuer la main de départ
            this.playerLibrary = this.shuffleArray(allCards);
            this.drawStartingHand();
        },

        /**
         * Réinitialiser l'état du jeu
         */
        resetGameState() {
            this.playerLife = 40;
            this.currentTurn = 1;
            this.commanderTax = 0;
            this.playerHand = [];
            this.playerBattlefield = [];
            this.playerGraveyard = [];
            this.playerExile = [];
            this.playerLibrary = [];
            this.commandZone = [];
            this.manaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
            this.lastRoll = { d6: null, d20: null };
        },

        /**
         * Distribuer la main de départ (7 cartes)
         */
        drawStartingHand() {
            for (let i = 0; i < 7; i++) {
                this.drawCard();
            }
        },

        /**
         * Piocher une carte
         */
        drawCard() {
            if (this.playerLibrary.length > 0) {
                const card = this.playerLibrary.pop();
                this.playerHand.push(card);
            }
        },

        /**
         * Mélanger la bibliothèque
         */
        shuffleLibrary() {
            this.playerLibrary = this.shuffleArray(this.playerLibrary);
            this.authSuccess = 'Bibliothèque mélangée !';
            setTimeout(() => this.authSuccess = '', 2000);
        },

        /**
         * Mélanger un tableau (algorithme Fisher-Yates)
         */
        shuffleArray(array) {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        },

        /**
         * Engager/dégager une carte
         */
        tapCard(card) {
            card.tapped = !card.tapped;
        },

        /**
         * Menu contextuel pour cartes
         */
        cardContextMenu(card, event) {
            // Ici on pourrait ajouter un menu pour ajouter des marqueurs, etc.
            const action = prompt('Action:\n1 - Ajouter +1/+1\n2 - Retirer marqueur\n3 - Envoyer au cimetière');

            switch (action) {
                case '1':
                    card.counters = (card.counters || 0) + 1;
                    break;
                case '2':
                    card.counters = Math.max(0, (card.counters || 0) - 1);
                    break;
                case '3':
                    this.moveCardToGraveyard(card);
                    break;
            }
        },

        /**
         * Déplacer une carte vers le cimetière
         */
        moveCardToGraveyard(card) {
            // Retirer de battlefield
            const index = this.playerBattlefield.findIndex(c => c.instanceId === card.instanceId);
            if (index > -1) {
                this.playerBattlefield.splice(index, 1);
                this.playerGraveyard.unshift(card); // Ajouter en haut du cimetière

                // Si c'est le commandant, demander où l'envoyer
                if (card.name === this.commander?.name) {
                    const choice = confirm('Envoyer le commandant en command zone au lieu du cimetière ?');
                    if (choice) {
                        this.playerGraveyard.shift(); // Retirer du cimetière
                        this.commandZone = [{ ...card, tapped: false, counters: 0 }];
                        this.commanderTax++;
                    }
                }
            }
        },

        /**
         * Changer les points de vie
         */
        changeLife(amount) {
            this.playerLife += amount;
            this.playerLife = Math.max(0, this.playerLife); // Pas en dessous de 0
        },

        /**
         * Gérer le mana
         */
        changeMana(color, amount) {
            this.manaPool[color] = Math.max(0, (this.manaPool[color] || 0) + amount);
        },

        clearManaPool() {
            Object.keys(this.manaPool).forEach(color => {
                this.manaPool[color] = 0;
            });
        },

        /**
         * Lancer un dé
         */
        rollDice(sides) {
            const result = Math.floor(Math.random() * sides) + 1;
            this.lastRoll[`d${sides}`] = result;

            this.authSuccess = `🎲 D${sides}: ${result}`;
            setTimeout(() => this.authSuccess = '', 3000);
        },

        /**
         * Tour suivant
         */
        nextTurn() {
            this.currentTurn++;

            // Dégager toutes les cartes
            this.playerBattlefield.forEach(card => {
                card.tapped = false;
            });

            // Piocher une carte
            this.drawCard();

            this.authSuccess = `Tour ${this.currentTurn} - Dégagement et pioche !`;
            setTimeout(() => this.authSuccess = '', 3000);
        },

        /**
         * Reset complet
         */
        resetGame() {
            if (confirm('Êtes-vous sûr de vouloir recommencer la partie ?')) {
                this.setupCommanderGame();
                this.authSuccess = 'Partie remise à zéro !';
                setTimeout(() => this.authSuccess = '', 3000);
            }
        },

        /**
         * Sortir du playtester
         */
        exitPlaytest() {
            if (confirm('Quitter le playtest et retourner à l\'éditeur ?')) {
                this.currentView = 'deck-editor';
                this.resetGameState();
            }
        },

        /**
         * Afficher détails d'une carte (on peut réutiliser votre logique existante)
         */
        showCardDetails(card) {
            // Ici on pourrait ouvrir un modal avec les détails de la carte
            console.log('Détails de carte:', card);
        },

        /**
     * Démarrer le playtest avec mulligan
     */
        startPlaytest() {
            if (!this.currentDeck || !this.currentDeck.cards) {
                this.handleError(new Error('Aucun deck sélectionné'), 'Démarrage playtest');
                return;
            }

            try {
                // Aller directement au mulligan au lieu du playtester
                this.currentView = 'mulligan';
                this.setupCommanderGame();

            } catch (error) {
                this.handleError(error, 'Démarrage playtest');
            }
        },

        /**
         * Configuration initiale pour Commander
         */
        setupCommanderGame() {
            this.resetGameState();

            // Préparer les cartes du deck
            const allCards = [];
            Object.entries(this.currentDeck.cards).forEach(([cardId, quantity]) => {
                const card = this.store.cardCache.get(cardId);
                if (card) {
                    for (let i = 0; i < quantity; i++) {
                        allCards.push({
                            ...card,
                            instanceId: `${cardId}_${i}`,
                            tapped: false,
                            counters: 0
                        });
                    }
                }
            });

            // Identifier le commandant
            const commanderCard = allCards.find(card =>
                card.type_line &&
                (card.type_line.includes('Legendary Creature') ||
                    card.type_line.includes('Legendary Planeswalker'))
            );

            if (commanderCard) {
                this.commander = commanderCard;
                this.commandZone = [commanderCard];

                const commanderIndex = allCards.findIndex(card =>
                    card.instanceId === commanderCard.instanceId
                );
                if (commanderIndex > -1) {
                    allCards.splice(commanderIndex, 1);
                }
            }

            // Préparer la bibliothèque et tirer la main de départ
            this.playerLibrary = this.shuffleArray(allCards);
            this.drawOpeningHand();
        },

        /**
         * Tirer la main de départ de 7 cartes
         */
        drawOpeningHand() {
            this.openingHand = [];
            for (let i = 0; i < 7; i++) {
                if (this.playerLibrary.length > 0) {
                    const card = this.playerLibrary.pop();
                    this.openingHand.push(card);
                }
            }
        },

        /**
         * Prendre un mulligan
         */
        takeMulligan() {
            if (this.mulliganCount >= 7) {
                alert('Vous ne pouvez pas prendre plus de 7 mulligans !');
                return;
            }

            // Remettre les cartes de la main dans la bibliothèque
            this.openingHand.forEach(card => {
                this.playerLibrary.push(card);
            });

            // Remettre les cartes du bottom of library
            this.bottomOfLibrary.forEach(card => {
                this.playerLibrary.push(card);
            });

            // Mélanger
            this.playerLibrary = this.shuffleArray(this.playerLibrary);

            // Incrémenter le compteur de mulligan
            this.mulliganCount++;

            // Tirer une nouvelle main (7 - nombre de mulligans)
            const newHandSize = Math.max(1, 7 - this.mulliganCount);
            this.openingHand = [];
            this.bottomOfLibrary = [];

            for (let i = 0; i < newHandSize; i++) {
                if (this.playerLibrary.length > 0) {
                    const card = this.playerLibrary.pop();
                    this.openingHand.push(card);
                }
            }

            this.authSuccess = `Mulligan ${this.mulliganCount} - Nouvelle main de ${newHandSize} cartes`;
            setTimeout(() => this.authSuccess = '', 3000);
        },

        /**
         * Garder la main
         */
        keepHand() {
            // Transférer la main vers la main du joueur
            this.playerHand = [...this.openingHand];

            // Remettre les cartes du bottom of library dans la bibliothèque
            this.bottomOfLibrary.reverse().forEach(card => {
                this.playerLibrary.push(card);
            });

            // Ajouter les cartes exilées à la zone d'exil
            this.playerExile.push(...this.exileFromMulligan);

            // Aller au playtester principal
            this.currentView = 'playtester';

            this.authSuccess = 'Main gardée ! Que la partie commence ! 🎮';
            setTimeout(() => this.authSuccess = '', 3000);
        },

        /**
         * Gestion du drag & drop - Début
         */
        onDragStart(event, card, index) {
            this.draggedCard = card;
            this.draggedIndex = index;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/html', event.target.outerHTML);
        },

        onDragEnd(event) {
            this.draggedCard = null;
            this.draggedIndex = null;
        },

        onDragEnter(event) {
            event.target.closest('.drop-zone').classList.add('drag-over');
        },

        onDragLeave(event) {
            // Vérifier si on quitte vraiment la zone
            if (!event.target.closest('.drop-zone').contains(event.relatedTarget)) {
                event.target.closest('.drop-zone').classList.remove('drag-over');
            }
        },

        /**
         * Gestion du drop
         */
        onDrop(event, zone) {
            event.preventDefault();
            event.target.closest('.drop-zone').classList.remove('drag-over');

            if (!this.draggedCard || this.draggedIndex === null) return;

            const card = this.draggedCard;
            const index = this.draggedIndex;

            // Retirer la carte de la main
            this.openingHand.splice(index, 1);

            // Ajouter à la zone appropriée
            if (zone === 'library') {
                this.bottomOfLibrary.push(card);
                this.authSuccess = `${card.name} envoyée au fond de la bibliothèque`;
            } else if (zone === 'exile') {
                this.exileFromMulligan.push(card);
                this.authSuccess = `${card.name} exilée`;
            }

            setTimeout(() => this.authSuccess = '', 2000);
        },

        /**
         * Sortir du mulligan
         */
        exitMulligan() {
            if (confirm('Quitter et retourner à l\'éditeur de deck ?')) {
                this.currentView = 'deck-editor';
                this.resetMulliganState();
            }
        },

        /**
         * Reset de l'état mulligan
         */
        resetMulliganState() {
            this.openingHand = [];
            this.mulliganCount = 0;
            this.bottomOfLibrary = [];
            this.exileFromMulligan = [];
            this.draggedCard = null;
            this.draggedIndex = null;
        },

        /**
         * Reset complet (màj de la méthode existante)
         */
        resetGameState() {
            this.playerLife = 40;
            this.currentTurn = 1;
            this.commanderTax = 0;
            this.playerHand = [];
            this.playerBattlefield = [];
            this.playerGraveyard = [];
            this.playerExile = [];
            this.playerLibrary = [];
            this.commandZone = [];
            this.manaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
            this.lastRoll = { d6: null, d20: null };

            // Reset mulligan
            this.resetMulliganState();
        },

        /**
         * Options (placeholder)
         */
        showOptions() {
            alert('Options à implémenter (scry, règles spéciales, etc.)');
        }
    },

    // === COMPUTED PROPERTIES ===
    computed: {
        filteredDeckCards() {
            if (!this.currentDeck?.cards || !this.store?.cardCache) {
                return [];
            }

            return Object.entries(this.currentDeck.cards)
                .map(([cardId, quantity]) => {
                    const card = this.store.cardCache.get(cardId);
                    return card ? { cardId, quantity, card } : null;
                })
                .filter(Boolean); // Enlève les null
        },

        deckRecommendations() {
            try {
                if (!this.currentDeck?.cards || !this.store?.cardCache) {
                    return [];
                }

                const recommendations = [];
                const totalCards = this.getTotalCards();
                const creatures = this.getCreatureCount();
                const lands = this.getLandCount();

                if (totalCards < 60) {
                    recommendations.push({
                        type: 'warning',
                        message: `Votre deck contient ${totalCards} cartes. Un deck Standard doit contenir au minimum 60 cartes.`
                    });
                } else if (totalCards > 100) {
                    recommendations.push({
                        type: 'info',
                        message: `Votre deck contient ${totalCards} cartes. Considérez réduire pour optimiser la consistance.`
                    });
                }

                const landRatio = totalCards > 0 ? (lands / totalCards) * 100 : 0;
                if (landRatio < 30) {
                    recommendations.push({
                        type: 'suggestion',
                        message: `Vous avez ${landRatio.toFixed(1)}% de terrains. Considérez ajouter plus de terrains (33-40% recommandé).`
                    });
                } else if (landRatio > 50) {
                    recommendations.push({
                        type: 'warning',
                        message: `Vous avez ${landRatio.toFixed(1)}% de terrains. C'est peut-être trop pour un deck agressif.`
                    });
                }

                const creatureRatio = totalCards > 0 ? (creatures / totalCards) * 100 : 0;
                if (creatureRatio < 15 && totalCards > 30) {
                    recommendations.push({
                        type: 'info',
                        message: `Vous avez peu de créatures (${creatureRatio.toFixed(1)}%). Assurez-vous d'avoir d'autres conditions de victoire.`
                    });
                }

                return recommendations;
            } catch (error) {
                console.warn('Erreur dans deckRecommendations:', error);
                return [];
            }
        }
    }
});

// 🎯 ENREGISTRER LE COMPOSANT DRAGGABLE
if (window.vuedraggable) {
    app.component('draggable', window.vuedraggable);
} else {
    console.error('Vue Draggable non trouvé. Vérifiez que le CDN est chargé.');
}

// 🎯 MONTAGE DE L'APPLICATION
app.mount('#app');