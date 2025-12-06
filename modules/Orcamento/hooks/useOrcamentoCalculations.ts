
import { useMemo } from 'react';
import type { OrcamentoItem } from '@/types';

export const useOrcamentoCalculations = (localOrcamento: OrcamentoItem[]) => {

    const processedOrcamento = useMemo(() => {
        const itemsMap = new Map();
        const parentIds = new Set(localOrcamento.map(i => i.pai).filter(p => p !== null));
        let grandTotal = 0;

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
                totalNivel: 0,
                percentNivel: 0,
            });
        });

        const calculateSubtotals = (itemId: string | number) => {
            const item = itemsMap.get(itemId);
            if (!item) return { mat: 0, mo: 0, total: 0 };

            if (!item.hasChildren) {
                item.totalNivel = item.matMoTotal;
                return { mat: item.matUnitTotal, mo: item.moUnitTotal, total: item.totalNivel };
            }

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
        });

        itemsMap.forEach(item => {
            item.percentNivel = grandTotal > 0 ? (item.totalNivel / grandTotal) * 100 : 0;
        });

        return Array.from(itemsMap.values()) as (OrcamentoItem & {
            hasChildren: boolean;
            matMoUnit: number;
            matUnitTotal: number;
            moUnitTotal: number;
            matMoTotal: number;
            totalNivel: number;
            percentNivel: number;
        })[];
    }, [localOrcamento]);

    const { grandTotalValue, grandTotalMaterial, grandTotalMaoDeObra } = useMemo(() => {
        const materialTotal = processedOrcamento
            .filter(item => item.unidade !== '' && item.unidade !== '-')
            .reduce((acc, item) => acc + item.matUnitTotal, 0);

        const moTotal = processedOrcamento
            .filter(item => item.unidade !== '' && item.unidade !== '-')
            .reduce((acc, item) => acc + item.moUnitTotal, 0);

        const grandTotal = processedOrcamento.reduce((acc, item) => item.pai === null ? acc + item.totalNivel : acc, 0);

        return {
            grandTotalValue: grandTotal,
            grandTotalMaterial: materialTotal,
            grandTotalMaoDeObra: moTotal,
        };
    }, [processedOrcamento]);

    return {
        processedOrcamento,
        grandTotalValue,
        grandTotalMaterial,
        grandTotalMaoDeObra
    };
};
