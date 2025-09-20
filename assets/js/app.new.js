/**
 * MTG Deck Builder - Application principale Vue.js refactorisée
 * Version modulaire avec séparation des métiers
 */

// Imports des modules
import { AuthMixin } from './mixins/auth.mixin.js';
import { DeckMixin } from './mixins/deck.mixin.js';
import { CardSearchMixin } from './mixins/card-search.mixin.js';
import { CommanderEngine } from './game/commander-engine.js';
import { MulliganSystem } from './game/mulligan-system.js';
import { BoardEngine } from './game/board-engine.js';
import { DragSelectEngine } from './game/dragselect-engine.js';
import { UIState } from './modules/ui-state.js';
import { ErrorHandler } from './modules/error-handler.js';
import { CardUtils } from './modules/card-utils.js';
import { ViewPersistence } from './modules/view-persistence.js';

const { createApp } = Vue;

const app = createApp({
    // Combiner tous les mixins
    mixins: [
        AuthMixin,
        DeckMixin,
        CardSearchMixin,
        CommanderEngine,
        MulliganSystem,
        BoardEngine,
        DragSelectEngine,
        UIState,
        ErrorHandler,
        CardUtils,
        ViewPersistence
    ],

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
            currentView: 'decks',
            showCreateDeck: false,

            // Authentification
            authMode: 'login',
            authLoading: false,
            authError: '',
            authSuccess: '',
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
            cardPlaceholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2OCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2OCIgZmlsbD0iIzM0NDk1ZSIgc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI2MCIgeT0iODQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiPk1URzwvdGV4dD48L3N2Zz4=',

            // Playtester Commander
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
            poisonCounters: 0,

            // Mulligan
            openingHand: [],
            mulliganCount: 0,
            bottomOfLibrary: [],
            exileFromMulligan: [],
            draggedCard: null,
            draggedIndex: null,

            // Board drag/drop
            draggedFromZone: null,

            // DragSelect
            dragSelectInstance: null,

            // Interval pour auto-save
            gameStateInterval: null
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
        // Méthode pour forcer le retour à la vue decks
        forceBackToDecks() {
            this.currentView = 'decks';
            this.currentDeck = null;
            // Nettoyer les états de jeu sauvegardés
            sessionStorage.removeItem('mtg_game_state');
            sessionStorage.removeItem('mtg_view_state');
            if (this.store) {
                this.store.setState({
                    currentView: 'decks',
                    currentDeck: null
                });
            }
            console.log('🏠 Retour forcé à la vue decks');
        }
    }
});

// Enregistrer le composant draggable
if (window.vuedraggable) {
    app.component('draggable', window.vuedraggable);
} else {
    console.error('Vue Draggable non trouvé. Vérifiez que le CDN est chargé.');
}

// Montage de l'application
app.mount('#app');