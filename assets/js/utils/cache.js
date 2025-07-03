/**
 * Système de cache pour les cartes MTG avec gestion des images
 */
class CardCache {
    constructor() {
        this.cache = new Map();
        this.imageCache = new Map(); // Cache spécifique pour les images
        this.imageLoading = new Set(); // Images en cours de chargement
        this.maxSize = 1000; // Limite du cache des cartes
        this.maxImageSize = 500; // Limite du cache des images
        this.storageKey = 'mtg_card_cache';
        this.imageStorageKey = 'mtg_image_cache';
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
        this.imageCache.clear();
        this.imageLoading.clear();
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.imageStorageKey);
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

    // === MÉTHODES POUR LES IMAGES ===

    /**
     * Obtenir une image avec cache intelligent
     */
    async getImage(card) {
        if (!card || !card.id) return null;

        const cacheKey = card.id;

        // 1. Vérifier si déjà en cache
        if (this.imageCache.has(cacheKey)) {
            const cachedData = this.imageCache.get(cacheKey);

            // Vérifier si l'image n'est pas trop ancienne (24h)
            const maxAge = 24 * 60 * 60 * 1000;
            if (Date.now() - cachedData.timestamp < maxAge) {
                return cachedData.imageUrl;
            } else {
                this.imageCache.delete(cacheKey);
                this._saveImageCache();
            }
        }

        // 2. Vérifier si déjà en cours de chargement
        if (this.imageLoading.has(cacheKey)) {
            return this._waitForImageLoad(cacheKey);
        }

        // 3. Charger l'image
        return this._loadImage(card);
    }

    /**
     * Charger une image et la mettre en cache
     */
    async _loadImage(card) {
        const cacheKey = card.id;
        this.imageLoading.add(cacheKey);

        try {
            // Priorité des images : normal > large > small
            const imageUrl = this._getBestImageUrl(card);

            if (imageUrl) {
                // Précharger l'image pour vérifier qu'elle fonctionne
                await this._preloadImage(imageUrl);

                // Gérer la taille du cache des images
                if (this.imageCache.size >= this.maxImageSize) {
                    this._evictOldestImages();
                }

                // Mettre en cache
                this.imageCache.set(cacheKey, {
                    imageUrl: imageUrl,
                    timestamp: Date.now(),
                    cardName: card.name
                });

                this._saveImageCache();
                this.imageLoading.delete(cacheKey);

                return imageUrl;
            } else {
                throw new Error('Aucune URL d\'image trouvée');
            }

        } catch (error) {
            console.warn(`Erreur chargement image ${card.name}:`, error);
            this.imageLoading.delete(cacheKey);

            // Mettre en cache l'échec pour éviter les tentatives répétées
            this.imageCache.set(cacheKey, {
                imageUrl: null,
                timestamp: Date.now(),
                cardName: card.name,
                error: true
            });

            this._saveImageCache();
            return null;
        }
    }

    /**
     * Précharger une image (vérifier qu'elle existe)
     */
    _preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => resolve(url);
            img.onerror = () => reject(new Error('Image failed to load'));

            // Timeout après 5 secondes
            setTimeout(() => reject(new Error('Image load timeout')), 5000);

