import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardHeader } from '../Card';
import { Button } from '../Button';
import { SearchableDropdown } from '../SearchableDropdown';
import {
    fetchAddressByCEP,
    fetchCitiesByUF,
    fetchStreetsByAddress,
    maskCEP,
    debounce,
    ViaCEPResponse,
    BRAZILIAN_STATES
} from '../../services/AddressService';
import { maskCNPJCPF } from '../../utils/formatters';
import type { GeneralSettingsData } from '../../hooks/useSettings';

interface GeneralSettingsProps {
    settings: GeneralSettingsData;
    onUpdate: (settings: GeneralSettingsData) => void;
    onSave: () => Promise<void>;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onUpdate, onSave }) => {
    const [isLoadingCEP, setIsLoadingCEP] = useState(false);
    const [cepError, setCepError] = useState('');
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [streetSuggestions, setStreetSuggestions] = useState<ViaCEPResponse[]>([]);
    const [showStreetSuggestions, setShowStreetSuggestions] = useState(false);
    const [isLoadingStreets, setIsLoadingStreets] = useState(false);
    const [streetCandidates, setStreetCandidates] = useState<ViaCEPResponse[]>([]);

    // UX State
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [initialSettings, setInitialSettings] = useState<GeneralSettingsData>(settings);

    // Update initial settings when settings prop changes (e.g. loaded from DB or project switch)
    useEffect(() => {
        if (settings.id !== initialSettings.id || !initialSettings.id) {
            setInitialSettings(settings);
            setIsDirty(false);
        }
    }, [settings, initialSettings.id]);

    const handleUpdateWrapper = (newSettings: GeneralSettingsData) => {
        onUpdate(newSettings);
        const isChanged = JSON.stringify(newSettings) !== JSON.stringify(initialSettings);
        setIsDirty(isChanged);
    };

    const handleChange = (field: keyof GeneralSettingsData, value: any) => {
        handleUpdateWrapper({ ...settings, [field]: value });
    };

    const handleSave = async () => {
        setIsSaving(true);
        await onSave();
        setIsSaving(false);
        setInitialSettings(settings);
        setIsDirty(false);
    };

    const loadCitiesForUF = async (uf: string) => {
        setIsLoadingCities(true);
        try {
            const cities = await fetchCitiesByUF(uf);
            setAvailableCities(cities);
        } finally {
            setIsLoadingCities(false);
        }
    };

    const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCep = maskCEP(e.target.value);
        handleChange('cep', newCep);
        setCepError('');
        if (newCep.replace(/\D/g, '').length === 8) {
            setIsLoadingCEP(true);
            try {
                const data = await fetchAddressByCEP(newCep);
                if (data) {
                    handleUpdateWrapper({
                        ...settings,
                        cep: newCep,
                        estado: data.uf,
                        cidade: data.localidade,
                        bairro: data.bairro,
                        logradouro: data.logradouro
                    });
                    setStreetCandidates([]);
                    await loadCitiesForUF(data.uf);
                } else { setCepError('CEP não encontrado.'); }
            } catch (error) { setCepError('Erro ao buscar CEP.'); } finally { setIsLoadingCEP(false); }
        }
    };

    const handleUFChange = async (uf: string) => {
        handleUpdateWrapper({ ...settings, estado: uf, cidade: '', bairro: '', logradouro: '', cep: '', numero: '' });
        setAvailableCities([]); setStreetCandidates([]);
        if (uf) await loadCitiesForUF(uf);
    };

    const handleCityChange = (cidade: string) => {
        handleUpdateWrapper({ ...settings, cidade: cidade, bairro: '', logradouro: '', cep: '', numero: '' });
        setStreetCandidates([]);
    };

    const debouncedStreetSearch = useCallback(debounce(async (uf: string, cidade: string, termo: string) => {
        if (termo.length < 3) return;
        setIsLoadingStreets(true);
        try {
            const results = await fetchStreetsByAddress(uf, cidade, termo);
            setStreetSuggestions(results);
            setShowStreetSuggestions(results.length > 0);
        } finally { setIsLoadingStreets(false); }
    }, 500), []);

    const handleLogradouroChange = (val: string) => {
        handleChange('logradouro', val);
        if (settings.estado && settings.cidade && val.length >= 3) {
            debouncedStreetSearch(settings.estado, settings.cidade, val);
        } else { setShowStreetSuggestions(false); }
    };

    const handleSelectStreetSuggestion = (item: ViaCEPResponse) => {
        const candidates = streetSuggestions.filter(s => s.logradouro === item.logradouro && s.bairro === item.bairro);
        setStreetCandidates(candidates);
        handleUpdateWrapper({ ...settings, logradouro: item.logradouro, bairro: item.bairro, cep: '', complemento: '' });
        setShowStreetSuggestions(false);
    };

    const handleNumberChange = (val: string) => {
        handleChange('numero', val);
        if (streetCandidates.length === 0) return;
        let selectedCep = '';
        if (val.trim() === '') {
            const evenCandidate = streetCandidates.find(c => c.complemento.includes('par') && !c.complemento.includes('ímpar'));
            selectedCep = evenCandidate ? evenCandidate.cep : streetCandidates[0].cep;
        } else {
            const num = parseInt(val.replace(/\D/g, ''));
            if (!isNaN(num)) {
                const isEven = num % 2 === 0;
                const match = streetCandidates.find(c => {
                    const comp = c.complemento.toLowerCase();
                    if (isEven && comp.includes('lado par')) return true;
                    if (!isEven && comp.includes('lado ímpar')) return true;
                    return false;
                });
                selectedCep = match ? match.cep : streetCandidates[0].cep;
            } else { selectedCep = streetCandidates[0].cep; }
        }
        if (selectedCep) handleChange('cep', selectedCep);
    };

    const getUniqueSuggestions = () => {
        const seen = new Set();
        return streetSuggestions.filter(item => {
            const key = `${item.logradouro}|${item.bairro}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    // Load cities on mount if UF is present
    useEffect(() => {
        if (settings.estado && availableCities.length === 0) {
            loadCitiesForUF(settings.estado);
        }
    }, [settings.estado]);

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className={`transition-all duration-300 ${isDirty ? 'opacity-100' : 'opacity-50 cursor-not-allowed'}`}
                >
                    {isSaving ? 'Salvando...' : isDirty ? '💾 Salvar Configurações Gerais' : 'Salvo'}
                </Button>
            </div>
            <Card>
                <CardHeader title="🏗️ Informações da Obra" />
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Nome da Obra</label>
                            <input type="text" value={settings.nomeObra} onChange={e => handleChange('nomeObra', e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" placeholder="Ex: Edifício Residencial Jardim Botânico" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Empresa Executora</label>
                            <input type="text" value={settings.empresa} onChange={e => handleChange('empresa', e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" placeholder="Ex: Construtora Silva & Cia" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">CNPJ/CPF da Empresa</label>
                            <input type="text" value={settings.empresaCNPJ} onChange={e => handleChange('empresaCNPJ', maskCNPJCPF(e.target.value))} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" placeholder="12.345.678/0001-99" maxLength={18} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Cliente</label>
                            <input type="text" value={settings.cliente} onChange={e => handleChange('cliente', e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" placeholder="Ex: Maria Oliveira Investimentos" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">CNPJ/CPF do Cliente</label>
                            <input type="text" value={settings.clienteCNPJ} onChange={e => handleChange('clienteCNPJ', maskCNPJCPF(e.target.value))} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" placeholder="123.456.789-01" maxLength={18} />
                        </div>
                    </div>
                    <hr className="border-[#3a3e45]" />
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-[#e8eaed] mb-2">Localização da Obra</h4>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">CEP</label>
                                <div className="relative">
                                    <input type="text" value={settings.cep} onChange={handleCEPChange} placeholder="00000-000" maxLength={9} className={`w-full bg-[#1e2329] border ${cepError ? 'border-red-500' : 'border-[#3a3e45]'} rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm`} />
                                    {isLoadingCEP && <div className="absolute right-3 top-2.5 text-xs text-[#0084ff]">...</div>}
                                </div>
                                {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
                            </div>
                            <div className="md:col-span-2">
                                <SearchableDropdown label="UF" options={BRAZILIAN_STATES} value={settings.estado} onChange={handleUFChange} placeholder="UF" required />
                            </div>
                            <div className="md:col-span-4">
                                <SearchableDropdown label="Cidade" options={availableCities} value={settings.cidade} onChange={handleCityChange} placeholder={isLoadingCities ? "Carregando..." : "Selecione a cidade"} disabled={!settings.estado || isLoadingCities} required />
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-sm font-medium mb-1">Bairro</label>
                                <input type="text" value={settings.bairro} readOnly disabled className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 outline-none text-sm opacity-60 cursor-not-allowed" placeholder="Automático..." />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-6 relative">
                                <label className="block text-sm font-medium mb-1">Logradouro <span className="text-red-500">*</span></label>
                                <input type="text" value={settings.logradouro} onChange={e => handleLogradouroChange(e.target.value)} disabled={!settings.cidade} placeholder={!settings.cidade ? "Selecione a cidade primeiro" : "Digite o nome da rua..."} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" autoComplete="off" />
                                {isLoadingStreets && <div className="absolute right-3 top-9 text-xs text-[#a0a5b0]">Buscando...</div>}
                                {showStreetSuggestions && (
                                    <div className="absolute z-50 w-full bg-[#242830] border border-[#3a3e45] rounded-md mt-1 shadow-xl max-h-60 overflow-y-auto">
                                        {getUniqueSuggestions().map((item: any, idx) => (
                                            <div key={idx} onClick={() => handleSelectStreetSuggestion(item)} className="p-3 hover:bg-[#3a3e45] cursor-pointer border-b border-[#3a3e45] last:border-0">
                                                <p className="text-sm text-white font-medium">{item.logradouro}</p>
                                                <p className="text-xs text-[#a0a5b0]">{item.bairro}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Número</label>
                                <input type="text" value={settings.numero} onChange={e => handleNumberChange(e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" placeholder="Ex: 1234" />
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-sm font-medium mb-1">Complemento</label>
                                <input type="text" value={settings.complemento} onChange={e => handleChange('complemento', e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" placeholder="Ex: Bloco A, Sala 301" />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
            <Card>
                <CardHeader title="📅 Calendário" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Jornada</label>
                        <select value={settings.scheduleType} onChange={e => handleChange('scheduleType', e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm">
                            <option value="mon_fri">Segunda a Sexta</option>
                            <option value="mon_sat_half">Segunda a Sábado (Meio)</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-3 pt-6">
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={settings.workOnHolidays} onChange={e => handleChange('workOnHolidays', e.target.checked)} className="w-5 h-5 bg-[#1e2329] border border-[#3a3e45] rounded" />
                            <label className="text-sm">Trabalhar em Feriados</label>
                        </div>
                    </div>
                </div>
            </Card>
            <Card>
                <CardHeader title="Configurações Financeiras" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">% Impostos</label>
                        <input type="number" value={settings.impostos} onChange={e => handleChange('impostos', parseFloat(e.target.value))} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none" placeholder="Ex: 8.5" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">% Custos Indiretos</label>
                        <input type="number" value={settings.custosIndiretos} onChange={e => handleChange('custosIndiretos', parseFloat(e.target.value))} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none" placeholder="Ex: 5.0" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">% BDI</label>
                        <input type="number" value={settings.bdi} onChange={e => handleChange('bdi', parseFloat(e.target.value))} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none" placeholder="Ex: 25.0" />
                    </div>
                </div>
            </Card>
        </div>
    );
};
