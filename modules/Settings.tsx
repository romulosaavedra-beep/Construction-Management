

import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { SearchableDropdown } from '../components/SearchableDropdown';
import { profissionaisData, fornecedoresData, recursosData, DEFAULT_UNITS_DATA } from '../data/mockData';
import {
    fetchAddressByCEP,
    fetchCitiesByUF,
    fetchNeighborhoodsByCity,
    fetchStreetsByNeighborhood,
    maskCEP,
    ViaCEPResponse,
    BRAZILIAN_STATES
} from '../services/AddressService';
import type { Profissional, Fornecedor } from '../types';


type SettingsTab = 'geral' | 'profissionais' | 'fornecedores' | 'unidades' | 'recursos';

interface UnitItem {
    id: string;
    category: string;
    name: string;
    symbol: string;
}

interface GeneralSettings {
    impostos: number;
    custosIndiretos: number;
    bdi: number;
    // Endereço (Brasil)
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string; // UF
    // Informações da Obra
    nomeObra: string;
    empresa: string;
    cliente: string;
    // Configuração de Calendário
    scheduleType: string;
    workOnHolidays: boolean;
    workOnRegionalHolidays: boolean;
}

const LOCAL_STORAGE_KEY_UNITS = 'vobi-settings-units';
const LOCAL_STORAGE_KEY_PROFS = 'vobi-settings-profs';
const LOCAL_STORAGE_KEY_ROLES = 'vobi-settings-roles';
const LOCAL_STORAGE_KEY_GENERAL = 'vobi-settings-general';

