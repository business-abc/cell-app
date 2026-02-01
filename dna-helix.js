/**
 * DNAHelix - Classe pour générer et animer une hélice ADN 3D via Canvas API
 * 
 * Caractéristiques:
 * - Double hélice avec 20 paires de nucléotides par brin
 * - Animation de rotation perpétuelle
 * - Nucléotides "éteints" par défaut, colorés selon le thème quand remplis
 * - Effet de profondeur 3D
 */

export class DNAHelix {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Configuration
        this.config = Object.assign({
            nucleotideCount: 20,          // Nombre de paires par brin
            helixRadius: 60,              // Rayon de l'hélice
            verticalSpacing: 18,          // Espacement vertical entre nucléotides
            nucleotideRadius: 8,          // Rayon des sphères
            rotationSpeed: 0.008,         // Vitesse de rotation (radians par frame)
            perspective: 400,             // Distance de perspective
        }, options);

        // État
        this.rotation = 0;
        this.nucleotides = [];
        this.animationId = null;

        // Couleurs par défaut
        this.colors = {
            empty: 'rgba(255, 255, 255, 0.12)',
            emptyStroke: 'rgba(255, 255, 255, 0.08)',
            connection: 'rgba(255, 255, 255, 0.06)',
            connectionActive: 'rgba(255, 255, 255, 0.15)',
        };

