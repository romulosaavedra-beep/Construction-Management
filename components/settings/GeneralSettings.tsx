import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardHeader } from '../Card';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { useConfirm } from '../../utils/useConfirm';
import toast from 'react-hot-toast';

interface GeneralSettingsProps {
    settings: GeneralSettingsData;
    onUpdate: (settings: GeneralSettingsData) => void;
    onSave: (updatedSettings: GeneralSettingsData) => Promise<void>;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onUpdate, onSave }) => {
    // Edit Mode States
    const [isEditing, setIsEditing] = useState(false);
    const [originalSettings, setOriginalSettings] = useState<GeneralSettingsData | null>(null);
    const [localSettings, setLocalSettings] = useState<GeneralSettingsData>(settings);
    const [history, setHistory] = useState<GeneralSettingsData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Address states
    const [isLoadingCEP, setIsLoadingCEP] = useState(false);
    const [cepError, setCepError] = useState('');
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [streetSuggestions, setStreetSuggestions] = useState<ViaCEPResponse[]>([]);
    const [showStreetSuggestions, setShowStreetSuggestions] = useState(false);
    const [isLoadingStreets, setIsLoadingStreets] = useState(false);
    const [streetCandidates, setStreetCandidates] = useState<ViaCEPResponse[]>([]);

    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    // Sync local settings with props when not editing
    useEffect(() => {
        if (!isEditing) {
            setLocalSettings(settings);
        }
    }, [settings, isEditing]);

    const updateSettings = useCallback((updater: React.SetStateAction<GeneralSettingsData>) => {
        setLocalSettings(currentData => {
            const newData = typeof updater === 'function' ? updater(currentData) : updater;
            const newDataCopy = JSON.parse(JSON.stringify(newData));
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(newDataCopy);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            return newData;
        });
    }, [history, historyIndex]);

    const handleEdit = () => {
        const deepCopy = JSON.parse(JSON.stringify(localSettings));
        setOriginalSettings(deepCopy);
        setHistory([deepCopy]);
        setHistoryIndex(0);
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            await onSave(localSettings);
            setIsEditing(false);
            setOriginalSettings(null);
            setHistory([]);
            setHistoryIndex(-1);
        } catch (error) {
            console.error(error);
        }
    };

    const handleExit = async () => {
        const confirmExit = await confirm({
            title: 'Confirmar Saída',
            message: 'Tem certeza que deseja sair sem salvar? Todas as alterações serão perdidas.',
            confirmText: 'Sair sem Salvar',
            cancelText: 'Cancelar'
        });

        if (!confirmExit) return;

        if (originalSettings) {
            setLocalSettings(originalSettings);
            onUpdate(originalSettings);
        }
        setIsEditing(false);
        setOriginalSettings(null);
        setHistory([]);
        setHistoryIndex(-1);
    };

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setLocalSettings(history[newIndex]);
        }
    }, [history, historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setLocalSettings(history[newIndex]);
        }
    }, [history, historyIndex]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isEditing) return;
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'z';
            const isRedo = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'y';

            if (isUndo) {
                e.preventDefault();
                handleUndo();
            } else if (isRedo) {
                e.preventDefault();
                handleRedo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEditing, handleUndo, handleRedo]);

    const handleChange = (field: keyof GeneralSettingsData, value: any) => {
        updateSettings({ ...localSettings, [field]: value });
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

        if (!newCep) {
            updateSettings({
                ...localSettings,
                cep: '',
                estado: '',
                cidade: '',
                bairro: '',
                logradouro: '',
                numero: '',
                complemento: ''
            });
            setAvailableCities([]);
            setStreetSuggestions([]);
            return;
        }

        if (newCep.replace(/\D/g, '').length === 8) {
            setIsLoadingCEP(true);
            try {
                const data = await fetchAddressByCEP(newCep);
                if (data) {
                    updateSettings({
                        ...localSettings,
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
        updateSettings({ ...localSettings, estado: uf, cidade: '', bairro: '', logradouro: '', cep: '', numero: '' });
        setAvailableCities([]); setStreetCandidates([]);
        if (uf) await loadCitiesForUF(uf);
    };

    const handleCityChange = (cidade: string) => {
        updateSettings({ ...localSettings, cidade: cidade, bairro: '', logradouro: '', cep: '', numero: '' });
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
        if (localSettings.estado && localSettings.cidade && val.length >= 3) {
            debouncedStreetSearch(localSettings.estado, localSettings.cidade, val);
        } else { setShowStreetSuggestions(false); }
    };

    const handleSelectStreetSuggestion = (item: ViaCEPResponse) => {
        const candidates = streetSuggestions.filter(s => s.logradouro === item.logradouro && s.bairro === item.bairro);
        setStreetCandidates(candidates);
        updateSettings({ ...localSettings, logradouro: item.logradouro, bairro: item.bairro, cep: '', complemento: '' });
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
        if (localSettings.estado && availableCities.length === 0) {
            loadCitiesForUF(localSettings.estado);
        }
    }, [localSettings.estado]);

    return (
        <div>
            <div className="flex justify-end gap-1 mb-4">
                {isEditing ? (
                    <>
                        <Button variant="default" onClick={handleSave} className="bg-[#0084ff] hover:bg-[#0073e6] text-white">💾 Salvar</Button>
                        <Button variant="secondary" onClick={handleExit}>Sair sem Salvar</Button>
                        <Button size="sm" variant="secondary" onClick={handleUndo} disabled={!canUndo} title="Desfazer (Ctrl+Z)">↩️</Button>
                        <Button size="sm" variant="secondary" onClick={handleRedo} disabled={!canRedo} title="Refazer (Ctrl+Y)">↪️</Button>
                    </>
                ) : (
                    <Button onClick={handleEdit}>✏️ Editar</Button>
                )}
            </div>
            <Card>
                <CardHeader title="🏗️ Informações da Obra" />
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Nome da Obra</label>
                            <input type="text" value={localSettings.nomeObra} onChange={e => handleChange('nomeObra', e.target.value)} disabled={!isEditing} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed" placeholder="Ex: Edifício Residencial Jardim Botânico" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Empresa Executora</label>
                            <input type="text" value={localSettings.empresa} onChange={e => handleChange('empresa', e.target.value)} disabled={!isEditing} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed" placeholder="Ex: Construtora Silva & Cia" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">CNPJ/CPF da Empresa</label>
                            <input type="text" value={localSettings.empresaCNPJ} onChange={e => handleChange('empresaCNPJ', maskCNPJCPF(e.target.value))} disabled={!isEditing} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed" placeholder="12.345.678/0001-99" maxLength={18} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Cliente</label>
                            <input type="text" value={localSettings.cliente} onChange={e => handleChange('cliente', e.target.value)} disabled={!isEditing} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed" placeholder="Ex: Maria Oliveira Investimentos" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">CNPJ/CPF do Cliente</label>
                            <input type="text" value={localSettings.clienteCNPJ} onChange={e => handleChange('clienteCNPJ', maskCNPJCPF(e.target.value))} disabled={!isEditing} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed" placeholder="123.456.789-01" maxLength={18} />
                        </div>
                    </div>
                    <hr className="border-[#3a3e45]" />
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-[#e8eaed] mb-2">Localização da Obra</h4>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">CEP</label>
                                <div className="relative">
                                    <input type="text" value={localSettings.cep} onChange={handleCEPChange} disabled={!isEditing} placeholder="00000-000" maxLength={9} className={`w-full bg-[#1e2329] border ${cepError ? 'border-red-500' : 'border-[#3a3e45]'} rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed`} />
                                    {isLoadingCEP && <div className="absolute right-3 top-2.5 text-xs text-[#0084ff]">...</div>}
                                </div>
                                {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
                            </div>
                            <div className="md:col-span-2">
                                <SearchableDropdown label="UF" options={BRAZILIAN_STATES} value={localSettings.estado} onChange={handleUFChange} placeholder="UF" required disabled={!isEditing} />
                            </div>
                            <div className="md:col-span-4">
                                <SearchableDropdown label="Cidade" options={availableCities} value={localSettings.cidade} onChange={handleCityChange} placeholder={isLoadingCities ? "Carregando..." : "Selecione a cidade"} disabled={!isEditing || !localSettings.estado || isLoadingCities} required />
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-sm font-medium mb-1">Bairro</label>
                                <input type="text" value={localSettings.bairro} readOnly disabled className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 outline-none text-sm opacity-60 cursor-not-allowed" placeholder="Automático..." />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-6 relative">
                                <label className="block text-sm font-medium mb-1">Logradouro <span className="text-red-500">*</span></label>
                                <input type="text" value={localSettings.logradouro} onChange={e => handleLogradouroChange(e.target.value)} disabled={!isEditing || !localSettings.cidade} placeholder={!localSettings.cidade ? "Selecione a cidade primeiro" : "Digite o nome da rua..."} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed" autoComplete="off" />
                                {isLoadingStreets && <div className="absolute right-3 top-9 text-xs text-[#a0a5b0]">Buscando...</div>}
                                {showStreetSuggestions && isEditing && (
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
                                <input type="text" value={localSettings.numero} onChange={e => handleNumberChange(e.target.value)} disabled={!isEditing} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed" placeholder="Ex: 1234" />
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-sm font-medium mb-1">Complemento</label>
                                <input type="text" value={localSettings.complemento} onChange={e => handleChange('complemento', e.target.value)} disabled={!isEditing} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed" placeholder="Ex: Bloco A, Sala 301" />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
            <Card>
                <CardHeader title="Configurações Financeiras" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">% Impostos</label>
                        <input type="number" value={localSettings.impostos} onChange={e => handleChange('impostos', parseFloat(e.target.value))} disabled={!isEditing} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none disabled:opacity-60 disabled:cursor-not-allowed" placeholder="Ex: 8.5" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">% Custos Indiretos</label>
                        <input type="number" value={localSettings.custosIndiretos} onChange={e => handleChange('custosIndiretos', parseFloat(e.target.value))} disabled={!isEditing} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none disabled:opacity-60 disabled:cursor-not-allowed" placeholder="Ex: 5.0" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">% BDI</label>
                        <input type="number" value={localSettings.bdi} onChange={e => handleChange('bdi', parseFloat(e.target.value))} disabled={!isEditing} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none disabled:opacity-60 disabled:cursor-not-allowed" placeholder="Ex: 25.0" />
                    </div>
                </div>
            </Card>

            {/* Confirm Dialog */}
            {dialogState.isOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2100] p-4">
                    <div className="bg-[#242830] rounded-lg shadow-2xl w-full max-w-md border border-[#3a3e45] p-6">
                        <h3 className="text-lg font-semibold text-white mb-2">{dialogState.title}</h3>
                        <p className="text-[#a0a5b0] mb-6">{dialogState.message}</p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={handleCancel}>{dialogState.cancelText || 'Cancelar'}</Button>
                            <Button variant="destructive" onClick={handleConfirm}>{dialogState.confirmText || 'Confirmar'}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
