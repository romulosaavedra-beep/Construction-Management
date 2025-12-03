import { useBudgetContext } from '../contexts/budget-context';

export const useBudgets = (projectId?: string) => {
    return useBudgetContext();
};
