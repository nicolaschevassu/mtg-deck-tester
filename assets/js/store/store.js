/**
 * Store global de l'application MTG Deck Builder
 */
class AppStore {
    constructor() {
        // Services
        this.supabaseConfig = new SupabaseConfig();
        this.authService = new AuthService(this.supabaseConfig);
        this.deckService = new DeckService(this.supabaseConfig);
        this.scryfallService = new ScryfallService();
        this.cardCache = new CardCache();

        // État de l'application
        this.state = {
            // Configuration
            isInitialized: false,
            supabaseConfigured: false,
            isConnected: false,

            // Authentification
            isAuthenticated: false,
            currentUser: null,
            authMode: 'login',
            authLoading: false,
            authError: '',
            authSuccess: '',

            // Interface
            currentView: 'decks',
            showCreateDeck: false,
            loading: false,

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

            // Configuration Supabase
            supabaseConfig: {
                url: '',
                anonKey: ''
            }
        };

        // Callbacks pour les changements d'état
        this.subscribers = [];

        // Debounced search
        this.debouncedSearch = Helpers.debounce(this._performSearch.bind(this), 500);
    }

    /**
     * Initialiser l'application
     */
    async initialize() {
        try {
            this.setState({ loading: true });

            // NOUVEAU : Restaurer l'état de vue sauvegardé
            const savedViewState = this._loadViewState();

            // Tenter de charger la configuration Supabase sauvée
            const savedConfig = await this.supabaseConfig.loadSavedConfig();

            if (savedConfig) {
                this.setState({
                    supabaseConfigured: true,
                    isConnected: true,
                    supabaseConfig: savedConfig
                });

                // Configurer l'authentification
                this.authService.setupAuthListener();

                // Vérifier la session
                const user = await this.authService.checkSession();
                if (user) {
                    this.setState({
                        isAuthenticated: true,
                        currentUser: user
                    });

                    await this.loadUserDecks();

                    // NOUVEAU : Restaurer la vue si authentifié ET vue sauvée valide ET deck disponible
                    if (savedViewState &&
                        (savedViewState.currentView === 'mulligan' || savedViewState.currentView === 'playtester') &&
                        savedViewState.currentDeckId) {

                        // Vérifier que le deck existe encore
                        const deckExists = this.state.userDecks.find(deck => deck.id === savedViewState.currentDeckId);

                        if (deckExists) {
                            this.setState({
                                currentView: savedViewState.currentView,
                                currentDeck: deckExists,
                                mulliganCount: savedViewState.mulliganCount || 0,
                                currentTurn: savedViewState.currentTurn || 1
                            });
                            console.log(`🔄 Vue restaurée: ${savedViewState.currentView} avec deck: ${deckExists.name}`);
                        } else {
                            // Le deck n'existe plus, retour à la vue decks
                            this.setState({ currentView: 'decks' });
                            console.log('🏠 Deck non trouvé, retour à la vue decks');
                        }
                    } else {
                        // S'assurer que la vue par défaut est 'decks'
                        this.setState({
                            currentView: 'decks'
                        });
                        console.log('🏠 Vue par défaut: decks');
                    }
                }

                // Écouter les changements d'auth
                this.authService.onAuthChange(this._handleAuthChange.bind(this));
            }

            this.setState({
                isInitialized: true,
                loading: false
            });

        } catch (error) {
            console.error('Erreur d\'initialisation:', error);
            this.setState({
                loading: false,
                authError: 'Erreur d\'initialisation de l\'application'
            });
        }
    }

    /**
     * Configurer Supabase
     */
    async configureSupabase(url, anonKey) {
        this.setState({ authLoading: true, authError: '' });

        try {
            await this.supabaseConfig.configure(url, anonKey);

            this.setState({
                supabaseConfigured: true,
                isConnected: true,
                supabaseConfig: { url, anonKey },
                authLoading: false
            });

            // Configurer l'authentification
            this.authService.setupAuthListener();
            this.authService.onAuthChange(this._handleAuthChange.bind(this));

        } catch (error) {
            this.setState({
                authLoading: false,
                authError: error.message
            });
        }
    }

