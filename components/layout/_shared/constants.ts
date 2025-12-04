/**
 * Constantes reutilizáveis do layout
 */

export const LAYOUT_CONSTANTS = {
    // Z-index values
    zIndex: {
        sidebar: 1000,
        mobileMenu: 1001,
        modal: 1050,
        tooltip: 1100,
    },

    // Timing
    animation: {
        duration: '300ms',
        easing: 'ease-in-out',
    },

    // Responsive breakpoints (Tailwind)
    breakpoints: {
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        '2xl': 1536,
    },

    // Grid
    containerPadding: {
        mobile: '1rem',
        tablet: '1.5rem',
        desktop: '2rem',
    },
} as const;

export const SIDEBAR_CONSTANTS = {
    expandedWidth: '16rem', // md:w-64
    collapsedWidth: '4.375rem', // md:w-[70px]
    animationDuration: 300,
    storageKey: 'sidebar-preferences',
} as const;
