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
import { Button } from '../components/Button';
import { useConfirm } from '../utils/useConfirm';
import type { GeneralSettingsData } from '../hooks/useSettings';

type SettingsTab = 'geral' | 'calendar' | 'profissionais' | 'fornecedores' | 'unidades_recursos';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('geral');
    const { projects, fetchProjects, createProject, deleteProject } = useProjects();
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

    // Update local settings when loaded
    useEffect(() => {
        if (settings.id && settings.id !== selectedProjectId) {
            setSelectedProjectId(settings.id);
        }
    }, [settings.id]);

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        const newProject = await createProject(newProjectName);
        if (newProject) {
            setSelectedProjectId(newProject.id);
            setIsCreatingProject(false);
            setNewProjectName('');
        }
    };

    const handleDeleteProject = async () => {
        if (!selectedProjectId) return;

        const shouldDelete = await confirm({
            title: 'Excluir Projeto',
            message: 'Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.',
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });

        if (shouldDelete) {
            const success = await deleteProject(selectedProjectId);
            if (success) {
                if (projects.length > 1) {
                    const nextProject = projects.find(p => p.id !== selectedProjectId);
                    setSelectedProjectId(nextProject?.id);
                } else {
                    setSelectedProjectId(undefined);
                }
            }
        }
    };

    const tabs: { id: SettingsTab; label: string }[] = [
        { id: 'geral', label: 'Geral' },
        { id: 'calendar', label: 'Calendário' },
        { id: 'profissionais', label: 'Profissionais' },
        { id: 'fornecedores', label: 'Fornecedores' },
        { id: 'unidades_recursos', label: 'Unidades e Recursos' }
    ];

    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-10 text-[#a0a5b0]">Carregando configurações...</div>;
        }

        switch (activeTab) {
            case 'geral':
                return (
                    <GeneralSettings
                        settings={settings}
                        onUpdate={setSettings}
                        onSave={async (updatedSettings: GeneralSettingsData) => {
                            setSettings(updatedSettings);
                            await saveSettings(updatedSettings);
                        }}
                    />
                );
            case 'calendar':
                return (
                    <CalendarSettings
                        settings={settings}
                        onUpdate={setSettings}
                        onSave={async (updatedSettings: GeneralSettingsData) => {
                            setSettings(updatedSettings);
                            await saveSettings(updatedSettings);
                        }}
                    />
                );
            case 'profissionais':
                return <ProfessionalsSettings projectId={settings.id} />;
            case 'fornecedores':
                return <SuppliersSettings projectId={settings.id} />;
            case 'unidades_recursos':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="w-full">
                            <UnitsSettings projectId={settings.id} />
                        </div>
                        <div className="w-full">
                            <ResourcesSettings projectId={settings.id} />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <PageHeader title="⚙️ CONFIGURAÇÕES" subtitle="Gerenciar dados mestres da obra" />

                <div className="flex items-center gap-1 bg-[#242830] p-2 rounded-lg border border-[#3a3e45]">
                    <span className="text-sm text-[#a0a5b0] whitespace-nowrap">Projeto:</span>
                    <select
                        value={selectedProjectId || ''}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="bg-[#1e2329] text-white text-sm border border-[#3a3e45] rounded px-2 py-1 outline-none focus:border-[#0084ff] min-w-[300px]"
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                        {projects.length === 0 && <option value="">Nenhum projeto</option>}
                    </select>
                    <Button variant="secondary" size="sm" onClick={() => setIsCreatingProject(true)} title="Novo Projeto">+</Button>
                    {selectedProjectId && <Button variant="danger" size="sm" onClick={handleDeleteProject} title="Excluir Projeto">🗑️</Button>}
                </div>
            </div>

            {isCreatingProject && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000] p-4">
                    <div className="bg-[#242830] rounded-lg p-6 w-full max-w-md border border-[#3a3e45]">
                        <h3 className="text-lg font-bold text-white mb-4">Novo Projeto</h3>
                        <input
                            type="text"
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                            placeholder="Nome do Projeto"
                            className="w-full bg-[#1e2329] border border-[#3a3e45] rounded p-2 mb-4 text-white focus:ring-2 focus:ring-[#0084ff] outline-none"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsCreatingProject(false)}>Cancelar</Button>
                            <Button variant="primary" onClick={handleCreateProject}>Criar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            {dialogState.isOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2100] p-4">
                    <div className="bg-[#242830] rounded-lg shadow-2xl w-full max-w-md border border-[#3a3e45] p-6">
                        <h3 className="text-lg font-semibold text-white mb-2">{dialogState.title}</h3>
                        <p className="text-[#a0a5b0] mb-6">{dialogState.message}</p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={handleCancel}>{dialogState.cancelText || 'Cancelar'}</Button>
                            <Button variant="danger" onClick={handleConfirm}>{dialogState.confirmText || 'Confirmar'}</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="border-b border-[#3a3e45] mb-6">
                <nav className="flex space-x-4 overflow-x-auto pb-1 custom-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'text-[#0084ff] border-b-2 border-[#0084ff]'
                                : 'text-[#a0a5b0] hover:text-white'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {renderContent()}
        </div>
    );
};

export default Settings;