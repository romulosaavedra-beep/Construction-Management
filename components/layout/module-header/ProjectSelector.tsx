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
import { CirclePlus, Trash2, Briefcase } from 'lucide-react';
import { useProjectContext } from '@/contexts/project-context';
import { useConfirm } from '@/utils/useConfirm';
import { toast } from 'sonner';

interface ProjectSelectorProps {
    onCreateClick: () => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ onCreateClick }) => {
    const { selectedProjectId, setSelectedProjectId, projects, deleteProject } =
        useProjectContext();
    const { confirm } = useConfirm();

    const handleDeleteProject = async () => {
        if (!selectedProjectId) return;

        const shouldDelete = await confirm({
            title: 'Excluir Projeto',
            message:
                'Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita e todos os dados vinculados serão perdidos.',
            confirmText: 'Excluir Projeto',
            cancelText: 'Cancelar',
        });

        if (shouldDelete) {
            const success = await deleteProject(selectedProjectId);
            if (success) {
                toast.success('Projeto excluído com sucesso.');
                if (projects.length > 1) {
                    const nextProject = projects.find((p) => p.id !== selectedProjectId);
                    setSelectedProjectId(nextProject?.id);
                } else {
                    setSelectedProjectId(undefined);
                }
            }
        }
    };

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2">
                <Briefcase className="w-4 h-4 text-[var(--ds-text-secondary)]" />
                <span className="text-sm font-medium text-[var(--ds-text-secondary)]">Projeto:</span>
            </div>

            <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[200px] lg:w-[250px] h-8">
                    <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                    {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                            {p.name}
                        </SelectItem>
                    ))}
                    {projects.length === 0 && (
                        <SelectItem value="none" disabled>
                            Nenhum projeto
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
                <TooltipContent side="bottom">Novo Projeto</TooltipContent>
            </Tooltip>

            {selectedProjectId && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDeleteProject}
                            className="h-8 w-8 text-[var(--ds-error)] hover:bg-[var(--ds-error-bg)]"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Excluir Projeto</TooltipContent>
                </Tooltip>
            )}
        </div>
    );
};
