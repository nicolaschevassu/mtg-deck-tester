const { createApp } = Vue;

createApp({
    data() {
        return {
            // Configuration Supabase
            supabaseConfigured: false,
            supabaseConfig: {
                url: '',
                anonKey: ''
            },
            supabaseClient: null,
            isConnected: false,

            // Authentification
            isAuthenticated: false,
            authMode: 'login', // ← Variable qui manquait !
            authLoading: false,
            authError: '',
            authSuccess: '',
            currentUser: null,

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

            // Interface
            currentView: 'decks',
            showCreateDeck: false,

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
            cardCache: {},

            // Debounce timer
            searchTimeout: null
        };
    },

    async mounted() {
        // Vérifier s'il y a une session Supabase sauvegardée
        const savedConfig = localStorage.getItem('mtg_supabase_config');
        if (savedConfig) {
            try {
                this.supabaseConfig = JSON.parse(savedConfig);
                await this.configureSupabase();
            } catch (error) {
                console.error('Erreur lors du chargement de la configuration:', error);
            }
        }
    },

    methods: {
        // === CONFIGURATION SUPABASE ===
        async configureSupabase() {
            if (!this.supabaseConfig.url || !this.supabaseConfig.anonKey) {
                this.authError = 'Veuillez remplir tous les champs de configuration';
                return;
            }

            try {
                // Créer le client Supabase
                this.supabaseClient = supabase.createClient(
                    this.supabaseConfig.url,
                    this.supabaseConfig.anonKey
                );

                // Tester la connexion
                const { data, error } = await this.supabaseClient
                    .from('decks')
                    .select('count')
                    .limit(1);

                if (error && error.code !== 'PGRST116') { // PGRST116 = table vide, c'est OK
                    throw error;
                }

                // Sauvegarder la configuration
                localStorage.setItem('mtg_supabase_config', JSON.stringify(this.supabaseConfig));

                this.supabaseConfigured = true;
                this.isConnected = true;
                this.authError = '';

                // Vérifier s'il y a un utilisateur connecté
                const { data: { session } } = await this.supabaseClient.auth.getSession();
                if (session) {
                    this.isAuthenticated = true;
                    this.currentUser = session.user;
                    await this.loadUserDecks();
                }

                // Écouter les changements d'authentification
                this.supabaseClient.auth.onAuthStateChange((event, session) => {
                    if (session) {
                        this.isAuthenticated = true;
                        this.currentUser = session.user;
                        this.loadUserDecks();
                    } else {
                        this.isAuthenticated = false;
                        this.currentUser = null;
                        this.userDecks = [];
                    }
                });

            } catch (error) {
                console.error('Erreur de configuration Supabase:', error);
                this.authError = `Erreur de connexion: ${error.message}`;
                this.isConnected = false;
            }
        },

        // === AUTHENTIFICATION ===
        async login() {
            if (!this.loginForm.email || !this.loginForm.password) {
                this.authError = 'Veuillez remplir tous les champs';
                return;
            }

            this.authLoading = true;
            this.authError = '';

            try {
                const { data, error } = await this.supabaseClient.auth.signInWithPassword({
                    email: this.loginForm.email,
                    password: this.loginForm.password
                });

                if (error) throw error;

                this.authSuccess = 'Connexion réussie !';
                this.loginForm = { email: '', password: '' };

            } catch (error) {
                console.error('Erreur de connexion:', error);
                this.authError = error.message;
            } finally {
                this.authLoading = false;
            }
        },

        async register() {
            if (!this.registerForm.email || !this.registerForm.password || !this.registerForm.confirmPassword) {
                this.authError = 'Veuillez remplir tous les champs';
                return;
            }

            if (this.registerForm.password !== this.registerForm.confirmPassword) {
                this.authError = 'Les mots de passe ne correspondent pas';
                return;
            }

            if (this.registerForm.password.length < 6) {
                this.authError = 'Le mot de passe doit contenir au moins 6 caractères';
                return;
            }

            this.authLoading = true;
            this.authError = '';

            try {
                const { data, error } = await this.supabaseClient.auth.signUp({
                    email: this.registerForm.email,
                    password: this.registerForm.password
                });

                if (error) throw error;

                this.authSuccess = 'Compte créé avec succès ! Vérifiez votre email pour confirmer votre compte.';
                this.registerForm = { email: '', password: '', confirmPassword: '' };

            } catch (error) {
                console.error('Erreur d\'inscription:', error);
                this.authError = error.message;
            } finally {
                this.authLoading = false;
            }
        },

        async logout() {
            try {
                const { error } = await this.supabaseClient.auth.signOut();
                if (error) throw error;

                this.currentView = 'decks';
                this.currentDeck = null;

            } catch (error) {
                console.error('Erreur de déconnexion:', error);
            }
        },

        // === GESTION DES DECKS ===
        async loadUserDecks() {
            this.decksLoading = true;
            try {
                const { data, error } = await this.supabaseClient
                    .from('decks')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                this.userDecks = data;
            } catch (error) {
                console.error('Erreur lors du chargement des decks:', error);
            } finally {
                this.decksLoading = false;
            }
        },

        async createDeck() {
            if (!this.newDeckName.trim()) return;

            this.deckLoading = true;
            try {
                const { data, error } = await this.supabaseClient
                    .from('decks')
                    .insert([
                        {
                            name: this.newDeckName.trim(),
                            user_id: this.currentUser.id,
                            cards: {}
                        }
                    ])
                    .select();

                if (error) throw error;

                this.userDecks.unshift(data[0]);
                this.newDeckName = '';
                this.showCreateDeck = false;

            } catch (error) {
                console.error('Erreur lors de la création du deck:', error);
            } finally {
                this.deckLoading = false;
            }
        },

        async saveDeck() {
            if (!this.currentDeck) return;

            this.deckLoading = true;
            try {
                const { error } = await this.supabaseClient
                    .from('decks')
                    .update({
                        cards: this.currentDeck.cards,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', this.currentDeck.id);

                if (error) throw error;

                // Mettre à jour le deck dans la liste
                const deckIndex = this.userDecks.findIndex(d => d.id === this.currentDeck.id);
                if (deckIndex !== -1) {
                    this.userDecks[deckIndex] = { ...this.currentDeck };
                }

                this.authSuccess = 'Deck sauvegardé !';
                setTimeout(() => { this.authSuccess = ''; }, 3000);

            } catch (error) {
                console.error('Erreur lors de la sauvegarde:', error);
                this.authError = 'Erreur lors de la sauvegarde';
            } finally {
                this.deckLoading = false;
            }
        },

        openDeck(deck) {
            this.currentDeck = { ...deck };
            this.currentView = 'deck-editor';
        },

        goBackToDecks() {
            this.currentView = 'decks';
            this.currentDeck = null;
        },

        // === RECHERCHE DE CARTES ===
        async searchCards() {
            if (!this.searchQuery.trim()) {
                this.searchResults = [];
                return;
            }

            // Debounce
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }

            this.searchTimeout = setTimeout(async () => {
                this.searchLoading = true;
                try {
                    const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(this.searchQuery)}`);
                    const data = await response.json();

                    if (data.data) {
                        this.searchResults = data.data.slice(0, 20); // Limiter à 20 résultats

                        // Mettre en cache
                        data.data.forEach(card => {
                            this.cardCache[card.id] = card;
                        });
                    } else {
                        this.searchResults = [];
                    }
                } catch (error) {
                    console.error('Erreur de recherche:', error);
                    this.searchResults = [];
                } finally {
                    this.searchLoading = false;
                }
            }, 500);
        },

        addCardToDeck(card) {
            if (!this.currentDeck) return;

            if (!this.currentDeck.cards) {
                this.currentDeck.cards = {};
            }

            this.cardCache[card.id] = card;

            if (this.currentDeck.cards[card.id]) {
                this.currentDeck.cards[card.id]++;
            } else {
                this.currentDeck.cards[card.id] = 1;
            }
        },

        addCardToDeckById(cardId) {
            if (!this.currentDeck || !this.currentDeck.cards) return;

            if (this.currentDeck.cards[cardId]) {
                this.currentDeck.cards[cardId]++;
            }
        },

        removeCardFromDeck(cardId) {
            if (!this.currentDeck || !this.currentDeck.cards || !this.currentDeck.cards[cardId]) return;

            this.currentDeck.cards[cardId]--;
            if (this.currentDeck.cards[cardId] <= 0) {
                delete this.currentDeck.cards[cardId];
            }
        },

        async processBulkAdd() {
            if (!this.bulkAddText.trim()) return;

            this.bulkLoading = true;
            const lines = this.bulkAddText.split('\n');

            for (const line of lines) {
                const match = line.trim().match(/^(\d+)x?\s+(.+)$/);
                if (match) {
                    const quantity = parseInt(match[1]);
                    const cardName = match[2].trim();

                    try {
                        const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
                        const card = await response.json();

                        if (!card.id) continue;

                        this.cardCache[card.id] = card;

                        if (!this.currentDeck.cards) {
                            this.currentDeck.cards = {};
                        }

                        if (this.currentDeck.cards[card.id]) {
                            this.currentDeck.cards[card.id] += quantity;
                        } else {
                            this.currentDeck.cards[card.id] = quantity;
                        }

                        // Petit délai pour éviter de surcharger l'API
                        await new Promise(resolve => setTimeout(resolve, 100));

                    } catch (error) {
                        console.error(`Erreur pour ${cardName}:`, error);
                    }
                }
            }

            this.bulkAddText = '';
            this.bulkLoading = false;
        },

        // === UTILITAIRES ===
        getCardById(cardId) {
            return this.cardCache[cardId] || null;
        },

        getTotalCards() {
            if (!this.currentDeck || !this.currentDeck.cards) return 0;
            return Object.values(this.currentDeck.cards).reduce((sum, quantity) => sum + quantity, 0);
        },

        getTotalCardsFromDeckData(cardsData) {
            if (!cardsData) return 0;
            return Object.values(cardsData).reduce((sum, quantity) => sum + quantity, 0);
        },

        getCreatureCount() {
            if (!this.currentDeck || !this.currentDeck.cards) return 0;
            return Object.entries(this.currentDeck.cards).reduce((count, [cardId, quantity]) => {
                const card = this.getCardById(cardId);
                if (card && card.type_line && card.type_line.includes('Creature')) {
                    return count + quantity;
                }
                return count;
            }, 0);
        },

        getSpellCount() {
            if (!this.currentDeck || !this.currentDeck.cards) return 0;
            return Object.entries(this.currentDeck.cards).reduce((count, [cardId, quantity]) => {
                const card = this.getCardById(cardId);
                if (card && card.type_line &&
                    (card.type_line.includes('Instant') ||
                        card.type_line.includes('Sorcery') ||
                        card.type_line.includes('Enchantment') ||
                        card.type_line.includes('Artifact')) &&
                    !card.type_line.includes('Land')) {
                    return count + quantity;
                }
                return count;
            }, 0);
        },

        getLandCount() {
            if (!this.currentDeck || !this.currentDeck.cards) return 0;
            return Object.entries(this.currentDeck.cards).reduce((count, [cardId, quantity]) => {
                const card = this.getCardById(cardId);
                if (card && card.type_line && card.type_line.includes('Land')) {
                    return count + quantity;
                }
                return count;
            }, 0);
        },

        formatDate(dateString) {
            return new Date(dateString).toLocaleDateString('fr-FR');
        }
    }
}).mount('#app');