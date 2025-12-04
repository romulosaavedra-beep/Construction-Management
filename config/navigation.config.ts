/**
 * Configuração centralizada de navegação
 * Define todos os itens de menu com ícones e rótulos
 */

import {
    LayoutDashboard,
    DollarSign,
    Calendar,
    Blocks,
    FileText,
    Ruler,
    TrendingUp,
    ShoppingCart,
    Wallet,
    Cloud,
    Settings,
    Building2,
    MapPin,
    Sun,
    Droplets,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    LucideIcon,
} from 'lucide-react';

export type NavItemId =
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

export interface NavItem {
    id: NavItemId;
    icon: LucideIcon;
    label: string;
    description?: string;
}

export const NAVIGATION_ITEMS: NavItem[] = [
    {
        id: 'dashboard',
        icon: LayoutDashboard,
        label: 'Dashboard',
        description: 'Visão geral da obra',
    },
    {
        id: 'orcamento',
        icon: DollarSign,
        label: 'Orçamento',
        description: 'Gestão de orçamentos',
    },
    {
        id: 'planejamento',
        icon: Calendar,
        label: 'Planejamento',
        description: 'Cronograma e planejamento',
    },
    {
        id: 'composicao',
        icon: Blocks,
        label: 'Composição de Custos',
        description: 'Análise de custos',
    },
    {
        id: 'diario',
        icon: FileText,
        label: 'Diário de Obra',
        description: 'Registro diário de atividades',
    },
    {
        id: 'medicao',
        icon: Ruler,
        label: 'Medição de Obra',
        description: 'Medições e progresso físico',
    },
    {
        id: 'curva-abc',
        icon: TrendingUp,
        label: 'Curva ABC',
        description: 'Análise de custos (ABC)',
    },
    {
        id: 'compras',
        icon: ShoppingCart,
        label: 'Gestão de Compras',
        description: 'Pedidos e fornecedores',
    },
    {
        id: 'financeiro',
        icon: Wallet,
        label: 'Financeiro',
        description: 'Movimentação financeira',
    },
    {
        id: 'clima',
        icon: Cloud,
        label: 'Clima e Tempo',
        description: 'Monitoramento de clima',
    },
    {
        id: 'settings',
        icon: Settings,
        label: 'Configurações',
        description: 'Ajustes do sistema',
    },
] as const;

export const LAYOUT_ICONS = {
    logo: Building2,
    location: MapPin,
    sun: Sun,
    droplets: Droplets,
    chevronLeft: ChevronLeft,
    chevronRight: ChevronRight,
    menu: Menu,
    close: X,
} as const;

export type LayoutIcon = typeof LAYOUT_ICONS;
