/**
 * Service d'authentification
 */
class AuthService {
    constructor(supabaseConfig) {
        this.supabaseConfig = supabaseConfig;
        this.currentUser = null;
        this.isAuthenticated = false;
        this.authCallbacks = [];
    }

    /**
     * Connexion utilisateur
     */
    async login(email, password) {
        if (!email || !password) {
            throw new Error('Email et mot de passe requis');
        }

        try {
            const client = this.supabaseConfig.getClient();
            const { data, error } = await client.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.currentUser = data.user;
            this.isAuthenticated = true;
            this._notifyAuthChange('login', data.user);

            return data.user;
        } catch (error) {
            throw new Error(`Erreur de connexion: ${error.message}`);
        }
    }

    /**
     * Inscription utilisateur
     */
    async register(email, password, confirmPassword) {
        if (!email || !password || !confirmPassword) {
            throw new Error('Tous les champs sont requis');
        }

        if (password !== confirmPassword) {
            throw new Error('Les mots de passe ne correspondent pas');
        }

        if (password.length < 6) {
            throw new Error('Le mot de passe doit contenir au moins 6 caractères');
        }

        try {
            const client = this.supabaseConfig.getClient();
            const { data, error } = await client.auth.signUp({
                email,
                password
            });

            if (error) throw error;

            this._notifyAuthChange('register', data.user);

            return data.user;
        } catch (error) {
            throw new Error(`Erreur d'inscription: ${error.message}`);
        }
    }

    /**
     * Récupération de mot de passe
     */
    async resetPassword(email) {
        if (!email) {
            throw new Error('Email requis');
        }

        try {
            const client = this.supabaseConfig.getClient();
            const { error } = await client.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) throw error;

            return true;
        } catch (error) {
            throw new Error(`Erreur lors de l'envoi de l'email de récupération: ${error.message}`);
        }
    }

    /**
     * Mise à jour du mot de passe
     */
    async updatePassword(newPassword) {
        if (!newPassword) {
            throw new Error('Nouveau mot de passe requis');
        }

        if (newPassword.length < 6) {
            throw new Error('Le mot de passe doit contenir au moins 6 caractères');
        }

        try {
            const client = this.supabaseConfig.getClient();
            const { error } = await client.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            return true;
        } catch (error) {
            throw new Error(`Erreur lors de la mise à jour du mot de passe: ${error.message}`);
        }
    }

    /**
     * Déconnexion
     */
    async logout() {
        try {
            const client = this.supabaseConfig.getClient();
            const { error } = await client.auth.signOut();

            if (error) throw error;

            this.currentUser = null;
            this.isAuthenticated = false;
            this._notifyAuthChange('logout', null);

        } catch (error) {
            throw new Error(`Erreur de déconnexion: ${error.message}`);
        }
    }

    /**
     * Vérifier la session actuelle
     */
    async checkSession() {
        try {
            const client = this.supabaseConfig.getClient();
            const { data: { session } } = await client.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
                this.isAuthenticated = true;
                this._notifyAuthChange('session', session.user);
                return session.user;
            }
            
            return null;
        } catch (error) {
            console.error('Erreur lors de la vérification de session:', error);
            return null;
        }
    }

    /**
     * Écouter les changements d'authentification
     */
    setupAuthListener() {
        const client = this.supabaseConfig.getClient();
        
        client.auth.onAuthStateChange((event, session) => {
            if (session) {
                this.currentUser = session.user;
                this.isAuthenticated = true;
                this._notifyAuthChange(event, session.user);
            } else {
                this.currentUser = null;
                this.isAuthenticated = false;
                this._notifyAuthChange(event, null);
            }
        });
    }

    /**
     * Ajouter un callback pour les changements d'auth
     */
    onAuthChange(callback) {
        this.authCallbacks.push(callback);
    }

    /**
     * Notifier les changements d'authentification
     */
    _notifyAuthChange(event, user) {
        this.authCallbacks.forEach(callback => {
            try {
                callback(event, user, this.isAuthenticated);
            } catch (error) {
                console.error('Erreur dans callback auth:', error);
            }
        });
    }

    /**
     * Obtenir l'utilisateur actuel
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Vérifier si l'utilisateur est connecté
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }
}

// Export
if (!window.AuthService) {
    window.AuthService = AuthService;
}