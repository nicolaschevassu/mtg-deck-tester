/**
 * Configuration et gestion de la connexion Supabase
 */
class SupabaseConfig {
    constructor() {
        this.client = null;
        this.isConfigured = false;
        this.isConnected = false;
    }

    /**
     * Configurer et initialiser Supabase
     */
    async configure(url, anonKey) {
        if (!url || !anonKey) {
            throw new Error('URL et clé anonyme requises');
        }

        try {
            // Créer le client Supabase
            this.client = supabase.createClient(url, anonKey);

            // Tester la connexion
            const { data, error } = await this.client
                .from('decks')
                .select('count')
                .limit(1);

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            // Sauvegarder la configuration
            localStorage.setItem('mtg_supabase_config', JSON.stringify({ url, anonKey }));
            
            this.isConfigured = true;
            this.isConnected = true;

            return this.client;
        } catch (error) {
            this.isConfigured = false;
            this.isConnected = false;
            throw new Error(`Erreur de configuration Supabase: ${error.message}`);
        }
    }

    /**
     * Charger la configuration depuis localStorage
     */
    async loadSavedConfig() {
        const savedConfig = localStorage.getItem('mtg_supabase_config');
        if (!savedConfig) return null;

        try {
            const config = JSON.parse(savedConfig);
            await this.configure(config.url, config.anonKey);
            return config;
        } catch (error) {
            console.error('Erreur lors du chargement de la configuration sauvée:', error);
            localStorage.removeItem('mtg_supabase_config');
            return null;
        }
    }

    /**
     * Obtenir le client Supabase
     */
    getClient() {
        if (!this.isConfigured) {
            throw new Error('Supabase non configuré');
        }
        return this.client;
    }

    /**
     * Vérifier si Supabase est configuré
     */
    isReady() {
        return this.isConfigured && this.isConnected;
    }
}

// Export singleton
if (!window.SupabaseConfig) {
    window.SupabaseConfig = SupabaseConfig;
}