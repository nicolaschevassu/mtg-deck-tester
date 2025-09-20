/**
 * Moteur de board style untap.in avec drag/drop libre
 */
export const BoardEngine = {
    data() {
        return {
            // Compteurs supplémentaires
            poisonCounters: 0,

            // État du drag
            draggedCard: null,
            draggedFromZone: null
        };
    },

    methods: {
        /**
         * Gestion du drag/drop des cartes
         */
        onCardDragStart(event, card) {
            this.draggedCard = card;

            // Déterminer la zone source
            if (this.playerHand.includes(card)) {
                this.draggedFromZone = 'hand';
            } else if (this.playerBattlefield.includes(card)) {
                this.draggedFromZone = 'battlefield';
            } else if (this.playerGraveyard.includes(card)) {
                this.draggedFromZone = 'graveyard';
            } else if (this.playerExile.includes(card)) {
                this.draggedFromZone = 'exile';
            } else if (this.commandZone.includes(card)) {
                this.draggedFromZone = 'command';
            }

            // Données pour le drag
            event.dataTransfer.setData('text/plain', card.instanceId);
            event.dataTransfer.effectAllowed = 'move';

            // Style visuel
            event.target.classList.add('dragging');

            console.log(`🎮 Drag started: ${card.name} from ${this.draggedFromZone}`);
        },

        /**
         * Drop sur le battlefield avec positionnement libre
         */
        onBattlefieldDrop(event) {
            event.preventDefault();

            if (!this.draggedCard) return;

            const rect = event.currentTarget.getBoundingClientRect();
            const x = event.clientX - rect.left - 40; // Centrer la carte
            const y = event.clientY - rect.top - 56;

            // Contraindre dans les limites
            const constrainedX = Math.max(0, Math.min(x, rect.width - 80));
            const constrainedY = Math.max(0, Math.min(y, rect.height - 112));

            // Copier la carte avec position
            const cardWithPosition = {
                ...this.draggedCard,
                position: { x: constrainedX, y: constrainedY }
            };

            // Retirer de la zone source
            this.removeCardFromZone(this.draggedCard, this.draggedFromZone);

            // Ajouter au battlefield si pas déjà présente
            if (!this.playerBattlefield.find(c => c.instanceId === this.draggedCard.instanceId)) {
                this.playerBattlefield.push(cardWithPosition);
            } else {
                // Juste mettre à jour la position
                const existingCard = this.playerBattlefield.find(c => c.instanceId === this.draggedCard.instanceId);
                if (existingCard) {
                    existingCard.position = { x: constrainedX, y: constrainedY };
                }
            }

            console.log(`🎮 Card dropped on battlefield at (${constrainedX}, ${constrainedY})`);
            this.clearDragState();
        },

        /**
         * Drop sur une zone spécifique
         */
        onZoneDrop(event, zoneName) {
            event.preventDefault();

            if (!this.draggedCard) return;

            // Retirer de la zone source
            this.removeCardFromZone(this.draggedCard, this.draggedFromZone);

            // Ajouter à la zone cible
            this.addCardToZone(this.draggedCard, zoneName);

            console.log(`🎮 Card moved to ${zoneName}: ${this.draggedCard.name}`);
            this.clearDragState();
        },

        /**
         * Retirer une carte d'une zone
         */
        removeCardFromZone(card, zoneName) {
            switch (zoneName) {
                case 'hand':
                    const handIndex = this.playerHand.findIndex(c => c.instanceId === card.instanceId);
                    if (handIndex > -1) this.playerHand.splice(handIndex, 1);
                    break;
                case 'battlefield':
                    const battlefieldIndex = this.playerBattlefield.findIndex(c => c.instanceId === card.instanceId);
                    if (battlefieldIndex > -1) this.playerBattlefield.splice(battlefieldIndex, 1);
                    break;
                case 'graveyard':
                    const graveyardIndex = this.playerGraveyard.findIndex(c => c.instanceId === card.instanceId);
                    if (graveyardIndex > -1) this.playerGraveyard.splice(graveyardIndex, 1);
                    break;
                case 'exile':
                    const exileIndex = this.playerExile.findIndex(c => c.instanceId === card.instanceId);
                    if (exileIndex > -1) this.playerExile.splice(exileIndex, 1);
                    break;
                case 'command':
                    const commandIndex = this.commandZone.findIndex(c => c.instanceId === card.instanceId);
                    if (commandIndex > -1) this.commandZone.splice(commandIndex, 1);
                    break;
            }
        },

        /**
         * Ajouter une carte à une zone
         */
        addCardToZone(card, zoneName) {
            // Créer une copie de la carte sans position pour les zones non-battlefield
            const cleanCard = { ...card };
            delete cleanCard.position;

            switch (zoneName) {
                case 'hand':
                    this.playerHand.push(cleanCard);
                    break;
                case 'battlefield':
                    this.playerBattlefield.push(card); // Garder la position pour le battlefield
                    break;
                case 'graveyard':
                    this.playerGraveyard.unshift(cleanCard); // Ajouter en haut
                    break;
                case 'exile':
                    this.playerExile.push(cleanCard);
                    break;
                case 'command':
                    this.commandZone.push(cleanCard);
                    break;
            }
        },

        /**
         * Nettoyer l'état de drag
         */
        clearDragState() {
            this.draggedCard = null;
            this.draggedFromZone = null;

            // Nettoyer les classes CSS
            document.querySelectorAll('.dragging').forEach(el => {
                el.classList.remove('dragging');
            });
        },

        /**
         * Aperçu de carte en haut à droite
         */
        showCardPreview(event, card) {
            const preview = document.getElementById('card-preview');
            const previewImage = document.getElementById('card-preview-image');

            if (!preview || !previewImage || !card) return;

            const imageUrl = card.image_uris?.normal || card.image_uris?.large || this.cardPlaceholder;

            previewImage.src = imageUrl;
            previewImage.alt = card.name;
            preview.classList.add('show');
        },

        /**
         * Cacher l'aperçu de carte
         */
        hideCardPreview() {
            const preview = document.getElementById('card-preview');
            if (preview) {
                preview.classList.remove('show');
            }
        },

        /**
         * Gestion des compteurs de poison
         */
        changePoisonCounters(amount) {
            this.poisonCounters = Math.max(0, (this.poisonCounters || 0) + amount);

            if (this.poisonCounters >= 10) {
                this.authSuccess = '☠️ Attention ! 10 marqueurs poison = défaite !';
                setTimeout(() => this.authSuccess = '', 5000);
            }
        },

        /**
         * Menu contextuel amélioré
         */
        cardContextMenu(card, event) {
            event.preventDefault();

            const actions = [
                '1 - Engager/Dégager',
                '2 - Ajouter +1/+1',
                '3 - Retirer marqueur',
                '4 - Envoyer au cimetière',
                '5 - Exiler',
                '6 - Remettre en main',
                '7 - Dupliquer (token)'
            ];

            const choice = prompt(`Actions pour ${card.name}:\n${actions.join('\n')}`);

            switch (choice) {
                case '1':
                    this.tapCard(card);
                    break;
                case '2':
                    card.counters = (card.counters || 0) + 1;
                    break;
                case '3':
                    card.counters = Math.max(0, (card.counters || 0) - 1);
                    break;
                case '4':
                    this.moveCardToZone(card, 'graveyard');
                    break;
                case '5':
                    this.moveCardToZone(card, 'exile');
                    break;
                case '6':
                    this.moveCardToZone(card, 'hand');
                    break;
                case '7':
                    this.createToken(card);
                    break;
            }
        },

        /**
         * Déplacer une carte vers une zone
         */
        moveCardToZone(card, targetZone) {
            // Déterminer la zone source
            let sourceZone = null;
            if (this.playerBattlefield.includes(card)) sourceZone = 'battlefield';
            else if (this.playerHand.includes(card)) sourceZone = 'hand';
            else if (this.playerGraveyard.includes(card)) sourceZone = 'graveyard';
            else if (this.playerExile.includes(card)) sourceZone = 'exile';
            else if (this.commandZone.includes(card)) sourceZone = 'command';

            if (sourceZone) {
                this.removeCardFromZone(card, sourceZone);
                this.addCardToZone(card, targetZone);

                // Gestion spéciale pour commandant
                if (card.name === this.commander?.name && targetZone === 'graveyard') {
                    const choice = confirm('Envoyer le commandant en command zone au lieu du cimetière ?');
                    if (choice) {
                        this.removeCardFromZone(card, 'graveyard');
                        this.addCardToZone(card, 'command');
                        this.commanderTax++;
                    }
                }
            }
        },

        /**
         * Créer un token
         */
        createToken(baseCard) {
            const tokenName = prompt('Nom du token:', `${baseCard.name} Token`);
            if (tokenName) {
                const token = {
                    ...baseCard,
                    instanceId: `token_${Date.now()}_${Math.random()}`,
                    name: tokenName,
                    isToken: true,
                    position: {
                        x: Math.random() * 300 + 100,
                        y: Math.random() * 200 + 100
                    }
                };

                this.playerBattlefield.push(token);
                this.authSuccess = `Token "${tokenName}" créé !`;
                setTimeout(() => this.authSuccess = '', 3000);
            }
        }
    },

    mounted() {
        // Cleanup du drag au cas où
        document.addEventListener('dragend', () => {
            this.clearDragState();
        });
    }
};