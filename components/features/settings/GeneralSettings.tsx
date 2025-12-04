'use client';

import React, { useEffect, useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useProjectContext } from '@/contexts/project-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MapPin, Save, AlertCircle } from 'lucide-react';
import { geocodeAddress } from '@/utils/geocoding';

interface GeneralSettingsProps {
    projectId?: string;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ projectId }) => {
    const { selectedProjectId } = useProjectContext();
    const id = projectId || selectedProjectId;

    const { settings, loading, saveSettings, setSettings } = useSettings(id);
    const [isSaving, setIsSaving] = useState(false);
    const [geocodingLoading, setGeocodingLoading] = useState(false);

    // Handlers para cada campo
    const handleBasicInfoChange = (field: string, value: string | number) => {
        setSettings((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleLocationChange = (field: keyof typeof settings.location, value: string | number) => {
        setSettings((prev) => ({
            ...prev,
            location: {
                ...prev.location,
                [field]: value,
            },
        }));
    };

    const handleGeocodeAddress = async () => {
        try {
            setGeocodingLoading(true);
            const result = await geocodeAddress(
                settings.location.logradouro,
                settings.location.numero,
                settings.location.bairro,
                settings.location.cidade,
                settings.location.estado,
                settings.location.cep
            );

            if (result) {
                setSettings((prev) => ({
                    ...prev,
                    location: {
                        ...prev.location,
                        latitude: result.latitude,
                        longitude: result.longitude,
                    },
                }));
                toast.success('Coordenadas obtidas com sucesso!');
            } else {
                toast.error('Não foi possível geocodificar o endereço.');
            }
        } catch (error) {
            toast.error('Erro ao geocodificar endereço.');
            console.error(error);
        } finally {
            setGeocodingLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await saveSettings(settings);
            toast.success('Configurações salvas com sucesso!');
        } catch (error) {
            toast.error('Erro ao salvar configurações.');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin">⏳</div>
                <span className="ml-2 text-[var(--ds-text-secondary)]">Carregando...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Seção: Informações Básicas */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--ds-text-primary)]">Informações Básicas</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label required>Nome da Obra</Label>
                        <Input
                            value={settings.nomeObra}
                            onChange={(e) => handleBasicInfoChange('nomeObra', e.target.value)}
                            placeholder="Ex: Edifício Horizon"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Empresa</Label>
                        <Input
                            value={settings.empresa}
                            onChange={(e) => handleBasicInfoChange('empresa', e.target.value)}
                            placeholder="Ex: Saavedra Engenharia"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>CNPJ da Empresa</Label>
                        <Input
                            value={settings.empresaCNPJ}
                            onChange={(e) => handleBasicInfoChange('empresaCNPJ', e.target.value)}
                            placeholder="XX.XXX.XXX/XXXX-XX"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Cliente</Label>
                        <Input
                            value={settings.cliente}
                            onChange={(e) => handleBasicInfoChange('cliente', e.target.value)}
                            placeholder="Nome do cliente"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>CNPJ do Cliente</Label>
                        <Input
                            value={settings.clienteCNPJ}
                            onChange={(e) => handleBasicInfoChange('clienteCNPJ', e.target.value)}
                            placeholder="XX.XXX.XXX/XXXX-XX"
                        />
                    </div>
                </div>
            </section>

            {/* Seção: Endereço */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[var(--ds-primary-500)]" />
                    <h3 className="text-lg font-semibold text-[var(--ds-text-primary)]">Localização da Obra</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>CEP</Label>
                        <Input
                            value={settings.location.cep}
                            onChange={(e) => handleLocationChange('cep', e.target.value)}
                            placeholder="00000-000"
                            maxLength={9}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label required>Logradouro</Label>
                        <Input
                            value={settings.location.logradouro}
                            onChange={(e) => handleLocationChange('logradouro', e.target.value)}
                            placeholder="Ex: Rua das Flores"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Número</Label>
                        <Input
                            value={settings.location.numero}
                            onChange={(e) => handleLocationChange('numero', e.target.value)}
                            placeholder="Ex: 123"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Complemento</Label>
                        <Input
                            value={settings.location.complemento}
                            onChange={(e) => handleLocationChange('complemento', e.target.value)}
                            placeholder="Ex: Apto 45"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Bairro</Label>
                        <Input
                            value={settings.location.bairro}
                            onChange={(e) => handleLocationChange('bairro', e.target.value)}
                            placeholder="Ex: Centro"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label required>Cidade</Label>
                        <Input
                            value={settings.location.cidade}
                            onChange={(e) => handleLocationChange('cidade', e.target.value)}
                            placeholder="Ex: São Paulo"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label required>Estado</Label>
                        <Input
                            value={settings.location.estado}
                            onChange={(e) => handleLocationChange('estado', e.target.value)}
                            placeholder="Ex: SP"
                            maxLength={2}
                        />
                    </div>
                </div>

                {/* Seção: Coordenadas GPS */}
                <div className="mt-4 p-4 bg-[var(--ds-bg-surface)] rounded-lg border border-[var(--ds-border-default)]">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-[var(--ds-info)] flex-shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-3">
                            <p className="text-sm text-[var(--ds-text-secondary)]">
                                As coordenadas GPS são usadas para exibir o clima em tempo real. Clique no botão abaixo para obter
                                automaticamente as coordenadas do endereço.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Latitude</Label>
                                    <Input
                                        type="number"
                                        value={settings.location.latitude || ''}
                                        onChange={(e) =>
                                            handleLocationChange(
                                                'latitude',
                                                e.target.value ? parseFloat(e.target.value) : null
                                            )
                                        }
                                        placeholder="-23.5505"
                                        step="0.0001"
                                        disabled
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Longitude</Label>
                                    <Input
                                        type="number"
                                        value={settings.location.longitude || ''}
                                        onChange={(e) =>
                                            handleLocationChange(
                                                'longitude',
                                                e.target.value ? parseFloat(e.target.value) : null
                                            )
                                        }
                                        placeholder="-46.6333"
                                        step="0.0001"
                                        disabled
                                    />
                                </div>
                            </div>

                            <Button
                                variant="secondary"
                                onClick={handleGeocodeAddress}
                                disabled={!settings.location.logradouro || !settings.location.cidade || geocodingLoading}
                                className="w-full"
                            >
                                {geocodingLoading ? 'Geocodificando...' : 'Obter Coordenadas'}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Seção: Configurações Financeiras */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--ds-text-primary)]">Configurações Financeiras</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Impostos (%)</Label>
                        <Input
                            type="number"
                            value={settings.impostos}
                            onChange={(e) => handleBasicInfoChange('impostos', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            step="0.01"
                            min="0"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Custos Indiretos (%)</Label>
                        <Input
                            type="number"
                            value={settings.custosIndiretos}
                            onChange={(e) => handleBasicInfoChange('custosIndiretos', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            step="0.01"
                            min="0"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>BDI (%)</Label>
                        <Input
                            type="number"
                            value={settings.bdi}
                            onChange={(e) => handleBasicInfoChange('bdi', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            step="0.01"
                            min="0"
                        />
                    </div>
                </div>
            </section>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-6 border-t border-[var(--ds-border-default)]">
                <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
            </div>
        </div>
    );
};
