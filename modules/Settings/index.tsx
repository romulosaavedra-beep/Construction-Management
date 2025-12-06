import React, { useState } from 'react';
import { ModuleHeader } from '@/components/layout';
import { GeneralSettings } from './components/GeneralSettings';
import { ProfessionalsSettings } from './components/ProfessionalsSettings';
import { SuppliersSettings } from './components/SuppliersSettings';
import { UnitsSettings } from './components/UnitsSettings';
import { ResourcesSettings } from './components/ResourcesSettings';
import { CalendarSettings } from './components/CalendarSettings';
import { useSettings } from '@/hooks/useSettings';
import type { GeneralSettingsData } from '@/hooks/useSettings';
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
                <div className="flex flex-col items-center justify-center h-64 text-secondary animate-pulse gap-3">
                    <div className="h-8 w-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Carregando configurações...</span>
                </div>
            );
        }

        switch (activeTab) {
            case 'geral':
                return <GeneralSettings projectId={settings.id} />;
            case 'calendar':
                return <CalendarSettings projectId={settings.id} />;
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
                <TabsList className="w-full justify-start bg-surface border-b border-default rounded-t-lg rounded-b-none p-0 h-auto overflow-x-auto custom-scrollbar">
                    <TabsTrigger
                        value="geral"
                        className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent-500 data-[state=active]:text-accent-500 text-secondary hover:text-white rounded-none px-6 py-3 h-auto border-b-2 border-transparent transition-all"
                    >
                        <SettingsIcon className="w-4 h-4 mr-2" /> Geral
                    </TabsTrigger>
                    <TabsTrigger
                        value="calendar"
                        className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent-500 data-[state=active]:text-accent-500 text-secondary hover:text-white rounded-none px-6 py-3 h-auto border-b-2 border-transparent transition-all"
                    >
                        <Calendar className="w-4 h-4 mr-2" /> Calendário
                    </TabsTrigger>
                    <TabsTrigger
                        value="profissionais"
                        className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent-500 data-[state=active]:text-accent-500 text-secondary hover:text-white rounded-none px-6 py-3 h-auto border-b-2 border-transparent transition-all"
                    >
                        <Users className="w-4 h-4 mr-2" /> Profissionais
                    </TabsTrigger>
                    <TabsTrigger
                        value="fornecedores"
                        className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent-500 data-[state=active]:text-accent-500 text-secondary hover:text-white rounded-none px-6 py-3 h-auto border-b-2 border-transparent transition-all"
                    >
                        <Truck className="w-4 h-4 mr-2" /> Fornecedores
                    </TabsTrigger>
                    <TabsTrigger
                        value="unidades_recursos"
                        className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent-500 data-[state=active]:text-accent-500 text-secondary hover:text-white rounded-none px-6 py-3 h-auto border-b-2 border-transparent transition-all"
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