/**
 * Système de mulligan pour Magic the Gathering
 */
export const MulliganSystem = {
    methods: {
        takeMulligan() {
            if (this.mulliganCount >= 7) {
                alert('Vous ne pouvez pas prendre plus de 7 mulligans !');
                return;
            }

            // Remettre les cartes de la main dans la bibliothèque
            this.openingHand.forEach(card => {
                this.playerLibrary.push(card);
            });

            // Remettre les cartes du bottom of library
            this.bottomOfLibrary.forEach(card => {
                this.playerLibrary.push(card);
            });

            // Mélanger
            this.playerLibrary = this.shuffleArray(this.playerLibrary);

            // Incrémenter le compteur de mulligan
            this.mulliganCount++;

            // Tirer une nouvelle main (7 - nombre de mulligans)
            const newHandSize = Math.max(1, 7 - this.mulliganCount);
            this.openingHand = [];
            this.bottomOfLibrary = [];

            for (let i = 0; i < newHandSize; i++) {
                if (this.playerLibrary.length > 0) {
                    const card = this.playerLibrary.pop();
                    this.openingHand.push(card);
                }
            }

            this.authSuccess = `Mulligan ${this.mulliganCount} - Nouvelle main de ${newHandSize} cartes`;
            setTimeout(() => this.authSuccess = '', 3000);
        },

        keepHand() {
            // Transférer la main vers la main du joueur
            this.playerHand = [...this.openingHand];

            // Remettre les cartes du bottom of library dans la bibliothèque
            this.bottomOfLibrary.reverse().forEach(card => {
                this.playerLibrary.push(card);
            });

            // Ajouter les cartes exilées à la zone d'exil
            this.playerExile.push(...this.exileFromMulligan);

            // Aller au playtester principal
            this.currentView = 'playtester';

            // Sauvegarder l'état du jeu
            this.saveGameState();

            this.authSuccess = 'Main gardée ! Que la partie commence ! 🎮';
            setTimeout(() => this.authSuccess = '', 3000);
        },

        // Gestion du drag & drop
        onDragStart(event, card, index) {
            this.draggedCard = card;
            this.draggedIndex = index;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/html', event.target.outerHTML);
        },

        onDragEnd(event) {
            this.draggedCard = null;
            this.draggedIndex = null;
        },

        onDragEnter(event) {
            event.target.closest('.drop-zone').classList.add('drag-over');
        },

        onDragLeave(event) {
            if (!event.target.closest('.drop-zone').contains(event.relatedTarget)) {
                event.target.closest('.drop-zone').classList.remove('drag-over');
            }
        },

        onDrop(event, zone) {
            event.preventDefault();
            event.target.closest('.drop-zone').classList.remove('drag-over');

            if (!this.draggedCard || this.draggedIndex === null) return;

            const card = this.draggedCard;
            const index = this.draggedIndex;

            // Retirer la carte de la main
            this.openingHand.splice(index, 1);

            // Ajouter à la zone appropriée
            if (zone === 'library') {
                this.bottomOfLibrary.push(card);
                this.authSuccess = `${card.name} envoyée au fond de la bibliothèque`;
            } else if (zone === 'exile') {
                this.exileFromMulligan.push(card);
                this.authSuccess = `${card.name} exilée`;
            }

            setTimeout(() => this.authSuccess = '', 2000);
        },

        exitMulligan() {
            if (confirm('Quitter et retourner à l\'éditeur de deck ?')) {
                this.clearSavedGameState(); // Nettoyer l'état sauvegardé
                this.changeView('deck-editor');
                this.resetMulliganState();
            }
        },

        resetMulliganState() {
            this.openingHand = [];
            this.mulliganCount = 0;
            this.bottomOfLibrary = [];
            this.exileFromMulligan = [];
            this.draggedCard = null;
            this.draggedIndex = null;
        },

        showOptions() {
            alert('Options à implémenter (scry, règles spéciales, etc.)');
        }
    }
};