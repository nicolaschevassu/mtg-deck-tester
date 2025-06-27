/**
 * Fonctions utilitaires générales
 */
class Helpers {
    /**
     * Formater une date
     */
    static formatDate(dateString, locale = 'fr-FR', options = {}) {
        if (!dateString) return '';
        
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        };
        
        try {
            return new Date(dateString).toLocaleDateString(locale, defaultOptions);
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Formater une date relative (il y a X temps)
     */
    static formatRelativeDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor(diffMs / (1000 * 60));

            if (diffDays > 7) {
                return this.formatDate(dateString);
            } else if (diffDays > 0) {
                return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
            } else if (diffHours > 0) {
                return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
            } else if (diffMinutes > 0) {
                return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
            } else {
                return 'À l\'instant';
            }
        } catch (error) {
            return this.formatDate(dateString);
        }
    }

    /**
     * Debounce une fonction
     */
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    /**
     * Throttle une fonction
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Valider un email
     */
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Générer un ID unique
     */
    static generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2);
        return `${prefix}${timestamp}${random}`;
    }

    /**
     * Capitaliser la première lettre
     */
    static capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Tronquer un texte
     */
    static truncate(str, length = 50, suffix = '...') {
        if (!str || str.length <= length) return str;
        return str.substring(0, length) + suffix;
    }

    /**
     * Nettoyer une chaîne de caractères
     */
    static sanitizeString(str) {
        if (!str) return '';
        return str.trim().replace(/\s+/g, ' ');
    }

    /**
     * Convertir en slug (URL friendly)
     */
    static slugify(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Formater un nombre
     */
    static formatNumber(num, locale = 'fr-FR') {
        if (typeof num !== 'number') return num;
        return num.toLocaleString(locale);
    }

    /**
     * Calculer un pourcentage
     */
    static percentage(value, total) {
        if (!total || total === 0) return 0;
        return Math.round((value / total) * 100);
    }

    /**
     * Grouper un tableau par propriété
     */
    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    /**
     * Supprimer les doublons d'un tableau
     */
    static unique(array, key = null) {
        if (!key) {
            return [...new Set(array)];
        }
        
        const seen = new Set();
        return array.filter(item => {
            const value = item[key];
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    }

    /**
     * Mélanger un tableau (shuffle)
     */
    static shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Attendre un délai
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Copier dans le presse-papier
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // Fallback pour les navigateurs anciens
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (fallbackError) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }

    /**
     * Télécharger un fichier
     */
    static downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    /**
     * Lire un fichier uploadé
     */
    static readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    }

    /**
     * Vérifier si un objet est vide
     */
    static isEmpty(obj) {
        if (!obj) return true;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return !obj;
    }

    /**
     * Deep clone d'un objet
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
    }

    /**
     * Merger deux objets
     */
    static merge(target, source) {
        const result = { ...target };
        
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.merge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        });
        
        return result;
    }
}

/**
 * Utilitaires spécifiques à MTG
 */
class MTGHelpers {
    /**
     * Couleurs MTG
     */
    static colors = {
        W: { name: 'Blanc', symbol: '⚪', hex: '#FFFBD5' },
        U: { name: 'Bleu', symbol: '🔵', hex: '#0E68AB' },
        B: { name: 'Noir', symbol: '⚫', hex: '#150B00' },
        R: { name: 'Rouge', symbol: '🔴', hex: '#D3202A' },
        G: { name: 'Vert', symbol: '🟢', hex: '#00733E' },
        C: { name: 'Incolore', symbol: '⭕', hex: '#CCCCCC' }
    };

    /**
     * Obtenir les informations d'une couleur
     */
    static getColorInfo(colorCode) {
        return this.colors[colorCode] || this.colors.C;
    }

