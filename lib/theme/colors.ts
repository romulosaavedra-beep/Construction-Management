// src/lib/theme/colors.ts
// Design System - Paleta de Cores Construction Pro

export const constructionProTheme = {
    // CORES PRINCIPAIS
    primary: {
        main: '#FF6B2C',      // Laranja vibrante (ações principais)
        light: '#FF8556',     // Hover
        dark: '#E05518',      // Active
        contrast: '#FFFFFF',  // Texto em cima de primary
    },

    // CORES DE STATUS
    status: {
        success: {
            main: '#10B981',    // Verde (concluído, positivo)
            light: '#34D399',
            bg: '#D1FAE5',      // Background
        },
        warning: {
            main: '#F59E0B',    // Amarelo (atenção)
            light: '#FBBF24',
            bg: '#FEF3C7',
        },
        critical: {
            main: '#EF4444',    // Vermelho (atrasado, erro)
            light: '#F87171',
            bg: '#FEE2E2',
        },
        info: {
            main: '#3B82F6',    // Azul (informação)
            light: '#60A5FA',
            bg: '#DBEAFE',
        },
    },

    // CORES DE INTERFACE
    background: {
        primary: '#FFFFFF',   // Fundo principal (light mode)
        secondary: '#F9FAFB', // Cards, painéis
        tertiary: '#F3F4F6',  // Hover states
        dark: '#111827',      // Fundo (dark mode)
    },

    text: {
        primary: '#111827',   // Texto principal
        secondary: '#6B7280', // Texto secundário
        tertiary: '#9CA3AF',  // Disabled, placeholders
        inverse: '#FFFFFF',   // Texto em background escuro
    },

    border: {
        light: '#E5E7EB',     // Bordas sutis
        medium: '#D1D5DB',    // Bordas padrão
        dark: '#9CA3AF',      // Bordas destacadas
    },

    // SHADOWS
    shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },

    // ESPAÇAMENTOS (baseado em 4px)
    spacing: {
        xs: '0.25rem',  // 4px
        sm: '0.5rem',   // 8px
        md: '1rem',     // 16px
        lg: '1.5rem',   // 24px
        xl: '2rem',     // 32px
        '2xl': '3rem',  // 48px
    },

    // TIPOGRAFIA
    typography: {
        fontFamily: {
            sans: 'Inter, system-ui, sans-serif',
            mono: 'JetBrains Mono, monospace',
        },
        fontSize: {
            xs: '0.75rem',   // 12px
            sm: '0.875rem',  // 14px
            base: '1rem',    // 16px
            lg: '1.125rem',  // 18px
            xl: '1.25rem',   // 20px
            '2xl': '1.5rem', // 24px
            '3xl': '2rem',   // 32px
        },
        fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
    },

    // RAIO DE BORDAS
    borderRadius: {
        none: '0',
        sm: '0.25rem',   // 4px
        md: '0.5rem',    // 8px
        lg: '0.75rem',   // 12px
        xl: '1rem',      // 16px
        full: '9999px',  // Círculo
    },
};

// TEMA ESCURO (Dark Mode)
export const darkTheme = {
    ...constructionProTheme,
    background: {
        primary: '#111827',
        secondary: '#1F2937',
        tertiary: '#374151',
        dark: '#030712',
    },
    text: {
        primary: '#F9FAFB',
        secondary: '#D1D5DB',
        tertiary: '#9CA3AF',
        inverse: '#111827',
    },
    border: {
        light: '#374151',
        medium: '#4B5563',
        dark: '#6B7280',
    },
};

// HELPER: Pegar cor por nome
export const getColor = (path: string, isDark = false) => {
    const theme = isDark ? darkTheme : constructionProTheme;
    return path.split('.').reduce((obj, key) => obj[key], theme as any);
};
