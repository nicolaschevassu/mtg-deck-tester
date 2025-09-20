/**
 * Gestion de l'état de l'interface utilisateur
 */
export const UIState = {
    methods: {
        changeView(newView) {
            this.currentView = newView;
            if (this.store) {
                this.store.setState({ currentView: newView });
            }
        },

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
        }
    }
};