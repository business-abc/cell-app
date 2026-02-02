/**
 * Cell. - Application principale
 * Gestion du dashboard et interactions utilisateur
 */

import { supabase } from './supabaseClient.js';
import { DNAHelix } from './dna-helix.js';

// Modular imports
import { noteService } from './src/services/noteService.js';
import { themeService } from './src/services/themeService.js';
import { store } from './src/state/store.js';
import { Toast } from './src/components/Toast.js';

class CellApp {
    constructor() {
        this.dnaHelix = null;
        this.themes = [];
        this.selectedNoteTheme = null;    // Theme selected for current note
        this.currentEditingNoteId = null; // ID of note being edited (null = new note)
        this.selectedFiles = [];          // Array of file objects (or objects with {name, url, type})

        this.init();
    }

    async init() {
        await this.checkAuth();

        // Attendre que le DOM soit prêt
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    async checkAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = '/auth.html';
            throw new Error('Unauthorized'); // Stop execution
        }
        this.user = session.user;
    }

    displayUserName() {
        const nameEl = document.querySelector('.user-name');
        if (!nameEl || !this.user) return;

        // Try to get display_name from metadata, fallback to email prefix
        const displayName = this.user.user_metadata?.display_name
            || this.user.email?.split('@')[0]
            || 'Utilisateur';

        nameEl.textContent = displayName;
    }

    setup() {
        this.displayUserName();
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

        // Attach Button
        const attachBtn = document.getElementById('attach-file-btn');
        const fileInput = document.getElementById('note-file-input');
        const removeFileBtn = document.getElementById('remove-file-btn'); // New

        if (attachBtn && fileInput) {
            console.log('Attach button found');
            attachBtn.addEventListener('click', (e) => {
                console.log('Attach button clicked');
                e.preventDefault(); // Prevent any default button behavior
                fileInput.click();
            });
            fileInput.addEventListener('change', (e) => {
                console.log('File selected');
                this.handleFileSelection(e);
            });

            // Allow re-selecting same file
            fileInput.addEventListener('click', (e) => e.target.value = null);


        } else {
            console.error('Attach button or file input not found', { attachBtn, fileInput });
        }

        // Profil Logout
        const profileLink = document.querySelector('.nav-link[data-menu="profil"]');
        if (profileLink) {
            profileLink.onclick = async (e) => {
                e.preventDefault();
                if (confirm("Se déconnecter de Cell. ?")) {
                    await supabase.auth.signOut();
                    window.location.href = '/auth.html';
                }
            };
        }

        // Notes Menu Click
        const notesLink = document.querySelector('.nav-link[data-menu="notes"]');
        if (notesLink) {
            notesLink.onclick = async (e) => {
                e.preventDefault();
                await this.openAllNotesView();
            };
        }

        // Back from All Notes
        const backFromNotesBtn = document.getElementById('back-from-notes-btn');
        if (backFromNotesBtn) {
            backFromNotesBtn.onclick = () => this.closeAllNotesView();
        }

        // Feature: Rich Text Formatting
        this.initFormattingToolbar();

        // Feature: Theme Details View (Split)
        this.initThemeView();
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
        // If we are navigating AWAY from 'notes', close the all-notes view
        if (menuName !== 'notes') {
            this.closeAllNotesView();
        }

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

        button.style.transform = 'scale(0.9)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }

    handleFileSelection(e) {
        const file = e.target.files[0];

        if (file) {
            if (file.type !== 'application/pdf') {
                this.showToast('Veuillez sélectionner un fichier PDF.');
                e.target.value = null;
                return;
            }

            if (this.selectedFiles.length >= 5) {
                this.showToast('Maximum 5 fichiers par note.');
                e.target.value = null;
                return;
            }

            if (this.selectedFiles.some(f => f.name === file.name)) {
                this.showToast('Ce fichier est déjà ajouté.');
                e.target.value = null;
                return;
            }

            this.selectedFiles.push(file);
            this.renderAttachments();

            e.target.value = null;
        }
    }

    renderAttachments() {
        const listContainer = document.getElementById('attachments-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (this.selectedFiles.length === 0) {
            listContainer.classList.add('hidden');
            return;
        }

        listContainer.classList.remove('hidden');

        this.selectedFiles.forEach((file, index) => {
            const pill = document.createElement('div');
            pill.className = 'attachment-pill';

            const fileName = file.name || 'Fichier';

            pill.innerHTML = `
                <div class="attachment-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                </div>
                <span class="attachment-name" title="${fileName}">${fileName}</span>
                <button class="attachment-remove-btn" data-index="${index}" title="Supprimer">×</button>
            `;

            pill.onclick = (e) => {
                if (e.target.closest('.attachment-remove-btn')) {
                    e.stopPropagation();
                    this.removeAttachment(index);
                    return;
                }
                if (file.url) {
                    window.open(file.url, '_blank');
                } else if (file instanceof File) {
                    const url = URL.createObjectURL(file);
                    window.open(url, '_blank');
                }
            };

            listContainer.appendChild(pill);
        });
    }

    clearAttachments() {
        this.selectedFiles = [];
        this.renderAttachments();
        const fileInput = document.getElementById('note-file-input');
        if (fileInput) fileInput.value = null;
    }

    removeAttachment(index) {
        if (index >= 0 && index < this.selectedFiles.length) {
            this.selectedFiles.splice(index, 1);
            this.renderAttachments();
        }
    }

    /**
     * Open Note in Read-Only Mode
     */
    openNoteReadOnly(note) {
        const sheet = document.getElementById('note-sheet');
        const carousel = document.querySelector('.cards-carousel');
        const themeView = document.getElementById('theme-view-container');

        if (!sheet) return;

        // Visuals
        sheet.classList.add('active');
        if (carousel) carousel.classList.add('hidden-view');
        // Keep theme view visible in background? Or hide? 
        // User asked "remonte", implying overlay. 
        // So we keep theme view but overlay sheet.

        // Populate Data
        const titleInput = document.querySelector('.note-title-input');
        const contentArea = document.querySelector('.note-content-area');

        if (titleInput) {
            titleInput.value = note.title;
            titleInput.setAttribute('readonly', 'true');
            titleInput.style.pointerEvents = 'none'; // Ensure no interaction
        }

        if (contentArea) {
            contentArea.innerHTML = note.content; // Render HTML
            contentArea.setAttribute('contenteditable', 'false');
            contentArea.style.pointerEvents = 'none'; // Ensure no interaction
        }

        // Handle Attachments (Multi-File)
        this.selectedFiles = []; // Reset first

        if (note.attachments && Array.isArray(note.attachments)) {
            // New JSONB structure
            this.selectedFiles = [...note.attachments];
        } else if (note.attachment_url) {
            // Legacy fallback
            this.selectedFiles = [{
                name: note.attachment_name || 'Pièce jointe',
                url: note.attachment_url,
                type: 'application/pdf' // Assume PDF for legacy
            }];
        }

        this.renderAttachments();

        // Hide Legacy Elements if they still exist in DOM
        const displayPill = document.getElementById('file-preview-pill');
        if (displayPill) displayPill.classList.add('hidden');

        // Hide Toolbar & Validation Button
        const formatBtn = document.getElementById('format-btn'); // The Aa button
        const saveBtn = document.querySelector('.note-action-btn.save-btn'); // The Validate button
        const attachBtn = document.getElementById('attach-file-btn');

        if (formatBtn) formatBtn.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'none';
        if (attachBtn) attachBtn.style.display = 'none';

        // Sync Theme Capsule
        const capsule = document.getElementById('theme-capsule');
        console.log('Opening note. Theme ID:', note.theme_id, 'Themes loaded:', this.themes ? this.themes.length : 0);

        if (note.theme_id) {
            const theme = this.themes ? this.themes.find(t => t.id === note.theme_id) : null;
            if (theme) {
                this.selectedNoteTheme = theme;
                console.log('Theme found:', theme.name);
            } else {
                // Fallback: Preserve ID even if we don't have metadata
                this.selectedNoteTheme = { id: note.theme_id, name: 'Chargement...', color: '#7b61ff' };
                console.warn('Theme not found in loaded list, generating fallback');
            }
        } else {
            this.selectedNoteTheme = null;
            console.log('No theme for this note');
        }

        if (capsule && this.selectedNoteTheme) {
            capsule.classList.add('selected');
            capsule.style.setProperty('--selected-theme-color', this.selectedNoteTheme.color);
            capsule.innerHTML = ''; // Remove "?" icon
            capsule.style.pointerEvents = 'none'; // Read-only: can't change theme initially
        }

        // Show Edit Toggle and setup handler
        const toggleContainer = document.getElementById('edit-mode-toggle-container');
        const toggleCheckbox = document.getElementById('edit-mode-checkbox');

        if (toggleContainer) {
            toggleContainer.classList.remove('hidden'); // Show toggle
            toggleCheckbox.checked = false; // Start in read-only mode

            toggleCheckbox.onchange = () => {
                const isEditing = toggleCheckbox.checked;
                this.setNoteEditable(isEditing);
            };
        }

        // Store current note ID for updating
        this.currentEditingNoteId = note.id;
        console.log('openNoteReadOnly: Set currentEditingNoteId to', this.currentEditingNoteId);
        console.log('Note Ownership Check:', {
            currentUserId: this.user ? this.user.id : 'No User',
            noteOwnerId: note.user_id,
            isOwner: this.user && this.user.id === note.user_id
        });

        // Close logic
        const closeArrow = document.getElementById('note-close-arrow');

        const cleanupReadOnly = () => {
            sheet.classList.remove('active');

            // Restore editable state for next creation
            if (titleInput) {
                titleInput.removeAttribute('readonly');
                titleInput.style.pointerEvents = 'auto';
                titleInput.value = '';
            }
            if (contentArea) {
                contentArea.setAttribute('contenteditable', 'true');
                contentArea.style.pointerEvents = 'auto';
                contentArea.innerHTML = '';
            }

            // Restore buttons
            if (formatBtn) formatBtn.style.removeProperty('display');
            if (saveBtn) saveBtn.style.removeProperty('display');
            if (attachBtn) attachBtn.style.removeProperty('display');

            // Restore attachment state
            if (displayPill) {
                displayPill.classList.add('hidden');
                displayPill.onclick = null;
                displayPill.style.cursor = '';
                if (removeBtn) removeBtn.style.removeProperty('display');
            }

            // Restore Theme Capsule
            if (capsule) {
                capsule.classList.remove('selected');
                capsule.style.removeProperty('--selected-theme-color');
                capsule.innerHTML = '<span class="capsule-icon">?</span>';
                capsule.style.pointerEvents = 'auto';
            }

            // Reset State
            this.selectedNoteTheme = null;
            this.currentEditingNoteId = null;

            // Hide Edit Toggle
            if (toggleContainer) {
                toggleContainer.classList.add('hidden');
                toggleCheckbox.checked = false;
                toggleCheckbox.onchange = null;
            }

            // Only restore Carousel if theme view is NOT active AND all-notes view is NOT active
            const themeView = document.getElementById('theme-view-container');
            const allNotesView = document.getElementById('all-notes-view');
            const isInThemeView = themeView && themeView.classList.contains('active');
            const isInAllNotesView = allNotesView && allNotesView.classList.contains('active');
            if (carousel && !isInThemeView && !isInAllNotesView) {
                carousel.classList.remove('hidden-view');
            }

            // Restore close handler
            if (closeArrow) closeArrow.onclick = () => this.toggleNoteCreationMode();

            // Remove escape listener
            if (this.escapeHandler) {
                document.removeEventListener('keydown', this.escapeHandler);
                this.escapeHandler = null;
            }
        };

        if (closeArrow) {
            closeArrow.onclick = cleanupReadOnly;
        }

        // Escape Key Listener for read-only mode
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                cleanupReadOnly();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    /**
     * Toggle note between editable and read-only mode
     */
    setNoteEditable(isEditable) {
        const titleInput = document.querySelector('.note-title-input');
        const contentArea = document.querySelector('.note-content-area');
        const formatBtn = document.getElementById('format-btn');
        const saveBtn = document.querySelector('.note-action-btn.save-btn');
        const attachBtn = document.getElementById('attach-file-btn');
        const capsule = document.getElementById('theme-capsule');
        const removeBtn = document.getElementById('remove-file-btn');

        if (isEditable) {
            // Enable Inputs
            if (titleInput) {
                titleInput.removeAttribute('readonly');
                titleInput.style.pointerEvents = 'auto';
            }
            if (contentArea) {
                contentArea.setAttribute('contenteditable', 'true');
                contentArea.style.pointerEvents = 'auto';
            }

            // Show Tools
            if (formatBtn) formatBtn.style.removeProperty('display');
            if (saveBtn) saveBtn.style.removeProperty('display');
            if (attachBtn) attachBtn.style.removeProperty('display');

            // Allow Theme Change
            if (capsule) capsule.style.pointerEvents = 'auto';

            // Allow File Removal
            if (removeBtn) removeBtn.style.removeProperty('display');

        } else {
            // Revert to Read-Only
            if (titleInput) {
                titleInput.setAttribute('readonly', 'true');
                titleInput.style.pointerEvents = 'none';
            }
            if (contentArea) {
                contentArea.setAttribute('contenteditable', 'false');
                contentArea.style.pointerEvents = 'none';
            }

            if (formatBtn) formatBtn.style.display = 'none';
            if (saveBtn) saveBtn.style.display = 'none';
            if (attachBtn) attachBtn.style.display = 'none';

            if (capsule) capsule.style.pointerEvents = 'none';
            if (removeBtn) removeBtn.style.display = 'none';
        }
    }

    /**
     * Open Note Creation (Editable)
     */
    toggleNoteCreationMode() {
        const sheet = document.getElementById('note-sheet');
        const carousel = document.querySelector('.cards-carousel');
        const button = document.getElementById('add-note-btn');

        if (!sheet || !carousel) return;

        const isActive = sheet.classList.contains('active');

        if (isActive) {
            // Closing
            sheet.classList.remove('active');
            if (button) button.innerHTML = '<span class="button-icon">+</span>';

            // Remove Escape listener
            if (this.escapeHandler) {
                document.removeEventListener('keydown', this.escapeHandler);
                this.escapeHandler = null;
            }

            // Reset File Selection
            this.clearAttachments();

            // Reset Form Fields
            const titleInput = document.querySelector('.note-title-input');
            const contentArea = document.querySelector('.note-content-area');
            if (titleInput) titleInput.value = '';
            if (contentArea) contentArea.innerHTML = '';

            // Reset editing state
            this.currentEditingNoteId = null;
            this.selectedNoteTheme = null;
            const capsule = document.getElementById('theme-capsule');
            if (capsule) {
                capsule.classList.remove('selected');
                capsule.style.removeProperty('--selected-theme-color');
                capsule.innerHTML = '<span class="capsule-icon">?</span>';
            }

            // Hide Formatting Toolbar if open
            const formatToolbar = document.getElementById('format-toolbar');
            if (formatToolbar) formatToolbar.classList.add('hidden');

            carousel.classList.remove('hidden-view'); // Restore carousel visibility
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

        // Handle click to view full note


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
            const data = await themeService.getAll();

            // Store in centralized state
            store.set('themes', data);

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
            Toast.error("Mode hors ligne ou erreur connexion");
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

        // Click to Open Details
        cardHtml.addEventListener('click', (e) => {
            // Ignore if clicking on action buttons (edit/delete)
            if (e.target.closest('.action-btn')) return;

            this.openThemeDetails(themeId);
        });

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
            // DB Insert using service
            await themeService.create({ id: themeId, name: name, color: colorStr });

            // Update store
            const newTheme = { id: themeId, name, color: colorStr };
            this.themes.push(newTheme);
            store.set('themes', [...this.themes]);

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

            Toast.success(`Thème "${name}" créé avec succès !`);

        } catch (e) {
            console.error(e);
            Toast.error("Erreur lors de la création du thème.");
        }

    }

    showToast(message, type = 'default') {
        const existingToast = document.querySelector('.custom-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `custom-toast ${type}`;

        // Icon based on type
        let icon = '';
        if (type === 'success') {
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
        } else {
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
        }

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <span class="toast-message">${message}</span>
        `;

        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        // Hide after 2 seconds
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
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

        // Keyboard Navigation
        document.addEventListener('keydown', (e) => {
            // Checks to ensure we are in the main carousel view
            const noteSheet = document.getElementById('note-sheet');
            if (noteSheet && noteSheet.classList.contains('active')) return;

            const newCard = document.getElementById('new-card');
            if (newCard && newCard.classList.contains('active')) return;

            if (this.isEditing) return;

            if (e.key === 'ArrowLeft') {
                this.navigateCarousel(-1);
            } else if (e.key === 'ArrowRight') {
                this.navigateCarousel(1);
            }
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
                    if (card) {
                        if (confirm('Supprimer ce thème définitivement ?')) {
                            this.deleteTheme(card);
                        }
                    }
                }
            });
        }
    }

    createColorSidebarHTML() {
        return `
        < div class="color-options-sidebar edit-mode-sidebar" style = "position: absolute; right: -80px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 20px;" >
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
            </div >
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
        closeBtn.innerHTML = `< svg width = "24" height = "24" fill = "none" stroke = "currentColor" viewBox = "0 0 24 24" stroke - width="2" ><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg > `;
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
                const rgbString = `${rgb.r}, ${rgb.g}, ${rgb.b} `;

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
        < svg width = "24" height = "24" viewBox = "0 0 24 24" fill = "none" stroke = "white" stroke - width="3" stroke - linecap="round" stroke - linejoin="round" >
            <polyline points="20 6 9 17 4 12"></polyline>
               </svg >
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

    async deleteTheme(card) {
        const themeId = card.id;

        try {
            // Delete using service
            await themeService.delete(themeId);

            // Remove from internal array and store
            this.themes = this.themes.filter(t => t.id !== themeId);
            store.set('themes', [...this.themes]);

            // Remove from DOM
            card.remove();

            // Adjust Index if needed
            if (this.currentCardIndex >= this.themes.length) {
                this.currentCardIndex = Math.max(0, this.themes.length - 1);
            }

            this.updateCarouselView();
            Toast.success('Thème supprimé');

        } catch (err) {
            console.error('Erreur suppression:', err);
            Toast.error('Erreur lors de la suppression');
        }
    }

    async saveNote() {
        const titleInput = document.querySelector('.note-title-input');
        const contentArea = document.querySelector('.note-content-area');

        const title = titleInput ? titleInput.value : '';
        const content = contentArea ? contentArea.innerHTML : ''; // Use innerHTML for rich text
        const theme = this.selectedNoteTheme;
        const date = this.noteDate || new Date();

        if (!title && !content) {
            Toast.error("La note est vide.");
            return;
        }

        try {

            // Process Attachments (New & Existing)
            const attachments = [];

            // We iterate through selectedFiles which contains both File objects (new) and plain objects (existing)
            for (const file of this.selectedFiles) {
                if (file instanceof File) {
                    // New File -> Upload
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                    const filePath = `${this.user.id}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('note_attachments')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('note_attachments')
                        .getPublicUrl(filePath);

                    attachments.push({
                        name: file.name,
                        url: publicUrl,
                        type: file.type
                    });
                } else {
                    // Existing File -> Keep as is
                    attachments.push({
                        name: file.name,
                        url: file.url,
                        type: file.type
                    });
                }
            }

            // Legacy support (optional): keep first attachment in old columns if needed, 
            // but we primarily use the 'attachments' column now.
            const legacyUrl = attachments.length > 0 ? attachments[0].url : null;
            const legacyName = attachments.length > 0 ? attachments[0].name : null;

            const payload = {
                title,
                content,
                theme_id: theme ? theme.id : null,
                date_display: date.toISOString(),
                user_id: this.user.id.toString(), // Ensure string, though usually is
                attachments: attachments,          // JSONB column
                attachment_url: legacyUrl,         // Legacy
                attachment_name: legacyName        // Legacy
            };

            // Determine if UPDATE or INSERT
            const isUpdate = !!this.currentEditingNoteId;
            console.log('saveNote: isUpdate?', isUpdate, 'ID:', this.currentEditingNoteId);

            if (isUpdate) {
                // UPDATE STRATEGY: Standard update with sanitized payload
                // We strictly exclude user_id, id, created_at to avoid RLS/Trigger issues

                const updatePayload = {
                    title: payload.title,
                    content: payload.content,
                    theme_id: payload.theme_id,
                    date_display: payload.date_display,
                    attachments: payload.attachments,
                    attachment_url: payload.attachment_url,
                    attachment_name: payload.attachment_name
                };

                console.log('saveNote: calling update with sanitized payload:', updatePayload);
                const result = await noteService.update(this.currentEditingNoteId, updatePayload);
                console.log('saveNote: update result:', result);

                if (result && result.length === 0) {
                    console.warn('saveNote: UPDATE returned 0 rows! ID mismatch or RLS blocking.');
                    Toast.error("Erreur: Impossible de modifier. Vérifiez que vous êtes bien propriétaire de cette note.");
                    return;
                }
            } else {
                console.log('saveNote: calling create...');
                await noteService.create(payload);
            }

            // Stylish Toast with theme name
            const themeName = theme ? theme.name : 'Sans catégorie';
            Toast.success(isUpdate ? 'Note mise à jour !' : `Note enregistrée dans ${themeName}`);

            // Refresh the notes list for the current theme
            if (payload.theme_id) {
                await this.renderThemeNotes(payload.theme_id);
            }

            // Also refresh all-notes view if it's open
            const allNotesView = document.getElementById('all-notes-view');
            if (allNotesView && allNotesView.classList.contains('active')) {
                await this.renderAllNotes();
            }

            // Close the sheet
            const closeArrow = document.getElementById('note-close-arrow');
            if (closeArrow) closeArrow.click();

        } catch (e) {
            console.error('Save note error:', e);
            Toast.error(`Erreur: ${e.message || 'sauvegarde note'}`);
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

        const newCard = document.getElementById('new-card');
        const cancelBtn = document.querySelector('.cancel-create-btn');
        const themeInput = document.querySelector('.theme-name-input');

        if (createThemeBtn && newCard) {
            createThemeBtn.addEventListener('click', (e) => {
                e.preventDefault();

                // Hide all current cards
                const allCards = this.getThemeCards();
                allCards.forEach(card => {
                    card.classList.remove('active');
                    card.classList.add('prev');
                });

                // Show creation card
                newCard.classList.add('active');

                // Initialize Creation DNA if needed
                requestAnimationFrame(() => {
                    if (!this.creationHelix) {
                        const canvas = document.getElementById('dna-canvas-creation');
                        if (canvas) {
                            this.creationHelix = new DNAHelix(canvas);
                        }
                    } else {
                        this.creationHelix.setupCanvas();
                    }

                    // Trigger Default Color (First one)
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

                // Restore carousel view
                this.updateCarouselView();

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
    initFormattingToolbar() {
        const formatBtn = document.getElementById('format-btn');
        const toolbar = document.getElementById('format-toolbar');
        const actionBtns = document.querySelectorAll('.format-action-btn');

        if (formatBtn && toolbar) {
            // Toggle Toolbar
            formatBtn.addEventListener('click', (e) => {
                e.stopPropagation();

                // Close date picker or theme dropdown if open
                const datePicker = document.getElementById('custom-date-picker');
                if (datePicker) datePicker.classList.add('hidden');
                const themeDropdown = document.getElementById('theme-dropdown');
                if (themeDropdown) themeDropdown.classList.add('hidden');

                toolbar.classList.toggle('hidden');

                // Close when clicking outside
                if (!toolbar.classList.contains('hidden')) {
                    const outsideClick = (ev) => {
                        if (!toolbar.contains(ev.target) && !formatBtn.contains(ev.target)) {
                            toolbar.classList.add('hidden');
                            document.removeEventListener('click', outsideClick);
                        }
                    };
                    setTimeout(() => document.addEventListener('click', outsideClick), 0);
                }
            });

            // Action Buttons
            actionBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const cmd = btn.dataset.cmd;
                    const val = btn.dataset.val;

                    if (cmd === 'fontSize') {
                        document.execCommand('fontSize', false, val);
                    } else {
                        document.execCommand(cmd, false, null);
                        btn.classList.toggle('active');
                    }

                    // Focus back to editor
                    const editor = document.getElementById('note-content-editable');
                    if (editor) editor.focus();
                });
            });

            // Update active states on selection change
            document.addEventListener('selectionchange', () => {
                if (document.activeElement.id === 'note-content-editable') {
                    this.updateToolbarState();
                }
            });
        }
    }

    updateToolbarState() {
        const actionBtns = document.querySelectorAll('.format-action-btn');
        actionBtns.forEach(btn => {
            const cmd = btn.dataset.cmd;
            if (cmd !== 'fontSize') {
                if (document.queryCommandState(cmd)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    }
    /* === Theme View (Split Layout) Logic === */

    initThemeView() {
        // Back Button
        const backBtn = document.getElementById('back-from-theme-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.closeThemeView());
        }
    }

    async openThemeDetails(themeId) {
        // Note: keeping method name same to match renderThemeCard call
        const theme = this.themes.find(t => t.id === themeId);
        if (!theme) return;

        // 1. Hide Dashboard & Header
        const dashboardMain = document.querySelector('.dashboard-main');
        const header = document.querySelector('.app-header');
        const themeView = document.getElementById('theme-view-container');

        if (dashboardMain) dashboardMain.classList.add('hidden-view');
        if (header) header.classList.add('hidden');

        // 2. Show Theme View
        if (themeView) {
            themeView.classList.remove('hidden');
            // Trigger reflow
            void themeView.offsetWidth;
            themeView.classList.add('visible');
        }

        // 3. Init Vertical DNA
        this.initVerticalDNA(theme.color);

        // 4. Fetch Notes
        await this.renderThemeNotes(themeId);
    }

    closeThemeView() {
        const dashboardMain = document.querySelector('.dashboard-main');
        const header = document.querySelector('.app-header');
        const themeView = document.getElementById('theme-view-container');

        if (themeView) {
            themeView.classList.remove('visible');
            setTimeout(() => {
                themeView.classList.add('hidden');

                // Restore Dashboard
                if (dashboardMain) dashboardMain.classList.remove('hidden-view');
                if (header) header.classList.remove('hidden');
            }, 500);
        }

        // Stop DNA
        if (this.verticalHelix) {
            this.verticalHelix.stopAnimation();
            this.verticalHelix = null;
        }
    }

    /**
     * Open All Notes View
     */
    async openAllNotesView() {
        const allNotesView = document.getElementById('all-notes-view');
        const dashboardMain = document.querySelector('.dashboard-main');
        const header = document.querySelector('.app-header');

        if (!allNotesView) return;

        // Hide dashboard
        if (dashboardMain) dashboardMain.classList.add('hidden-view');
        if (header) header.classList.add('hidden');

        // Show all-notes view
        allNotesView.classList.remove('hidden');
        requestAnimationFrame(() => {
            allNotesView.classList.add('active');
        });

        // Render notes
        await this.renderAllNotes();
    }

    /**
     * Close All Notes View
     */
    closeAllNotesView() {
        const allNotesView = document.getElementById('all-notes-view');
        const dashboardMain = document.querySelector('.dashboard-main');
        const header = document.querySelector('.app-header');
        const carousel = document.querySelector('.cards-carousel');

        if (!allNotesView) return;

        allNotesView.classList.remove('active');
        setTimeout(() => {
            allNotesView.classList.add('hidden');

            // Restore Dashboard
            if (dashboardMain) dashboardMain.classList.remove('hidden-view');
            if (header) header.classList.remove('hidden');

            // Critical: Ensure Carousel is also visible (it happens to be hidden by openNoteReadOnly)
            if (carousel) carousel.classList.remove('hidden-view');
        }, 400);
    }

    /**
     * Render All Notes grouped by theme
     */
    async renderAllNotes() {
        const container = document.getElementById('all-notes-content');
        if (!container) return;

        container.innerHTML = '<div class="notes-empty-state">Chargement...</div>';

        try {
            // Fetch all notes for this user
            const { data: notes, error } = await supabase
                .from('notes')
                .select('*')
                .eq('user_id', this.user.id)
                .order('date_display', { ascending: false });

            if (error) throw error;

            if (!notes || notes.length === 0) {
                container.innerHTML = `
                    <div class="notes-empty-state">
                        <div class="notes-empty-icon">📝</div>
                        <p>Aucune note pour le moment</p>
                    </div>`;
                return;
            }

            // Group notes by theme_id
            const groupedNotes = {};
            const noThemeNotes = [];

            notes.forEach(note => {
                if (note.theme_id) {
                    if (!groupedNotes[note.theme_id]) {
                        groupedNotes[note.theme_id] = [];
                    }
                    groupedNotes[note.theme_id].push(note);
                } else {
                    noThemeNotes.push(note);
                }
            });

            // Use themes from store or fetch
            const themes = store.get('themes') || this.themes || [];

            container.innerHTML = '';

            // Render each theme group
            for (const themeId of Object.keys(groupedNotes)) {
                const theme = themes.find(t => t.id === themeId);
                const themeName = theme ? theme.name : 'Thème inconnu';
                const themeColor = theme ? theme.color : '#7b61ff';
                const themeNotes = groupedNotes[themeId];

                const groupHTML = this.createNotesGroupHTML(themeName, themeColor, themeNotes);
                container.insertAdjacentHTML('beforeend', groupHTML);
            }

            // Render notes without theme
            if (noThemeNotes.length > 0) {
                const groupHTML = this.createNotesGroupHTML('Sans thème', '#888888', noThemeNotes);
                container.insertAdjacentHTML('beforeend', groupHTML);
            }

            // Add click handlers
            container.querySelectorAll('.all-notes-card').forEach(card => {
                card.onclick = () => {
                    const noteId = card.dataset.noteId;
                    const note = notes.find(n => n.id === noteId);
                    if (note) {
                        this.openNoteReadOnly(note);
                    }
                };
            });

        } catch (err) {
            console.error('Error loading all notes:', err);
            container.innerHTML = `
                <div class="notes-empty-state">
                    <p>Erreur lors du chargement des notes</p>
                </div>`;
        }
    }

    /**
     * Create HTML for a theme group of notes
     */
    createNotesGroupHTML(themeName, themeColor, notes) {
        const notesHTML = notes.map(note => {
            const title = note.title || 'Sans titre';
            const preview = this.stripHTML(note.content || '').substring(0, 100);
            const date = note.date_display ? new Date(note.date_display).toLocaleDateString('fr-FR') : '';

            return `
                <div class="all-notes-card" data-note-id="${note.id}" style="--note-theme-color: ${themeColor}">
                    <div class="all-notes-card-title">${title}</div>
                    <div class="all-notes-card-preview">${preview}</div>
                    <div class="all-notes-card-date">${date}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="notes-theme-group">
                <div class="notes-theme-header">
                    <div class="notes-theme-dot" style="background: ${themeColor}; color: ${themeColor}"></div>
                    <span class="notes-theme-name">${themeName}</span>
                    <span class="notes-theme-count">${notes.length} note${notes.length > 1 ? 's' : ''}</span>
                </div>
                <div class="notes-grid">
                    ${notesHTML}
                </div>
            </div>
        `;
    }

    /**
     * Helper to strip HTML tags from content
     */
    stripHTML(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    initVerticalDNA(color) {
        const canvas = document.getElementById('dna-canvas-vertical');
        if (!canvas) return;

        // Config for long vertical strand
        const config = {
            nucleotideCount: 80, // Very long
            helixRadius: 60,
            verticalSpacing: 30,
            rotationSpeed: 0.003 // Slow elegant rotation
        };

        this.verticalHelix = new DNAHelix(canvas, config);
        this.verticalHelix.setTheme(color);

        // Fill some for visuals
        for (let i = 0; i < 80; i++) {
            if (Math.random() > 0.6) {
                this.verticalHelix.fillNucleotide(i, color, 'fill');
            }
        }
    }

    async renderThemeNotes(themeId) {
        console.log('Rendering theme notes for:', themeId);
        const container = document.getElementById('theme-notes-area');
        if (!container) {
            console.error('Notes container not found!');
            return;
        }

        // Visual loading state only if empty? Or simple logic
        // container.innerHTML = '<div style="color:white;text-align:center;margin-top:50px;">Chargement...</div>';

        try {
            const data = await noteService.getByTheme(themeId);

            console.log('Fetched notes:', data ? data.length : 0);

            container.innerHTML = '';

            if (data && data.length > 0) {
                data.forEach(note => {
                    const el = document.createElement('div');
                    el.className = 'note-preview-card';

                    const date = new Date(note.date_display).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric'
                    });

                    // Text preview - Preserve HTML structure
                    // We inject the HTML directly. CSS will handle line clamping.
                    // However, we want to ensure we don't inject massive images or iframes in preview if we don't want to.
                    // For now, let's trust the content is safe (sanitized on save ideally, or just contenteditable HTML)
                    let contentHtml = note.content || '';

                    // Simple safety check: if it's way too long, maybe truncate raw string first? 
                    // But truncating HTML string is risky (unclosed tags).
                    // Better to rely on CSS overflow hidden.

                    el.innerHTML = `
                        <div class="note-preview-date">${date}</div>
                        <div class="note-preview-title">${note.title || 'Sans titre'}</div>
                        <div class="note-preview-snippet">${contentHtml}</div>
                        <div class="note-interaction-indicator">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </div>
                     `;

                    el.addEventListener('click', () => {
                        this.openNoteReadOnly(note);
                    });

                    container.appendChild(el);
                });
            } else {
                container.innerHTML = '<div style="color:rgba(255,255,255,0.5);text-align:center;margin-top:50px;">Aucune note.</div>';
            }

        } catch (err) {
            console.error(err);
            container.innerHTML = '<div style="color:rgba(255,255,255,0.5);text-align:center;margin-top:50px;">Erreur de chargement.</div>';
        }
    }
}

// Initialiser l'application
const app = new CellApp();

// Exposer pour le debugging
window.CellApp = app;
