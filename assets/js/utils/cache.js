/**
 * Système de cache pour les cartes MTG
 */
class CardCache {
    constructor() {
        this.cache = new Map();
        this.maxSize = 1000; // Limite du cache
        this.storageKey = 'mtg_card_cache';
        this.loadFromStorage();
    }

    /**
     * Ajouter une carte au cache
     */
    set(cardId, card) {
        if (!cardId || !card) return;

        // Si le cache est plein, supprimer les plus anciennes
        if (this.cache.size >= this.maxSize) {
            this._evictOldest();
        }

        this.cache.set(cardId, {
            ...card,
            _cached_at: Date.now()
        });

        this._saveToStorage();
    }

    /**
     * Récupérer une carte du cache
     */
    get(cardId) {
        const cachedCard = this.cache.get(cardId);
        
        if (!cachedCard) return null;

        // Vérifier si la carte n'est pas trop ancienne (7 jours)
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours en ms
        if (Date.now() - cachedCard._cached_at > maxAge) {
            this.cache.delete(cardId);
            this._saveToStorage();
            return null;
        }

        return cachedCard;
    }

    /**
     * Vérifier si une carte est en cache
     */
    has(cardId) {
        return this.get(cardId) !== null;
    }

    /**
     * Ajouter plusieurs cartes au cache
     */
    setMany(cards) {
        cards.forEach(card => {
            if (card && card.id) {
                this.set(card.id, card);
            }
        });
    }

    /**
     * Récupérer plusieurs cartes du cache
     */
    getMany(cardIds) {
        const results = {};
        const missing = [];

        cardIds.forEach(cardId => {
            const card = this.get(cardId);
            if (card) {
                results[cardId] = card;
            } else {
                missing.push(cardId);
            }
        });

        return { found: results, missing };
    }

    /**
     * Supprimer une carte du cache
     */
    delete(cardId) {
        const deleted = this.cache.delete(cardId);
        if (deleted) {
            this._saveToStorage();
        }
        return deleted;
    }

    /**
     * Vider tout le cache
     */
    clear() {
        this.cache.clear();
        localStorage.removeItem(this.storageKey);
    }

    /**
     * Obtenir la taille du cache
     */
    size() {
        return this.cache.size;
    }

    /**
     * Obtenir toutes les cartes du cache
     */
    getAll() {
        const result = {};
        this.cache.forEach((card, cardId) => {
            result[cardId] = card;
        });
        return result;
    }

    /**
     * Supprimer les cartes les plus anciennes
     */
    _evictOldest() {
        const entries = Array.from(this.cache.entries());
        
        // Trier par date de cache
        entries.sort((a, b) => a[1]._cached_at - b[1]._cached_at);
        
        // Supprimer les 10% les plus anciennes
        const toRemove = Math.floor(entries.length * 0.1) || 1;
        
        for (let i = 0; i < toRemove; i++) {
            this.cache.delete(entries[i][0]);
        }
    }

    /**
     * Sauvegarder le cache dans localStorage
     */
    _saveToStorage() {
        try {
            const cacheData = Array.from(this.cache.entries());
            localStorage.setItem(this.storageKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Impossible de sauvegarder le cache:', error);
            // Si localStorage est plein, vider le cache
            if (error.name === 'QuotaExceededError') {
                this.clear();
            }
        }
    }

    /**
     * Charger le cache depuis localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const cacheData = JSON.parse(stored);
                this.cache = new Map(cacheData);
                
                // Nettoyer les cartes expirées
                this._cleanExpired();
            }
        } catch (error) {
            console.warn('Impossible de charger le cache:', error);
            localStorage.removeItem(this.storageKey);
        }
    }

    /**
     * Nettoyer les cartes expirées
     */
    _cleanExpired() {
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours
        const now = Date.now();
        let cleaned = false;

        this.cache.forEach((card, cardId) => {
            if (!card._cached_at || now - card._cached_at > maxAge) {
                this.cache.delete(cardId);
                cleaned = true;
            }
        });

        if (cleaned) {
            this._saveToStorage();
        }
    }

    /**
     * Obtenir des statistiques du cache
     */
    getStats() {
        const now = Date.now();
        let totalSize = 0;
        let oldestTime = now;
        let newestTime = 0;

        this.cache.forEach(card => {
            totalSize += JSON.stringify(card).length;
            if (card._cached_at) {
                oldestTime = Math.min(oldestTime, card._cached_at);
                newestTime = Math.max(newestTime, card._cached_at);
            }
        });

        return {
            count: this.cache.size,
            maxSize: this.maxSize,
            sizeKB: Math.round(totalSize / 1024),
            oldestAgeHours: oldestTime === now ? 0 : Math.round((now - oldestTime) / (1000 * 60 * 60)),
            newestAgeHours: newestTime === 0 ? 0 : Math.round((now - newestTime) / (1000 * 60 * 60))
        };
    }
}

// Export
if (!window.CardCache) {
    window.CardCache = CardCache;
}