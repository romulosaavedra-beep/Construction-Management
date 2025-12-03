import React, { useState } from 'react';
import { PageHeader } from './page-header';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Briefcase, CirclePlus, Trash2, LucideIcon, FileSpreadsheet } from "lucide-react";
import { useProjectContext } from '@/contexts/project-context';
import { useBudgets } from '@/hooks/useBudgets';
import { useConfirm } from '@/utils/useConfirm';
import toast from 'react-hot-toast';

interface ModuleHeaderProps {
    title: string;
    subtitle: string;
    icon?: LucideIcon;
    showBudgetSelector?: boolean;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
    title,
    subtitle,
    icon,
    showBudgetSelector = true
}) => {
    const { selectedProjectId, setSelectedProjectId, projects, createProject, deleteProject } = useProjectContext();
    const { budgets, activeBudget, setActiveBudget, createBudget, deleteBudget } = useBudgets(selectedProjectId);

    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');

    const [isCreatingBudget, setIsCreatingBudget] = useState(false);
    const [newBudgetName, setNewBudgetName] = useState('');
    const [newBudgetDescription, setNewBudgetDescription] = useState('');

    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    // ==================== PROJECT HANDLERS ====================
    const handleCreateProject = async () => {
        if (!newProjectName.trim()) {
            toast.error("O nome do projeto é obrigatório.");
            return;
        }
        const newProject = await createProject(newProjectName);
        if (newProject) {
            setSelectedProjectId(newProject.id);
            setIsCreatingProject(false);
            setNewProjectName('');
            toast.success("Projeto criado com sucesso!");
        }
    };

    const handleDeleteProject = async () => {
        if (!selectedProjectId) return;

        const shouldDelete = await confirm({
            title: 'Excluir Projeto',
            message: 'Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita e todos os dados vinculados (orçamentos, configurações, etc.) serão perdidos.',
            confirmText: 'Excluir Projeto',
            cancelText: 'Cancelar'
        });

        if (shouldDelete) {
            const success = await deleteProject(selectedProjectId);
            if (success) {
                toast.success("Projeto excluído com sucesso.");
                if (projects.length > 1) {
                    const nextProject = projects.find(p => p.id !== selectedProjectId);
                    setSelectedProjectId(nextProject?.id);
                } else {
                    setSelectedProjectId(undefined);
                }
            }
        }
    };

    // ==================== BUDGET HANDLERS ====================
    const handleCreateBudget = async () => {
        if (!selectedProjectId) {
            toast.error("Selecione um projeto primeiro.");
            return;
        }
        if (!newBudgetName.trim()) {
            toast.error("O nome do orçamento é obrigatório.");
            return;
        }

        const newBudget = await createBudget(selectedProjectId, newBudgetName, newBudgetDescription);
        if (newBudget) {
            setActiveBudget(newBudget);
            setIsCreatingBudget(false);
            setNewBudgetName('');
            setNewBudgetDescription('');
            toast.success("Orçamento criado com sucesso!");
        }
    };

    const handleDeleteBudget = async () => {
        if (!activeBudget) return;

        const shouldDelete = await confirm({
            title: 'Excluir Orçamento',
            message: `Tem certeza que deseja excluir o orçamento "${activeBudget.name}"? Esta ação não pode ser desfeita e todos os itens do orçamento serão perdidos.`,
            confirmText: 'Excluir Orçamento',
            cancelText: 'Cancelar'
        });

        if (shouldDelete) {
            const success = await deleteBudget(activeBudget.id);
            if (success) {
                toast.success("Orçamento excluído com sucesso.");
                if (budgets.length > 1) {
                    const nextBudget = budgets.find(b => b.id !== activeBudget.id);
                    setActiveBudget(nextBudget || null);
                } else {
                    setActiveBudget(null);
                }
            }
        }
    };

    return (
        <TooltipProvider>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <PageHeader
                    icon={icon}
                    title={title}
                    subtitle={subtitle}
                />

                <div className="flex items-center gap-2 bg-[#1e2329] p-1.5 rounded-lg border border-[#3a3e45] shadow-sm">
                    {/* ==================== PROJETO SECTION ==================== */}
                    <div className="flex items-center gap-2 px-2">
                        <Briefcase className="w-4 h-4 text-[#a0a5b0]" />
                        <span className="text-sm font-medium text-[#a0a5b0]">Projeto:</span>
                    </div>

                    <Select value={selectedProjectId || ""} onValueChange={setSelectedProjectId}>
                        <SelectTrigger className="w-[200px] lg:w-[250px] h-8 bg-[#0f1419] border-[#3a3e45] text-white focus:ring-0 focus:ring-offset-0 focus:border-[#71767f]">
                            <SelectValue placeholder="Selecione um projeto" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e2329] border-[#3a3e45] text-white z-[100]">
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id} className="focus:bg-[#242830] focus:text-white cursor-pointer">
                                    {p.name}
                                </SelectItem>
                            ))}
                            {projects.length === 0 && <SelectItem value="none" disabled>Nenhum projeto</SelectItem>}
                        </SelectContent>
                    </Select>

                    {/* Botões de Ação do Projeto */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsCreatingProject(true)}
                                className="h-8 w-8 text-[#0084ff] hover:bg-[#0084ff]/10 hover:text-[#0084ff]"
                            >
                                <CirclePlus className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>Novo Projeto</p>
                        </TooltipContent>
                    </Tooltip>

                    {selectedProjectId && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleDeleteProject}
                                    className="h-8 w-8 text-red-400 hover:bg-red-400/10 hover:text-red-400"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p>Excluir Projeto</p>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {/* ==================== ORÇAMENTO SECTION ==================== */}
                    {showBudgetSelector && selectedProjectId && (
                        <>
                            <div className="w-px h-4 bg-[#3a3e45] mx-1" />

                            <div className="flex items-center gap-2 px-2">
                                <FileSpreadsheet className="w-4 h-4 text-[#a0a5b0]" />
                                <span className="text-sm font-medium text-[#a0a5b0]">Orçamento:</span>
                            </div>

                            <Select value={activeBudget?.id || ""} onValueChange={(id) => {
                                const budget = budgets.find(b => b.id === id);
                                if (budget) setActiveBudget(budget);
                            }}>
                                <SelectTrigger className="w-[200px] h-8 bg-[#0f1419] border-[#3a3e45] text-white focus:ring-0 focus:ring-offset-0 focus:border-[#71767f]">
                                    <SelectValue placeholder="Selecione um orçamento" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e2329] border-[#3a3e45] text-white z-[100]">
                                    {budgets.map(b => (
                                        <SelectItem key={b.id} value={b.id} className="focus:bg-[#242830] focus:text-white cursor-pointer">
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                    {budgets.length === 0 && <SelectItem value="none" disabled>Nenhum orçamento</SelectItem>}
                                </SelectContent>
                            </Select>

                            {/* Botões de Ação do Orçamento */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsCreatingBudget(true)}
                                        className="h-8 w-8 text-[#0084ff] hover:bg-[#0084ff]/10 hover:text-[#0084ff]"
                                    >
                                        <CirclePlus className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p>Novo Orçamento</p>
                                </TooltipContent>
                            </Tooltip>

                            {activeBudget && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleDeleteBudget}
                                            className="h-8 w-8 text-red-400 hover:bg-red-400/10 hover:text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p>Excluir Orçamento</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ==================== CREATE PROJECT MODAL ==================== */}
            <Dialog open={isCreatingProject} onOpenChange={setIsCreatingProject}>
                <DialogContent className="sm:max-w-[425px] bg-[#242830] border-[#3a3e45] text-[#e8eaed] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-[#0084ff]" />
                            Novo Projeto
                        </DialogTitle>
                        <DialogDescription className="text-[#a0a5b0]">
                            Crie um novo projeto para começar a gerenciar sua obra.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="projectName" className="text-sm font-medium text-[#e8eaed]">Nome do Projeto</Label>
                        <Input
                            id="projectName"
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                            placeholder="Ex: Edifício Horizon"
                            className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f]"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsCreatingProject(false)} className="text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45]">Cancelar</Button>
                        <Button onClick={handleCreateProject} className="bg-[#0084ff] hover:bg-[#0073e6] text-white shadow-lg shadow-blue-900/20">Criar Projeto</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ==================== CREATE BUDGET MODAL ==================== */}
            <Dialog open={isCreatingBudget} onOpenChange={setIsCreatingBudget}>
                <DialogContent className="sm:max-w-[425px] bg-[#242830] border-[#3a3e45] text-[#e8eaed] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-[#0084ff]" />
                            Novo Orçamento
                        </DialogTitle>
                        <DialogDescription className="text-[#a0a5b0]">
                            Crie um novo orçamento para o projeto selecionado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="budgetName" className="text-sm font-medium text-[#e8eaed]">Nome do Orçamento *</Label>
                            <Input
                                id="budgetName"
                                value={newBudgetName}
                                onChange={e => setNewBudgetName(e.target.value)}
                                placeholder="Ex: Orçamento Base 2024"
                                className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f]"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="budgetDescription" className="text-sm font-medium text-[#e8eaed]">Descrição (opcional)</Label>
                            <Input
                                id="budgetDescription"
                                value={newBudgetDescription}
                                onChange={e => setNewBudgetDescription(e.target.value)}
                                placeholder="Ex: Orçamento inicial aprovado pelo cliente"
                                className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f]"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateBudget()}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsCreatingBudget(false)} className="text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45]">Cancelar</Button>
                        <Button onClick={handleCreateBudget} className="bg-[#0084ff] hover:bg-[#0073e6] text-white shadow-lg shadow-blue-900/20">Criar Orçamento</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ==================== CONFIRMATION DIALOG ==================== */}
            <Dialog open={dialogState.isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent className="sm:max-w-[400px] bg-[#242830] border-[#3a3e45] text-[#e8eaed] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-400" />
                            {dialogState.title}
                        </DialogTitle>
                        <DialogDescription className="text-[#a0a5b0] pt-2">
                            {dialogState.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="ghost" onClick={handleCancel} className="text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45]">{dialogState.cancelText || 'Cancelar'}</Button>
                        <Button variant="destructive" onClick={handleConfirm} className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/20">{dialogState.confirmText || 'Confirmar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
};
