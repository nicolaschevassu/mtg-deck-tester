/**
 * Gestion centralisée des erreurs
 */
export const ErrorHandler = {
    methods: {
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
        }
    }
};