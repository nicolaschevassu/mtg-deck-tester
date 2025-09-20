/**
 * Mixin pour la gestion des decks
 */
export const DeckMixin = {
    methods: {
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

                // Précharger les images en arrière-plan
                setTimeout(async () => {
                    const cardsToPreload = [];
                    Object.keys(deck.cards).forEach(cardId => {
                        const card = this.store.cardCache.get(cardId);
                        if (card) cardsToPreload.push(card);
                    });

                    if (cardsToPreload.length > 0) {
                        await this.store.cardCache.preloadImages(cardsToPreload);
                        console.log(`📊 Images préchargées pour ${deck.name}`);
                    }
                }, 500);

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
        }
    },

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
                .filter(Boolean);
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
};