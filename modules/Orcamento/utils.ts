
import type { OrcamentoItem } from '@/types';
import { formatCurrency } from '../../utils/formatters';

export const formatNumberOrDash = (value: number, decimalPlaces = 2): string => {
    if (value === 0 || isNaN(value)) return '-';
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
    }).format(value);
};

export const formatCurrencyOrDash = (value: number): string => {
    if (value === 0 || isNaN(value)) return '-';
    return formatCurrency(value);
};

// Helper para navegação com Enter
export const handleEnterNavigation = (e: React.KeyboardEvent<HTMLElement>, colId: string) => {
    e.preventDefault();
    const currentInput = e.currentTarget;
    const table = currentInput.closest('table');
    if (!table) return;

    const allInputs = Array.from(table.querySelectorAll(`input[data-col-id="${colId}"], select[data-col-id="${colId}"]`)) as HTMLElement[];

    const currentIndex = allInputs.indexOf(currentInput);
    if (currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % allInputs.length;
        const nextInput = allInputs[nextIndex];

        nextInput.focus();
        if (nextInput instanceof HTMLInputElement) {
            nextInput.select();
        }
    }
};

export const regenerateNiveles = (items: OrcamentoItem[]): OrcamentoItem[] => {
    const newItems = items.map(i => ({ ...i }));

    const processLevel = (parentId: string | number | null, parentNivel: string) => {
        let siblingIndex = 1;
        const children = newItems.filter(item => item.pai === parentId);
        for (const child of children) {
            const newNivel = parentNivel ? `${parentNivel}.${siblingIndex}` : `${siblingIndex}`;
            child.nivel = newNivel;
            siblingIndex++;
            processLevel(child.id, child.nivel);
        }
    };

    processLevel(null, '');
    return newItems;
}

export const getAllDescendantIds = (items: OrcamentoItem[], parentId: string | number): (string | number)[] => {
    const descendantIds: (string | number)[] = [];
    const children = items.filter(item => item.pai === parentId);
    for (const child of children) {
        descendantIds.push(child.id);
        descendantIds.push(...getAllDescendantIds(items, child.id));
    }
    return descendantIds;
};

export const updateHierarchy = (items: OrcamentoItem[]): OrcamentoItem[] => {
    const parentIds = new Set(items.map(i => i.pai).filter(p => p !== null));
    const cleanedItems = items.map(item => {
        if (parentIds.has(item.id)) {
            return {
                ...item,
                unidade: '',
                quantidade: 0,
                mat_unit: 0,
                mo_unit: 0,
            };
        }
        return item;
    });
    return regenerateNiveles(cleanedItems);
};
