import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { GeneralSettings } from '../components/settings/GeneralSettings';
import { ProfessionalsSettings } from '../components/settings/ProfessionalsSettings';
import { SuppliersSettings } from '../components/settings/SuppliersSettings';
import { UnitsSettings } from '../components/settings/UnitsSettings';
import { ResourcesSettings } from '../components/settings/ResourcesSettings';
import { CalendarSettings } from '../components/settings/CalendarSettings';
import { useSettings } from '../hooks/useSettings';
import { useProjects } from '../hooks/useProjects';
import { useConfirm } from '../utils/useConfirm';
import type { GeneralSettingsData } from '../hooks/useSettings';

// UI Components (Shadcn & Lucide)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Settings as SettingsIcon,
    Calendar,
    Users,
    Truck,
    Ruler,
    CirclePlus,
    Trash2,
    Briefcase,
    FolderPlus
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import toast from 'react-hot-toast';

type SettingsTab = 'geral' | 'calendar' | 'profissionais' | 'fornecedores' | 'unidades_recursos';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>('geral');
    const { projects, createProject, deleteProject } = useProjects();
    const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
    const { settings, loading, saveSettings, setSettings } = useSettings(selectedProjectId);

    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    // Auto-select first project if none selected
    useEffect(() => {
        if (!selectedProjectId && projects.length > 0) {
            setSelectedProjectId(projects[0].id);
        }
    }, [projects, selectedProjectId]);

    // Sync settings ID when loaded
    useEffect(() => {
        if (settings.id && settings.id !== selectedProjectId) {
            setSelectedProjectId(settings.id);
        }
    }, [settings.id]);

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
            message: 'Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita e todos os dados vinculados serão perdidos.',
            confirmText: 'Excluir Projeto',
            cancelText: 'Cancelar'
        });

        if (shouldDelete) {
            const success = await deleteProject(selectedProjectId);
            if (success) {
                toast.success("Projeto excluído.");
                if (projects.length > 1) {
                    const nextProject = projects.find(p => p.id !== selectedProjectId);
                    setSelectedProjectId(nextProject?.id);
                } else {
                    setSelectedProjectId(undefined);
                }
            }
        }
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-[#a0a5b0] animate-pulse gap-3">
                    <div className="h-8 w-8 border-2 border-[#0084ff] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Carregando configurações...</span>
                </div>
            );
        }

        switch (activeTab) {
            case 'geral':
                return <GeneralSettings settings={settings} onUpdate={setSettings} onSave={async (s) => { setSettings(s); await saveSettings(s); }} />;
            case 'calendar':
                return <CalendarSettings settings={settings} onUpdate={setSettings} onSave={async (s) => { setSettings(s); await saveSettings(s); }} />;
            case 'profissionais':
                return <ProfessionalsSettings projectId={settings.id} />;
            case 'fornecedores':
                return <SuppliersSettings projectId={settings.id} />;
            case 'unidades_recursos':
                return (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <UnitsSettings projectId={settings.id} />
                        <ResourcesSettings projectId={settings.id} />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <TooltipProvider>
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <PageHeader
                        icon={SettingsIcon} // <--- Adicione esta linha
                        title="Configurações"
                        subtitle="Gerencie os dados mestres e parâmetros do sistema"
                    />

                    {/* Project Selector Bar */}
                    <div className="flex items-center gap-2 bg-[#1e2329] p-1.5 rounded-lg border border-[#3a3e45] shadow-sm">
                        <div className="flex items-center gap-2 px-2">
                            <Briefcase className="w-4 h-4 text-[#a0a5b0]" />
                            <span className="text-sm font-medium text-[#a0a5b0]">Projeto:</span>
                        </div>

                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                            {/* AJUSTE DE FOCO: Sem ring, borda cinza */}
                            <SelectTrigger className="w-[360px] h-8 bg-[#0f1419] border-[#3a3e45] text-white focus:ring-0 focus:ring-offset-0 focus:border-[#71767f]">
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

                        <div className="w-px h-4 bg-[#3a3e45] mx-1" />

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
                            <TooltipContent side="bottom" align="end">
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
                                <TooltipContent side="bottom" align="end">
                                    <p>Excluir Projeto Atual</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </div>

                {/* Tabs Navigation */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full justify-start bg-[#1e2329] border-b border-[#3a3e45] rounded-t-lg rounded-b-none p-0 h-auto overflow-x-auto custom-scrollbar">
                        <TabsTrigger
                            value="geral"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#0084ff] data-[state=active]:text-[#0084ff] text-[#a0a5b0] hover:text-white rounded-none px-6 py-3 h-auto border-b-2 border-transparent transition-all"
                        >
                            <SettingsIcon className="w-4 h-4 mr-2" /> Geral
                        </TabsTrigger>
                        <TabsTrigger
                            value="calendar"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#0084ff] data-[state=active]:text-[#0084ff] text-[#a0a5b0] hover:text-white rounded-none px-6 py-3 h-auto border-b-2 border-transparent transition-all"
                        >
                            <Calendar className="w-4 h-4 mr-2" /> Calendário
                        </TabsTrigger>
                        <TabsTrigger
                            value="profissionais"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#0084ff] data-[state=active]:text-[#0084ff] text-[#a0a5b0] hover:text-white rounded-none px-6 py-3 h-auto border-b-2 border-transparent transition-all"
                        >
                            <Users className="w-4 h-4 mr-2" /> Profissionais
                        </TabsTrigger>
                        <TabsTrigger
                            value="fornecedores"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#0084ff] data-[state=active]:text-[#0084ff] text-[#a0a5b0] hover:text-white rounded-none px-6 py-3 h-auto border-b-2 border-transparent transition-all"
                        >
                            <Truck className="w-4 h-4 mr-2" /> Fornecedores
                        </TabsTrigger>
                        <TabsTrigger
                            value="unidades_recursos"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#0084ff] data-[state=active]:text-[#0084ff] text-[#a0a5b0] hover:text-white rounded-none px-6 py-3 h-auto border-b-2 border-transparent transition-all"
                        >
                            <Ruler className="w-4 h-4 mr-2" /> Unidades e Recursos
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-6">
                        {renderContent()}
                    </div>
                </Tabs>

                {/* Create Project Modal */}
                <Dialog open={isCreatingProject} onOpenChange={setIsCreatingProject}>
                    <DialogContent className="sm:max-w-[425px] bg-[#242830] border-[#3a3e45] text-[#e8eaed] shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                                <FolderPlus className="w-5 h-5 text-[#0084ff]" />
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
                                // AJUSTE DE FOCO: Sem ring, borda cinza
                                className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f]"
                                autoFocus
                            />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" onClick={() => setIsCreatingProject(false)} className="text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45]">Cancelar</Button>
                            <Button onClick={handleCreateProject} className="bg-[#0084ff] hover:bg-[#0073e6] text-white shadow-lg shadow-blue-900/20">Criar Projeto</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Confirmation Dialog */}
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
            </div>
        </TooltipProvider>
    );
};

export default Settings;