        // Initialisation
        this.init();
    }

    init() {
        this.setupCanvas();
        this.createNucleotides();
        this.startAnimation();

        // Gérer le redimensionnement
        window.addEventListener('resize', () => this.setupCanvas());
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = container.clientWidth * dpr;
        this.canvas.height = container.clientHeight * dpr;
        this.canvas.style.width = container.clientWidth + 'px';
        this.canvas.style.height = container.clientHeight + 'px';

        this.ctx.scale(dpr, dpr);

        this.centerX = container.clientWidth / 2;
        this.centerY = container.clientHeight / 2;
    }

    createNucleotides() {
        this.nucleotides = [];

        for (let i = 0; i < this.config.nucleotideCount; i++) {
            // Chaque paire contient deux nucléotides (brin A et brin B)
            this.nucleotides.push({
                index: i,
                filled: false,
                themeColor: null,       // Couleur du thème si rempli
                themeId: null,          // ID du thème associé
                // Position de base dans l'hélice
                baseAngle: (i / this.config.nucleotideCount) * Math.PI * 4, // 2 tours complets
                yOffset: (i - this.config.nucleotideCount / 2) * this.config.verticalSpacing,
            });
        }
    }

    /**
     * Remplir un nucléotide avec la couleur d'un thème
     * @param {number} index - Index du nucléotide (0-19)
     * @param {string} themeColor - Couleur hex du thème
     * @param {string} themeId - ID du thème
     */
    fillNucleotide(index, themeColor, themeId) {
        if (index >= 0 && index < this.nucleotides.length) {
            this.nucleotides[index].filled = true;
            this.nucleotides[index].themeColor = themeColor;
            this.nucleotides[index].themeId = themeId;
        }
    }

    /**
     * Vider un nucléotide
     * @param {number} index - Index du nucléotide
     */
    emptyNucleotide(index) {
        if (index >= 0 && index < this.nucleotides.length) {
            this.nucleotides[index].filled = false;
            this.nucleotides[index].themeColor = null;
            this.nucleotides[index].themeId = null;
        }
    }

    /**
     * Obtenir le nombre de nucléotides remplis
     */
    getFilledCount() {
        return this.nucleotides.filter(n => n.filled).length;
    }

    /**
     * Met à jour la couleur de tous les nucléotides remplis
     * @param {string} newColor - Nouvelle couleur hex ou rgb
     */
    updateAllColors(newColor) {
        this.nucleotides.forEach(n => {
            if (n.filled) {
                n.themeColor = newColor;
            }
        });
    }

    startAnimation() {
        const animate = () => {
            this.update();
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    update() {
        this.rotation += this.config.rotationSpeed;
        if (this.rotation > Math.PI * 2) {
            this.rotation -= Math.PI * 2;
        }
    }

    render() {
        const ctx = this.ctx;
        const container = this.canvas.parentElement;

        // Clear canvas
        ctx.clearRect(0, 0, container.clientWidth, container.clientHeight);

        // Collecter tous les éléments à dessiner avec leur profondeur Z
        const elements = [];

        for (const nucleotide of this.nucleotides) {
            const angle = nucleotide.baseAngle + this.rotation;

            // Brin A - Position 3D
            const xA = Math.cos(angle) * this.config.helixRadius;
            const zA = Math.sin(angle);

            // Brin B - Décalé de π (opposé)
            const xB = Math.cos(angle + Math.PI) * this.config.helixRadius;
            const zB = Math.sin(angle + Math.PI);

            const y = nucleotide.yOffset;

            // Calcul de la perspective et de la taille
            const scaleA = this.getScale(zA);
            const scaleB = this.getScale(zB);

            // Ajouter les nucléotides
            elements.push({
                type: 'nucleotide',
                x: this.centerX + xA,
                y: this.centerY + y,
                z: zA,
                scale: scaleA,
                nucleotide: nucleotide,
                strand: 'A'
            });

            elements.push({
                type: 'nucleotide',
                x: this.centerX + xB,
                y: this.centerY + y,
                z: zB,
                scale: scaleB,
                nucleotide: nucleotide,
                strand: 'B'
            });

            // Ajouter la connexion entre les deux brins
            elements.push({
                type: 'connection',
                x1: this.centerX + xA,
                y1: this.centerY + y,
                x2: this.centerX + xB,
                y2: this.centerY + y,
                z: (zA + zB) / 2,
                nucleotide: nucleotide
            });
        }

        // Trier par profondeur Z (du plus loin au plus proche)
        elements.sort((a, b) => a.z - b.z);

        // Dessiner les éléments
        for (const element of elements) {
            if (element.type === 'connection') {
                this.drawConnection(element);
            } else if (element.type === 'nucleotide') {
                this.drawNucleotide(element);
            }
        }
    }

    getScale(z) {
        // Effet de perspective : plus proche = plus grand
        return 0.6 + (z + 1) * 0.25;
    }

    getOpacity(z) {
        // Plus loin = plus transparent
        return 0.4 + (z + 1) * 0.3;
    }

    drawNucleotide(element) {
        const ctx = this.ctx;
        const { x, y, z, scale, nucleotide } = element;
        const radius = this.config.nucleotideRadius * scale;
        const opacity = this.getOpacity(z);

        ctx.save();

        if (nucleotide.filled && nucleotide.themeColor) {
            // Nucléotide rempli - avec couleur du thème
            const color = nucleotide.themeColor;

            // Glow effect
            ctx.shadowColor = color;
            ctx.shadowBlur = 15 * scale;

            // Gradient pour effet 3D
            const gradient = ctx.createRadialGradient(
                x - radius * 0.3, y - radius * 0.3, 0,
                x, y, radius
            );
            gradient.addColorStop(0, this.lightenColor(color, 40));
            gradient.addColorStop(0.5, color);
            gradient.addColorStop(1, this.darkenColor(color, 30));

            ctx.fillStyle = gradient;
            ctx.globalAlpha = Math.min(1, opacity + 0.3);

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Highlight
            ctx.shadowBlur = 0;
            const highlightGradient = ctx.createRadialGradient(
                x - radius * 0.4, y - radius * 0.4, 0,
                x - radius * 0.2, y - radius * 0.2, radius * 0.5
            );
            highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = highlightGradient;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // Nucléotide vide/éteint
            ctx.globalAlpha = opacity * 0.5;

            // Contour seulement
            ctx.strokeStyle = this.colors.emptyStroke;
            ctx.lineWidth = 1.5 * scale;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Remplissage très léger
            ctx.fillStyle = this.colors.empty;
            ctx.globalAlpha = opacity * 0.3;
            ctx.fill();
        }

        ctx.restore();
    }

    drawConnection(element) {
        const ctx = this.ctx;
        const { x1, y1, x2, y2, z, nucleotide } = element;
        const opacity = this.getOpacity(z) * 0.5;

        ctx.save();
        ctx.globalAlpha = opacity;

        if (nucleotide.filled) {
            ctx.strokeStyle = this.colors.connectionActive;
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = this.colors.connection;
            ctx.lineWidth = 1;
        }

        // Ligne en pointillés pour les connexions vides
        if (!nucleotide.filled) {
            ctx.setLineDash([4, 4]);
        }

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.restore();
    }

    // Utilitaires de couleur
    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `rgb(${R}, ${G}, ${B})`;
    }

    darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `rgb(${R}, ${G}, ${B})`;
    }

    /**
     * Définir le thème de couleur (palette monochromatique)
     * @param {string} baseColor - Couleur de base hexadécimale
     */
    setTheme(baseColor) {
        // Générer une palette monochromatique basée sur la couleur
        this.themePalette = {
            primary: baseColor,
            light: this.lightenColor(baseColor, 30),
            lighter: this.lightenColor(baseColor, 50),
            dark: this.darkenColor(baseColor, 20),
            darker: this.darkenColor(baseColor, 40)
        };

        // Mettre à jour les nucléotides existants pour utiliser cette palette
        this.nucleotides.forEach((n, index) => {
            if (n.filled) {
                // Assigner une variation de la couleur pour éviter l'aspect plat
                // Alterner entre les nuances pour un effet organique
                const nuance = index % 3;
                if (nuance === 0) n.themeColor = this.themePalette.primary;
                else if (nuance === 1) n.themeColor = this.themePalette.light;
                else n.themeColor = this.themePalette.dark;
            }
        });
    }

    /**
     * Démonstration : remplir plusieurs nucléotides avec le thème Violet
     */
    demo() {
        const violetTheme = '#7b61ff';
        this.setTheme(violetTheme);

        // Remplir quelques nucléotides pour la démo avec la palette violette
        const indicesToFill = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18];

        indicesToFill.forEach(index => {
            // La couleur spécifique sera écrasée par setTheme/logique interne, 
            // mais on passe la couleur primaire par défaut
            this.fillNucleotide(index, this.themePalette.primary, 'default-theme');

            // Appliquer la variation immédiatement
            const nuance = index % 3;
            if (nuance === 0) this.nucleotides[index].themeColor = this.themePalette.primary;
            else if (nuance === 1) this.nucleotides[index].themeColor = this.themePalette.light;
            else this.nucleotides[index].themeColor = this.themePalette.dark;
        });
    }
}

// Export pour utilisation globale
window.DNAHelix = DNAHelix;
