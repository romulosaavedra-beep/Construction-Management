/**
 * Tipos e interfaces compartilhadas do layout
 */

import { LucideIcon } from 'lucide-react';

export type Module =
    | 'dashboard'
    | 'orcamento'
    | 'planejamento'
    | 'composicao'
    | 'diario'
    | 'medicao'
    | 'curva-abc'
    | 'compras'
    | 'financeiro'
    | 'clima'
    | 'settings';

export interface NavItemType {
    id: Module;
    icon: LucideIcon;
    label: string;
    description?: string;
}

export interface SidebarPreferences {
    isPinned: boolean;
    isCollapsed: boolean;
}

export interface LocationData {
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
}
