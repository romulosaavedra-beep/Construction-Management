
import type { OrcamentoItem } from '@/types';
export type { OrcamentoItem };

export interface ColumnConfig {
    id: string;
    label: string;
    initialWidth: number;
    minWidth: number;
    align?: 'left' | 'center' | 'right';
    resizable?: boolean;
}

export interface UnitItem {
    category: string;
    name: string;
    symbol: string;
}

export interface OrcamentoProps {
    orcamentoData: OrcamentoItem[];
    setOrcamentoData: (data: OrcamentoItem[]) => void;
}
