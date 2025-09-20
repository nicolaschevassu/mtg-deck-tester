/**
 * Mixin pour la recherche et gestion des cartes
 */
export const CardSearchMixin = {
    methods: {
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

        getCardById(cardId) {
            try {
                if (!this.store?.cardCache) return null;
                return this.store.cardCache.get(cardId);
            } catch (error) {
                console.warn('Erreur getCardById:', error);
                return null;
            }
        },

        async showCardImage(event, card) {
            const tooltip = document.getElementById('card-tooltip');
            const tooltipImage = document.getElementById('card-tooltip-image');

            if (!tooltip || !tooltipImage || !card || !this.store?.cardCache) return;

            try {
                const imageUrl = await this.store.cardCache.getImage(card);

                if (imageUrl) {
                    tooltipImage.src = imageUrl;
                    tooltipImage.alt = card.name;
                } else {
                    tooltipImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI3OSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI3OSIgZmlsbD0iI2YwZjBmMCIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSIxMDAiIHk9IjE0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNjY2Ij5NVEc8L3RleHQ+PC9zdmc+';
                    tooltipImage.alt = 'Image non disponible';
                }

                this.positionTooltip(event, tooltip);
                tooltip.classList.add('show');

            } catch (error) {
                console.warn('Erreur affichage image carte:', error);
            }
        },

        hideCardImage() {
            const tooltip = document.getElementById('card-tooltip');
            if (tooltip) {
                tooltip.classList.remove('show');
            }
        },

        positionTooltip(event, tooltip) {
            const margin = 20;
            const tooltipRect = tooltip.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let left = event.clientX + margin;
            let top = event.clientY + margin;

            if (left + tooltipRect.width > viewportWidth) {
                left = event.clientX - tooltipRect.width - margin;
            }

            if (top + tooltipRect.height > viewportHeight) {
                top = event.clientY - tooltipRect.height - margin;
            }

            left = Math.max(margin, left);
            top = Math.max(margin, top);

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        }
    }
};