    /**
     * Connexion
     */
    async login(email, password) {
        this.setState({ authLoading: true, authError: '', authSuccess: '' });

        try {
            await this.authService.login(email, password);
            this.setState({
                authLoading: false,
                authSuccess: 'Connexion réussie !'
            });
        } catch (error) {
            this.setState({
                authLoading: false,
                authError: error.message
            });
        }
    }

    /**
     * Inscription
     */
    async register(email, password, confirmPassword) {
        this.setState({ authLoading: true, authError: '', authSuccess: '' });

        try {
            await this.authService.register(email, password, confirmPassword);
            this.setState({
                authLoading: false,
                authSuccess: 'Compte créé avec succès ! Vérifiez votre email pour confirmer votre compte.'
            });
        } catch (error) {
            this.setState({
                authLoading: false,
                authError: error.message
            });
        }
    }

    /**
     * Déconnexion
     */
    async logout() {
        try {
            await this.authService.logout();

            // NOUVEAU : Nettoyer l'état de vue sauvegardé
            this._clearViewState();

            this.setState({
                currentView: 'decks',
                currentDeck: null,
                userDecks: []
            });
        } catch (error) {
            console.error('Erreur de déconnexion:', error);
        }
    }

    /**
     * Charger les decks de l'utilisateur
     */
    async loadUserDecks() {
        this.setState({ decksLoading: true });

        try {
            const decks = await this.deckService.loadUserDecks();
            this.setState({
                userDecks: decks,
                decksLoading: false
            });
        } catch (error) {
            console.error('Erreur chargement decks:', error);
            this.setState({
                decksLoading: false,
                authError: error.message
            });
        }
    }

    /**
     * Créer un nouveau deck
     */
    async createDeck(name) {
        this.setState({ deckLoading: true });

        try {
            const newDeck = await this.deckService.createDeck(name, this.state.currentUser.id);

            this.setState(prevState => ({
                userDecks: [newDeck, ...prevState.userDecks],
                newDeckName: '',
                showCreateDeck: false,
                deckLoading: false
            }));

            return newDeck;
        } catch (error) {
            this.setState({
                deckLoading: false,
                authError: error.message
            });
        }
    }

    /**
     * Sauvegarder un deck
     */
    async saveDeck(deck = null) {
        const deckToSave = deck || this.state.currentDeck;
        if (!deckToSave) return;

        this.setState({ deckLoading: true });

        try {
            await this.deckService.saveDeck(deckToSave);

            // Mettre à jour la liste des decks
            this.setState(prevState => ({
                userDecks: prevState.userDecks.map(d =>
                    d.id === deckToSave.id ? { ...deckToSave } : d
                ),
                deckLoading: false,
                authSuccess: 'Deck sauvegardé !'
            }));

            // Effacer le message de succès après 3 secondes
            setTimeout(() => {
                this.setState({ authSuccess: '' });
            }, 3000);

        } catch (error) {
            this.setState({
                deckLoading: false,
                authError: error.message
            });
        }
    }

    /**
     * Ouvrir un deck
     */
    async openDeck(deck) {
        this.setState({
            currentDeck: { ...deck },
            currentView: 'deck-editor'
        });

        // Charger les cartes du deck
        await this.loadDeckCards(deck);
    }

