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
