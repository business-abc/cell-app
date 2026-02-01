/**
 * Cell. - Application principale
 * Gestion du dashboard et interactions utilisateur
 */

import { supabase } from './supabaseClient.js';
import { DNAHelix } from './dna-helix.js';

class CellApp {
    constructor() {
        this.dnaHelix = null;
        this.themes = [];

        this.init();
    }

    init() {
        // Attendre que le DOM soit prêt
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.initDNAHelix();
        this.initParticles();
        this.initEventListeners();
        this.initThemeCreation();
        this.setupCarousel();
        this.initManageThemes();
        this.loadThemes();

        console.log('Cell. initialized successfully');
    }

    initDNAHelix() {
        const canvas = document.getElementById('dna-canvas');
        if (canvas) {
            // Wait for layout to be fully rendered before initializing
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.dnaHelix = new DNAHelix(canvas);

                    // Mode démo - activer pour voir des nucléotides colorés
                    this.dnaHelix.demo();

                    console.log('DNA Helix initialized');
                });
            });
        }
    }

    initParticles() {
        const container = document.getElementById('particles');
        if (!container) return;

        // Créer des particules flottantes pour l'ambiance
        const particleCount = 30;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            // Position aléatoire
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 2}px;
                height: ${Math.random() * 4 + 2}px;
                background: rgba(0, 212, 255, ${Math.random() * 0.3 + 0.1});
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: floatParticle ${Math.random() * 20 + 15}s ease-in-out infinite;
                animation-delay: ${Math.random() * -20}s;
            `;

            container.appendChild(particle);
        }

        // Ajouter le keyframe d'animation
        if (!document.getElementById('particle-keyframes')) {
            const style = document.createElement('style');
            style.id = 'particle-keyframes';
            style.textContent = `
                @keyframes floatParticle {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                        opacity: 0.3;
                    }
                    25% {
                        transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) scale(1.2);
                        opacity: 0.6;
                    }
                    50% {
                        transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) scale(0.8);
                        opacity: 0.4;
                    }
                    75% {
                        transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) scale(1.1);
                        opacity: 0.5;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    initEventListeners() {
        // Bouton ajouter
        const addButton = document.getElementById('add-note-btn');
        if (addButton) {
            addButton.addEventListener('click', () => this.handleAddNote());
        }

        // Navigation sidebar
        this.initSidebarNav();

        // Save Note Button
        const saveBtn = document.querySelector('.save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveNote());
        }
    }

    initSidebarNav() {
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();

                // Retirer l'état actif de tous les liens
                navLinks.forEach(l => l.classList.remove('active'));

                // Ajouter l'état actif au lien cliqué
                link.classList.add('active');

                // Récupérer le menu sélectionné
                const menuName = link.dataset.menu;
                this.handleMenuChange(menuName);
            });
        });
    }

    handleMenuChange(menuName) {
        // Pour l'instant, juste un feedback visuel
        console.log(`Menu sélectionné: ${menuName}`);

        // Labels pour les menus
        const menuLabels = {
            'profil': 'Profil',
            'theme': 'Thème',
            'notes': 'Notes',
            'routine': 'Routine'
        };

        // Toast discret pour feedback
        this.showToast(`${menuLabels[menuName] || menuName}`);
    }

    handleAddNote() {
        const button = document.getElementById('add-note-btn');

        // Logic for Edit Mode Validation
        if (this.isEditing) {
            this.saveEditing();
            return;
        }

        // Validation Logic for Theme Creation
        if (button && button.classList.contains('valid-theme')) {
            const input = document.querySelector('.theme-name-input');
            const themeName = input ? input.value : 'Nouveau Thème';

            // Get Color from Selected Circle for accuracy
            const selectedCircle = document.querySelector('.color-circle.selected');
            const colorStr = selectedCircle ? selectedCircle.style.getPropertyValue('--circle-color') : '#7b61ff';

            this.createTheme(themeName, colorStr);
            return;
        }

        // Toggle Note Creation Mode
        this.toggleNoteCreationMode();

        // Animation du bouton
        button.style.transform = 'scale(0.9)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }

    toggleNoteCreationMode() {
        const sheet = document.getElementById('note-sheet');
        const carousel = document.querySelector('.cards-carousel');
        const button = document.getElementById('add-note-btn');

        if (!sheet || !carousel) return;

        const isActive = sheet.classList.contains('active');

        if (isActive) {
            // Closing
            sheet.classList.remove('active');
            carousel.classList.remove('hidden-view');
            if (button) button.innerHTML = '<span class="button-icon">+</span>';

            // Remove Escape listener
            if (this.escapeHandler) {
                document.removeEventListener('keydown', this.escapeHandler);
                this.escapeHandler = null;
            }
        } else {
            // Opening
            sheet.classList.add('active');
            carousel.classList.add('hidden-view');
            if (button) button.innerHTML = '<span class="button-icon" style="font-size: 28px; line-height: 24px;">×</span>';

            // Initialize Date
            setTimeout(() => this.initNoteDateListeners(), 50);

            // Initialize Theme Selector
            setTimeout(() => this.initThemeSelector(), 50);

            // Close Arrow Listener
            const closeArrow = document.getElementById('note-close-arrow');
            if (closeArrow) {
                closeArrow.onclick = () => this.toggleNoteCreationMode();
            }

            // Escape Key Listener
            this.escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    this.toggleNoteCreationMode();
                }
            };
            document.addEventListener('keydown', this.escapeHandler);
        }
    }

    initNoteDateListeners() {
        const wrapper = document.getElementById('date-wrapper');
        const picker = document.getElementById('custom-date-picker');
        const dateText = document.getElementById('note-date-text');

        if (!wrapper || !picker || !dateText) return;

        // State Init
        if (!this.noteDate) this.noteDate = new Date();
        this.pickerViewDate = new Date(this.noteDate);

        this.updateDateDisplay(this.noteDate, dateText);

        // Toggle Logic
        wrapper.onclick = (e) => {
            if (e.target.closest('.custom-date-picker')) return;

            const isHidden = picker.classList.contains('hidden');
            if (isHidden) {
                picker.classList.remove('hidden');
                this.renderCalendar();

                const outsideClick = (ev) => {
                    if (!wrapper.contains(ev.target)) {
                        picker.classList.add('hidden');
                        document.removeEventListener('click', outsideClick);
                    }
                };
                setTimeout(() => document.addEventListener('click', outsideClick), 0);
            } else {
                picker.classList.add('hidden');
            }
        };

        // Navigation
        const prevBtn = document.getElementById('cal-prev');
        const nextBtn = document.getElementById('cal-next');

        if (prevBtn) prevBtn.onclick = (e) => {
            e.stopPropagation();
            this.pickerViewDate.setMonth(this.pickerViewDate.getMonth() - 1);
            this.renderCalendar();
        };

        if (nextBtn) nextBtn.onclick = (e) => {
            e.stopPropagation();
            this.pickerViewDate.setMonth(this.pickerViewDate.getMonth() + 1);
            this.renderCalendar();
        };
    }

    renderCalendar() {
        const vDate = this.pickerViewDate;
        const sDate = this.noteDate;
        const grid = document.getElementById('calendar-days-grid');
        const label = document.getElementById('cal-month-year');
        const picker = document.getElementById('custom-date-picker');
        const dateText = document.getElementById('note-date-text');

        if (!grid || !label) return;

        const year = vDate.getFullYear();
        const month = vDate.getMonth();

        // Capitalize Month
        const monthName = vDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        label.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

        grid.innerHTML = '';

        // Days Logic (Mon start)
        const firstDay = new Date(year, month, 1).getDay();
        // Su=0, Mo=1... Sa=6. Target: Mo=0... Su=6
        let startDay = (firstDay + 6) % 7;

        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < startDay; i++) {
            const div = document.createElement('div');
            div.className = 'calendar-day empty';
            grid.appendChild(div);
        }

        const today = new Date();
        for (let i = 1; i <= daysInMonth; i++) {
            const div = document.createElement('div');
            div.className = 'calendar-day';
            div.textContent = i;

            if (sDate && i === sDate.getDate() && month === sDate.getMonth() && year === sDate.getFullYear()) {
                div.classList.add('selected');
            }
            if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                div.classList.add('today');
            }

            div.onclick = (e) => {
                e.stopPropagation();
                this.noteDate = new Date(year, month, i);
                this.updateDateDisplay(this.noteDate, dateText);
                picker.classList.add('hidden');
                this.renderCalendar(); // Refresh selection visual
            };
            grid.appendChild(div);
        }
    }

    updateDateDisplay(dateObj, textElement) {
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        textElement.textContent = dateObj.toLocaleDateString('fr-FR', options);
    }

    initThemeSelector() {
        const selector = document.getElementById('theme-selector');
        const capsule = document.getElementById('theme-capsule');
        const dropdown = document.getElementById('theme-dropdown');
        const themeList = document.getElementById('theme-list');

        if (!selector || !capsule || !dropdown || !themeList) return;

        // Populate Themes
        this.populateThemeDropdown(themeList);

        // Toggle Dropdown
        capsule.onclick = (e) => {
            e.stopPropagation();
            const isHidden = dropdown.classList.contains('hidden');

            // Close date picker if open
            const datePicker = document.getElementById('custom-date-picker');
            if (datePicker) datePicker.classList.add('hidden');

            if (isHidden) {
                dropdown.classList.remove('hidden');

                const outsideClick = (ev) => {
                    if (!selector.contains(ev.target)) {
                        dropdown.classList.add('hidden');
                        document.removeEventListener('click', outsideClick);
                    }
                };
                setTimeout(() => document.addEventListener('click', outsideClick), 0);
            } else {
                dropdown.classList.add('hidden');
            }
        };
    }

    populateThemeDropdown(listElement) {
        listElement.innerHTML = '';

        // Add "Main" theme
        const mainItem = this.createThemeItem('main-card', 'Principal', '#7b61ff');
        listElement.appendChild(mainItem);

        // Add created themes
        if (this.themes && this.themes.length > 0) {
            this.themes.forEach(theme => {
                const item = this.createThemeItem(theme.id, theme.name, theme.color);
                listElement.appendChild(item);
            });
        }
    }

    createThemeItem(id, name, color) {
        const item = document.createElement('div');
        item.className = 'theme-item';
        item.dataset.themeId = id;

        const colorCircle = document.createElement('div');
        colorCircle.className = 'theme-item-color';
        colorCircle.style.background = color;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'theme-item-name';
        nameSpan.textContent = name;

        item.appendChild(colorCircle);
        item.appendChild(nameSpan);

        item.onclick = (e) => {
            e.stopPropagation();
            this.selectNoteTheme(id, name, color);
        };

        return item;
    }

    selectNoteTheme(themeId, themeName, themeColor) {
        this.selectedNoteTheme = { id: themeId, name: themeName, color: themeColor };

        const capsule = document.getElementById('theme-capsule');
        const dropdown = document.getElementById('theme-dropdown');

        if (capsule) {
            capsule.classList.add('selected');
            capsule.style.setProperty('--selected-theme-color', themeColor);
            capsule.innerHTML = ''; // Remove "?" icon
        }

        if (dropdown) {
            dropdown.classList.add('hidden');
        }
    }

    async loadThemes() {
        try {
            const { data, error } = await supabase.from('themes').select('*').order('created_at', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                // Wait for DOM
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        data.forEach(t => this.renderThemeCard(t.id, t.name, t.color));
                        this.updateCarouselView();
                    });
                } else {
                    data.forEach(t => this.renderThemeCard(t.id, t.name, t.color));
                    // Update view after rendering all
                    setTimeout(() => this.updateCarouselView(), 100);
                }
            }
        } catch (e) {
            console.error('Erreur chargement thèmes:', e);
            this.showToast("Mode hors ligne ou erreur connexion");
        }
    }

    renderThemeCard(themeId, name, colorStr) {
        // Parse Color
        const rgb = this.parseColorToRgb(colorStr);
        const rgbString = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
        const canvasId = 'dna-canvas-' + themeId;

        // HTML Template
        const cardHtml = document.createElement('div');
        cardHtml.className = 'dna-card new-created-card';
        cardHtml.id = themeId;

        cardHtml.style.setProperty('--theme-rgb', rgbString);

        cardHtml.innerHTML = `
            <div class="card-actions">
                <div class="action-btn edit-btn" title="Éditer">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </div>
                <div class="action-btn delete-btn" title="Supprimer">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </div>
            </div>
            <div class="card-gradient"></div>
            <div class="card-grid"></div>
            <div class="dna-canvas-wrapper">
                <canvas id="${canvasId}"></canvas>
            </div>
            <div class="card-footer">
                <span class="theme-title">${name}</span>
            </div>
        `;

        // Insert into Carousel
        const carousel = document.querySelector('.cards-carousel');
        const newCardForm = document.getElementById('new-card');
        if (carousel && newCardForm) {
            carousel.insertBefore(cardHtml, newCardForm);
        }

        // Init DNA
        requestAnimationFrame(() => {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                const helix = new DNAHelix(canvas);
                helix.setTheme(colorStr); // Ensure color is set directly

                // Add to internal list
                this.themes.push({ id: themeId, name, color: colorStr, helix });

                // Demo visuals
                const indices = [2, 5, 8, 12, 15, 18];
                indices.forEach(idx => helix.fillNucleotide(idx, colorStr, themeId));
            }
        });
    }

    async createTheme(name, colorStr) {
        // Init themes storage if needed
        if (!this.themes) this.themes = [];

        const themeId = self.crypto.randomUUID();

        try {
            // DB Insert
            const { error } = await supabase.from('themes').insert([
                { id: themeId, name: name, color: colorStr }
            ]);

            if (error) throw error;

            // Render UI
            this.renderThemeCard(themeId, name, colorStr);

            // Transition
            const newCardForm = document.getElementById('new-card');
            if (newCardForm) newCardForm.classList.remove('active');

            // Update Carousel State
            setTimeout(() => {
                const card = document.getElementById(themeId);
                const cards = this.getThemeCards();
                if (card) {
                    this.currentCardIndex = cards.indexOf(card);
                    this.updateCarouselView();
                }
            }, 100);

            // Reset Creation Form
            const input = document.querySelector('.theme-name-input');
            if (input) input.value = '';
            document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
            if (this.creationHelix) {
                this.creationHelix.nucleotides.forEach(n => { n.filled = false; });
            }
            this.updateValidationState();

            this.showToast(`Thème "${name}" créé avec succès !`);

        } catch (e) {
            console.error(e);
            this.showToast("Erreur lors de la création du thème.");
        }
    }

    showToast(message) {
        // Créer un toast notification style iOS
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            left: auto;
            transform: translateY(-20px);
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 12px 24px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            opacity: 0;
            transition: all 0.3s ease;
        `;

        document.body.appendChild(toast);

        // Animation d'entrée
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Disparition
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    setupCarousel() {
        const carousel = document.querySelector('.cards-carousel');
        if (!carousel) return;

        // State
        this.currentCardIndex = 0;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.mouseDownX = 0;

        // Initial Update
        this.updateCarouselView();

        // Touch Events
        carousel.addEventListener('touchstart', (e) => {
            const newCard = document.getElementById('new-card');
            if (newCard && newCard.classList.contains('active')) return;

            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        carousel.addEventListener('touchend', (e) => {
            const newCard = document.getElementById('new-card');
            if (newCard && newCard.classList.contains('active')) return;

            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });

        // Mouse Events
        carousel.addEventListener('mousedown', (e) => {
            const newCard = document.getElementById('new-card');
            if (newCard && newCard.classList.contains('active')) return;
            this.mouseDownX = e.screenX;
        });

        carousel.addEventListener('mouseup', (e) => {
            const newCard = document.getElementById('new-card');
            if (newCard && newCard.classList.contains('active')) return;
            const diff = e.screenX - this.mouseDownX;
            const threshold = 50;
            if (diff < -threshold) this.navigateCarousel(1);
            if (diff > threshold) this.navigateCarousel(-1);
        });
    }

    handleSwipe() {
        const threshold = 50;
        if (this.touchEndX < this.touchStartX - threshold) {
            // Swipe Left -> Next
            this.navigateCarousel(1);
        }
        if (this.touchEndX > this.touchStartX + threshold) {
            // Swipe Right -> Prev
            this.navigateCarousel(-1);
        }
    }

    navigateCarousel(direction) {
        const cards = this.getThemeCards();
        if (cards.length <= 1) return;

        // Update Index
        this.currentCardIndex = (this.currentCardIndex + direction + cards.length) % cards.length;

        this.updateCarouselView();
    }

    updateCarouselView() {
        const cards = this.getThemeCards();
        if (cards.length === 0) return;

        // Reset all classes
        cards.forEach(card => {
            card.classList.remove('active', 'prev', 'next');
            // Ensure visibility for active/prev/next is handled by CSS (others are hidden?)
            // If css default is opacity: 0, then removing classes hides them. Good.
        });

        // Set Active
        cards[this.currentCardIndex].classList.add('active');

        // Set Prev (Loop)
        const prevIndex = (this.currentCardIndex - 1 + cards.length) % cards.length;
        if (cards.length > 1) {
            cards[prevIndex].classList.add('prev');
        }

        // Set Next (Loop)
        const nextIndex = (this.currentCardIndex + 1) % cards.length;
        if (cards.length > 2) {
            // Only if we have at least 3 cards do we show Next distinct from prev
            cards[nextIndex].classList.add('next');
        } else if (cards.length === 2) {
            // With 2 cards, one is Active, one is Prev. 
            // Swipe Left (Next) -> Active becomes Prev, Prev becomes Active.
            // Logic holds. Visually we only show Prev.
        }
    }

    getThemeCards() {
        const allCards = Array.from(document.querySelectorAll('.dna-card'));
        return allCards.filter(c => c.id !== 'new-card');
    }

    initManageThemes() {
        const manageLink = document.getElementById('manage-themes-link');
        const carousel = document.querySelector('.cards-carousel');
        const dock = document.querySelector('.floating-dock');

        if (manageLink) {
            manageLink.addEventListener('click', (e) => {
                e.preventDefault();

                // Helper to deactivate other modes if any
                const newCard = document.getElementById('new-card');
                if (newCard) newCard.classList.remove('active');

                // Enable Manage Mode
                if (carousel) {
                    carousel.classList.add('manage-mode');
                    carousel.scrollLeft = 0;
                }

                // Hide Dock
                if (dock) {
                    dock.classList.add('hidden');
                }
            });
        }

        // Listeners to Exit Manage Mode
        // 1. Create Theme Link
        const createLink = document.getElementById('create-theme-link');
        if (createLink) {
            createLink.addEventListener('click', (e) => {
                if (carousel) carousel.classList.remove('manage-mode');
                if (dock) dock.classList.remove('hidden');
            });
        }

        // 2. Main Theme Nav Link (Return to Carousel)
        const themeNavLink = document.querySelector('.nav-link[data-menu="theme"]');
        if (themeNavLink) {
            themeNavLink.addEventListener('click', (e) => {
                // Exit Manage Mode
                if (carousel && carousel.classList.contains('manage-mode')) {
                    carousel.classList.remove('manage-mode');
                    if (dock) dock.classList.remove('hidden');
                }
            });
        }

        // 3. Edit/Delete Button Delegation
        if (carousel) {
            carousel.addEventListener('click', (e) => {
                // Only active in manage mode
                if (!carousel.classList.contains('manage-mode')) return;

                const editBtn = e.target.closest('.edit-btn');
                if (editBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const card = editBtn.closest('.dna-card');
                    if (card) this.startEditing(card);
                }

                const deleteBtn = e.target.closest('.delete-btn');
                if (deleteBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const card = deleteBtn.closest('.dna-card');
                    if (card && card.id !== 'main-card') {
                        if (confirm('Supprimer ce thème ?')) {
                            card.remove();
                            this.updateCarouselView();
                        }
                    }
                }
            });
        }
    }

    createColorSidebarHTML() {
        return `
            <div class="color-options-sidebar edit-mode-sidebar" style="position: absolute; right: -80px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 20px;">
                <button class="color-circle" style="--circle-color: #B22222;" title="Crimson Red"></button>
                <button class="color-circle" style="--circle-color: #50C878;" title="Émeraude"></button>
                <button class="color-circle" style="--circle-color: #8DDCDC;" title="Bleu"></button>
                <button class="color-circle" style="--circle-color: #FFDE21;" title="Jaune"></button>
                <button class="color-circle" style="--circle-color: #FFA800;" title="Orange"></button>
                <button class="color-circle" style="--circle-color: #7b61ff;" title="Violet"></button>
                <button class="color-circle" style="--circle-color: #FC8EAC;" title="Rose"></button>
                <button class="color-circle" style="--circle-color: #F7E6CA;" title="Beige"></button>
                <button class="color-circle" style="--circle-color: #FFFAFA;" title="Blanc"></button>
                <button class="color-circle" style="--circle-color: #353839;" title="Noir"></button>
            </div>
        `;
    }

    startEditing(card) {
        if (this.isEditing) return;
        this.isEditing = true;
        this.editingCard = card;

        // Store Original State
        this.originalColorRgb = card.style.getPropertyValue('--theme-rgb');
        // Determine original Hex
        if (card.id === 'main-card') this.originalColorHex = '#7b61ff';
        else {
            const t = this.themes && this.themes.find(x => x.id === card.id);
            this.originalColorHex = t ? t.color : '#7b61ff';
        }

        // 1. Dim Others
        const allCards = this.getThemeCards();
        allCards.forEach(c => {
            if (c !== card) c.classList.add('dimmed');
        });
        card.classList.add('editing');

        // 2. Inject Sidebar
        const sidebarHtml = this.createColorSidebarHTML();
        const sidebarWrapper = document.createElement('div');
        sidebarWrapper.innerHTML = sidebarHtml;
        const sidebar = sidebarWrapper.firstElementChild;
        card.appendChild(sidebar);

        // Inject Close Button
        const closeBtn = document.createElement('div');
        closeBtn.className = 'edit-close-btn';
        closeBtn.innerHTML = `<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        Object.assign(closeBtn.style, {
            position: 'absolute', top: '20px', left: '20px', zIndex: '150', cursor: 'pointer', color: 'rgba(255,255,255,0.7)'
        });
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelEditing();
        });
        card.appendChild(closeBtn);

        // 3. Attach Color Listeners
        const circles = sidebar.querySelectorAll('.color-circle');
        circles.forEach(circle => {
            circle.addEventListener('click', (e) => {
                e.stopPropagation();
                circles.forEach(c => c.classList.remove('selected'));
                circle.classList.add('selected');

                const rawColor = circle.style.getPropertyValue('--circle-color');
                const colorStr = rawColor ? rawColor.trim() : '#7b61ff';
                const rgb = this.parseColorToRgb(colorStr);
                const rgbString = `${rgb.r}, ${rgb.g}, ${rgb.b}`;

                card.style.setProperty('--theme-rgb', rgbString);

                // Update Helix Color
                let targetHelix = null;
                if (card.id === 'main-card') {
                    targetHelix = this.dnaHelix;
                } else if (this.themes) {
                    const themeObj = this.themes.find(t => t.id === card.id);
                    if (themeObj) targetHelix = themeObj.helix;
                }

                if (targetHelix) {
                    if (typeof targetHelix.setTheme === 'function') {
                        targetHelix.setTheme(colorStr);
                    } else if (typeof targetHelix.updateAllColors === 'function') {
                        targetHelix.updateAllColors(colorStr);
                    }
                }
            });
        });

        // 4. Title to Input
        const titleSpan = card.querySelector('.theme-title');
        if (titleSpan) {
            this.tempTitleText = titleSpan.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'theme-title-input-edit';
            input.value = this.tempTitleText;
            input.maxLength = 8;
            titleSpan.replaceWith(input);
            input.focus();
            input.addEventListener('click', e => e.stopPropagation());
        }

        // 5. Validation Button
        const dock = document.querySelector('.floating-dock');
        const addBtn = document.getElementById('add-note-btn');
        if (dock) dock.classList.remove('hidden');
        if (addBtn) {
            addBtn.classList.add('valid-theme');
            addBtn.innerHTML = `
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                   <polyline points="20 6 9 17 4 12"></polyline>
               </svg>
           `;
        }
    }

    cancelEditing() {
        if (!this.editingCard) return;
        const card = this.editingCard;

        // Revert Title
        const input = card.querySelector('.theme-title-input-edit');
        if (input && this.tempTitleText) {
            const span = document.createElement('span');
            span.className = 'theme-title';
            span.textContent = this.tempTitleText;
            input.replaceWith(span);
        }

        // Revert Color
        if (this.originalColorRgb) {
            card.style.setProperty('--theme-rgb', this.originalColorRgb);

            let targetHelix = null;
            if (card.id === 'main-card') targetHelix = this.dnaHelix;
            else if (this.themes) {
                const themeObj = this.themes.find(t => t.id === card.id);
                if (themeObj) targetHelix = themeObj.helix;
            }
            if (targetHelix && this.originalColorHex && typeof targetHelix.setTheme === 'function') {
                targetHelix.setTheme(this.originalColorHex);
            }
        }

        // Cleanup UI
        const sidebar = card.querySelector('.edit-mode-sidebar');
        if (sidebar) sidebar.remove();
        const closeBtn = card.querySelector('.edit-close-btn');
        if (closeBtn) closeBtn.remove();

        card.classList.remove('editing');
        const allCards = this.getThemeCards();
        allCards.forEach(c => c.classList.remove('dimmed'));

        this.isEditing = false;
        this.editingCard = null;

        // Hide Dock
        const dock = document.querySelector('.floating-dock');
        const addBtn = document.getElementById('add-note-btn');
        if (addBtn) {
            addBtn.classList.remove('valid-theme');
            addBtn.innerHTML = '<span class="button-icon">+</span>';
            addBtn.style = '';
        }
        if (dock) dock.classList.add('hidden');
    }

    async saveEditing() {
        if (!this.editingCard) return;

        const card = this.editingCard;
        const themeId = card.id;

        // 1. Get New Data
        const input = card.querySelector('.theme-title-input-edit');
        const newTitle = input ? input.value : (this.tempTitleText || '');

        let newColor = this.originalColorHex;
        const sidebar = card.querySelector('.edit-mode-sidebar');
        if (sidebar) {
            const selectedCircle = sidebar.querySelector('.color-circle.selected');
            if (selectedCircle) {
                const raw = selectedCircle.style.getPropertyValue('--circle-color');
                if (raw) newColor = raw.trim();
            }
        }

        // 2. Restore UI
        const span = document.createElement('span');
        span.className = 'theme-title';
        span.textContent = newTitle;
        if (input) input.replaceWith(span);

        if (sidebar) sidebar.remove();
        const closeBtn = card.querySelector('.edit-close-btn');
        if (closeBtn) closeBtn.remove();

        card.classList.remove('editing');
        const allCards = this.getThemeCards();
        allCards.forEach(c => c.classList.remove('dimmed'));

        // 3. Update State & DB
        if (themeId !== 'main-card') {
            // Update Local
            const themeObj = this.themes.find(t => t.id === themeId);
            if (themeObj) {
                themeObj.name = newTitle;
                themeObj.color = newColor;
            }

            // Update DB
            try {
                await supabase.from('themes').update({ name: newTitle, color: newColor }).eq('id', themeId);
                this.showToast("Thème modifié !");
            } catch (e) {
                console.error(e);
                this.showToast("Erreur sauvegarde.");
            }
        }

        // Reset State
        this.isEditing = false;
        this.editingCard = null;

        // Reset Dock
        const dock = document.querySelector('.floating-dock');
        const addBtn = document.getElementById('add-note-btn');
        if (addBtn) {
            addBtn.classList.remove('valid-theme');
            addBtn.innerHTML = '<span class="button-icon">+</span>';
        }
        if (dock) dock.classList.add('hidden');
    }

    async saveNote() {
        const titleInput = document.querySelector('.note-title-input');
        const contentArea = document.querySelector('.note-content-area');

        const title = titleInput ? titleInput.value : '';
        const content = contentArea ? contentArea.value : '';
        const theme = this.selectedNoteTheme;
        const date = this.noteDate || new Date();

        if (!title && !content) {
            this.showToast("La note est vide.");
            return;
        }

        try {
            const { error } = await supabase.from('notes').insert([
                {
                    title,
                    content,
                    theme_id: theme ? theme.id : null,
                    date_display: date.toISOString()
                }
            ]);

            if (error) throw error;

            this.showToast("Note enregistrée !");
            this.toggleNoteCreationMode();

            // Reset UI
            if (titleInput) titleInput.value = '';
            if (contentArea) contentArea.value = '';
            this.selectedNoteTheme = null;

            const capsule = document.getElementById('theme-capsule');
            if (capsule) {
                capsule.classList.remove('selected');
                capsule.style.removeProperty('--selected-theme-color');
                capsule.innerHTML = '<span class="capsule-icon">?</span>';
            }

        } catch (e) {
            console.error(e);
            this.showToast("Erreur sauvegarde note.");
        }
    }

    /**
     * API pour ajouter une note à un thème
     * @param {string} themeId - ID du thème
     * @param {string} themeColor - Couleur du thème
     */
    addNoteToTheme(themeId, themeColor) {
        const filledCount = this.dnaHelix.getFilledCount();

        if (filledCount < 20) {
            this.dnaHelix.fillNucleotide(filledCount, themeColor, themeId);
            this.showToast('Information encodée');
            return true;
        } else {
            // Brin complet - logique de mutation à implémenter
            this.showToast('Brin complet ! Mutation en cours...');
            return false;
        }
    }

    initThemeCreation() {
        const createThemeTabs = Array.from(document.querySelectorAll('.submenu-link'));
        const createThemeBtn = createThemeTabs.find(el => el.textContent.trim() === 'Créer un thème');

        const mainCard = document.getElementById('main-card');
        const newCard = document.getElementById('new-card');
        const cancelBtn = document.querySelector('.cancel-create-btn');
        const themeInput = document.querySelector('.theme-name-input');

        if (createThemeBtn && mainCard && newCard) {
            createThemeBtn.addEventListener('click', (e) => {
                e.preventDefault();

                // Effect: Slide current left, show new center
                mainCard.classList.remove('active');
                mainCard.classList.add('prev');

                newCard.classList.add('active');

                // Initialize Creation DNA (Empty Strand) if needed
                // Delay slightly to ensure layout is computed (width > 0)
                requestAnimationFrame(() => {
                    if (!this.creationHelix) {
                        const canvas = document.getElementById('dna-canvas-creation');
                        if (canvas) {
                            this.creationHelix = new DNAHelix(canvas);
                            // No demo() call -> Empty strand by default
                        }
                    } else {
                        // Resizing safety check if it was initialized while hidden
                        this.creationHelix.setupCanvas();
                    }

                    // Trigger Default Color (First one: Red)
                    const circles = document.querySelectorAll('.color-options-sidebar .color-circle');
                    if (circles.length > 0) {
                        circles[0].click();
                    }
                });

                setTimeout(() => {
                    if (themeInput) themeInput.focus();
                }, 400);
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();

                newCard.classList.remove('active');

                mainCard.classList.remove('prev');
                mainCard.classList.add('active');

                if (themeInput) themeInput.value = '';

                // Reset Selection
                document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
                // Reset Button Visuals
                this.updateValidationState();
            });
        }

        // Listen for Input Validation
        if (themeInput) {
            themeInput.addEventListener('input', () => this.updateValidationState());
            themeInput.addEventListener('keyup', () => this.updateValidationState());
        }

        // Initialize Color Selection Logic
        this.initColorSelection();
    }

    updateValidationState() {
        const input = document.querySelector('.theme-name-input');
        const selectedCircle = document.querySelector('.color-circle.selected');
        const addBtn = document.getElementById('add-note-btn');

        // Ensure we are in creation mode
        const newCard = document.getElementById('new-card');
        const isActive = newCard && newCard.classList.contains('active');

        if (!isActive && addBtn) {
            // Reset to default style if not active
            addBtn.classList.remove('valid-theme');
            addBtn.innerHTML = '<span class="button-icon">+</span>';
            addBtn.style.backgroundColor = '';
            addBtn.style.boxShadow = '';
            addBtn.style.borderColor = '';
            return;
        }

        if (input && addBtn) {
            const hasText = input.value.trim().length > 0;
            const isShortEnough = input.value.length <= 8;
            const hasColor = !!selectedCircle;

            if (hasText && isShortEnough && hasColor) {
                // Valid!
                addBtn.classList.add('valid-theme');
                addBtn.innerHTML = `
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                       <polyline points="20 6 9 17 4 12"></polyline>
                   </svg>
               `;

                // Use selected color
                let colorVar = selectedCircle ? selectedCircle.style.getPropertyValue('--circle-color') : '#7b61ff';

                addBtn.style.backgroundColor = colorVar;
                addBtn.style.borderColor = colorVar;
                addBtn.style.boxShadow = `0 0 20px ${colorVar}`;
            } else {
                // Invalid/Incomplete
                addBtn.classList.remove('valid-theme');
                addBtn.innerHTML = '<span class="button-icon">+</span>';
                addBtn.style.backgroundColor = '';
                addBtn.style.borderColor = '';
                addBtn.style.boxShadow = '';
            }
        }
    }

    initColorSelection() {
        const newCard = document.getElementById('new-card');
        if (!newCard) return;

        // Colors are now in the external sidebar
        const circles = document.querySelectorAll('.color-options-sidebar .color-circle');
        const cardGlass = newCard.querySelector('.card-glass-layer');
        const cardGradient = newCard.querySelector('.card-gradient');

        circles.forEach(circle => {
            circle.addEventListener('click', (e) => {
                // Feedback Visuel
                circles.forEach(c => c.classList.remove('selected'));
                circle.classList.add('selected');

                // Récupérer la couleur brute
                const rawColor = circle.style.getPropertyValue('--circle-color');
                if (!rawColor) return;

                // Convertir en composantes RGB pour manipuler l'opacité
                const rgb = this.parseColorToRgb(rawColor);
                if (!rgb) return;

                // Appliquer l'Aura Lumineuse (White -> Selected Color)
                const glowColorHigh = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
                const glowColorLow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;

                if (cardGlass) {
                    cardGlass.style.boxShadow = `
                        0 20px 50px rgba(0, 0, 0, 0.5),
                        0 0 80px ${glowColorHigh},
                        inset 0 0 20px ${glowColorLow}
                    `;
                    cardGlass.style.borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
                }

                // Appliquer le Gradient (Similaire à l'initial mais coloré)
                // Linear Gradient sur la carte elle-même (Vertical)
                newCard.style.background = `linear-gradient(180deg, 
                    rgba(10, 14, 20, 0.6) 0%, 
                    rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2) 40%, 
                    rgba(255, 255, 255, 0.1) 70%, 
                    rgba(255, 255, 255, 0.05) 100%)`;

                if (cardGradient) {
                    cardGradient.style.background = `
                        radial-gradient(ellipse at 50% 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4) 0%, transparent 70%)
                    `;
                }

                // Update Validation Trigger
                this.updateValidationState();
            });
        });
    }

    /**
     * Convertit n'importe quelle string couleur (Hex, Var, Name) en RGB
     */
    parseColorToRgb(colorStr) {
        // Utiliser le navigateur pour parser la couleur via un élément temporaire
        const div = document.createElement('div');
        div.style.color = colorStr;
        div.style.display = 'none';
        document.body.appendChild(div);

        const computedColor = window.getComputedStyle(div).color;
        document.body.removeChild(div);

        // computedColor est toujours au format "rgb(r, g, b)"
        const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3])
            };
        }
        return { r: 255, g: 255, b: 255 }; // Fallback blanc
    }
}

// Initialiser l'application
const app = new CellApp();

// Exposer pour le debugging
window.CellApp = app;
