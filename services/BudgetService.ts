
import type { OrcamentoItem } from '@/types';

const STORAGE_KEY = 'vobi-orcamento-data';

export const BudgetService = {
    /**
     * Loads budget data from local storage.
     */
    loadBudget: (): OrcamentoItem[] | null => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading budget:', error);
            return null;
        }
    },

    /**
     * Saves budget data to local storage.
     */
    saveBudget: (items: OrcamentoItem[]): void => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
            console.error('Error saving budget:', error);
        }
    },

    /**
     * Generates a unique ID for a new item.
     * Simple implementation: max(ids) + 1
     */
    generateNextId: (items: OrcamentoItem[]): number => {
        if (items.length === 0) return 1;
        return Math.max(...items.map(i => i.id)) + 1;
    },

    /**
     * Recalculates totals for the entire budget tree.
     * This ensures consistency between children and parents.
     */
    recalculateTotals: (items: OrcamentoItem[]): OrcamentoItem[] => {
        const itemMap = new Map<number, OrcamentoItem>();
        // Clone items to avoid mutation side effects on the input array
        const newItems = items.map(i => ({ ...i }));

        newItems.forEach(item => itemMap.set(item.id, item));

        // Helper to process a node
        const processNode = (itemId: number): { mat: number; mo: number; total: number } => {
            const item = itemMap.get(itemId);
            if (!item) return { mat: 0, mo: 0, total: 0 };

            const children = newItems.filter(child => child.pai === itemId);

            if (children.length === 0) {
                // Leaf node: calculate based on unit values
                const matTotal = item.quantidade * item.mat_unit;
                const moTotal = item.quantidade * item.mo_unit;
                return { mat: matTotal, mo: moTotal, total: matTotal + moTotal };
            } else {
                // Parent node: sum of children
                let sumMat = 0;
                let sumMo = 0;

                children.forEach(child => {
                    const childTotals = processNode(child.id);
                    sumMat += childTotals.mat;
                    sumMo += childTotals.mo;
                });

                // Update parent item values (optional: strictly speaking parents shouldn't have unit values if they are summaries, 
                // but we keep the structure flexible)
                // For display purposes, we might want to store these calculated totals in separate fields 
                // or just rely on the component to calculate them on the fly. 
                // However, for consistency, let's assume 'mat_unit' and 'mo_unit' on parents are derived or 0.

                // IMPORTANT: The current Orcamento.tsx logic calculates totals on the fly in `processedOrcamento`.
                // This service method is for "hard" recalculation if we want to persist the totals or validate data.
                // For now, we return the sums but don't mutate unit values of parents to avoid overwriting user intent if they typed something there.

                return { mat: sumMat, mo: sumMo, total: sumMat + sumMo };
            }
        };

        // Trigger calculation from roots
        newItems.filter(i => i.pai === null).forEach(root => processNode(root.id));

        return newItems;
    }
};
