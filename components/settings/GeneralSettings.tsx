import React, { useState, useCallback, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { 
    Save, 
    Pencil, 
    Undo2, 
    Redo2, 
    X, 
    Building2, 
    MapPin, 
    DollarSign,
    AlertTriangle
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

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
            title: 'Descartar Alterações',
            message: 'Tem certeza que deseja sair sem salvar? Todas as alterações serão perdidas.',
            confirmText: 'Sair sem Salvar',
            cancelText: 'Continuar Editando'
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
        let updates: Partial<GeneralSettingsData> = { numero: val };

        if (streetCandidates.length > 0) {
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
                } else { 
                    selectedCep = streetCandidates[0].cep; 
                }
            }
            
            if (selectedCep) {
                updates.cep = selectedCep;
            }
        }
        updateSettings(prev => ({ ...prev, ...updates }));
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

    useEffect(() => {
        if (localSettings.estado && availableCities.length === 0) {
            loadCitiesForUF(localSettings.estado);
        }
    }, [localSettings.estado]);

    const inputClass = "h-10 bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f] disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <TooltipProvider>
            <div className="space-y-6">
                {/* CARD ÚNICO UNIFICADO */}
                <Card className="bg-[#1e2329] border-[#3a3e45] shadow-sm">
                    {/* HEADER COM BOTÕES DE AÇÃO */}
                    <CardHeader className="border-b border-[#3a3e45] pb-4 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-[#0084ff]" />
                            Informações da Obra
                        </CardTitle>

                        {/* BOTÕES MOVIDOS PARA DENTRO DO HEADER */}
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <div className="flex items-center gap-1 mr-2 bg-[#0f1419] p-1 rounded-lg border border-[#3a3e45]">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                {/* CORREÇÃO AQUI: hover:bg-[#3a3e45] para não ficar branco */}
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    onClick={handleUndo} 
                                                    disabled={!canUndo} 
                                                    className="h-7 w-7 text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45]"
                                                >
                                                    <Undo2 className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">Desfazer (Ctrl+Z)</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                {/* CORREÇÃO AQUI: hover:bg-[#3a3e45] para não ficar branco */}
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    onClick={handleRedo} 
                                                    disabled={!canRedo} 
                                                    className="h-7 w-7 text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45]"
                                                >
                                                    <Redo2 className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">Refazer (Ctrl+Y)</TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Button variant="ghost" onClick={handleExit} className="text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45] h-9">
                                        <X className="w-4 h-4 mr-2" /> Cancelar
                                    </Button>
                                    <Button onClick={handleSave} className="bg-[#0084ff] hover:bg-[#0073e6] text-white shadow-lg shadow-blue-900/20 h-9">
                                        <Save className="w-4 h-4 mr-2" /> Salvar
                                    </Button>
                                </>
                            ) : (
                                <Button onClick={handleEdit} className="bg-[#242830] border border-[#3a3e45] hover:bg-[#2f343d] text-white h-9">
                                    <Pencil className="w-4 h-4 mr-2" /> Editar Informações
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6 space-y-6">
                        {/* BLOCO 1: DADOS BÁSICOS */}
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-[#e8eaed]">Nome da Obra</Label>
                                <Input 
                                    value={localSettings.nomeObra} 
                                    onChange={e => handleChange('nomeObra', e.target.value)} 
                                    disabled={!isEditing} 
                                    className={inputClass}
                                    placeholder="Ex: Edifício Residencial Jardim Botânico" 
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-[#e8eaed]">Empresa Executora</Label>
                                <Input 
                                    value={localSettings.empresa} 
                                    onChange={e => handleChange('empresa', e.target.value)} 
                                    disabled={!isEditing} 
                                    className={inputClass}
                                    placeholder="Ex: Construtora Silva & Cia" 
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-[#e8eaed]">CNPJ/CPF da Empresa</Label>
                                <Input 
                                    value={localSettings.empresaCNPJ} 
                                    onChange={e => handleChange('empresaCNPJ', maskCNPJCPF(e.target.value))} 
                                    disabled={!isEditing} 
                                    className={inputClass}
                                    placeholder="12.345.678/0001-99" 
                                    maxLength={18} 
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-[#e8eaed]">Cliente</Label>
                                <Input 
                                    value={localSettings.cliente} 
                                    onChange={e => handleChange('cliente', e.target.value)} 
                                    disabled={!isEditing} 
                                    className={inputClass}
                                    placeholder="Ex: Maria Oliveira Investimentos" 
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-[#e8eaed]">CNPJ/CPF do Cliente</Label>
                                <Input 
                                    value={localSettings.clienteCNPJ} 
                                    onChange={e => handleChange('clienteCNPJ', maskCNPJCPF(e.target.value))} 
                                    disabled={!isEditing} 
                                    className={inputClass}
                                    placeholder="123.456.789-01" 
                                    maxLength={18} 
                                />
                            </div>
                        </div>

                        {/* DIVISOR: LOCALIZAÇÃO */}
                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-[#3a3e45]" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#1e2329] px-2 text-[#a0a5b0] font-medium flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Localização
                                </span>
                            </div>
                        </div>

                        {/* BLOCO 2: ENDEREÇO */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[#e8eaed]">CEP</Label>
                                    <div className="relative">
                                        <Input 
                                            value={localSettings.cep} 
                                            onChange={handleCEPChange} 
                                            disabled={!isEditing} 
                                            placeholder="00000-000" 
                                            maxLength={9} 
                                            className={`${inputClass} ${cepError ? 'border-red-500 focus-visible:border-red-500' : ''}`} 
                                        />
                                        {isLoadingCEP && <div className="absolute right-3 top-2.5 text-xs text-[#0084ff] animate-pulse">...</div>}
                                    </div>
                                    {cepError && <p className="text-xs text-red-500">{cepError}</p>}
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[#e8eaed]">UF <span className="text-red-500">*</span></Label>
                                    <SearchableDropdown 
                                        options={BRAZILIAN_STATES} 
                                        value={localSettings.estado} 
                                        onChange={handleUFChange} 
                                        placeholder="UF" 
                                        required 
                                        disabled={!isEditing}
                                        className="w-full" 
                                    />
                                </div>
                                <div className="md:col-span-4 space-y-2">
                                    <Label className="text-[#e8eaed]">Cidade <span className="text-red-500">*</span></Label>
                                    <SearchableDropdown 
                                        options={availableCities} 
                                        value={localSettings.cidade} 
                                        onChange={handleCityChange} 
                                        placeholder={isLoadingCities ? "Carregando..." : "Selecione a cidade"} 
                                        disabled={!isEditing || !localSettings.estado || isLoadingCities} 
                                        required 
                                        className="w-full"
                                    />
                                </div>
                                <div className="md:col-span-4 space-y-2">
                                    <Label className="text-[#e8eaed]">Bairro</Label>
                                    <Input 
                                        value={localSettings.bairro} 
                                        readOnly 
                                        disabled 
                                        className={`${inputClass} opacity-60 cursor-not-allowed`} 
                                        placeholder="Automático..." 
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-6 space-y-2 relative">
                                    <Label className="text-[#e8eaed]">Logradouro <span className="text-red-500">*</span></Label>
                                    <Input 
                                        value={localSettings.logradouro} 
                                        onChange={e => handleLogradouroChange(e.target.value)} 
                                        disabled={!isEditing || !localSettings.cidade} 
                                        placeholder={!localSettings.cidade ? "Selecione a cidade primeiro" : "Digite o nome da rua..."} 
                                        className={inputClass} 
                                        autoComplete="off" 
                                    />
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
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[#e8eaed]">Número</Label>
                                    <Input 
                                        value={localSettings.numero} 
                                        onChange={e => handleNumberChange(e.target.value)} 
                                        disabled={!isEditing} 
                                        className={inputClass} 
                                        placeholder="Ex: 1234" 
                                    />
                                </div>
                                <div className="md:col-span-4 space-y-2">
                                    <Label className="text-[#e8eaed]">Complemento</Label>
                                    <Input 
                                        value={localSettings.complemento} 
                                        onChange={e => handleChange('complemento', e.target.value)} 
                                        disabled={!isEditing} 
                                        className={inputClass} 
                                        placeholder="Ex: Bloco A, Sala 301" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* DIVISOR: FINANCEIRO */}
                        <div className="relative py-4 mt-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-[#3a3e45]" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#1e2329] px-2 text-[#a0a5b0] font-medium flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" /> Configurações Financeiras
                                </span>
                            </div>
                        </div>

                        {/* BLOCO 3: FINANCEIRO */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[#e8eaed]">% Impostos</Label>
                                <div className="relative">
                                    <Input 
                                        type="number" 
                                        value={localSettings.impostos} 
                                        onChange={e => handleChange('impostos', parseFloat(e.target.value))} 
                                        disabled={!isEditing} 
                                        className={`${inputClass} pr-8`} 
                                        placeholder="Ex: 8.5" 
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-[#a0a5b0]">%</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[#e8eaed]">% Custos Indiretos</Label>
                                <div className="relative">
                                    <Input 
                                        type="number" 
                                        value={localSettings.custosIndiretos} 
                                        onChange={e => handleChange('custosIndiretos', parseFloat(e.target.value))} 
                                        disabled={!isEditing} 
                                        className={`${inputClass} pr-8`} 
                                        placeholder="Ex: 5.0" 
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-[#a0a5b0]">%</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[#e8eaed]">% BDI</Label>
                                <div className="relative">
                                    <Input 
                                        type="number" 
                                        value={localSettings.bdi} 
                                        onChange={e => handleChange('bdi', parseFloat(e.target.value))} 
                                        disabled={!isEditing} 
                                        className={`${inputClass} pr-8`} 
                                        placeholder="Ex: 25.0" 
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-[#a0a5b0]">%</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Confirm Dialog */}
            <Dialog open={dialogState.isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent className="sm:max-w-[400px] bg-[#242830] border-[#3a3e45] text-[#e8eaed] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
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