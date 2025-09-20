/**
 * Utilitaires pour les cartes Magic
 */
export const CardUtils = {
    methods: {
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
    }
};