            img.src = url;
        });
    }

    /**
     * Obtenir la meilleure URL d'image disponible
     */
    _getBestImageUrl(card) {
        if (card.image_uris) {
            return card.image_uris.normal ||
                card.image_uris.large ||
                card.image_uris.small;
        }

        // Pour les cartes double-face
        if (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris) {
            return card.card_faces[0].image_uris.normal ||
                card.card_faces[0].image_uris.large ||
                card.card_faces[0].image_uris.small;
        }

        return null;
    }

    /**
     * Attendre qu'une image en cours de chargement soit prête
     */
    async _waitForImageLoad(cacheKey) {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (!this.imageLoading.has(cacheKey)) {
                    clearInterval(checkInterval);
                    const cached = this.imageCache.get(cacheKey);
                    resolve(cached ? cached.imageUrl : null);
                }
            }, 100);

            // Timeout après 10 secondes
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve(null);
            }, 10000);
        });
    }

    /**
     * Précharger les images d'une liste de cartes
     */
    async preloadImages(cards, maxConcurrent = 2) {
        if (!cards || cards.length === 0) return;

        const cardsToLoad = cards.filter(card =>
            card && card.id &&
            !this.imageCache.has(card.id) &&
            !this.imageLoading.has(card.id)
        );

        if (cardsToLoad.length === 0) return;

        console.log(`🖼️ Préchargement de ${cardsToLoad.length} images...`);

        // Traiter par batch pour éviter de surcharger l'API
        for (let i = 0; i < cardsToLoad.length; i += maxConcurrent) {
            const batch = cardsToLoad.slice(i, i + maxConcurrent);

            const promises = batch.map(async (card) => {
                try {
                    await this._loadImage(card);
                    console.log(`✅ Image préchargée: ${card.name}`);
                } catch (error) {
                    console.warn(`❌ Échec préchargement: ${card.name}`, error);
                }
            });

            await Promise.all(promises);

            // Pause entre les batch pour respecter les limites API
            if (i + maxConcurrent < cardsToLoad.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    /**
     * Supprimer les images les plus anciennes du cache
     */
    _evictOldestImages() {
        const entries = Array.from(this.imageCache.entries());

        // Trier par date de cache
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        // Supprimer les 10% les plus anciennes
        const toRemove = Math.floor(entries.length * 0.1) || 1;

        for (let i = 0; i < toRemove; i++) {
            this.imageCache.delete(entries[i][0]);
        }
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
     * Sauvegarder le cache des images
     */
    _saveImageCache() {
        try {
            const cacheData = Array.from(this.imageCache.entries());
            localStorage.setItem(this.imageStorageKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Impossible de sauvegarder le cache d\'images:', error);
            if (error.name === 'QuotaExceededError') {
                this.imageCache.clear();
            }
        }
    }

    /**
     * Charger le cache depuis localStorage
     */
    loadFromStorage() {
        try {
            // Charger le cache des cartes
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const cacheData = JSON.parse(stored);
                this.cache = new Map(cacheData);

                // Nettoyer les cartes expirées
                this._cleanExpired();
            }

            // Charger le cache des images
            const storedImages = localStorage.getItem(this.imageStorageKey);
            if (storedImages) {
                const imageCacheData = JSON.parse(storedImages);
                this.imageCache = new Map(imageCacheData);

                // Nettoyer les images expirées
                this._cleanExpiredImages();
            }
        } catch (error) {
            console.warn('Impossible de charger le cache:', error);
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.imageStorageKey);
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
     * Nettoyer les images expirées
     */
    _cleanExpiredImages() {
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures pour les images
        const now = Date.now();
        let cleaned = false;

        this.imageCache.forEach((imageData, cardId) => {
            if (!imageData.timestamp || now - imageData.timestamp > maxAge) {
                this.imageCache.delete(cardId);
                cleaned = true;
            }
        });

        if (cleaned) {
            this._saveImageCache();
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

        // Stats des images
        const imageSuccessful = Array.from(this.imageCache.values()).filter(data => !data.error).length;
        const imageErrors = Array.from(this.imageCache.values()).filter(data => data.error).length;

        return {
            cards: {
                count: this.cache.size,
                maxSize: this.maxSize,
                sizeKB: Math.round(totalSize / 1024),
                oldestAgeHours: oldestTime === now ? 0 : Math.round((now - oldestTime) / (1000 * 60 * 60)),
                newestAgeHours: newestTime === 0 ? 0 : Math.round((now - newestTime) / (1000 * 60 * 60))
            },
            images: {
                count: this.imageCache.size,
                maxSize: this.maxImageSize,
                successful: imageSuccessful,
                errors: imageErrors,
                loading: this.imageLoading.size
            }
        };
    }
}

// Export
if (!window.CardCache) {
    window.CardCache = CardCache;
}