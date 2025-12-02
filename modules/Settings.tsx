import React, { useState } from 'react';
import { ModuleHeader } from '../components/ModuleHeader';
import { GeneralSettings } from '../components/settings/GeneralSettings';
import { ProfessionalsSettings } from '../components/settings/ProfessionalsSettings';
import { SuppliersSettings } from '../components/settings/SuppliersSettings';
import { UnitsSettings } from '../components/settings/UnitsSettings';
import { ResourcesSettings } from '../components/settings/ResourcesSettings';
import { CalendarSettings } from '../components/settings/CalendarSettings';
import { useSettings } from '../hooks/useSettings';
import type { GeneralSettingsData } from '../hooks/useSettings';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Settings as SettingsIcon,
    Calendar,
    Users,
    Truck,
    Ruler
} from "lucide-react";

type SettingsTab = 'geral' | 'calendar' | 'profissionais' | 'fornecedores' | 'unidades_recursos';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>('geral');
    const { settings, loading, saveSettings, setSettings } = useSettings();

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
        <div className="space-y-6">
            {/* Header Section - Totalmente encapsulado no ModuleHeader */}
            <ModuleHeader
                title="Configurações"
                subtitle="Gerencie os dados mestres e parâmetros do sistema"
                icon={SettingsIcon}
            />

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
        </div>
    );
};

export default Settings;