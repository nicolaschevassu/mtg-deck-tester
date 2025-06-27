/**
 * MTG Deck Builder - Application principale Vue.js
 * Version robuste avec gestion d'erreurs complète
 */

const { createApp } = Vue;

createApp({
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
            bulkLoading: false
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

}).mount('#app');