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
import { Briefcase } from 'lucide-react';
import { useProjectContext } from '@/contexts/project-context';
import { toast } from 'sonner';

interface CreateProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
    open,
    onOpenChange,
}) => {
    const [projectName, setProjectName] = useState('');
    const [loading, setLoading] = useState(false);

    const { createProject, setSelectedProjectId } = useProjectContext();

    const handleCreate = async () => {
        if (!projectName.trim()) {
            toast.error('O nome do projeto é obrigatório.');
            return;
        }

        try {
            setLoading(true);
            const newProject = await createProject(projectName);
            if (newProject) {
                setSelectedProjectId(newProject.id);
                setProjectName('');
                onOpenChange(false);
                toast.success('Projeto criado com sucesso!');
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
                        <Briefcase className="w-5 h-5 text-[var(--ds-primary-500)]" />
                        Novo Projeto
                    </DialogTitle>
                    <DialogDescription>
                        Crie um novo projeto para começar a gerenciar sua obra.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2">
                    <Label required>Nome do Projeto</Label>
                    <Input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Ex: Edifício Horizon"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        disabled={loading}
                    />
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleCreate}
                        disabled={loading || !projectName.trim()}
                    >
                        {loading ? 'Criando...' : 'Criar Projeto'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
