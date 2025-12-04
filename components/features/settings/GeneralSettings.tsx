import React, { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableDropdown } from '@/components/widgets/searchable-dropdown';
import {
    fetchAddressByCEP,
    fetchCitiesByUF,
    fetchStreetsByAddress,
    maskCEP,
    debounce,
    ViaCEPResponse,
    BRAZILIAN_STATES
} from '@/services/AddressService';
import { maskCNPJCPF } from '@/utils/formatters';
import type { GeneralSettingsData } from '@/hooks/useSettings';
import { useConfirm } from '@/utils/useConfirm';
import {
    Save,
    Pencil,
    Undo2,
    Redo2,
    X,
    Building2,
    MapPin,
    DollarSign,
    AlertTriangle,
    Loader2
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

// ═══════════════════════════════════════════════════════════════════
// VALIDAÇÃO ZOD (Schema atualizado)
// ═══════════════════════════════════════════════════════════════════

const generalSettingsSchema = z.object({
    nomeObra: z.string().min(3, 'Nome da obra deve ter no mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
    empresa: z.string().min(3, 'Nome da empresa deve ter no mínimo 3 caracteres'),
    empresaCNPJ: z.string()
        .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CNPJ/CPF inválido')
        .optional()
        .or(z.literal('')),
    cliente: z.string().min(3, 'Nome do cliente deve ter no mínimo 3 caracteres'),
    clienteCNPJ: z.string()
        .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CNPJ/CPF inválido')
        .optional()
        .or(z.literal('')),
    cep: z.string().regex(/^\d{5}-\d{3}$/, 'CEP inválido').optional().or(z.literal('')),
    estado: z.string().min(2, 'Selecione um estado').max(2),
    cidade: z.string().min(2, 'Selecione uma cidade'),
    bairro: z.string(),
    logradouro: z.string().min(3, 'Logradouro obrigatório'),
    numero: z.string(),
    complemento: z.string().optional().or(z.literal('')),
    impostos: z.number().min(0, 'Valor não pode ser negativo').max(100, 'Máximo 100%'),
    custosIndiretos: z.number().min(0, 'Valor não pode ser negativo').max(100, 'Máximo 100%'),
    bdi: z.number().min(0, 'Valor não pode ser negativo').max(100, 'Máximo 100%'),
});

type FormData = z.infer<typeof generalSettingsSchema>;

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

interface GeneralSettingsProps {
    settings: GeneralSettingsData;
    onUpdate: (settings: GeneralSettingsData) => void;
    onSave: (updatedSettings: GeneralSettingsData) => Promise<void>;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onUpdate, onSave }) => {
    // ═══════════════════════════════════════════════════════════════
    // ESTADOS
    // ═══════════════════════════════════════════════════════════════
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [originalSettings, setOriginalSettings] = useState<GeneralSettingsData | null>(null);
    const [history, setHistory] = useState<FormData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Address states
    const [isLoadingCEP, setIsLoadingCEP] = useState(false);
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [streetSuggestions, setStreetSuggestions] = useState<ViaCEPResponse[]>([]);
    const [showStreetSuggestions, setShowStreetSuggestions] = useState(false);
    const [isLoadingStreets, setIsLoadingStreets] = useState(false);
    const [streetCandidates, setStreetCandidates] = useState<ViaCEPResponse[]>([]);

    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    // ═══════════════════════════════════════════════════════════════
    // REACT HOOK FORM + ZOD
    // ═══════════════════════════════════════════════════════════════
    const {
        control,
        handleSubmit,
        formState: { errors, isDirty },
        setValue,
        watch,
        reset,
        getValues
    } = useForm<FormData>({
        resolver: zodResolver(generalSettingsSchema),
        defaultValues: {
            nomeObra: settings.nomeObra || '',
            empresa: settings.empresa || '',
            empresaCNPJ: settings.empresaCNPJ || '',
            cliente: settings.cliente || '',
            clienteCNPJ: settings.clienteCNPJ || '',
            cep: settings.cep || '',
            estado: settings.estado || '',
            cidade: settings.cidade || '',
            bairro: settings.bairro || '',
            logradouro: settings.logradouro || '',
            numero: settings.numero || '',
            complemento: settings.complemento || '',
            impostos: settings.impostos || 0,
            custosIndiretos: settings.custosIndiretos || 0,
            bdi: settings.bdi || 0,
        },
        mode: 'onChange' // Validação em tempo real
    });

    // Watch para histórico manual (undo/redo)
    const formValues = watch();

    // ═══════════════════════════════════════════════════════════════
    // HISTÓRICO (UNDO/REDO)
    // ═══════════════════════════════════════════════════════════════
    const addToHistory = useCallback((data: FormData) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(data)));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            const previousState = history[newIndex];
            Object.keys(previousState).forEach((key) => {
                setValue(key as keyof FormData, previousState[key as keyof FormData], { shouldValidate: true });
            });
            toast.info('Alteração desfeita');
        }
    }, [history, historyIndex, setValue]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            const nextState = history[newIndex];
            Object.keys(nextState).forEach((key) => {
                setValue(key as keyof FormData, nextState[key as keyof FormData], { shouldValidate: true });
            });
            toast.info('Alteração refeita');
        }
    }, [history, historyIndex, setValue]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    // Keyboard shortcuts (Ctrl+Z / Ctrl+Y)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isEditing) return;
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'z' && !e.shiftKey;
            const isRedo = (isMac ? e.metaKey : e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey));

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

    // ═══════════════════════════════════════════════════════════════
    // EDIÇÃO E SALVAMENTO
    // ═══════════════════════════════════════════════════════════════
    const handleEdit = () => {
        const deepCopy = JSON.parse(JSON.stringify(getValues()));
        setOriginalSettings(settings);
        setHistory([deepCopy]);
        setHistoryIndex(0);
        setIsEditing(true);
        toast.info('Modo de edição ativado');
    };

    const onSubmit = async (data: FormData) => {
        setIsSaving(true);
        try {
            const updatedSettings: GeneralSettingsData = {
                ...settings,
                ...data
            };

            await onSave(updatedSettings);

            setIsEditing(false);
            setOriginalSettings(null);
            setHistory([]);
            setHistoryIndex(-1);

            toast.success('Configurações salvas com sucesso!', {
                description: 'Todas as alterações foram aplicadas.',
                duration: 4000,
            });
        } catch (error) {
            console.error('Erro ao salvar:', error);
            toast.error('Erro ao salvar configurações', {
                description: 'Tente novamente ou contate o suporte.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleExit = async () => {
        if (!isDirty) {
            setIsEditing(false);
            setOriginalSettings(null);
            setHistory([]);
            setHistoryIndex(-1);
            return;
        }

        const confirmExit = await confirm({
            title: 'Descartar Alterações',
            message: 'Existem alterações não salvas. Tem certeza que deseja sair sem salvar?',
            confirmText: 'Descartar',
            cancelText: 'Continuar Editando'
        });

        if (!confirmExit) return;

        if (originalSettings) {
            reset({
                nomeObra: originalSettings.nomeObra || '',
                empresa: originalSettings.empresa || '',
                empresaCNPJ: originalSettings.empresaCNPJ || '',
                cliente: originalSettings.cliente || '',
                clienteCNPJ: originalSettings.clienteCNPJ || '',
                cep: originalSettings.cep || '',
                estado: originalSettings.estado || '',
                cidade: originalSettings.cidade || '',
                bairro: originalSettings.bairro || '',
                logradouro: originalSettings.logradouro || '',
                numero: originalSettings.numero || '',
                complemento: originalSettings.complemento || '',
                impostos: originalSettings.impostos || 0,
                custosIndiretos: originalSettings.custosIndiretos || 0,
                bdi: originalSettings.bdi || 0,
            });
        }

        setIsEditing(false);
        setOriginalSettings(null);
        setHistory([]);
        setHistoryIndex(-1);

        toast.info('Alterações descartadas');
    };

    // ═══════════════════════════════════════════════════════════════
    // LÓGICA DE ENDEREÇO (CEP, UF, CIDADE, LOGRADOURO)
    // ═══════════════════════════════════════════════════════════════
    const loadCitiesForUF = async (uf: string) => {
        setIsLoadingCities(true);
        try {
            const cities = await fetchCitiesByUF(uf);
            setAvailableCities(cities);
        } finally {
            setIsLoadingCities(false);
        }
    };

    const handleCEPChange = async (cepValue: string) => {
        const maskedCep = maskCEP(cepValue);
        setValue('cep', maskedCep, { shouldValidate: true });
        addToHistory(getValues());

        if (!maskedCep) {
            setValue('estado', '');
            setValue('cidade', '');
            setValue('bairro', '');
            setValue('logradouro', '');
            setValue('numero', '');
            setValue('complemento', '');
            setAvailableCities([]);
            setStreetSuggestions([]);
            return;
        }

        if (maskedCep.replace(/\D/g, '').length === 8) {
            setIsLoadingCEP(true);
            try {
                const data = await fetchAddressByCEP(maskedCep);
                if (data) {
                    setValue('estado', data.uf, { shouldValidate: true });
                    setValue('cidade', data.localidade, { shouldValidate: true });
                    setValue('bairro', data.bairro, { shouldValidate: true });
                    setValue('logradouro', data.logradouro, { shouldValidate: true });
                    setStreetCandidates([]);
                    await loadCitiesForUF(data.uf);
                    toast.success('Endereço encontrado!');
                    addToHistory(getValues());
                } else {
                    toast.error('CEP não encontrado');
                }
            } catch (error) {
                toast.error('Erro ao buscar CEP');
            } finally {
                setIsLoadingCEP(false);
            }
        }
    };

    const handleUFChange = async (uf: string) => {
        setValue('estado', uf, { shouldValidate: true });
        setValue('cidade', '', { shouldValidate: true });
        setValue('bairro', '');
        setValue('logradouro', '');
        setValue('cep', '');
        setValue('numero', '');
        setAvailableCities([]);
        setStreetCandidates([]);

        if (uf) {
            await loadCitiesForUF(uf);
        }

        addToHistory(getValues());
    };

    const handleCityChange = (cidade: string) => {
        setValue('cidade', cidade, { shouldValidate: true });
        setValue('bairro', '');
        setValue('logradouro', '');
        setValue('cep', '');
        setValue('numero', '');
        setStreetCandidates([]);
        addToHistory(getValues());
    };

    const debouncedStreetSearch = useCallback(debounce(async (uf: string, cidade: string, termo: string) => {
        if (termo.length < 3) return;
        setIsLoadingStreets(true);
        try {
            const results = await fetchStreetsByAddress(uf, cidade, termo);
            setStreetSuggestions(results);
            setShowStreetSuggestions(results.length > 0);
        } finally {
            setIsLoadingStreets(false);
        }
    }, 500), []);

    const handleLogradouroChange = (val: string) => {
        setValue('logradouro', val, { shouldValidate: true });

        const currentUF = watch('estado');
        const currentCity = watch('cidade');

        if (currentUF && currentCity && val.length >= 3) {
            debouncedStreetSearch(currentUF, currentCity, val);
        } else {
            setShowStreetSuggestions(false);
        }

        addToHistory(getValues());
    };

    const handleSelectStreetSuggestion = (item: ViaCEPResponse) => {
        const candidates = streetSuggestions.filter(s => s.logradouro === item.logradouro && s.bairro === item.bairro);
        setStreetCandidates(candidates);
        setValue('logradouro', item.logradouro, { shouldValidate: true });
        setValue('bairro', item.bairro);
        setValue('cep', '');
        setValue('complemento', '');
        setShowStreetSuggestions(false);
        addToHistory(getValues());
    };

    const handleNumberChange = (val: string) => {
        setValue('numero', val);

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
                setValue('cep', selectedCep);
            }
        }

        addToHistory(getValues());
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

    // Load cities on UF change
    useEffect(() => {
        const currentUF = watch('estado');
        if (currentUF && availableCities.length === 0) {
            loadCitiesForUF(currentUF);
        }
    }, [watch('estado')]);

    // ═══════════════════════════════════════════════════════════════
    // ESTILOS
    // ═══════════════════════════════════════════════════════════════
    const inputClass = "h-10 bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f] disabled:opacity-50 disabled:cursor-not-allowed";
    const errorInputClass = "border-red-500 focus-visible:border-red-500";

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <TooltipProvider>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-6">
                    <Card className="bg-[#1e2329] border-[#3a3e45] shadow-sm">
                        {/* HEADER COM BOTÕES DE AÇÃO */}
                        <CardHeader className="border-b border-[#3a3e45] pb-4 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-[#0084ff]" />
                                Informações da Obra
                            </CardTitle>

                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <>
                                        {/* UNDO/REDO */}
                                        <div className="flex items-center gap-1 mr-2 bg-[#0f1419] p-1 rounded-lg border border-[#3a3e45]">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
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
                                                    <Button
                                                        type="button"
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
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={handleExit}
                                            className="text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45] h-9"
                                            disabled={isSaving}
                                        >
                                            <X className="w-4 h-4 mr-2" /> Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="bg-[#0084ff] hover:bg-[#0073e6] text-white shadow-lg shadow-blue-900/20 h-9"
                                            disabled={isSaving || !isDirty}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Salvando...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4 mr-2" /> Salvar
                                                </>
                                            )}
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={handleEdit}
                                        className="bg-[#242830] border border-[#3a3e45] hover:bg-[#2f343d] text-white h-9"
                                    >
                                        <Pencil className="w-4 h-4 mr-2" /> Editar Informações
                                    </Button>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="pt-6 space-y-6">
                            {/* BLOCO 1: DADOS BÁSICOS */}
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                                {/* Nome da Obra */}
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[#e8eaed]">Nome da Obra <span className="text-red-500">*</span></Label>
                                    <Controller
                                        name="nomeObra"
                                        control={control}
                                        render={({ field }) => (
                                            <>
                                                <Input
                                                    {...field}
                                                    disabled={!isEditing}
                                                    className={`${inputClass} ${errors.nomeObra ? errorInputClass : ''}`}
                                                    placeholder="Ex: Edifício Residencial Jardim Botânico"
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        addToHistory(getValues());
                                                    }}
                                                />
                                                {errors.nomeObra && (
                                                    <p className="text-xs text-red-500 mt-1">{errors.nomeObra.message}</p>
                                                )}
                                            </>
                                        )}
                                    />
                                </div>

                                {/* Empresa Executora */}
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[#e8eaed]">Empresa Executora <span className="text-red-500">*</span></Label>
                                    <Controller
                                        name="empresa"
                                        control={control}
                                        render={({ field }) => (
                                            <>
                                                <Input
                                                    {...field}
                                                    disabled={!isEditing}
                                                    className={`${inputClass} ${errors.empresa ? errorInputClass : ''}`}
                                                    placeholder="Ex: Construtora Silva & Cia"
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        addToHistory(getValues());
                                                    }}
                                                />
                                                {errors.empresa && (
                                                    <p className="text-xs text-red-500 mt-1">{errors.empresa.message}</p>
                                                )}
                                            </>
                                        )}
                                    />
                                </div>

                                {/* CNPJ Empresa */}
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[#e8eaed]">CNPJ/CPF da Empresa</Label>
                                    <Controller
                                        name="empresaCNPJ"
                                        control={control}
                                        render={({ field }) => (
                                            <>
                                                <Input
                                                    {...field}
                                                    disabled={!isEditing}
                                                    className={`${inputClass} ${errors.empresaCNPJ ? errorInputClass : ''}`}
                                                    placeholder="12.345.678/0001-99"
                                                    maxLength={18}
                                                    onChange={(e) => {
                                                        const masked = maskCNPJCPF(e.target.value);
                                                        field.onChange(masked);
                                                        addToHistory(getValues());
                                                    }}
                                                />
                                                {errors.empresaCNPJ && (
                                                    <p className="text-xs text-red-500 mt-1">{errors.empresaCNPJ.message}</p>
                                                )}
                                            </>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {/* Cliente */}
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[#e8eaed]">Cliente <span className="text-red-500">*</span></Label>
                                    <Controller
                                        name="cliente"
                                        control={control}
                                        render={({ field }) => (
                                            <>
                                                <Input
                                                    {...field}
                                                    disabled={!isEditing}
                                                    className={`${inputClass} ${errors.cliente ? errorInputClass : ''}`}
                                                    placeholder="Ex: Maria Oliveira Investimentos"
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        addToHistory(getValues());
                                                    }}
                                                />
                                                {errors.cliente && (
                                                    <p className="text-xs text-red-500 mt-1">{errors.cliente.message}</p>
                                                )}
                                            </>
                                        )}
                                    />
                                </div>

                                {/* CNPJ Cliente */}
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[#e8eaed]">CNPJ/CPF do Cliente</Label>
                                    <Controller
                                        name="clienteCNPJ"
                                        control={control}
                                        render={({ field }) => (
                                            <>
                                                <Input
                                                    {...field}
                                                    disabled={!isEditing}
                                                    className={`${inputClass} ${errors.clienteCNPJ ? errorInputClass : ''}`}
                                                    placeholder="123.456.789-01"
                                                    maxLength={18}
                                                    onChange={(e) => {
                                                        const masked = maskCNPJCPF(e.target.value);
                                                        field.onChange(masked);
                                                        addToHistory(getValues());
                                                    }}
                                                />
                                                {errors.clienteCNPJ && (
                                                    <p className="text-xs text-red-500 mt-1">{errors.clienteCNPJ.message}</p>
                                                )}
                                            </>
                                        )}
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
                                    {/* CEP */}
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-[#e8eaed]">CEP</Label>
                                        <div className="relative">
                                            <Controller
                                                name="cep"
                                                control={control}
                                                render={({ field }) => (
                                                    <>
                                                        <Input
                                                            {...field}
                                                            disabled={!isEditing}
                                                            placeholder="00000-000"
                                                            maxLength={9}
                                                            className={`${inputClass} ${errors.cep ? errorInputClass : ''}`}
                                                            onChange={(e) => {
                                                                handleCEPChange(e.target.value);
                                                            }}
                                                        />
                                                        {isLoadingCEP && (
                                                            <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-[#0084ff] animate-spin" />
                                                        )}
                                                    </>
                                                )}
                                            />
                                        </div>
                                        {errors.cep && (
                                            <p className="text-xs text-red-500 mt-1">{errors.cep.message}</p>
                                        )}
                                    </div>

                                    {/* UF */}
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-[#e8eaed]">UF <span className="text-red-500">*</span></Label>
                                        <Controller
                                            name="estado"
                                            control={control}
                                            render={({ field }) => (
                                                <>
                                                    <SearchableDropdown
                                                        options={BRAZILIAN_STATES}
                                                        value={field.value}
                                                        onChange={(val) => {
                                                            field.onChange(val);
                                                            handleUFChange(val);
                                                        }}
                                                        placeholder="UF"
                                                        required
                                                        disabled={!isEditing}
                                                        className="w-full"
                                                    />
                                                    {errors.estado && (
                                                        <p className="text-xs text-red-500 mt-1">{errors.estado.message}</p>
                                                    )}
                                                </>
                                            )}
                                        />
                                    </div>

                                    {/* Cidade */}
                                    <div className="md:col-span-4 space-y-2">
                                        <Label className="text-[#e8eaed]">Cidade <span className="text-red-500">*</span></Label>
                                        <Controller
                                            name="cidade"
                                            control={control}
                                            render={({ field }) => (
                                                <>
                                                    <SearchableDropdown
                                                        options={availableCities}
                                                        value={field.value}
                                                        onChange={(val) => {
                                                            field.onChange(val);
                                                            handleCityChange(val);
                                                        }}
                                                        placeholder={isLoadingCities ? "Carregando..." : "Selecione a cidade"}
                                                        disabled={!isEditing || !watch('estado') || isLoadingCities}
                                                        required
                                                        className="w-full"
                                                    />
                                                    {errors.cidade && (
                                                        <p className="text-xs text-red-500 mt-1">{errors.cidade.message}</p>
                                                    )}
                                                </>
                                            )}
                                        />
                                    </div>

                                    {/* Bairro */}
                                    <div className="md:col-span-4 space-y-2">
                                        <Label className="text-[#e8eaed]">Bairro</Label>
                                        <Controller
                                            name="bairro"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    readOnly
                                                    disabled
                                                    className={`${inputClass} opacity-60 cursor-not-allowed`}
                                                    placeholder="Automático..."
                                                />
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    {/* Logradouro */}
                                    <div className="md:col-span-6 space-y-2 relative">
                                        <Label className="text-[#e8eaed]">Logradouro <span className="text-red-500">*</span></Label>
                                        <Controller
                                            name="logradouro"
                                            control={control}
                                            render={({ field }) => (
                                                <>
                                                    <Input
                                                        {...field}
                                                        disabled={!isEditing || !watch('cidade')}
                                                        placeholder={!watch('cidade') ? "Selecione a cidade primeiro" : "Digite o nome da rua..."}
                                                        className={`${inputClass} ${errors.logradouro ? errorInputClass : ''}`}
                                                        autoComplete="off"
                                                        onChange={(e) => {
                                                            field.onChange(e);
                                                            handleLogradouroChange(e.target.value);
                                                        }}
                                                    />
                                                    {isLoadingStreets && (
                                                        <Loader2 className="absolute right-3 top-9 w-4 h-4 text-[#a0a5b0] animate-spin" />
                                                    )}
                                                    {showStreetSuggestions && isEditing && (
                                                        <div className="absolute z-50 w-full bg-[#242830] border border-[#3a3e45] rounded-md mt-1 shadow-xl max-h-60 overflow-y-auto">
                                                            {getUniqueSuggestions().map((item: any, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => handleSelectStreetSuggestion(item)}
                                                                    className="p-3 hover:bg-[#3a3e45] cursor-pointer border-b border-[#3a3e45] last:border-0"
                                                                >
                                                                    <p className="text-sm text-white font-medium">{item.logradouro}</p>
                                                                    <p className="text-xs text-[#a0a5b0]">{item.bairro}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {errors.logradouro && (
                                                        <p className="text-xs text-red-500 mt-1">{errors.logradouro.message}</p>
                                                    )}
                                                </>
                                            )}
                                        />
                                    </div>

                                    {/* Número */}
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-[#e8eaed]">Número</Label>
                                        <Controller
                                            name="numero"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    disabled={!isEditing}
                                                    className={inputClass}
                                                    placeholder="Ex: 1234"
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        handleNumberChange(e.target.value);
                                                    }}
                                                />
                                            )}
                                        />
                                    </div>

                                    {/* Complemento */}
                                    <div className="md:col-span-4 space-y-2">
                                        <Label className="text-[#e8eaed]">Complemento</Label>
                                        <Controller
                                            name="complemento"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    disabled={!isEditing}
                                                    className={inputClass}
                                                    placeholder="Ex: Bloco A, Sala 301"
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        addToHistory(getValues());
                                                    }}
                                                />
                                            )}
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
                                {/* Impostos */}
                                <div className="space-y-2">
                                    <Label className="text-[#e8eaed]">% Impostos</Label>
                                    <div className="relative">
                                        <Controller
                                            name="impostos"
                                            control={control}
                                            render={({ field }) => (
                                                <>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        onChange={(e) => {
                                                            field.onChange(parseFloat(e.target.value) || 0);
                                                            addToHistory(getValues());
                                                        }}
                                                        disabled={!isEditing}
                                                        className={`${inputClass} ${errors.impostos ? errorInputClass : ''} pr-8`}
                                                        placeholder="Ex: 8.5"
                                                    />
                                                    <span className="absolute right-3 top-2.5 text-xs text-[#a0a5b0]">%</span>
                                                    {errors.impostos && (
                                                        <p className="text-xs text-red-500 mt-1">{errors.impostos.message}</p>
                                                    )}
                                                </>
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Custos Indiretos */}
                                <div className="space-y-2">
                                    <Label className="text-[#e8eaed]">% Custos Indiretos</Label>
                                    <div className="relative">
                                        <Controller
                                            name="custosIndiretos"
                                            control={control}
                                            render={({ field }) => (
                                                <>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        onChange={(e) => {
                                                            field.onChange(parseFloat(e.target.value) || 0);
                                                            addToHistory(getValues());
                                                        }}
                                                        disabled={!isEditing}
                                                        className={`${inputClass} ${errors.custosIndiretos ? errorInputClass : ''} pr-8`}
                                                        placeholder="Ex: 5.0"
                                                    />
                                                    <span className="absolute right-3 top-2.5 text-xs text-[#a0a5b0]">%</span>
                                                    {errors.custosIndiretos && (
                                                        <p className="text-xs text-red-500 mt-1">{errors.custosIndiretos.message}</p>
                                                    )}
                                                </>
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* BDI */}
                                <div className="space-y-2">
                                    <Label className="text-[#e8eaed]">% BDI</Label>
                                    <div className="relative">
                                        <Controller
                                            name="bdi"
                                            control={control}
                                            render={({ field }) => (
                                                <>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        onChange={(e) => {
                                                            field.onChange(parseFloat(e.target.value) || 0);
                                                            addToHistory(getValues());
                                                        }}
                                                        disabled={!isEditing}
                                                        className={`${inputClass} ${errors.bdi ? errorInputClass : ''} pr-8`}
                                                        placeholder="Ex: 25.0"
                                                    />
                                                    <span className="absolute right-3 top-2.5 text-xs text-[#a0a5b0]">%</span>
                                                    {errors.bdi && (
                                                        <p className="text-xs text-red-500 mt-1">{errors.bdi.message}</p>
                                                    )}
                                                </>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </form>

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
                        <Button
                            variant="ghost"
                            onClick={handleCancel}
                            className="text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45]"
                        >
                            {dialogState.cancelText || 'Cancelar'}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirm}
                            className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/20"
                        >
                            {dialogState.confirmText || 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
};
