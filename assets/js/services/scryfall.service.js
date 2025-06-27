/**
 * Service API Scryfall pour recherche et récupération de cartes
 */
class ScryfallService {
    constructor() {
        this.baseUrl = 'https://api.scryfall.com';
        this.lastRequestTime = 0;
        this.requestDelay = 100; // 100ms entre requêtes
    }

    /**
     * Attendre entre les requêtes pour respecter les limites de l'API
     */
    async _waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.requestDelay) {
            await new Promise(resolve => 
                setTimeout(resolve, this.requestDelay - timeSinceLastRequest)
            );
        }
        
        this.lastRequestTime = Date.now();
    }

    /**
     * Rechercher des cartes par nom/texte
     */
    async searchCards(query, options = {}) {
        if (!query || !query.trim()) {
            return [];
        }

        await this._waitForRateLimit();

        try {
            const params = new URLSearchParams({
                q: query.trim(),
                ...options
            });

            const response = await fetch(`${this.baseUrl}/cards/search?${params}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    return []; // Aucun résultat
                }
                throw new Error(`Erreur API Scryfall: ${response.status}`);
            }

            const data = await response.json();
            return data.data || [];

        } catch (error) {
            console.error('Erreur de recherche Scryfall:', error);
            throw new Error(`Erreur de recherche: ${error.message}`);
        }
    }

    /**
     * Récupérer une carte par son ID
     */
    async getCardById(cardId) {
        if (!cardId) {
            throw new Error('ID de carte requis');
        }

        await this._waitForRateLimit();

        try {
            const response = await fetch(`${this.baseUrl}/cards/${cardId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`Erreur API Scryfall: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error(`Erreur récupération carte ${cardId}:`, error);
            throw new Error(`Erreur récupération carte: ${error.message}`);
        }
    }

    /**
     * Récupérer plusieurs cartes par leurs IDs (batch)
     */
    async getCardsByIds(cardIds) {
        if (!cardIds || cardIds.length === 0) {
            return [];
        }

        await this._waitForRateLimit();

        try {
            const identifiers = cardIds.map(id => ({ id }));
            
            const response = await fetch(`${this.baseUrl}/cards/collection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifiers: identifiers.slice(0, 75) // Max 75 cartes par requête
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur API Scryfall: ${response.status}`);
            }

            const data = await response.json();
            
            return {
                found: data.data || [],
                notFound: data.not_found || []
            };

        } catch (error) {
            console.error('Erreur récupération batch cartes:', error);
            throw new Error(`Erreur récupération cartes: ${error.message}`);
        }
    }

    /**
     * Récupérer une carte par nom exact
     */
    async getCardByName(name) {
        if (!name || !name.trim()) {
            throw new Error('Nom de carte requis');
        }

        await this._waitForRateLimit();

        try {
            const response = await fetch(
                `${this.baseUrl}/cards/named?exact=${encodeURIComponent(name.trim())}`
            );
            
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`Erreur API Scryfall: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error(`Erreur recherche carte "${name}":`, error);
            throw new Error(`Carte "${name}" non trouvée`);
        }
    }

    /**
     * Recherche avec auto-complétion
     */
    async autocomplete(query) {
        if (!query || query.length < 2) {
            return [];
        }

        await this._waitForRateLimit();

        try {
            const response = await fetch(
                `${this.baseUrl}/cards/autocomplete?q=${encodeURIComponent(query)}`
            );
            
            if (!response.ok) {
                return [];
            }

            const data = await response.json();
            return data.data || [];

        } catch (error) {
            console.error('Erreur autocomplétion:', error);
            return [];
        }
    }

    /**
     * Parser une liste de cartes au format texte
     */
    parseCardList(text) {
        if (!text || !text.trim()) {
            return [];
        }

        const lines = text.split('\n').filter(line => line.trim());
        const cards = [];

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            
            // Ignorer les commentaires et lignes vides
            if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
                return;
            }

            // Format: "4x Lightning Bolt" ou "4 Lightning Bolt"
            const match = trimmedLine.match(/^(\d+)x?\s+(.+)$/);
            
            if (match) {
                const quantity = parseInt(match[1]);
                const name = match[2].trim();
                
                if (quantity > 0 && name) {
                    cards.push({
                        quantity,
                        name,
                        lineNumber: index + 1,
                        originalLine: line
                    });
                }
            } else {
                // Format simple: juste le nom (quantité = 1)
                if (trimmedLine) {
                    cards.push({
                        quantity: 1,
                        name: trimmedLine,
                        lineNumber: index + 1,
                        originalLine: line
                    });
                }
            }
        });

        return cards;
    }

    /**
     * Traiter une liste de cartes en bulk
     */
    async processBulkCardList(cardList, onProgress = null) {
        const results = {
            success: [],
            errors: [],
            total: cardList.length
        };

        for (let i = 0; i < cardList.length; i++) {
            const cardItem = cardList[i];
            
            try {
                const card = await this.getCardByName(cardItem.name);
                
                if (card) {
                    results.success.push({
                        ...cardItem,
                        card: card
                    });
                } else {
                    results.errors.push({
                        ...cardItem,
                        error: 'Carte non trouvée'
                    });
                }

                // Callback de progression
                if (onProgress) {
                    onProgress(i + 1, cardList.length, cardItem.name);
                }

            } catch (error) {
                results.errors.push({
                    ...cardItem,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Rechercher des cartes par critères avancés
     */
    async advancedSearch(criteria) {
        const queryParts = [];

        if (criteria.name) {
            queryParts.push(`"${criteria.name}"`);
        }

        if (criteria.colors && criteria.colors.length > 0) {
            const colorQuery = criteria.colors.join('');
            queryParts.push(`c:${colorQuery}`);
        }

        if (criteria.type) {
            queryParts.push(`t:${criteria.type}`);
        }

        if (criteria.cmc !== undefined) {
            if (criteria.cmcOperator) {
                queryParts.push(`cmc${criteria.cmcOperator}${criteria.cmc}`);
            } else {
                queryParts.push(`cmc:${criteria.cmc}`);
            }
        }

        if (criteria.format) {
            queryParts.push(`f:${criteria.format}`);
        }

        if (criteria.rarity) {
            queryParts.push(`r:${criteria.rarity}`);
        }

        const query = queryParts.join(' ');
        return await this.searchCards(query);
    }
}

// Export
window.ScryfallService = ScryfallService;