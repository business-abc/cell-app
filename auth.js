
import { supabase } from './supabaseClient.js';
import { DNAHelix } from './dna-helix.js';

class AuthManager {
    constructor() {
        this.mode = 'login'; // 'login' or 'signup'
        this.canvas = document.getElementById('auth-dna-canvas');
        this.form = document.getElementById('auth-form');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.submitBtn = document.getElementById('submit-btn');
        this.btnText = document.getElementById('btn-text');
        this.loader = document.querySelector('.loader');
        this.errorBanner = document.getElementById('error-message');

        this.init();
    }

    init() {
        // Init Background
        if (this.canvas) {
            const helix = new DNAHelix(this.canvas);
            helix.config.helixRadius = 100; // Bigger for background
            helix.demo(); // Colorful
        }

        // Tabs
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.tab);
                tabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Form Submit
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Check if already logged in
        this.checkSession();
    }

    async checkSession() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            window.location.href = '/'; // Redirect to dashboard
        }
    }

    switchMode(mode) {
        this.mode = mode;
        this.errorBanner.classList.add('hidden');
        if (mode === 'login') {
            this.btnText.textContent = 'Se connecter';
        } else {
            this.btnText.textContent = "S'inscrire";
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const email = this.emailInput.value;
        const password = this.passwordInput.value;

        this.setLoading(true);
        this.errorBanner.classList.add('hidden');

        try {
            let result;
            if (this.mode === 'signup') {
                result = await supabase.auth.signUp({
                    email,
                    password,
                });
            } else {
                result = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
            }

            const { data, error } = result;

            if (error) throw error;

            if (this.mode === 'signup' && !data.session) {
                // Confirmation email sent
                alert("Compte créé ! Veuillez vérifier votre email pour confirmer.");
                this.switchMode('login');
            } else if (data.session) {
                // Success
                window.location.href = '/';
            }

        } catch (err) {
            this.errorBanner.textContent = err.message === 'Invalid login credentials'
                ? 'Email ou mot de passe incorrect.'
                : err.message;
            this.errorBanner.classList.remove('hidden');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(isLoading) {
        if (isLoading) {
            this.submitBtn.disabled = true;
            this.btnText.style.display = 'none';
            this.loader.classList.remove('hidden');
        } else {
            this.submitBtn.disabled = false;
            this.btnText.style.display = 'block';
            this.loader.classList.add('hidden');
        }
    }
}

new AuthManager();