    /**
     * Charger les cartes d'un deck
     */
    async loadDeckCards(deck) {
        if (!deck.cards || Object.keys(deck.cards).length === 0) {
            return;
        }

        this.setState({ deckLoading: true });

        try {
            const cardIds = Object.keys(deck.cards);
            const { found, missing } = this.cardCache.getMany(cardIds);

            // Si toutes les cartes sont en cache, on n'a rien à faire
            if (missing.length === 0) {
                this.setState({ deckLoading: false });
                return;
            }

            // Charger les cartes manquantes par batch
            const batchSize = 75;
            for (let i = 0; i < missing.length; i += batchSize) {
                const batch = missing.slice(i, i + batchSize);

                try {
                    const result = await this.scryfallService.getCardsByIds(batch);

                    // Ajouter les cartes trouvées au cache
                    if (result.found) {
                        this.cardCache.setMany(result.found);
                    }

                    // Gérer les cartes non trouvées
                    if (result.notFound) {
                        result.notFound.forEach(notFound => {
                            if (notFound.id) {
                                this.cardCache.set(notFound.id, {
                                    id: notFound.id,
                                    name: 'Carte non trouvée',
                                    type_line: 'Erreur',
                                    image_uris: null,
                                    mana_cost: '',
                                    error: true
                                });
                            }
                        });
                    }

                    // Pause entre les batch
                    if (i + batchSize < missing.length) {
                        await Helpers.delay(100);
                    }

                } catch (error) {
                    console.error(`Erreur batch ${i}-${i + batchSize}:`, error);

                    // Fallback: essayer carte par carte
                    for (const cardId of batch) {
                        try {
                            const card = await this.scryfallService.getCardById(cardId);
                            if (card) {
                                this.cardCache.set(cardId, card);
                            }
                            await Helpers.delay(100);
                        } catch (individualError) {
                            console.error(`Erreur carte ${cardId}:`, individualError);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Erreur chargement cartes deck:', error);
            this.setState({ authError: 'Erreur lors du chargement des cartes du deck' });
        } finally {
            this.setState({ deckLoading: false });
        }
    }

    /**
     * Rechercher des cartes
     */
    searchCards(query) {
        this.setState({ searchQuery: query });

        if (!query.trim()) {
            this.setState({ searchResults: [] });
            return;
        }

        this.debouncedSearch();
    }

    /**
     * Effectuer la recherche de cartes
     */
    async _performSearch() {
        const query = this.state.searchQuery.trim();
        if (!query) return;

        this.setState({ searchLoading: true });

        try {
            const results = await this.scryfallService.searchCards(query);
            const limitedResults = results.slice(0, 20); // Limiter à 20 résultats

            // Ajouter au cache
            this.cardCache.setMany(limitedResults);

            this.setState({
                searchResults: limitedResults,
                searchLoading: false
            });

        } catch (error) {
            console.error('Erreur de recherche:', error);
            this.setState({
                searchResults: [],
                searchLoading: false
            });
        }
    }

    /**
     * Ajouter une carte au deck
     */
    addCardToDeck(card, quantity = 1) {
        if (!this.state.currentDeck) return;

        // Ajouter au cache
        this.cardCache.set(card.id, card);

        this.setState(prevState => {
            const newDeck = { ...prevState.currentDeck };
            if (!newDeck.cards) newDeck.cards = {};

            newDeck.cards[card.id] = (newDeck.cards[card.id] || 0) + quantity;

            return { currentDeck: newDeck };
        });
    }

    /**
     * Modifier la quantité d'une carte dans le deck
     */
    setCardQuantity(cardId, newQuantity) {
        if (!this.state.currentDeck) return;

        this.setState(prevState => {
            const newDeck = { ...prevState.currentDeck };
            if (!newDeck.cards) newDeck.cards = {};

            if (newQuantity <= 0) {
                delete newDeck.cards[cardId];
            } else {
                newDeck.cards[cardId] = newQuantity;
            }

            return { currentDeck: newDeck };
        });
    }

    /**
     * Traitement en bulk des cartes
     */
    async processBulkAdd(cardListText) {
        if (!cardListText.trim() || !this.state.currentDeck) return;

        this.setState({ bulkLoading: true });

        try {
            const cardList = this.scryfallService.parseCardList(cardListText);

            const results = await this.scryfallService.processBulkCardList(
                cardList,
                (processed, total, cardName) => {
                    // Callback de progression si nécessaire
                    console.log(`Progression: ${processed}/${total} - ${cardName}`);
                }
            );

            // Ajouter les cartes trouvées au deck
            results.success.forEach(item => {
                this.addCardToDeck(item.card, item.quantity);
            });

            // Afficher les erreurs s'il y en a
            if (results.errors.length > 0) {
                const errorMessages = results.errors.map(err =>
                    `Ligne ${err.lineNumber}: ${err.name} - ${err.error}`
                ).join('\n');

                this.setState({
                    authError: `Erreurs lors de l'ajout:\n${errorMessages}`
                });
            }

            this.setState({
                bulkAddText: '',
                bulkLoading: false,
                authSuccess: `${results.success.length} cartes ajoutées avec succès !`
            });

            setTimeout(() => {
                this.setState({ authSuccess: '' });
            }, 3000);

        } catch (error) {
            this.setState({
                bulkLoading: false,
                authError: error.message
            });
        }
    }

    /**
     * Gérer les changements d'authentification
     */
    _handleAuthChange(event, user, isAuthenticated) {
        this.setState({
            isAuthenticated,
            currentUser: user
        });

        if (isAuthenticated && user) {
            this.loadUserDecks();
        } else {
            this.setState({
                userDecks: [],
                currentDeck: null,
                currentView: 'decks'
            });
        }
    }

    /**
     * Mettre à jour l'état
     */
    setState(newState) {
        if (typeof newState === 'function') {
            this.state = { ...this.state, ...newState(this.state) };
        } else {
            this.state = { ...this.state, ...newState };
        }

        // NOUVEAU : Sauvegarder l'état de vue si il a changé
        if (newState.currentView) {
            this._saveViewState();
        }

        // Notifier les subscribers
        this._notifySubscribers();
    }

    /**
     * S'abonner aux changements d'état
     */
    subscribe(callback) {
        this.subscribers.push(callback);

        // Retourner une fonction de désabonnement
        return () => {
            const index = this.subscribers.indexOf(callback);
            if (index > -1) {
                this.subscribers.splice(index, 1);
            }
        };
    }

    /**
     * Notifier les subscribers
     */
    _notifySubscribers() {
        this.subscribers.forEach(callback => {
            try {
                callback(this.state);
            } catch (error) {
                console.error('Erreur dans subscriber:', error);
            }
        });
    }

    /**
     * Obtenir l'état actuel
     */
    getState() {
        return { ...this.state };
    }

    /**
 * Sauvegarder l'état de la vue dans sessionStorage
 */
    _saveViewState() {
        try {
            const viewState = {
                currentView: this.state.currentView,
                mulliganCount: this.state.mulliganCount || 0,
                currentTurn: this.state.currentTurn || 1,
                savedAt: Date.now()
            };
            sessionStorage.setItem('mtg_view_state', JSON.stringify(viewState));
        } catch (error) {
            console.warn('Impossible de sauvegarder l\'état de vue:', error);
        }
    }

    /**
     * Restaurer l'état de la vue depuis sessionStorage
     */
    _loadViewState() {
        try {
            const saved = sessionStorage.getItem('mtg_view_state');
            if (!saved) return null;

            const viewState = JSON.parse(saved);

            // Vérifier que l'état n'est pas trop ancien (1 heure max)
            const maxAge = 60 * 60 * 1000; // 1 heure
            if (Date.now() - viewState.savedAt > maxAge) {
                sessionStorage.removeItem('mtg_view_state');
                return null;
            }

            return viewState;
        } catch (error) {
            console.warn('Impossible de charger l\'état de vue:', error);
            sessionStorage.removeItem('mtg_view_state');
            return null;
        }
    }

    /**
     * Nettoyer l'état de vue sauvegardé
     */
    _clearViewState() {
        sessionStorage.removeItem('mtg_view_state');
    }
}

// Export singleton
if (!window.AppStore) {
    window.AppStore = AppStore;
}