    /**
     * Formater le coût de mana
     */
    static formatManaCost(manaCost) {
        if (!manaCost) return '';
        
        return manaCost
            .replace(/\{([WUBRGC])\}/g, (match, color) => {
                const colorInfo = this.getColorInfo(color);
                return colorInfo.symbol;
            })
            .replace(/\{(\d+)\}/g, '$1')
            .replace(/\{([WUBRGC])\/([WUBRGC])\}/g, (match, c1, c2) => {
                return `${this.getColorInfo(c1).symbol}/${this.getColorInfo(c2).symbol}`;
            });
    }

    /**
     * Calculer l'identité couleur d'un deck
     */
    static getDeckColorIdentity(cards, cardCache) {
        const colors = new Set();
        
        Object.keys(cards).forEach(cardId => {
            const card = cardCache[cardId];
            if (card && card.color_identity) {
                card.color_identity.forEach(color => colors.add(color));
            }
        });
        
        return Array.from(colors).sort();
    }

    /**
     * Vérifier la légalité d'un deck dans un format
     */
    static checkDeckLegality(cards, cardCache, format = 'standard') {
        const issues = [];
        let totalCards = 0;
        const cardCounts = {};
        
        Object.entries(cards).forEach(([cardId, quantity]) => {
            const card = cardCache[cardId];
            if (!card) return;
            
            totalCards += quantity;
            cardCounts[card.name] = (cardCounts[card.name] || 0) + quantity;
            
            // Vérifier la légalité dans le format
            if (card.legalities && card.legalities[format] !== 'legal') {
                issues.push(`${card.name} n'est pas légal en ${format}`);
            }
            
            // Vérifier les limites de quantité
            const isBasicLand = card.type_line && card.type_line.includes('Basic Land');
            if (!isBasicLand && quantity > 4) {
                issues.push(`${card.name}: maximum 4 exemplaires (${quantity} trouvés)`);
            }
        });
        
        // Vérifier le nombre total de cartes
        const minCards = format === 'commander' ? 100 : 60;
        if (totalCards < minCards) {
            issues.push(`Nombre insuffisant de cartes: ${totalCards}/${minCards}`);
        }
        
        return {
            isLegal: issues.length === 0,
            issues,
            totalCards,
            cardCounts
        };
    }

    /**
     * Calculer la courbe de mana d'un deck
     */
    static getManaCurve(cards, cardCache) {
        const curve = {};
        
        Object.entries(cards).forEach(([cardId, quantity]) => {
            const card = cardCache[cardId];
            if (!card || !card.cmc || card.type_line?.includes('Land')) return;
            
            const cmc = Math.min(card.cmc, 7); // Grouper 7+ ensemble
            const key = cmc === 7 && card.cmc > 7 ? '7+' : cmc.toString();
            
            curve[key] = (curve[key] || 0) + quantity;
        });
        
        return curve;
    }

    /**
     * Obtenir les recommandations pour un deck
     */
    static getDeckRecommendations(deckStats, colorIdentity) {
        const recommendations = [];
        
        if (deckStats.total < 60) {
            recommendations.push({
                type: 'warning',
                message: `Votre deck n'a que ${deckStats.total} cartes. Ajoutez ${60 - deckStats.total} cartes pour atteindre le minimum.`
            });
        }
        
        if (deckStats.lands < 20) {
            recommendations.push({
                type: 'suggestion',
                message: 'Considérez ajouter plus de terrains (recommandé: 20-24 pour 60 cartes).'
            });
        }
        
        if (deckStats.lands > 30) {
            recommendations.push({
                type: 'warning',
                message: 'Vous avez beaucoup de terrains. Cela pourrait ralentir votre stratégie.'
            });
        }
        
        if (colorIdentity.length > 2) {
            recommendations.push({
                type: 'info',
                message: 'Deck multicolore: assurez-vous d\'avoir suffisamment de sources de mana pour chaque couleur.'
            });
        }
        
        return recommendations;
    }
}

// Export
if (!window.Helpers) {
    window.Helpers = Helpers;
}
if (!window.MTGHelpers) {
    window.MTGHelpers = MTGHelpers;
}