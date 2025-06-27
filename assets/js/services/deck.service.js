/**
 * Service de gestion des decks
 */
class DeckService {
    constructor(supabaseConfig) {
        this.supabaseConfig = supabaseConfig;
    }

    /**
     * Charger tous les decks de l'utilisateur
     */
    async loadUserDecks() {
        try {
            const client = this.supabaseConfig.getClient();
            const { data, error } = await client
                .from('decks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            throw new Error(`Erreur lors du chargement des decks: ${error.message}`);
        }
    }

    /**
     * Créer un nouveau deck
     */
    async createDeck(name, userId) {
        if (!name || !name.trim()) {
            throw new Error('Le nom du deck est requis');
        }

        if (!userId) {
            throw new Error('Utilisateur non connecté');
        }

        try {
            const client = this.supabaseConfig.getClient();
            const { data, error } = await client
                .from('decks')
                .insert([
                    {
                        name: name.trim(),
                        user_id: userId,
                        cards: {}
                    }
                ])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            throw new Error(`Erreur lors de la création du deck: ${error.message}`);
        }
    }

    /**
     * Sauvegarder un deck
     */
    async saveDeck(deck) {
        if (!deck || !deck.id) {
            throw new Error('Deck invalide');
        }

        try {
            const client = this.supabaseConfig.getClient();
            const { error } = await client
                .from('decks')
                .update({
                    name: deck.name,
                    cards: deck.cards || {},
                    updated_at: new Date().toISOString()
                })
                .eq('id', deck.id);

            if (error) throw error;
            return deck;
        } catch (error) {
            throw new Error(`Erreur lors de la sauvegarde: ${error.message}`);
        }
    }

    /**
     * Supprimer un deck
     */
    async deleteDeck(deckId) {
        if (!deckId) {
            throw new Error('ID du deck requis');
        }

        try {
            const client = this.supabaseConfig.getClient();
            const { error } = await client
                .from('decks')
                .delete()
                .eq('id', deckId);

            if (error) throw error;
            return true;
        } catch (error) {
            throw new Error(`Erreur lors de la suppression: ${error.message}`);
        }
    }

    /**
     * Dupliquer un deck
     */
    async duplicateDeck(deck, userId, newName = null) {
        if (!deck) {
            throw new Error('Deck à dupliquer requis');
        }

        const duplicatedName = newName || `${deck.name} (copie)`;
        
        return await this.createDeck(duplicatedName, userId).then(newDeck => {
            newDeck.cards = { ...deck.cards };
            return this.saveDeck(newDeck);
        });
    }

    /**
     * Exporter un deck au format texte
     */
    exportDeckToText(deck, cardCache) {
        if (!deck || !deck.cards) {
            return '';
        }

        let exportText = `# ${deck.name}\n\n`;
        
        // Grouper par types
        const creatures = [];
        const spells = [];
        const lands = [];
        const others = [];

        Object.entries(deck.cards).forEach(([cardId, quantity]) => {
            const card = cardCache[cardId];
            if (!card) return;

            const line = `${quantity}x ${card.name}`;
            
            if (card.type_line.includes('Creature')) {
                creatures.push(line);
            } else if (card.type_line.includes('Land')) {
                lands.push(line);
            } else if (card.type_line.includes('Instant') || card.type_line.includes('Sorcery')) {
                spells.push(line);
            } else {
                others.push(line);
            }
        });

        if (creatures.length > 0) {
            exportText += `## Créatures (${creatures.length})\n`;
            exportText += creatures.join('\n') + '\n\n';
        }

        if (spells.length > 0) {
            exportText += `## Sorts (${spells.length})\n`;
            exportText += spells.join('\n') + '\n\n';
        }

        if (others.length > 0) {
            exportText += `## Autres (${others.length})\n`;
            exportText += others.join('\n') + '\n\n';
        }

        if (lands.length > 0) {
            exportText += `## Terrains (${lands.length})\n`;
            exportText += lands.join('\n') + '\n\n';
        }

        const totalCards = Object.values(deck.cards).reduce((sum, qty) => sum + qty, 0);
        exportText += `\n**Total: ${totalCards} cartes**`;

        return exportText;
    }

    /**
     * Obtenir les statistiques d'un deck
     */
    getDeckStats(deck, cardCache) {
        if (!deck || !deck.cards) {
            return {
                total: 0,
                creatures: 0,
                spells: 0,
                lands: 0,
                others: 0,
                avgCmc: 0,
                colors: []
            };
        }

        let total = 0;
        let creatures = 0;
        let spells = 0;
        let lands = 0;
        let others = 0;
        let totalCmc = 0;
        let cardsWithCmc = 0;
        const colors = new Set();

        Object.entries(deck.cards).forEach(([cardId, quantity]) => {
            const card = cardCache[cardId];
            if (!card) return;

            total += quantity;

            // Types
            if (card.type_line.includes('Creature')) {
                creatures += quantity;
            } else if (card.type_line.includes('Land')) {
                lands += quantity;
            } else if (card.type_line.includes('Instant') || card.type_line.includes('Sorcery')) {
                spells += quantity;
            } else {
                others += quantity;
            }

            // CMC
            if (card.cmc !== undefined && !card.type_line.includes('Land')) {
                totalCmc += card.cmc * quantity;
                cardsWithCmc += quantity;
            }

            // Couleurs
            if (card.colors) {
                card.colors.forEach(color => colors.add(color));
            }
        });

        return {
            total,
            creatures,
            spells,
            lands,
            others,
            avgCmc: cardsWithCmc > 0 ? (totalCmc / cardsWithCmc).toFixed(1) : 0,
            colors: Array.from(colors)
        };
    }
}

// Export - UNE SEULE FOIS !
if (!window.DeckService) {
    window.DeckService = DeckService;
}