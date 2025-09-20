/**
 * Module pour la persistance de l'état des vues de jeu
 */
export const ViewPersistence = {
    methods: {
        /**
         * Sauvegarder l'état de jeu complet
         */
        saveGameState() {
            if (this.currentView !== 'mulligan' && this.currentView !== 'playtester') {
                return;
            }

            try {
                const gameState = {
                    // Vue et deck
                    currentView: this.currentView,
                    currentDeckId: this.currentDeck?.id,

                    // État de jeu Commander
                    playerLife: this.playerLife,
                    currentTurn: this.currentTurn,
                    commanderTax: this.commanderTax,

                    // Mulligan
                    mulliganCount: this.mulliganCount,

                    // Zones de jeu (sauver seulement les IDs des cartes pour éviter les gros objets)
                    playerHandIds: this.playerHand?.map(card => card.instanceId) || [],
                    playerBattlefieldIds: this.playerBattlefield?.map(card => ({
                        instanceId: card.instanceId,
                        tapped: card.tapped,
                        counters: card.counters
                    })) || [],
                    playerGraveyardIds: this.playerGraveyard?.map(card => card.instanceId) || [],
                    playerExileIds: this.playerExile?.map(card => card.instanceId) || [],
                    playerLibraryIds: this.playerLibrary?.map(card => card.instanceId) || [],
                    commandZoneIds: this.commandZone?.map(card => card.instanceId) || [],

                    // Compteurs
                    manaPool: { ...this.manaPool },
                    lastRoll: { ...this.lastRoll },

                    // Timestamp
                    savedAt: Date.now()
                };

                sessionStorage.setItem('mtg_game_state', JSON.stringify(gameState));
                console.log('🎮 État de jeu sauvegardé');

            } catch (error) {
                console.warn('Impossible de sauvegarder l\'état de jeu:', error);
            }
        },

        /**
         * Charger l'état de jeu sauvegardé
         */
        loadGameState() {
            try {
                const saved = sessionStorage.getItem('mtg_game_state');
                if (!saved) return null;

                const gameState = JSON.parse(saved);

                // Vérifier que l'état n'est pas trop ancien (30 minutes max)
                const maxAge = 30 * 60 * 1000; // 30 minutes
                if (Date.now() - gameState.savedAt > maxAge) {
                    sessionStorage.removeItem('mtg_game_state');
                    console.log('🗑️ État de jeu expiré, supprimé');
                    return null;
                }

                console.log('🎮 État de jeu chargé:', gameState.currentView);
                return gameState;

            } catch (error) {
                console.warn('Impossible de charger l\'état de jeu:', error);
                sessionStorage.removeItem('mtg_game_state');
                return null;
            }
        },

        /**
         * Restaurer l'état de jeu complet
         */
        async restoreGameState(gameState) {
            if (!gameState || !this.currentDeck) return false;

            // Vérifier que c'est le même deck
            if (gameState.currentDeckId !== this.currentDeck.id) {
                console.log('🎮 Deck différent, état de jeu ignoré');
                return false;
            }

            try {
                // Restaurer l'état de base
                this.currentView = gameState.currentView;
                this.playerLife = gameState.playerLife || 40;
                this.currentTurn = gameState.currentTurn || 1;
                this.commanderTax = gameState.commanderTax || 0;
                this.mulliganCount = gameState.mulliganCount || 0;
                this.manaPool = gameState.manaPool || { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
                this.lastRoll = gameState.lastRoll || { d6: null, d20: null };

                // Seulement restaurer les zones si on est en playtester (pas en mulligan)
                if (gameState.currentView === 'playtester') {
                    await this.restoreGameZones(gameState);
                }

                console.log('✅ État de jeu restauré avec succès');
                return true;

            } catch (error) {
                console.error('❌ Erreur lors de la restauration:', error);
                return false;
            }
        },

        /**
         * Restaurer les zones de jeu
         */
        async restoreGameZones(gameState) {
            // Préparer toutes les cartes du deck avec leurs instanceId
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

            // Créer une map pour retrouver rapidement les cartes
            const cardMap = new Map();
            allCards.forEach(card => {
                cardMap.set(card.instanceId, card);
            });

            // Restaurer chaque zone
            this.playerHand = this.restoreZone(gameState.playerHandIds, cardMap);
            this.playerGraveyard = this.restoreZone(gameState.playerGraveyardIds, cardMap);
            this.playerExile = this.restoreZone(gameState.playerExileIds, cardMap);
            this.playerLibrary = this.restoreZone(gameState.playerLibraryIds, cardMap);
            this.commandZone = this.restoreZone(gameState.commandZoneIds, cardMap);

            // Battlefield avec état des cartes
            this.playerBattlefield = gameState.playerBattlefieldIds?.map(cardState => {
                const card = cardMap.get(cardState.instanceId);
                if (card) {
                    return {
                        ...card,
                        tapped: cardState.tapped,
                        counters: cardState.counters
                    };
                }
                return null;
            }).filter(Boolean) || [];

            // Identifier le commandant
            this.commander = this.commandZone?.[0] || null;
        },

        /**
         * Restaurer une zone spécifique
         */
        restoreZone(cardIds, cardMap) {
            if (!cardIds || !Array.isArray(cardIds)) return [];

            return cardIds.map(instanceId => cardMap.get(instanceId)).filter(Boolean);
        },

        /**
         * Nettoyer l'état sauvegardé
         */
        clearSavedGameState() {
            sessionStorage.removeItem('mtg_game_state');
            console.log('🗑️ État de jeu nettoyé');
        },

        /**
         * Auto-save à intervalles réguliers
         */
        setupAutoSave() {
            // Sauvegarder l'état toutes les 10 secondes en jeu
            if (this.gameStateInterval) {
                clearInterval(this.gameStateInterval);
            }

            this.gameStateInterval = setInterval(() => {
                if (this.currentView === 'mulligan' || this.currentView === 'playtester') {
                    this.saveGameState();
                }
            }, 10000); // 10 secondes
        },

        /**
         * Arrêter l'auto-save
         */
        stopAutoSave() {
            if (this.gameStateInterval) {
                clearInterval(this.gameStateInterval);
                this.gameStateInterval = null;
            }
        }
    },

    mounted() {
        // Démarrer l'auto-save au montage
        this.setupAutoSave();

        // Sauvegarder avant la fermeture/changement d'onglet
        window.addEventListener('beforeunload', () => {
            this.saveGameState();
        });

        // Sauvegarder lors du changement de visibilité (changement d'onglet)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveGameState();
            }
        });
    },

    beforeUnmount() {
        this.stopAutoSave();
    }
};