const DEFAULT_ROLES = [
    "Engenheiro Civil",
    "Engenheiro Eletricista",
    "Engenheiro Mecânico",
    "Engenheiro de Segurança",
    "Arquiteto",
    "Gerente de Projetos",
    "Coordenador de Obras",
    "Mestre de Obras",
    "Encarregado Geral",
    "Fiscal de Obra",
    "Técnico de Edificações",
    "Técnico de Segurança",
    "Apontador",
    "Almoxarife",
    "Comprador",
    "Orçamentista",
    "Planejador"
];

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Máscara específica para Celular: (DD) 9XXXX-XXXX
const maskMobilePhone = (value: string) => {
    if (!value) return '';
    let v = value.replace(/\D/g, '').slice(0, 11); // Limita a 11 dígitos

    if (v.length > 7) {
        return v.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (v.length > 2) {
        return v.replace(/^(\d\d)(\d{0,5})/, '($1) $2');
    } else {
        return v.replace(/^(\d*)/, '($1');
    }
};

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('geral');

    // --- General Settings State ---
    // --- General Settings State ---
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY_GENERAL);
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error('Error parsing general settings:', e);
                }
            }
        }
        return {
            impostos: 5.0,
            custosIndiretos: 8.0,
            bdi: 25.0,
            cep: '',
            logradouro: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            estado: '',
            nomeObra: '',
            empresa: '',
            cliente: '',
            scheduleType: 'mon_fri',
            workOnHolidays: false,
            workOnRegionalHolidays: false
        };
    });

    // Address State
    const [isLoadingCEP, setIsLoadingCEP] = useState(false);
    const [cepError, setCepError] = useState<string>('');
    const [addressSuggestions, setAddressSuggestions] = useState<ViaCEPResponse[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Cascading Address State
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [availableNeighborhoods, setAvailableNeighborhoods] = useState<string[]>([]);
    const [availableStreets, setAvailableStreets] = useState<ViaCEPResponse[]>([]);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [isLoadingNeighborhoods, setIsLoadingNeighborhoods] = useState(false);
    const [isLoadingStreets, setIsLoadingStreets] = useState(false);

    // Profissionais State com Persistência
    const [profissionais, setProfissionais] = useState<Profissional[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PROFS);
            if (saved) {
                try { return JSON.parse(saved); } catch (e) { console.error(e); }
            }
        }
        return profissionaisData;
    });

    const [roles, setRoles] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ROLES);
            if (saved) {
                try { return JSON.parse(saved); } catch (e) { console.error(e); }
            }
        }
        return DEFAULT_ROLES;
    });

    const [isProfissionalModalOpen, setIsProfissionalModalOpen] = useState(false);
    const [currentProfissional, setCurrentProfissional] = useState<Partial<Profissional>>({});
    const [phoneError, setPhoneError] = useState<string>("");

    // State para adicionar novo cargo dinamicamente
    const [isAddingNewRole, setIsAddingNewRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");

    const [fornecedores, setFornecedores] = useState<Fornecedor[]>(fornecedoresData);
    const [recursos, setRecursos] = useState<string[]>(recursosData);

    // Initialize Units State
    const [units, setUnits] = useState<UnitItem[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY_UNITS);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    return parsed.map((u: any) => u.id ? u : { ...u, id: generateId() });
                } catch (e) { console.error(e); }
            }
        }
        return DEFAULT_UNITS_DATA.map(u => ({ ...u, id: generateId() }));
    });

    const [unitSearch, setUnitSearch] = useState('');
    const [newUnit, setNewUnit] = useState<{ category: string; name: string; symbol: string }>({ category: '', name: '', symbol: '' });

    // Sorting State
    type SortKey = 'category' | 'name' | 'symbol';
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

    // Persistência via useEffect
    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY_UNITS, JSON.stringify(units));
    }, [units]);

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY_PROFS, JSON.stringify(profissionais));
    }, [profissionais]);

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY_ROLES, JSON.stringify(roles));
    }, [roles]);

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY_GENERAL, JSON.stringify(generalSettings));
    }, [generalSettings]);

    // --- Handlers for General Settings ---
    const handleGeneralChange = (field: keyof GeneralSettings, value: any) => {
        setGeneralSettings(prev => ({ ...prev, [field]: value }));
    };

    // --- Handlers for Address ---
    const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCep = maskCEP(e.target.value);
        handleGeneralChange('cep', newCep);
        setCepError('');

        if (newCep.replace(/\D/g, '').length === 8) {
            setIsLoadingCEP(true);
            try {
                const data = await fetchAddressByCEP(newCep);
                if (data) {
                    // Auto-preenche todos os campos
                    setGeneralSettings(prev => ({
                        ...prev,
                        cep: newCep,
                        estado: data.uf,
                        cidade: data.localidade,
                        bairro: data.bairro,
                        logradouro: data.logradouro
                    }));

                    // Carrega as listas em cascata
                    await loadCitiesForUF(data.uf);
                    await loadNeighborhoodsForCity(data.uf, data.localidade);
                } else {
                    setCepError('CEP não encontrado.');
                }
            } catch (error) {
                setCepError('Erro ao buscar CEP.');
            } finally {
                setIsLoadingCEP(false);
            }
        }
    };

    const handleUFChange = async (uf: string) => {
        handleGeneralChange('estado', uf);
        // Limpa campos dependentes
        handleGeneralChange('cidade', '');
        handleGeneralChange('bairro', '');
        handleGeneralChange('logradouro', '');
        handleGeneralChange('numero', '');
        handleGeneralChange('complemento', '');
        setAvailableNeighborhoods([]);
        setAvailableStreets([]);

        if (uf) {
            await loadCitiesForUF(uf);
        } else {
            setAvailableCities([]);
        }
    };

    const handleCityChange = async (cidade: string) => {
        handleGeneralChange('cidade', cidade);
        // Limpa campos dependentes
        handleGeneralChange('bairro', '');
        handleGeneralChange('logradouro', '');
        handleGeneralChange('numero', '');
        handleGeneralChange('complemento', '');
        setAvailableStreets([]);

        if (cidade && generalSettings.estado) {
            await loadNeighborhoodsForCity(generalSettings.estado, cidade);
        } else {
            setAvailableNeighborhoods([]);
        }
    };

    const handleNeighborhoodChange = (bairro: string) => {
        handleGeneralChange('bairro', bairro);
        // Limpa campos dependentes
        handleGeneralChange('logradouro', '');
        handleGeneralChange('numero', '');
        handleGeneralChange('complemento', '');
        setAvailableStreets([]);
    };

    const handleLogradouroChange = async (value: string) => {
        handleGeneralChange('logradouro', value);

        if (value.length >= 3 && generalSettings.estado && generalSettings.cidade && generalSettings.bairro) {
            setIsLoadingStreets(true);
            try {
                const streets = await fetchStreetsByNeighborhood(
                    generalSettings.estado,
                    generalSettings.cidade,
                    generalSettings.bairro,
                    value
                );
                setAvailableStreets(streets);
                setShowSuggestions(streets.length > 0);
            } catch (error) {
                console.error('Erro ao buscar logradouros:', error);
            } finally {
                setIsLoadingStreets(false);
            }
        } else {
            setAvailableStreets([]);
            setShowSuggestions(false);
        }
    };

    const loadCitiesForUF = async (uf: string) => {
        setIsLoadingCities(true);
        try {
            const cities = await fetchCitiesByUF(uf);
            setAvailableCities(cities);
        } catch (error) {
            console.error('Erro ao carregar cidades:', error);
            setAvailableCities([]);
        } finally {
            setIsLoadingCities(false);
        }
    };

    const loadNeighborhoodsForCity = async (uf: string, cidade: string) => {
        setIsLoadingNeighborhoods(true);
        try {
            const neighborhoods = await fetchNeighborhoodsByCity(uf, cidade);
            setAvailableNeighborhoods(neighborhoods);
        } catch (error) {
            console.error('Erro ao carregar bairros:', error);
            setAvailableNeighborhoods([]);
        } finally {
            setIsLoadingNeighborhoods(false);
        }
    };

    const handleStreetSuggestionSelect = (suggestion: ViaCEPResponse) => {
        setGeneralSettings(prev => ({
            ...prev,
            cep: suggestion.cep,
            logradouro: suggestion.logradouro,
            bairro: suggestion.bairro
        }));
        setShowSuggestions(false);
        setAvailableStreets([]);
    };

    const handleSaveGeneral = () => {
        localStorage.setItem(LOCAL_STORAGE_KEY_GENERAL, JSON.stringify(generalSettings));
        alert("Configurações gerais salvas com sucesso!");
    };

    // --- Handlers for Profissionais ---
    const handleAddProfissional = () => {
        setCurrentProfissional({ cargo: roles[0] }); // Default role
        setPhoneError("");
        setIsProfissionalModalOpen(true);
        setIsAddingNewRole(false);
    };

    const handleEditProfissional = (profissional: Profissional) => {
        setCurrentProfissional({ ...profissional });
        setPhoneError("");
        setIsProfissionalModalOpen(true);
        setIsAddingNewRole(false);

        // Se o cargo atual não estiver na lista (ex: legado), adiciona temporariamente ou mantém
        if (profissional.cargo && !roles.includes(profissional.cargo)) {
            setRoles(prev => [...prev, profissional.cargo].sort());
        }
    };

    const handleDeleteProfissional = (id: number) => {
        if (window.confirm('Tem certeza que deseja remover este profissional?')) {
            setProfissionais(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleSaveProfissional = (e: React.FormEvent) => {
        e.preventDefault();
        setPhoneError("");

        if (!currentProfissional.nome || !currentProfissional.cargo) {
            alert("Nome e Cargo são obrigatórios.");
            return;
        }

        // Validação Rigorosa do Celular
        const rawPhone = (currentProfissional.telefone || '').replace(/\D/g, '');
        if (rawPhone.length > 0) {
            if (rawPhone.length !== 11) {
                setPhoneError("O celular deve ter 11 dígitos (DDD + 9 + Número).");
                return;
            }
            // Verifica se o terceiro dígito (índice 2) é 9 (DDD são os indices 0 e 1)
            if (rawPhone[2] !== '9') {
                setPhoneError("O número de celular deve começar com 9.");
                return;
            }
        }

        if (currentProfissional.id) {
            // Edit
            setProfissionais(prev => prev.map(p => p.id === currentProfissional.id ? { ...p, ...currentProfissional } as Profissional : p));
        } else {
            // Add
            const newId = Math.max(0, ...profissionais.map(p => p.id)) + 1;
            setProfissionais(prev => [...prev, { ...currentProfissional, id: newId } as Profissional]);
        }
        setIsProfissionalModalOpen(false);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhoneError(""); // Limpa o erro ao digitar
        const masked = maskMobilePhone(e.target.value);
        setCurrentProfissional({ ...currentProfissional, telefone: masked });
    };

    const handleAddNewRole = () => {
        if (newRoleName.trim()) {
            setRoles(prev => [...prev, newRoleName.trim()].sort());
            setCurrentProfissional({ ...currentProfissional, cargo: newRoleName.trim() });
            setNewRoleName("");
            setIsAddingNewRole(false);
        }
    };

    // --- Handlers for Units ---
    const handleAddUnit = () => {
        if (newUnit.symbol && newUnit.name) {
            const category = 'Usuário';
            const newItem: UnitItem = { ...newUnit, category, id: generateId() };
            setUnits([newItem, ...units]);
            setNewUnit({ category: '', name: '', symbol: '' });
        } else {
            alert('Preencha pelo menos o Nome e o Símbolo da unidade.');
        }
    };

    const handleRemoveUnit = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const unitToDelete = units.find(u => u.id === id);
        if (unitToDelete) {
            if (window.confirm(`Tem certeza que deseja remover a unidade "${unitToDelete.name}" (${unitToDelete.symbol})?`)) {
                setUnits(prev => prev.filter(u => u.id !== id));
            }
        }
    };

    const handleResetUnits = () => {
        if (window.confirm('Isso irá restaurar a lista completa original de unidades. Todas as unidades personalizadas serão perdidas. Deseja continuar?')) {
            setUnits(DEFAULT_UNITS_DATA.map(u => ({ ...u, id: generateId() })));
        }
    };

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortKey) => {
        if (!sortConfig || sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    const filteredAndSortedUnits = useMemo(() => {
        const lowerSearch = unitSearch.toLowerCase();
        let result = units.filter(u =>
            u.name.toLowerCase().includes(lowerSearch) ||
            u.symbol.toLowerCase().includes(lowerSearch) ||
            u.category.toLowerCase().includes(lowerSearch)
        );

        if (sortConfig !== null) {
            result.sort((a, b) => {
                const aValue = a[sortConfig.key].toLowerCase();
                const bValue = b[sortConfig.key].toLowerCase();
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [units, unitSearch, sortConfig]);


    const renderContent = () => {
        switch (activeTab) {
            case 'geral':
                return (
                    <div>
                        <div className="flex justify-end mb-4">
                            <Button variant="primary" onClick={handleSaveGeneral}>💾 Salvar Configurações Gerais</Button>
                        </div>
                        <Card>
                            <CardHeader title="🏗️ Informações da Obra" />
                            <div className="space-y-6">
                                {/* Seção 1: Dados Gerais */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nome da Obra</label>
                                        <input
                                            type="text"
                                            value={generalSettings.nomeObra}
                                            onChange={e => handleGeneralChange('nomeObra', e.target.value)}
                                            placeholder="Digite o nome da obra..."
                                            className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Empresa</label>
                                        <input
                                            type="text"
                                            value={generalSettings.empresa}
                                            onChange={e => handleGeneralChange('empresa', e.target.value)}
                                            placeholder="Nome da empresa contratada..."
                                            className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Cliente</label>
                                        <input
                                            type="text"
                                            value={generalSettings.cliente}
                                            onChange={e => handleGeneralChange('cliente', e.target.value)}
                                            placeholder="Nome do cliente contratante..."
                                            className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm"
                                        />
                                    </div>
                                </div>

                                <hr className="border-[#3a3e45]" />

                                {/* Seção 2: Endereço (Macro -> Micro) */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-[#e8eaed] mb-2">Localização da Obra</h4>

                                    {/* Linha 1: CEP, UF, Cidade, Bairro */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        {/* CEP - 3 colunas (25%) */}
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-medium mb-1">CEP</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={generalSettings.cep}
                                                    onChange={handleCEPChange}
                                                    placeholder="00000-000"
                                                    maxLength={9}
                                                    className={`w-full bg-[#1e2329] border ${cepError ? 'border-red-500' : 'border-[#3a3e45]'} rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm pr-10`}
                                                />
                                                {isLoadingCEP && (
                                                    <div className="absolute right-3 top-2.5">
                                                        <div className="animate-spin h-4 w-4 border-2 border-[#0084ff] border-t-transparent rounded-full"></div>
                                                    </div>
                                                )}
                                            </div>
                                            {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
                                        </div>

                                        {/* UF - 2 colunas (~17%) */}
                                        <div className="md:col-span-2">
                                            <SearchableDropdown
                                                label="UF"
                                                options={BRAZILIAN_STATES}
                                                value={generalSettings.estado}
                                                onChange={handleUFChange}
                                                placeholder="UF"
                                                required={true}
                                            />
                                        </div>

                                        {/* Cidade - 4 colunas (~33%) */}
                                        <div className="md:col-span-4">
                                            <SearchableDropdown
                                                label="Cidade"
                                                options={availableCities}
                                                value={generalSettings.cidade}
                                                onChange={handleCityChange}
                                                placeholder={isLoadingCities ? "Carregando..." : "Selecione a cidade"}
                                                disabled={!generalSettings.estado || isLoadingCities}
                                                required={true}
                                            />
                                        </div>

                                        {/* Bairro - 3 colunas (25%) */}
                                        <div className="md:col-span-3">
                                            <SearchableDropdown
                                                label="Bairro"
                                                options={availableNeighborhoods}
                                                value={generalSettings.bairro}
                                                onChange={handleNeighborhoodChange}
                                                placeholder={isLoadingNeighborhoods ? "Carregando..." : "Selecione o bairro"}
                                                disabled={!generalSettings.cidade || isLoadingNeighborhoods}
                                                required={true}
                                            />
                                        </div>
                                    </div>

                                    {/* Linha 2: Logradouro, Número, Complemento */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        {/* Logradouro - 6 colunas (50%) */}
                                        <div className="md:col-span-6 relative">
                                            <label className="block text-sm font-medium mb-1">
                                                Logradouro (Rua, Av, etc) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={generalSettings.logradouro}
                                                onChange={(e) => handleLogradouroChange(e.target.value)}
                                                placeholder="Digite o endereço..."
                                                disabled={!generalSettings.bairro}
                                                className={`w-full bg-[#1e2329] border ${!generalSettings.logradouro ? 'border-red-500' : 'border-[#3a3e45]'
                                                    } rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm ${!generalSettings.bairro ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                                autoComplete="off"
                                            />
                                            {/* Autocomplete Suggestions */}
                                            {showSuggestions && availableStreets.length > 0 && (
                                                <div className="absolute z-10 w-full bg-[#242830] border border-[#3a3e45] rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
                                                    {availableStreets.map((suggestion, index) => (
                                                        <div
                                                            key={index}
                                                            className="p-2 hover:bg-[#3a3e45] cursor-pointer text-sm"
                                                            onClick={() => handleStreetSuggestionSelect(suggestion)}
                                                        >
                                                            <span className="font-medium">{suggestion.logradouro}</span>
                                                            <span className="text-[#a0a5b0] text-xs ml-2">
                                                                {suggestion.bairro} - CEP: {suggestion.cep}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {isLoadingStreets && (
                                                <p className="text-xs text-[#a0a5b0] mt-1">Buscando logradouros...</p>
                                            )}
                                        </div>

                                        {/* Número - 2 colunas (~17%) */}
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium mb-1">Número</label>
                                            <input
                                                type="text"
                                                value={generalSettings.numero}
                                                onChange={e => handleGeneralChange('numero', e.target.value)}
                                                placeholder="Nº"
                                                disabled={!generalSettings.logradouro}
                                                className={`w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm ${!generalSettings.logradouro ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                            />
                                        </div>

                                        {/* Complemento - 4 colunas (~33%) */}
                                        <div className="md:col-span-4">
                                            <label className="block text-sm font-medium mb-1">Complemento</label>
                                            <input
                                                type="text"
                                                value={generalSettings.complemento}
                                                onChange={e => handleGeneralChange('complemento', e.target.value)}
                                                placeholder="Apto, Bloco, etc."
                                                disabled={!generalSettings.logradouro}
                                                className={`w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm ${!generalSettings.logradouro ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                        <Card>
                            <CardHeader title="📅 Calendário e Jornada de Trabalho" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Jornada de Trabalho *</label>
                                    <select
                                        value={generalSettings.scheduleType}
                                        onChange={e => handleGeneralChange('scheduleType', e.target.value)}
                                        className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm"
                                    >
                                        <option value="mon_fri">Segunda a Sexta-feira</option>
                                        <option value="mon_sat_half">Segunda a Sábado (Meio turno Sábado)</option>
                                        <option value="mon_sat_full">Segunda a Sábado (Turno completo Sábado)</option>
                                        <option value="mon_sun_half_sat_sun">Segunda a Domingo (Meio turno Sáb e Dom)</option>
                                        <option value="mon_sun_half_sun">Segunda a Domingo (Meio turno Domingo)</option>
                                        <option value="mon_sun_full_sun">Segunda a Domingo (Turno completo Domingo)</option>
                                    </select>
                                    <p className="text-xs text-[#a0a5b0] mt-1">
                                        Esta configuração define como os prazos e datas finais são calculados no módulo de Planejamento.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 invisible">Spacer</label>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="workOnHolidays"
                                                checked={generalSettings.workOnHolidays}
                                                onChange={e => handleGeneralChange('workOnHolidays', e.target.checked)}
                                                className="w-5 h-5 bg-[#1e2329] border border-[#3a3e45] rounded focus:ring-[#0084ff] accent-[#0084ff]"
                                            />
                                            <label htmlFor="workOnHolidays" className="text-sm font-medium cursor-pointer select-none">
                                                Trabalhar em Feriados Nacionais
                                            </label>
                                        </div>

                                        {generalSettings.cidade && (
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id="workOnRegionalHolidays"
                                                    checked={generalSettings.workOnRegionalHolidays}
                                                    onChange={e => handleGeneralChange('workOnRegionalHolidays', e.target.checked)}
                                                    className="w-5 h-5 bg-[#1e2329] border border-[#3a3e45] rounded focus:ring-[#0084ff] accent-[#0084ff]"
                                                />
                                                <label htmlFor="workOnRegionalHolidays" className="text-sm font-medium cursor-pointer select-none">
                                                    Trabalhar em Feriados Regionais ({generalSettings.cidade})
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                        <Card>
                            <CardHeader title="Configurações Financeiras" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">% Impostos</label>
                                    <input
                                        type="number"
                                        value={generalSettings.impostos}
                                        onChange={e => handleGeneralChange('impostos', parseFloat(e.target.value))}
                                        className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">% Custos Indiretos</label>
                                    <input
                                        type="number"
                                        value={generalSettings.custosIndiretos}
                                        onChange={e => handleGeneralChange('custosIndiretos', parseFloat(e.target.value))}
                                        className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">% BDI (Benefícios e Despesas Indiretas)</label>
                                    <input
                                        type="number"
                                        value={generalSettings.bdi}
                                        onChange={e => handleGeneralChange('bdi', parseFloat(e.target.value))}
                                        className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none"
                                    />
                                </div>
                            </div>
                        </Card>
                        <Card>
                            <CardHeader title="ℹ️ Informações do Sistema" />
                            <div className="text-sm text-[#a0a5b0]">
                                <p><strong>Versão:</strong> 1.0.3</p>
                                <p><strong>Última atualização:</strong> 12/11/2025</p>
                                <p>Sistema de Gestão de Obras</p>
                            </div>
                        </Card>
                    </div >
                );
            case 'profissionais':
                return (
                    <Card>
                        <CardHeader title="Profissionais">
                            <Button variant="primary" onClick={handleAddProfissional}>+ Adicionar</Button>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-[#a0a5b0]">
                                <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830]">
                                    <tr>
                                        <th className="px-4 py-3">Cargo/Função</th>
                                        <th className="px-4 py-3">Nome</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Telefone</th>
                                        <th className="px-4 py-3 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profissionais.map((p) => (
                                        <tr key={p.id} className="border-b border-[#3a3e45] hover:bg-[#24282f]">
                                            <td className="px-4 py-3">{p.cargo}</td>
                                            <td className="px-4 py-3 font-medium text-white">{p.nome}</td>
                                            <td className="px-4 py-3">{p.email || '-'}</td>
                                            <td className="px-4 py-3 font-mono text-xs">{p.telefone || '-'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditProfissional(p)}
                                                        className="text-[#a0a5b0] hover:text-white p-1"
                                                        title="Editar"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProfissional(p.id)}
                                                        className="text-red-400 hover:text-red-500 p-1"
                                                        title="Excluir"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {profissionais.length === 0 && (
                                <div className="text-center py-6 text-[#a0a5b0]">Nenhum profissional cadastrado.</div>
                            )}
                        </div>
                    </Card>
                );
            case 'fornecedores':
                return (
                    <Card>
                        <CardHeader title="Fornecedores">
                            <Button variant="primary" onClick={() => alert('Adicionar Fornecedor')}>+ Adicionar</Button>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830]">
                                    <tr>
                                        <th className="px-4 py-3">Nome</th>
                                        <th className="px-4 py-3">Contato</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fornecedores.map((f, i) => (
                                        <tr key={i} className="border-b border-[#3a3e45]">
                                            <td className="px-4 py-3 font-medium text-white">{f.nome}</td>
                                            <td className="px-4 py-3">{f.vendedor}</td>
                                            <td className="px-4 py-3">{f.email}</td>
                                            <td className="px-4 py-3"><Button variant="secondary" size="sm">✏️</Button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                );
            case 'unidades':
                return (
                    <Card>
                        <CardHeader title="Tabela de Unidades de Medida">
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={handleResetUnits}>↺ Definição Original</Button>
                            </div>
                        </CardHeader>

                        <div className="mb-6 space-y-4">
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#a0a5b0]">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Procurar unidade (Nome, Símbolo ou Categoria)..."
                                    value={unitSearch}
                                    onChange={(e) => setUnitSearch(e.target.value)}
                                    className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md py-2 pl-10 pr-4 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm"
                                />
                            </div>

                            <div className="bg-[#242830] p-4 rounded-lg border border-[#3a3e45]">
                                <h4 className="text-sm font-bold text-white mb-3">Adicionar Nova Unidade</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                    <div>
                                        <label className="text-xs text-[#a0a5b0] mb-1 block">Nome da Unidade *</label>
                                        <input
                                            type="text"
                                            value={newUnit.name}
                                            onChange={e => setNewUnit({ ...newUnit, name: e.target.value })}
                                            placeholder="Ex: Quilograma"
                                            className="w-full bg-[#1e2329] border border-[#3a3e45] rounded p-2 text-sm focus:ring-1 focus:ring-[#0084ff]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[#a0a5b0] mb-1 block">Símbolo (Abrev.) *</label>
                                        <input
                                            type="text"
                                            value={newUnit.symbol}
                                            onChange={e => setNewUnit({ ...newUnit, symbol: e.target.value })}
                                            placeholder="Ex: kg"
                                            className="w-full bg-[#1e2329] border border-[#3a3e45] rounded p-2 text-sm focus:ring-1 focus:ring-[#0084ff]"
                                        />
                                    </div>
                                    <div>
                                        <Button variant="primary" onClick={handleAddUnit} className="w-full">+ Adicionar</Button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-[#a0a5b0] mt-2">Novas unidades serão classificadas automaticamente na categoria 'Usuário'.</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-[#3a3e45] rounded-md max-h-[600px] custom-scrollbar">
                            <table className="w-full text-sm text-left text-[#a0a5b0]">
                                <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830] sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th
                                            className="px-4 py-3 cursor-pointer hover:bg-[#3a3e45] transition-colors select-none"
                                            onClick={() => requestSort('category')}
                                            title="Clique para ordenar por categoria"
                                        >
                                            Categoria / Grandeza {getSortIndicator('category')}
                                        </th>
                                        <th
                                            className="px-4 py-3 cursor-pointer hover:bg-[#3a3e45] transition-colors select-none"
                                            onClick={() => requestSort('name')}
                                            title="Clique para ordenar por nome"
                                        >
                                            Nome da Unidade {getSortIndicator('name')}
                                        </th>
                                        <th
                                            className="px-4 py-3 text-center cursor-pointer hover:bg-[#3a3e45] transition-colors select-none"
                                            onClick={() => requestSort('symbol')}
                                            title="Clique para ordenar por símbolo"
                                        >
                                            Símbolo {getSortIndicator('symbol')}
                                        </th>
                                        <th className="px-4 py-3 text-center w-20">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedUnits.length > 0 ? (
                                        filteredAndSortedUnits.map((u) => (
                                            <tr key={u.id} className="border-b border-[#3a3e45] hover:bg-[#24282f]">
                                                <td className="px-4 py-2 text-xs">{u.category}</td>
                                                <td className="px-4 py-2 font-medium text-white">{u.name}</td>
                                                <td className="px-4 py-2 text-center font-mono text-[#0084ff] bg-[#0084ff]/10 rounded">{u.symbol}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <button
                                                        onClick={(e) => handleRemoveUnit(u.id, e)}
                                                        className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors"
                                                        title="Excluir unidade"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-[#a0a5b0]">
                                                Nenhuma unidade encontrada para "{unitSearch}".
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                );
            case 'recursos':
                return (
                    <Card>
                        <CardHeader title="Recursos/Equipamentos">
                            <Button variant="primary" onClick={() => alert('Adicionar Recurso')}>+ Adicionar</Button>
                        </CardHeader>
                        <div className="flex flex-wrap gap-2">
                            {recursos.map((r, i) => (
                                <span key={i} className="bg-[#242830] px-3 py-1 rounded-full text-sm">{r}</span>
                            ))}
                        </div>
                    </Card>
                );
            default: return null;
        }
    }

    const tabs: { id: SettingsTab; label: string }[] = [
        { id: 'geral', label: 'Geral' },
        { id: 'profissionais', label: 'Profissionais' },
        { id: 'fornecedores', label: 'Fornecedores' },
        { id: 'unidades', label: 'Unidades de Medida' },
        { id: 'recursos', label: 'Recursos' },
    ];

    return (
        <div>
            <PageHeader title="⚙️ CONFIGURAÇÕES" subtitle="Gerenciar profissionais, fornecedores, unidades e recursos da obra" />

            {/* Profissional Modal */}
            {isProfissionalModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000]">
                    <div className="bg-[#1e2329] rounded-lg shadow-xl p-6 w-full max-w-md relative border border-[#3a3e45]">
                        <div className="flex justify-between items-center mb-4 border-b border-[#3a3e45] pb-2">
                            <h3 className="text-xl font-bold text-white">{currentProfissional.id ? 'Editar Profissional' : 'Adicionar Profissional'}</h3>
                            <button onClick={() => setIsProfissionalModalOpen(false)} className="text-2xl text-[#a0a5b0] hover:text-white">&times;</button>
                        </div>
                        <form onSubmit={handleSaveProfissional} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome *</label>
                                <input
                                    type="text"
                                    value={currentProfissional.nome || ''}
                                    onChange={e => setCurrentProfissional({ ...currentProfissional, nome: e.target.value })}
                                    required
                                    className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 focus:ring-2 focus:ring-[#0084ff] outline-none"
                                />
                            </div>

                            {/* Cargo com Dropdown e Adição Dinâmica */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Cargo/Função *</label>
                                {isAddingNewRole ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newRoleName}
                                            onChange={e => setNewRoleName(e.target.value)}
                                            placeholder="Digite o novo cargo..."
                                            className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 focus:ring-2 focus:ring-[#0084ff] outline-none"
                                            autoFocus
                                        />
                                        <Button type="button" variant="success" onClick={handleAddNewRole} size="sm" className="w-12 justify-center">Ok</Button>
                                        <Button type="button" variant="danger" onClick={() => setIsAddingNewRole(false)} size="sm" className="w-12 justify-center">X</Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <select
                                            value={currentProfissional.cargo || ''}
                                            onChange={e => setCurrentProfissional({ ...currentProfissional, cargo: e.target.value })}
                                            required
                                            className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 focus:ring-2 focus:ring-[#0084ff] outline-none"
                                        >
                                            <option value="">Selecione um cargo...</option>
                                            {roles.map((role) => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setIsAddingNewRole(true)}
                                            title="Adicionar novo cargo"
                                            className="whitespace-nowrap"
                                        >
                                            + Novo
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    value={currentProfissional.email || ''}
                                    onChange={e => setCurrentProfissional({ ...currentProfissional, email: e.target.value })}
                                    className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 focus:ring-2 focus:ring-[#0084ff] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Telefone (Celular)</label>
                                <input
                                    type="text"
                                    value={currentProfissional.telefone || ''}
                                    onChange={handlePhoneChange}
                                    placeholder="(DD) 90000-0000"
                                    className={`w-full bg-[#242830] border rounded p-2 focus:ring-2 outline-none ${phoneError ? 'border-red-500 focus:ring-red-500' : 'border-[#3a3e45] focus:ring-[#0084ff]'}`}
                                />
                                {phoneError ? (
                                    <p className="text-xs text-red-400 mt-1">⚠️ {phoneError}</p>
                                ) : (
                                    <p className="text-[10px] text-[#a0a5b0] mt-1">Opcional. Se preenchido, obrigatório DDD + 9 dígitos (ex: 11999998888).</p>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button variant="secondary" type="button" onClick={() => setIsProfissionalModalOpen(false)}>Cancelar</Button>
                                <Button variant="primary" type="submit">Salvar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="border-b border-[#3a3e45] mb-6">
                <nav className="flex space-x-4 overflow-x-auto custom-scrollbar pb-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3 py-2 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-[#0084ff] border-b-2 border-[#0084ff]' : 'text-[#a0a5b0] hover:text-white'}`}
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
