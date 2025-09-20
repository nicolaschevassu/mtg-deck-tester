/**
 * Moteur de jeu Commander
 */
export const CommanderEngine = {
    methods: {
        startPlaytest() {
            if (!this.currentDeck || !this.currentDeck.cards) {
                this.handleError(new Error('Aucun deck sélectionné'), 'Démarrage playtest');
                return;
            }

            try {
                // Vérifier s'il y a un état de jeu sauvegardé
                const savedGameState = this.loadGameState();

                if (savedGameState && savedGameState.currentDeckId === this.currentDeck.id) {
                    // Restaurer l'état existant
                    this.restoreGameState(savedGameState);
                    console.log('🎮 Jeu restauré depuis l\'état sauvegardé');
                } else {
                    // Nouveau jeu
                    this.changeView('mulligan');
                    this.setupCommanderGame();
                }
            } catch (error) {
                this.handleError(error, 'Démarrage playtest');
            }
        },

        setupCommanderGame() {
            this.resetGameState();

            // Préparer les cartes du deck
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

            // Identifier le commandant
            const commanderCard = allCards.find(card =>
                card.type_line &&
                (card.type_line.includes('Legendary Creature') ||
                    card.type_line.includes('Legendary Planeswalker'))
            );

            if (commanderCard) {
                this.commander = commanderCard;
                this.commandZone = [commanderCard];

                const commanderIndex = allCards.findIndex(card =>
                    card.instanceId === commanderCard.instanceId
                );
                if (commanderIndex > -1) {
                    allCards.splice(commanderIndex, 1);
                }
            }

            // Préparer la bibliothèque et tirer la main de départ
            this.playerLibrary = this.shuffleArray(allCards);
            this.drawOpeningHand();
        },

        resetGameState() {
            this.playerLife = 40;
            this.currentTurn = 1;
            this.commanderTax = 0;
            this.playerHand = [];
            this.playerBattlefield = [];
            this.playerGraveyard = [];
            this.playerExile = [];
            this.playerLibrary = [];
            this.commandZone = [];
            this.manaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
            this.lastRoll = { d6: null, d20: null };
        },

        drawOpeningHand() {
            this.openingHand = [];
            for (let i = 0; i < 7; i++) {
                if (this.playerLibrary.length > 0) {
                    const card = this.playerLibrary.pop();
                    this.openingHand.push(card);
                }
            }
        },

        drawCard() {
            if (this.playerLibrary.length > 0) {
                const card = this.playerLibrary.pop();
                this.playerHand.push(card);
            }
        },

        shuffleLibrary() {
            this.playerLibrary = this.shuffleArray(this.playerLibrary);
            this.authSuccess = 'Bibliothèque mélangée !';
            setTimeout(() => this.authSuccess = '', 2000);
        },

        shuffleArray(array) {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        },

        tapCard(card) {
            card.tapped = !card.tapped;
        },

        cardContextMenu(card, event) {
            const action = prompt('Action:\n1 - Ajouter +1/+1\n2 - Retirer marqueur\n3 - Envoyer au cimetière');

            switch (action) {
                case '1':
                    card.counters = (card.counters || 0) + 1;
                    break;
                case '2':
                    card.counters = Math.max(0, (card.counters || 0) - 1);
                    break;
                case '3':
                    this.moveCardToGraveyard(card);
                    break;
            }
        },

        moveCardToGraveyard(card) {
            const index = this.playerBattlefield.findIndex(c => c.instanceId === card.instanceId);
            if (index > -1) {
                this.playerBattlefield.splice(index, 1);
                this.playerGraveyard.unshift(card);

                if (card.name === this.commander?.name) {
                    const choice = confirm('Envoyer le commandant en command zone au lieu du cimetière ?');
                    if (choice) {
                        this.playerGraveyard.shift();
                        this.commandZone = [{ ...card, tapped: false, counters: 0 }];
                        this.commanderTax++;
                    }
                }
            }
        },

        changeLife(amount) {
            this.playerLife += amount;
            this.playerLife = Math.max(0, this.playerLife);
        },

        changeMana(color, amount) {
            this.manaPool[color] = Math.max(0, (this.manaPool[color] || 0) + amount);
        },

        clearManaPool() {
            Object.keys(this.manaPool).forEach(color => {
                this.manaPool[color] = 0;
            });
        },

        rollDice(sides) {
            const result = Math.floor(Math.random() * sides) + 1;
            this.lastRoll[`d${sides}`] = result;

            this.authSuccess = `🎲 D${sides}: ${result}`;
            setTimeout(() => this.authSuccess = '', 3000);
        },

        nextTurn() {
            this.currentTurn++;

            this.playerBattlefield.forEach(card => {
                card.tapped = false;
            });

            this.drawCard();

            this.authSuccess = `Tour ${this.currentTurn} - Dégagement et pioche !`;
            setTimeout(() => this.authSuccess = '', 3000);
        },

        resetGame() {
            if (confirm('Êtes-vous sûr de vouloir recommencer la partie ?')) {
                this.setupCommanderGame();
                this.authSuccess = 'Partie remise à zéro !';
                setTimeout(() => this.authSuccess = '', 3000);
            }
        },

        exitPlaytest() {
            if (confirm('Quitter le playtest et retourner à l\'éditeur ?')) {
                this.clearSavedGameState(); // Nettoyer l'état sauvegardé
                this.changeView('deck-editor');
                this.resetGameState();
            }
        },

        showCardDetails(card) {
            console.log('Détails de carte:', card);
        }
    }
};