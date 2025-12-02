import { useMemo } from 'react';
import { OrcamentoItem } from '../../../types';

// Helper functions that don't depend on state
export const regenerateNiveles = (items: OrcamentoItem[]): OrcamentoItem[] => {
    const newItems = items.map(i => ({ ...i }));

    const processLevel = (parentId: number | null, parentNivel: string) => {
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

export const getAllDescendantIds = (items: OrcamentoItem[], parentId: number): number[] => {
    const descendantIds: number[] = [];
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

export const useOrcamentoCalculations = (localOrcamento: OrcamentoItem[]) => {
    const processedOrcamento = useMemo(() => {
        const itemsMap = new Map();
        const parentIds = new Set(localOrcamento.map(i => i.pai).filter(p => p !== null));
        let grandTotal = 0;
        let grandTotalMaterial = 0;
        let grandTotalMaoDeObra = 0;

        // First pass: init items with self values
        localOrcamento.forEach(item => {
            const isParent = parentIds.has(item.id);
            const matTotal = item.quantidade * item.mat_unit;
            const moTotal = item.quantidade * item.mo_unit;

            itemsMap.set(item.id, {
                ...item,
                hasChildren: isParent,
                matMoUnit: item.mat_unit + item.mo_unit,
                matUnitTotal: matTotal,
                moUnitTotal: moTotal,
                matMoTotal: matTotal + moTotal,
                totalNivel: 0, // Will be calculated recursively
                percentNivel: 0,
            });
        });

        // Recursive subtotal calculation
        const calculateSubtotals = (itemId: number) => {
            const item = itemsMap.get(itemId);
            if (!item) return { mat: 0, mo: 0, total: 0 };

            // If item is a leaf, its subtotals are its own calculated totals
            if (!item.hasChildren) {
                item.totalNivel = item.matMoTotal;
                return { mat: item.matUnitTotal, mo: item.moUnitTotal, total: item.totalNivel };
            }

            // If item is a parent, its subtotals are sum of children
            let sumMat = 0;
            let sumMo = 0;
            let sumTotal = 0;

            localOrcamento.filter(child => child.pai === itemId).forEach(child => {
                const childTotals = calculateSubtotals(child.id);
                sumMat += childTotals.mat;
                sumMo += childTotals.mo;
                sumTotal += childTotals.total;
            });

            item.matUnitTotal = sumMat;
            item.moUnitTotal = sumMo;
            item.matMoTotal = sumMat + sumMo;
            item.totalNivel = sumTotal;

            return { mat: sumMat, mo: sumMo, total: sumTotal };
        };

        localOrcamento.filter(item => item.pai === null).forEach(root => {
            const totals = calculateSubtotals(root.id);
            grandTotal += totals.total;
            grandTotalMaterial += totals.mat;
            grandTotalMaoDeObra += totals.mo;
        });

        itemsMap.forEach(item => {
            item.percentNivel = grandTotal > 0 ? (item.totalNivel / grandTotal) * 100 : 0;
        });

        return {
            processedItems: Array.from(itemsMap.values()),
            grandTotal,
            grandTotalMaterial,
            grandTotalMaoDeObra
        };
    }, [localOrcamento]);

    return processedOrcamento;
};
