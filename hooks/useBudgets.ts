import { useBudgetContext } from '../contexts/BudgetContext';

export const useBudgets = (projectId?: string) => {
    return useBudgetContext();
};
