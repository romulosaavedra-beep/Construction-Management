/**
 * Tailwind CSS Configuration
 * Mapeia as variáveis --ds-* do design-system.css para classes Tailwind
 * 
 * Estrutura:
 * - Colors: Cores do design system
 * - Spacing: Espaçamento padronizado
 * - Typography: Fontes e tamanhos
 * - Shadows: Sombras
 * - Border Radius: Raios de borda
 */

import type { Config } from 'tailwindcss';
import defaultConfig from 'tailwindcss/defaultConfig';

const config: Config = {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
        './modules/**/*.{js,ts,jsx,tsx}',
    ],

    theme: {
        extend: {
            // ==========================================
            // COLORS - Mapeados de design-system.css
            // ==========================================
            colors: {
                // Backgrounds
                base: 'var(--ds-bg-base)',
                surface: 'var(--ds-bg-surface)',
                elevated: 'var(--ds-bg-elevated)',

                // Text
                primary: {
                    50: 'var(--ds-text-primary)',
                    DEFAULT: 'var(--ds-text-primary)',
                },
                secondary: 'var(--ds-text-secondary)',
                disabled: 'var(--ds-text-disabled)',

                // Primary Colors
                accent: {
                    50: 'var(--ds-primary-50)',
                    100: 'var(--ds-primary-100)',
                    200: 'var(--ds-primary-200)',
                    300: 'var(--ds-primary-300)',
                    400: 'var(--ds-primary-400)',
                    500: 'var(--ds-primary-500)',
                    600: 'var(--ds-primary-600)',
                    700: 'var(--ds-primary-700)',
                    800: 'var(--ds-primary-800)',
                    900: 'var(--ds-primary-900)',
                    DEFAULT: 'var(--ds-primary-500)',
                },

                // Status Colors
                success: 'var(--ds-success)',
                'success-bg': 'var(--ds-success-bg)',
                error: 'var(--ds-error)',
                'error-bg': 'var(--ds-error-bg)',
                warning: 'var(--ds-warning)',
                'warning-bg': 'var(--ds-warning-bg)',
                info: 'var(--ds-info)',
                'info-bg': 'var(--ds-info-bg)',

                // Borders
                border: {
                    default: 'var(--ds-border-default)',
                    subtle: 'var(--ds-border-subtle)',
                    strong: 'var(--ds-border-strong)',
                    DEFAULT: 'var(--ds-border-default)',
                },

                // Component Specific
                'btn-primary-text': 'var(--ds-btn-primary-text)',
                'card-border': 'var(--ds-card-border)',
                'card-border-inner': 'var(--ds-card-border-inner)',

                // Focus
                'focus-ring': 'var(--ds-focus-ring)',
            },

            // ==========================================
            // SPACING
            // ==========================================
            spacing: {
                0: '0',
                1: 'var(--ds-space-1)',
                2: 'var(--ds-space-2)',
                4: 'var(--ds-space-4)',
                6: 'var(--ds-space-6)',
                8: 'var(--ds-space-8)',
                10: 'var(--ds-space-10)',
                12: 'var(--ds-space-12)',
                16: 'var(--ds-space-16)',
                20: 'var(--ds-space-20)',
                24: 'var(--ds-space-24)',
                32: 'var(--ds-space-32)',
            },

            // ==========================================
            // TYPOGRAPHY
            // ==========================================
            fontSize: {
                xs: ['var(--ds-font-size-xs)', { lineHeight: 'var(--ds-line-height-tight)' }],
                sm: ['var(--ds-font-size-sm)', { lineHeight: 'var(--ds-line-height-tight)' }],
                base: ['var(--ds-font-size-base)', { lineHeight: 'var(--ds-line-height-normal)' }],
                lg: ['var(--ds-font-size-lg)', { lineHeight: 'var(--ds-line-height-normal)' }],
                xl: ['var(--ds-font-size-xl)', { lineHeight: 'var(--ds-line-height-normal)' }],
                '2xl': ['var(--ds-font-size-2xl)', { lineHeight: 'var(--ds-line-height-tight)' }],
                '3xl': ['var(--ds-font-size-3xl)', { lineHeight: 'var(--ds-line-height-tight)' }],
                '4xl': ['var(--ds-font-size-4xl)', { lineHeight: 'var(--ds-line-height-tight)' }],
            },

            fontWeight: {
                normal: 'var(--ds-font-weight-normal)',
                medium: 'var(--ds-font-weight-medium)',
                semibold: 'var(--ds-font-weight-semibold)',
                bold: 'var(--ds-font-weight-bold)',
            },

            fontFamily: {
                sans: ['var(--ds-font-family-base)', ...defaultConfig.theme.fontFamily.sans],
                mono: ['var(--ds-font-family-mono)', ...defaultConfig.theme.fontFamily.mono],
            },

            // ==========================================
            // SHADOWS
            // ==========================================
            boxShadow: {
                xs: 'var(--ds-shadow-xs)',
                sm: 'var(--ds-shadow-sm)',
                md: 'var(--ds-shadow-md)',
                lg: 'var(--ds-shadow-lg)',
                'inset-sm': 'var(--ds-shadow-inset-sm)',
            },

            // ==========================================
            // BORDER RADIUS
            // ==========================================
            borderRadius: {
                sm: 'var(--ds-radius-sm)',
                base: 'var(--ds-radius-base)',
                md: 'var(--ds-radius-md)',
                lg: 'var(--ds-radius-lg)',
                full: 'var(--ds-radius-full)',
            },

            // ==========================================
            // ANIMATIONS & TRANSITIONS
            // ==========================================
            transitionDuration: {
                fast: 'var(--ds-duration-fast)',
                normal: 'var(--ds-duration-normal)',
            },

            transitionTimingFunction: {
                standard: 'var(--ds-ease-standard)',
            },

            // ==========================================
            // Z-INDEX
            // ==========================================
            zIndex: {
                sidebar: '1000',
                'mobile-menu': '1001',
                modal: '1050',
                tooltip: '1100',
            },

            // ==========================================
            // CONTAINER
            // ==========================================
            maxWidth: {
                sm: 'var(--ds-container-sm)',
                md: 'var(--ds-container-md)',
                lg: 'var(--ds-container-lg)',
                xl: 'var(--ds-container-xl)',
            },

            // ==========================================
            // OUTLINE
            // ==========================================
            outline: {
                focus: ['2px solid var(--ds-primary-500)', '2px'],
            },

            // ==========================================
            // RING (Focus Ring)
            // ==========================================
            ringColor: {
                focus: 'var(--ds-focus-ring)',
            },

            ringWidth: {
                focus: '3px',
            },

            // ==========================================
            // BORDER COLORS (L, R, T, B variants)
            // ==========================================
            borderColor: {
                default: 'var(--ds-border-default)',
                subtle: 'var(--ds-border-subtle)',
                strong: 'var(--ds-border-strong)',
                success: 'var(--ds-success)',
                error: 'var(--ds-error)',
                warning: 'var(--ds-warning)',
                info: 'var(--ds-info)',
                'accent-500': 'var(--ds-primary-500)',
                'accent-600': 'var(--ds-primary-600)',
                'accent-700': 'var(--ds-primary-700)',
            },

        },
    },

    plugins: [],
};

export default config;