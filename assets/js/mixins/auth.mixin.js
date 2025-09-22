/**
 * Mixin pour la gestion de l'authentification
 */
export const AuthMixin = {
    methods: {
        async configureSupabase() {
            if (!this.supabaseConfig.url || !this.supabaseConfig.anonKey) {
                this.handleError(new Error('URL et clé Supabase requis'), 'Configuration Supabase');
                return;
            }

            try {
                this.authLoading = true;
                this.authError = '';

                if (!this.store) {
                    this.handleError(new Error('Store non initialisé'), 'Configuration Supabase');
                    return;
                }

                await this.store.configureSupabase(
                    this.supabaseConfig.url,
                    this.supabaseConfig.anonKey
                );

                console.log('✅ Supabase configuré avec succès');
            } catch (error) {
                this.handleError(error, 'Configuration Supabase');
            } finally {
                this.authLoading = false;
            }
        },

        async login() {
            if (!this.store) {
                this.handleError(new Error('Application non initialisée'), 'Connexion');
                return;
            }

            try {
                this.authLoading = true;
                this.authError = '';

                await this.store.login(
                    this.loginForm.email,
                    this.loginForm.password
                );

                this.loginForm = { email: '', password: '' };
                console.log('✅ Connexion réussie');

            } catch (error) {
                this.handleError(error, 'Connexion');
            } finally {
                this.authLoading = false;
            }
        },

        async register() {
            if (!this.store) {
                this.handleError(new Error('Application non initialisée'), 'Inscription');
                return;
            }

            if (this.registerForm.password !== this.registerForm.confirmPassword) {
                this.handleError(new Error('Les mots de passe ne correspondent pas'), 'Inscription');
                return;
            }

            try {
                this.authLoading = true;
                this.authError = '';

                await this.store.register(
                    this.registerForm.email,
                    this.registerForm.password,
                    this.registerForm.confirmPassword
                );

                this.registerForm = { email: '', password: '', confirmPassword: '' };
                this.authMode = 'login';
                this.authSuccess = 'Inscription réussie ! Vous pouvez maintenant vous connecter.';

                console.log('✅ Inscription réussie');

            } catch (error) {
                this.handleError(error, 'Inscription');
            } finally {
                this.authLoading = false;
            }
        },

        async resetPassword() {
            if (!this.store) {
                this.handleError(new Error('Application non initialisée'), 'Récupération de mot de passe');
                return;
            }

            try {
                this.authLoading = true;
                this.authError = '';

                await this.store.resetPassword(this.resetForm.email);

                this.resetForm = { email: '' };
                this.authMode = 'login';
                this.authSuccess = 'Un email de récupération a été envoyé à votre adresse. Vérifiez votre boîte de réception.';

                console.log('✅ Email de récupération envoyé');

            } catch (error) {
                this.handleError(error, 'Récupération de mot de passe');
            } finally {
                this.authLoading = false;
            }
        },

        async logout() {
            if (!this.store) {
                this.handleError(new Error('Application non initialisée'), 'Déconnexion');
                return;
            }

            try {
                await this.store.logout();
                this.authSuccess = 'Déconnexion réussie !';
                console.log('✅ Déconnexion réussie');
            } catch (error) {
                this.handleError(error, 'Déconnexion');
            }
        }
    }
};