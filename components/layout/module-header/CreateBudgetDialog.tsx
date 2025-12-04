'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FileSpreadsheet } from 'lucide-react';
import { useProjectContext } from '@/contexts/project-context';
import { useBudgets } from '@/hooks/useBudgets';
import { toast } from 'sonner';

interface CreateBudgetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const CreateBudgetDialog: React.FC<CreateBudgetDialogProps> = ({
    open,
    onOpenChange,
}) => {
    const [budgetName, setBudgetName] = useState('');
    const [budgetDescription, setBudgetDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const { selectedProjectId } = useProjectContext();
    const { createBudget, setActiveBudget } = useBudgets(selectedProjectId);

    const handleCreate = async () => {
        if (!selectedProjectId) {
            toast.error('Selecione um projeto primeiro.');
            return;
        }

        if (!budgetName.trim()) {
            toast.error('O nome do orçamento é obrigatório.');
            return;
        }

        try {
            setLoading(true);
            const newBudget = await createBudget(
                selectedProjectId,
                budgetName,
                budgetDescription
            );
            if (newBudget) {
                setActiveBudget(newBudget);
                setBudgetName('');
                setBudgetDescription('');
                onOpenChange(false);
                toast.success('Orçamento criado com sucesso!');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-[var(--ds-primary-500)]" />
                        Novo Orçamento
                    </DialogTitle>
                    <DialogDescription>
                        Crie um novo orçamento para o projeto selecionado.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label required>Nome do Orçamento</Label>
                        <Input
                            value={budgetName}
                            onChange={(e) => setBudgetName(e.target.value)}
                            placeholder="Ex: Orçamento Base 2024"
                            autoFocus
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Descrição (opcional)</Label>
                        <Input
                            value={budgetDescription}
                            onChange={(e) => setBudgetDescription(e.target.value)}
                            placeholder="Ex: Orçamento inicial aprovado pelo cliente"
                            disabled={loading}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleCreate}
                        disabled={loading || !budgetName.trim()}
                    >
                        {loading ? 'Criando...' : 'Criar Orçamento'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
