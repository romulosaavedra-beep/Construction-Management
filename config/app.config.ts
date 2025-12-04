/**
 * Configuração centralizada da aplicação
 * Todas as constantes de branding e configuração global
 */

export const APP_CONFIG = {
    company: {
        name: 'SAAVEDRA ENGENHARIA',
        displayName: 'Saavedra',
        description: 'Gestão Integrada de Obras e Projetos',
    },
    app: {
        title: 'Gestão de Obras',
        version: '1.0.0',
    },
    ui: {
        headerHeight: '60px',
        sidebarWidth: '256px', // md:w-64
        sidebarCollapsedWidth: '70px',
    },
} as const;

export const APP_BRANDING = {
    logo: 'SAAVEDRA',
    colors: {
        primary: 'var(--ds-primary-500)',
        accent: 'var(--ds-primary-600)',
    },
} as const;

export type AppConfig = typeof APP_CONFIG;
