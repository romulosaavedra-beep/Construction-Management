'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CirclePlus, Trash2, FileSpreadsheet } from 'lucide-react';
import { useProjectContext } from '@/contexts/project-context';
import { useBudgets } from '@/hooks/useBudgets';
import { useConfirm } from '@/utils/useConfirm';
import { toast } from 'sonner';

interface BudgetSelectorProps {
    onCreateClick: () => void;
}

export const BudgetSelector: React.FC<BudgetSelectorProps> = ({ onCreateClick }) => {
    const { selectedProjectId } = useProjectContext();
    const { budgets, activeBudget, setActiveBudget, deleteBudget } =
        useBudgets(selectedProjectId);
    const { confirm } = useConfirm();

    const handleDeleteBudget = async () => {
        if (!activeBudget) return;

        const shouldDelete = await confirm({
            title: 'Excluir Orçamento',
            message: `Tem certeza que deseja excluir o orçamento "${activeBudget.name}"? Todos os itens serão perdidos.`,
            confirmText: 'Excluir Orçamento',
            cancelText: 'Cancelar',
        });

        if (shouldDelete) {
            const success = await deleteBudget(activeBudget.id);
            if (success) {
                toast.success('Orçamento excluído com sucesso.');
                if (budgets.length > 1) {
                    const nextBudget = budgets.find((b) => b.id !== activeBudget.id);
                    setActiveBudget(nextBudget || null);
                } else {
                    setActiveBudget(null);
                }
            }
        }
    };

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2">
                <FileSpreadsheet className="w-4 h-4 text-secondary" />
                <span className="text-sm font-medium text-secondary">Orçamento:</span>
            </div>

            <Select
                value={activeBudget?.id || ''}
                onValueChange={(id) => {
                    const budget = budgets.find((b) => b.id === id);
                    if (budget) setActiveBudget(budget);
                }}
            >
                <SelectTrigger className="w-[200px] h-8">
                    <SelectValue placeholder="Selecione um orçamento" />
                </SelectTrigger>
                <SelectContent>
                    {budgets.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                            {b.name}
                        </SelectItem>
                    ))}
                    {budgets.length === 0 && (
                        <SelectItem value="none" disabled>
                            Nenhum orçamento
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onCreateClick}
                        className="h-8 w-8"
                    >
                        <CirclePlus className="w-4 h-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Novo Orçamento</TooltipContent>
            </Tooltip>

            {activeBudget && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDeleteBudget}
                            className="h-8 w-8 text-error hover:bg-error-bg"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Excluir Orçamento</TooltipContent>
                </Tooltip>
            )}
        </div>
    );
};
