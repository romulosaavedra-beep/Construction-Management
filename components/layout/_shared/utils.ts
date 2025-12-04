/**
 * Funções utilitárias para layout
 */

import { LAYOUT_CONSTANTS } from './constants';

export const getZIndex = (layer: keyof typeof LAYOUT_CONSTANTS.zIndex): number => {
    return LAYOUT_CONSTANTS.zIndex[layer];
};

export const formatDateTime = (date: Date): { date: string; time: string } => {
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };

    return {
        date: new Intl.DateTimeFormat('pt-BR', options).format(date),
        time: date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }),
    };
};

export const getContainerPadding = (viewport: 'mobile' | 'tablet' | 'desktop'): string => {
    return LAYOUT_CONSTANTS.containerPadding[viewport];
};

export const isMobileViewport = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < LAYOUT_CONSTANTS.breakpoints.md;
};

export const isTabletViewport = (): boolean => {
    if (typeof window === 'undefined') return false;
    const width = window.innerWidth;
    return width >= LAYOUT_CONSTANTS.breakpoints.md && width < LAYOUT_CONSTANTS.breakpoints.lg;
};

export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let timeoutId: ReturnType<typeof setTimeout>;

    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};
