/**
 * Moteur de drag/drop simple avec événements natifs
 */
export const DragSelectEngine = {
    data() {
        return {
            dragState: {
                isDragging: false,
                draggedCard: null,
                startX: 0,
                startY: 0,
                offsetX: 0,
                offsetY: 0
            }
        };
    },

    methods: {
        /**
         * Démarrer le drag d'une carte battlefield
         */
        startCardDrag(event, card) {
            // Seulement pour les cartes du battlefield
            if (!this.playerBattlefield.includes(card)) return;

            event.preventDefault();

            this.dragState.isDragging = true;
            this.dragState.draggedCard = card;

            const rect = event.target.getBoundingClientRect();
            const battlefieldRect = document.querySelector('.battlefield-grid').getBoundingClientRect();

            this.dragState.offsetX = event.clientX - rect.left;
            this.dragState.offsetY = event.clientY - rect.top;
            this.dragState.startX = event.clientX - battlefieldRect.left;
            this.dragState.startY = event.clientY - battlefieldRect.top;

            // Style visuel
            event.target.style.zIndex = '100';
            event.target.style.opacity = '0.8';
            event.target.style.cursor = 'grabbing';

            // Événements globaux
            document.addEventListener('mousemove', this.onCardDrag);
            document.addEventListener('mouseup', this.endCardDrag);

            console.log(`🎮 Start drag: ${card.name}`);
        },

        /**
         * Déplacer la carte pendant le drag
         */
        onCardDrag(event) {
            if (!this.dragState.isDragging || !this.dragState.draggedCard) return;

            event.preventDefault();

            const battlefieldRect = document.querySelector('.battlefield-grid').getBoundingClientRect();

            const x = event.clientX - battlefieldRect.left - this.dragState.offsetX;
            const y = event.clientY - battlefieldRect.top - this.dragState.offsetY;

            // Contraindre dans les limites
            const constrainedX = Math.max(0, Math.min(x, battlefieldRect.width - 80));
            const constrainedY = Math.max(0, Math.min(y, battlefieldRect.height - 112));

            // Mettre à jour la position en temps réel
            const card = this.playerBattlefield.find(c => c.instanceId === this.dragState.draggedCard.instanceId);
            if (card) {
                card.position = { x: constrainedX, y: constrainedY };
            }
        },

        /**
         * Terminer le drag
         */
        endCardDrag(event) {
            if (!this.dragState.isDragging) return;

            // Nettoyer les événements
            document.removeEventListener('mousemove', this.onCardDrag);
            document.removeEventListener('mouseup', this.endCardDrag);

            // Trouver l'élément de la carte
            const cardElement = document.querySelector(`[data-card-id="${this.dragState.draggedCard.instanceId}"]`);
            if (cardElement) {
                cardElement.style.zIndex = '';
                cardElement.style.opacity = '';
                cardElement.style.cursor = 'grab';
            }

            console.log(`🎮 End drag: ${this.dragState.draggedCard.name}`);

            // Sauvegarder l'état
            this.saveGameState();

            // Nettoyer l'état
            this.dragState.isDragging = false;
            this.dragState.draggedCard = null;
        },

        /**
         * Gestion des clics sur les cartes
         */
        onCardClick(event, card) {
            // Empêcher le clic si on vient de faire un drag
            if (this.dragState.isDragging) {
                event.preventDefault();
                return;
            }

            // Clic simple = engager/dégager
            this.tapCard(card);
        },

        /**
         * Gestion du menu contextuel
         */
        onCardContextMenu(event, card) {
            event.preventDefault();
            this.cardContextMenu(card, event);
        }
    },

    mounted() {
        // Cleanup préventif
        document.addEventListener('mouseup', () => {
            if (this.dragState.isDragging) {
                this.endCardDrag();
            }
        });
    }
};