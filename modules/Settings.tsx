import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { SearchableDropdown } from '../components/SearchableDropdown';
import { fornecedoresData, recursosData, DEFAULT_UNITS_DATA } from '../data/mockData';
import {
    fetchAddressByCEP,
    fetchCitiesByUF,
    fetchStreetsByAddress,
    maskCEP,
    debounce,
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
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    nomeObra: string;
    empresa: string;
    cliente: string;
    scheduleType: string;
    workOnHolidays: boolean;
    workOnRegionalHolidays: boolean;
}

// --- DADOS PADRÃO COM DESCRIÇÕES ---
const DEFAULT_PROFISSIONAIS_DATA: Profissional[] = [
    {
        id: 1, cargo: 'Engenheiro Civil', nome: 'Carlos Silva', email: 'carlos.silva@exemplo.com', telefone: '(11) 99999-1234',
        atividades: 'Responsável técnico pela execução da obra, gestão de cronograma, controle de qualidade e coordenação das equipes de campo.'
    },
    {
        id: 2, cargo: 'Engenheiro Civil', nome: 'Marina Costa', email: 'marina.costa@exemplo.com', telefone: '(11) 98888-5678',
        atividades: 'Focada em orçamentação, levantamento de quantitativos, cotações técnicas e controle de custos (Orçado x Realizado).'
    },
    {
        id: 3, cargo: 'Mestre de Obras', nome: 'Paulo Souza', email: 'paulo.obras@exemplo.com', telefone: '(11) 97777-1111',
        atividades: 'Supervisão direta dos pedreiros e serventes, controle de entrada e saída de materiais e garantia da segurança no canteiro.'
    },
    {
        id: 4, cargo: 'Fiscal de Obra', nome: 'João Santos', email: 'joao.santos@exemplo.com', telefone: '(11) 96666-2222',
        atividades: 'Vistoria diária dos serviços executados, medição de empreiteiros e elaboração de relatórios fotográficos de avanço.'
    }
];

// --- CHAVES DE PERSISTÊNCIA ---
const LOCAL_STORAGE_KEY_UNITS = 'vobi-settings-units';
const LOCAL_STORAGE_KEY_PROFS = 'vobi-settings-profs';
const LOCAL_STORAGE_KEY_ROLES = 'vobi-settings-roles';
const LOCAL_STORAGE_KEY_GENERAL = 'vobi-settings-general';
const LOCAL_STORAGE_KEY_COL_WIDTHS = 'vobi-settings-col-widths';
const LOCAL_STORAGE_KEY_SORT_PROFS = 'vobi-settings-sort-profs';
const LOCAL_STORAGE_KEY_SORT_FORN = 'vobi-settings-sort-forn';
const LOCAL_STORAGE_KEY_SORT_UNITS = 'vobi-settings-sort-units';

const DEFAULT_ROLES = [
    "Engenheiro Civil", "Engenheiro Eletricista", "Engenheiro Mecânico", "Arquiteto",
    "Gerente de Projetos", "Mestre de Obras", "Encarregado Geral", "Almoxarife", "Comprador"
];

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const maskMobilePhone = (value: string) => {
    if (!value) return '';
    let v = value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 7) return v.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
    else if (v.length > 2) return v.replace(/^(\d\d)(\d{0,5})/, '($1) $2');
    else return v.replace(/^(\d*)/, '($1');
};

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('geral');

    // --- General Settings State ---
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY_GENERAL);
            if (saved) {
                try { return JSON.parse(saved); } catch (e) { console.error(e); }
            }
        }
        return {
            impostos: 5.0, custosIndiretos: 8.0, bdi: 25.0,
            cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
            nomeObra: '', empresa: '', cliente: '',
            scheduleType: 'mon_fri', workOnHolidays: false, workOnRegionalHolidays: false
        };
    });

    // --- Address Logic State ---
    const [isLoadingCEP, setIsLoadingCEP] = useState(false);
    const [cepError, setCepError] = useState('');
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [streetSuggestions, setStreetSuggestions] = useState<ViaCEPResponse[]>([]);
    const [showStreetSuggestions, setShowStreetSuggestions] = useState(false);
    const [isLoadingStreets, setIsLoadingStreets] = useState(false);
    const [streetCandidates, setStreetCandidates] = useState<ViaCEPResponse[]>([]);

    // --- Profissionais State ---
    const [profissionais, setProfissionais] = useState<Profissional[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PROFS);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // FIX: Migração de dados. Se o primeiro item não tiver 'atividades',
                    // assume que é cache antigo e usa o padrão novo.
                    if (Array.isArray(parsed) && parsed.length > 0 && !('atividades' in parsed[0])) {
                        console.warn("Cache antigo detectado. Atualizando estrutura de Profissionais.");
                        return DEFAULT_PROFISSIONAIS_DATA;
                    }
                    return parsed;
                } catch (e) { console.error(e); }
            }
        }
        return DEFAULT_PROFISSIONAIS_DATA;
    });

    const [roles, setRoles] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ROLES);
            if (saved) { try { return JSON.parse(saved); } catch (e) { console.error(e); } }
        }
        return DEFAULT_ROLES;
    });
    const [isProfissionalModalOpen, setIsProfissionalModalOpen] = useState(false);
    const [currentProfissional, setCurrentProfissional] = useState<Partial<Profissional>>({});
    const [phoneError, setPhoneError] = useState("");
    const [isAddingNewRole, setIsAddingNewRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");

    // --- Other States ---
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>(fornecedoresData);
    const [recursos, setRecursos] = useState<string[]>(recursosData);
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
    const [newUnit, setNewUnit] = useState({ category: '', name: '', symbol: '' });

    // --- Sorting States ---
    const [sortProfissionais, setSortProfissionais] = useState<{ key: keyof Profissional; direction: 'asc' | 'desc' } | null>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SORT_PROFS);
        return saved ? JSON.parse(saved) : null;
    });
    const [sortFornecedores, setSortFornecedores] = useState<{ key: keyof Fornecedor; direction: 'asc' | 'desc' } | null>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SORT_FORN);
        return saved ? JSON.parse(saved) : null;
    });
    const [sortUnits, setSortUnits] = useState<{ key: keyof UnitItem; direction: 'asc' | 'desc' } | null>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SORT_UNITS);
        return saved ? JSON.parse(saved) : null;
    });

    // --- Column Widths State ---
    const [colWidths, setColWidths] = useState<Record<string, string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY_COL_WIDTHS);
            if (saved) { try { return JSON.parse(saved); } catch (e) { console.error(e); } }
        }
        return {};
    });

    // --- Persistência ---
    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY_UNITS, JSON.stringify(units)); }, [units]);
    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY_PROFS, JSON.stringify(profissionais)); }, [profissionais]);
    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY_ROLES, JSON.stringify(roles)); }, [roles]);
    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY_GENERAL, JSON.stringify(generalSettings)); }, [generalSettings]);
    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY_COL_WIDTHS, JSON.stringify(colWidths)); }, [colWidths]);
    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY_SORT_PROFS, JSON.stringify(sortProfissionais)); }, [sortProfissionais]);
    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY_SORT_FORN, JSON.stringify(sortFornecedores)); }, [sortFornecedores]);
    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY_SORT_UNITS, JSON.stringify(sortUnits)); }, [sortUnits]);

    const updateColumnWidth = (tableId: string, colKey: string, width: string | undefined) => {
        setColWidths(prev => {
            const newWidths = { ...prev };
            const key = `${tableId}_${colKey}`;
            if (width) {
                newWidths[key] = width;
            } else {
                delete newWidths[key];
            }
            return newWidths;
        });
    };

    // --- Componente ResizableTh Corrigido ---
    const ResizableTh = ({
        tableId,
        colKey,
        children,
        initialWidth,
        className = "",
        onSort,
        sortIndicator
    }: {
        tableId: string,
        colKey: string,
        children: React.ReactNode,
        initialWidth?: string,
        className?: string,
        onSort?: () => void,
        sortIndicator?: React.ReactNode
    }) => {
        const thRef = useRef<HTMLTableHeaderCellElement>(null);
        const savedWidth = colWidths[`${tableId}_${colKey}`];
        const currentWidth = savedWidth === 'auto' ? 'auto' : (savedWidth || initialWidth);

        // Função de reset extraída para ser usada tanto no dblclick quanto no mousedown(detail=2)
        const handleResetWidth = () => {
            updateColumnWidth(tableId, colKey, 'auto');
            if (thRef.current) {
                thRef.current.style.width = 'auto';
                thRef.current.style.minWidth = 'auto';
            }
        };

        const handleMouseDown = (e: React.MouseEvent) => {
            // FIX: Detecta duplo clique aqui para evitar conflito com o início do arraste
            if (e.detail === 2) {
                e.preventDefault();
                e.stopPropagation();
                handleResetWidth();
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const th = thRef.current;
            if (!th) return;

            const startX = e.pageX;
            const startWidth = th.offsetWidth;

            const onMouseMove = (moveEvent: MouseEvent) => {
                const newWidth = startWidth + (moveEvent.pageX - startX);
                if (newWidth > 50) {
                    th.style.width = `${newWidth}px`;
                    th.style.minWidth = `${newWidth}px`;
                }
            };

            const onMouseUp = () => {
                if (th) {
                    updateColumnWidth(tableId, colKey, `${th.offsetWidth}px`);
                    th.classList.remove('resizing');
                }
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            th.classList.add('resizing');
        };

        return (
            <th
                ref={thRef}
                className={`px-4 py-3 relative bg-[#242830] border-r border-[#3a3e45] last:border-r-0 select-none ${className}`}
                style={{ width: currentWidth, minWidth: currentWidth }}
            >
                <div className="flex items-center justify-between h-full">
                    <span
                        onClick={onSort}
                        className={`flex items-center truncate ${onSort ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                    >
                        {children} {sortIndicator}
                    </span>
                    <div
                        className="resizer"
                        onMouseDown={handleMouseDown}
                        onDoubleClick={(e) => {
                            // Mantemos como fallback, mas o e.detail no mousedown deve capturar antes
                            e.stopPropagation();
                            handleResetWidth();
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </th>
        );
    };

    const getSortIndicator = (currentSort: { key: any, direction: 'asc' | 'desc' } | null, key: string) => {
        if (!currentSort || currentSort.key !== key) return <span className="text-[#4a4e55] ml-1 text-[10px]">▼</span>;
        return <span className="text-[#0084ff] ml-1 text-[10px]">{currentSort.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    // --- Dados Ordenados ---
    const sortedProfissionais = useMemo(() => {
        let items = [...profissionais];
        if (sortProfissionais) {
            items.sort((a, b) => {
                const aVal = String(a[sortProfissionais.key] || '').toLowerCase();
                const bVal = String(b[sortProfissionais.key] || '').toLowerCase();
                if (aVal < bVal) return sortProfissionais.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortProfissionais.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [profissionais, sortProfissionais]);

    const sortedFornecedores = useMemo(() => {
        let items = [...fornecedores];
        if (sortFornecedores) {
            items.sort((a, b) => {
                const aVal = String(a[sortFornecedores.key] || '').toLowerCase();
                const bVal = String(b[sortFornecedores.key] || '').toLowerCase();
                if (aVal < bVal) return sortFornecedores.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortFornecedores.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [fornecedores, sortFornecedores]);

    const filteredAndSortedUnits = useMemo(() => {
        const lowerSearch = unitSearch.toLowerCase();
        let result = units.filter(u =>
            u.name.toLowerCase().includes(lowerSearch) ||
            u.symbol.toLowerCase().includes(lowerSearch) ||
            u.category.toLowerCase().includes(lowerSearch)
        );
        if (sortUnits) {
            result.sort((a, b) => {
                const aVal = a[sortUnits.key].toLowerCase();
                const bVal = b[sortUnits.key].toLowerCase();
                if (aVal < bVal) return sortUnits.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortUnits.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [units, unitSearch, sortUnits]);

    // --- Handlers de Ordenação ---
    const requestSortProfissionais = (key: keyof Profissional) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortProfissionais && sortProfissionais.key === key && sortProfissionais.direction === 'asc') direction = 'desc';
        setSortProfissionais({ key, direction });
    };

    const requestSortFornecedores = (key: keyof Fornecedor) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortFornecedores && sortFornecedores.key === key && sortFornecedores.direction === 'asc') direction = 'desc';
        setSortFornecedores({ key, direction });
    };

    const requestSortUnits = (key: keyof UnitItem) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortUnits && sortUnits.key === key && sortUnits.direction === 'asc') direction = 'desc';
        setSortUnits({ key, direction });
    };

    // --- ADDRESS LOGIC ---
    const handleGeneralChange = (field: keyof GeneralSettings, value: any) => {
        setGeneralSettings(prev => ({ ...prev, [field]: value }));
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
        handleGeneralChange('cep', newCep);
        setCepError('');
        if (newCep.replace(/\D/g, '').length === 8) {
            setIsLoadingCEP(true);
            try {
                const data = await fetchAddressByCEP(newCep);
                if (data) {
                    setGeneralSettings(prev => ({
                        ...prev, cep: newCep, estado: data.uf, cidade: data.localidade, bairro: data.bairro, logradouro: data.logradouro
                    }));
                    setStreetCandidates([]);
                    await loadCitiesForUF(data.uf);
                } else { setCepError('CEP não encontrado.'); }
            } catch (error) { setCepError('Erro ao buscar CEP.'); } finally { setIsLoadingCEP(false); }
        }
    };

    const handleUFChange = async (uf: string) => {
        setGeneralSettings(prev => ({ ...prev, estado: uf, cidade: '', bairro: '', logradouro: '', cep: '', numero: '' }));
        setAvailableCities([]); setStreetCandidates([]);
        if (uf) await loadCitiesForUF(uf);
    };

    const handleCityChange = (cidade: string) => {
        setGeneralSettings(prev => ({ ...prev, cidade: cidade, bairro: '', logradouro: '', cep: '', numero: '' }));
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
        handleGeneralChange('logradouro', val);
        if (generalSettings.estado && generalSettings.cidade && val.length >= 3) {
            debouncedStreetSearch(generalSettings.estado, generalSettings.cidade, val);
        } else { setShowStreetSuggestions(false); }
    };

    const handleSelectStreetSuggestion = (item: ViaCEPResponse) => {
        const candidates = streetSuggestions.filter(s => s.logradouro === item.logradouro && s.bairro === item.bairro);
        setStreetCandidates(candidates);
        setGeneralSettings(prev => ({ ...prev, logradouro: item.logradouro, bairro: item.bairro, cep: '', complemento: '' }));
        setShowStreetSuggestions(false);
    };

    const handleNumberChange = (val: string) => {
        handleGeneralChange('numero', val);
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
        if (selectedCep) handleGeneralChange('cep', selectedCep);
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

    const handleSaveGeneral = () => {
        localStorage.setItem(LOCAL_STORAGE_KEY_GENERAL, JSON.stringify(generalSettings));
        alert("Configurações gerais salvas com sucesso!");
    };

    // --- Profissionais Handlers ---
    const handleAddProfissional = () => {
        setCurrentProfissional({ cargo: roles[0] });
        setPhoneError("");
        setIsProfissionalModalOpen(true);
        setIsAddingNewRole(false);
    };
    const handleEditProfissional = (p: Profissional) => {
        setCurrentProfissional({ ...p });
        setPhoneError("");
        setIsProfissionalModalOpen(true);
        setIsAddingNewRole(false);
        if (p.cargo && !roles.includes(p.cargo)) setRoles(prev => [...prev, p.cargo].sort());
    };
    const handleDeleteProfissional = (id: number) => {
        if (window.confirm('Remover profissional?')) setProfissionais(prev => prev.filter(p => p.id !== id));
    };
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhoneError("");
        const masked = maskMobilePhone(e.target.value);
        setCurrentProfissional({ ...currentProfissional, telefone: masked });
    };
    const handleSaveProfissional = (e: React.FormEvent) => {
        e.preventDefault();
        setPhoneError("");
        if (!currentProfissional.nome || !currentProfissional.cargo || !currentProfissional.atividades) return alert("Nome, Cargo e Atividades são obrigatórios.");
        const rawPhone = (currentProfissional.telefone || '').replace(/\D/g, '');
        if (rawPhone.length > 0) {
            if (rawPhone.length !== 11) return setPhoneError("Celular deve ter 11 dígitos.");
            if (rawPhone[2] !== '9') return setPhoneError("Celular deve começar com 9.");
        }
        if (currentProfissional.id) {
            setProfissionais(prev => prev.map(p => p.id === currentProfissional.id ? { ...p, ...currentProfissional } as Profissional : p));
        } else {
            const newId = Math.max(0, ...profissionais.map(p => p.id)) + 1;
            setProfissionais(prev => [...prev, { ...currentProfissional, id: newId } as Profissional]);
        }
        setIsProfissionalModalOpen(false);
    };
    const handleAddNewRole = () => {
        if (newRoleName.trim()) {
            setRoles(prev => [...prev, newRoleName.trim()].sort());
            setCurrentProfissional({ ...currentProfissional, cargo: newRoleName.trim() });
            setNewRoleName("");
            setIsAddingNewRole(false);
        }
    };

    // --- Units Handlers ---
    const handleAddUnit = () => {
        if (newUnit.symbol && newUnit.name) {
            const newItem: UnitItem = { ...newUnit, category: 'Usuário', id: generateId() };
            setUnits([newItem, ...units]);
            setNewUnit({ category: '', name: '', symbol: '' });
        } else alert('Preencha Nome e Símbolo.');
    };
    const handleRemoveUnit = (id: string) => {
        if (window.confirm('Remover unidade?')) setUnits(prev => prev.filter(u => u.id !== id));
    };
    const handleResetUnits = () => {
        if (window.confirm('Restaurar padrão?')) setUnits(DEFAULT_UNITS_DATA.map(u => ({ ...u, id: generateId() })));
    };

    // --- Navegação com ENTER ---
    const handleEnterNavigation = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter') {
            const target = e.target as HTMLElement;
            if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return;
            e.preventDefault();
            e.stopPropagation();
            const container = e.currentTarget;
            const selector = 'input:not([disabled]):not([readonly]), select:not([disabled]), button:not([disabled])';
            const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
            const currentIndex = elements.indexOf(target);
            if (currentIndex > -1 && currentIndex < elements.length - 1) {
                let nextElement = elements[currentIndex + 1];
                if (nextElement.tagName === 'BUTTON' && nextElement.getAttribute('type') === 'button' && currentIndex + 2 < elements.length) {
                    const elementAfterNext = elements[currentIndex + 2];
                    if (elementAfterNext.tagName === 'BUTTON' && elementAfterNext.getAttribute('type') === 'submit') {
                        nextElement = elementAfterNext;
                    }
                }
                nextElement.focus();
            }
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'geral':
                return (
                    <div onKeyDown={handleEnterNavigation}>
                        <div className="flex justify-end mb-4">
                            <Button variant="primary" onClick={handleSaveGeneral}>💾 Salvar Configurações Gerais</Button>
                        </div>
                        <Card>
                            <CardHeader title="🏗️ Informações da Obra" />
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nome da Obra</label>
                                        <input type="text" value={generalSettings.nomeObra} onChange={e => handleGeneralChange('nomeObra', e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Empresa</label>
                                        <input type="text" value={generalSettings.empresa} onChange={e => handleGeneralChange('empresa', e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Cliente</label>
                                        <input type="text" value={generalSettings.cliente} onChange={e => handleGeneralChange('cliente', e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" />
                                    </div>
                                </div>
                                <hr className="border-[#3a3e45]" />
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-[#e8eaed] mb-2">Localização da Obra</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium mb-1">CEP</label>
                                            <div className="relative">
                                                <input type="text" value={generalSettings.cep} onChange={handleCEPChange} placeholder="00000-000" maxLength={9} className={`w-full bg-[#1e2329] border ${cepError ? 'border-red-500' : 'border-[#3a3e45]'} rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm`} />
                                                {isLoadingCEP && <div className="absolute right-3 top-2.5 text-xs text-[#0084ff]">...</div>}
                                            </div>
                                            {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
                                        </div>
                                        <div className="md:col-span-2">
                                            <SearchableDropdown label="UF" options={BRAZILIAN_STATES} value={generalSettings.estado} onChange={handleUFChange} placeholder="UF" required />
                                        </div>
                                        <div className="md:col-span-4">
                                            <SearchableDropdown label="Cidade" options={availableCities} value={generalSettings.cidade} onChange={handleCityChange} placeholder={isLoadingCities ? "Carregando..." : "Selecione a cidade"} disabled={!generalSettings.estado || isLoadingCities} required />
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="block text-sm font-medium mb-1">Bairro</label>
                                            <input type="text" value={generalSettings.bairro} readOnly disabled className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 outline-none text-sm opacity-60 cursor-not-allowed" placeholder="Automático..." />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-6 relative">
                                            <label className="block text-sm font-medium mb-1">Logradouro <span className="text-red-500">*</span></label>
                                            <input type="text" value={generalSettings.logradouro} onChange={e => handleLogradouroChange(e.target.value)} disabled={!generalSettings.cidade} placeholder={!generalSettings.cidade ? "Selecione a cidade primeiro" : "Digite o nome da rua..."} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" autoComplete="off" />
                                            {isLoadingStreets && <div className="absolute right-3 top-9 text-xs text-[#a0a5b0]">Buscando...</div>}
                                            {showStreetSuggestions && (
                                                <div className="absolute z-50 w-full bg-[#242830] border border-[#3a3e45] rounded-md mt-1 shadow-xl max-h-60 overflow-y-auto">
                                                    {getUniqueSuggestions().map((item, idx) => (
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
                                            <input type="text" value={generalSettings.numero} onChange={e => handleNumberChange(e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" />
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="block text-sm font-medium mb-1">Complemento</label>
                                            <input type="text" value={generalSettings.complemento} onChange={e => handleGeneralChange('complemento', e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" />
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
                                    <select value={generalSettings.scheduleType} onChange={e => handleGeneralChange('scheduleType', e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm">
                                        <option value="mon_fri">Segunda a Sexta</option>
                                        <option value="mon_sat_half">Segunda a Sábado (Meio)</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-3 pt-6">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" checked={generalSettings.workOnHolidays} onChange={e => handleGeneralChange('workOnHolidays', e.target.checked)} className="w-5 h-5 bg-[#1e2329] border border-[#3a3e45] rounded" />
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
                                    <input type="number" value={generalSettings.impostos} onChange={e => handleGeneralChange('impostos', parseFloat(e.target.value))} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">% Custos Indiretos</label>
                                    <input type="number" value={generalSettings.custosIndiretos} onChange={e => handleGeneralChange('custosIndiretos', parseFloat(e.target.value))} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">% BDI</label>
                                    <input type="number" value={generalSettings.bdi} onChange={e => handleGeneralChange('bdi', parseFloat(e.target.value))} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none" />
                                </div>
                            </div>
                        </Card>
                    </div>
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
                                        <ResizableTh tableId="prof" colKey="cargo" initialWidth="15%" onSort={() => requestSortProfissionais('cargo')} sortIndicator={getSortIndicator(sortProfissionais, 'cargo')}>Cargo</ResizableTh>
                                        <ResizableTh tableId="prof" colKey="nome" initialWidth="15%" onSort={() => requestSortProfissionais('nome')} sortIndicator={getSortIndicator(sortProfissionais, 'nome')}>Nome</ResizableTh>
                                        <ResizableTh tableId="prof" colKey="email" initialWidth="15%" onSort={() => requestSortProfissionais('email')} sortIndicator={getSortIndicator(sortProfissionais, 'email')}>Email</ResizableTh>
                                        <ResizableTh tableId="prof" colKey="telefone" initialWidth="12%" onSort={() => requestSortProfissionais('telefone')} sortIndicator={getSortIndicator(sortProfissionais, 'telefone')}>Telefone</ResizableTh>
                                        <ResizableTh tableId="prof" colKey="atividades" onSort={() => requestSortProfissionais('atividades')} sortIndicator={getSortIndicator(sortProfissionais, 'atividades')}>Atividades</ResizableTh>
                                        <th className="px-4 py-3 w-[80px] text-center border-l border-[#3a3e45]">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedProfissionais.map(p => (
                                        <tr key={p.id} className="border-b border-[#3a3e45] hover:bg-[#24282f]">
                                            <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis">{p.cargo}</td>
                                            <td className="px-4 py-3 font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis">{p.nome}</td>
                                            <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis">{p.email || '-'}</td>
                                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{p.telefone || '-'}</td>
                                            <td className="px-4 py-3 whitespace-normal break-words">{p.atividades || '-'}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleEditProfissional(p)} className="text-[#a0a5b0] hover:text-white p-1" title="Editar">✏️</button>
                                                    <button onClick={() => handleDeleteProfissional(p.id)} className="text-red-400 hover:text-red-500 p-1" title="Excluir">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {profissionais.length === 0 && <div className="text-center py-6 text-[#a0a5b0]">Nenhum profissional cadastrado.</div>}
                        </div>
                    </Card>
                );
            case 'fornecedores':
                return (
                    <Card>
                        <CardHeader title="Fornecedores"><Button variant="primary" onClick={() => alert('Adicionar')}>+ Adicionar</Button></CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830]">
                                    <tr>
                                        <ResizableTh tableId="forn" colKey="nome" initialWidth="30%" onSort={() => requestSortFornecedores('nome')} sortIndicator={getSortIndicator(sortFornecedores, 'nome')}>Nome</ResizableTh>
                                        <ResizableTh tableId="forn" colKey="vendedor" initialWidth="30%" onSort={() => requestSortFornecedores('vendedor')} sortIndicator={getSortIndicator(sortFornecedores, 'vendedor')}>Contato</ResizableTh>
                                        <ResizableTh tableId="forn" colKey="email" initialWidth="40%" onSort={() => requestSortFornecedores('email')} sortIndicator={getSortIndicator(sortFornecedores, 'email')}>Email</ResizableTh>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedFornecedores.map((f, i) => (
                                        <tr key={i} className="border-b border-[#3a3e45]">
                                            <td className="px-4 py-3 font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis">{f.nome}</td>
                                            <td className="px-4 py-3 text-[#a0a5b0] whitespace-nowrap overflow-hidden text-ellipsis">{f.vendedor}</td>
                                            <td className="px-4 py-3 text-[#a0a5b0] whitespace-nowrap overflow-hidden text-ellipsis">{f.email}</td>
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
                        <CardHeader title="Unidades"><Button variant="secondary" onClick={handleResetUnits}>↺ Reset</Button></CardHeader>
                        <div className="mb-6 space-y-4">
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#a0a5b0]">🔍</span>
                                <input type="text" placeholder="Procurar unidade..." value={unitSearch} onChange={(e) => setUnitSearch(e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md py-2 pl-10 pr-4 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm" />
                            </div>
                            <div className="bg-[#242830] p-4 rounded-lg border border-[#3a3e45]" onKeyDown={handleEnterNavigation}>
                                <h4 className="text-sm font-bold text-white mb-3">Adicionar Nova Unidade</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                    <div>
                                        <label className="text-xs text-[#a0a5b0] mb-1 block">Nome *</label>
                                        <input type="text" value={newUnit.name} onChange={e => setNewUnit({ ...newUnit, name: e.target.value })} placeholder="Ex: Quilograma" className="w-full bg-[#1e2329] border border-[#3a3e45] rounded p-2 text-sm focus:ring-1 focus:ring-[#0084ff]" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[#a0a5b0] mb-1 block">Símbolo *</label>
                                        <input type="text" value={newUnit.symbol} onChange={e => setNewUnit({ ...newUnit, symbol: e.target.value })} placeholder="Ex: kg" className="w-full bg-[#1e2329] border border-[#3a3e45] rounded p-2 text-sm focus:ring-1 focus:ring-[#0084ff]" />
                                    </div>
                                    <div><Button variant="primary" onClick={handleAddUnit} className="w-full">+ Adicionar</Button></div>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                            <table className="w-full text-sm text-left text-[#a0a5b0]">
                                <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830] sticky top-0 z-20">
                                    <tr>
                                        <ResizableTh tableId="unit" colKey="category" initialWidth="25%" onSort={() => requestSortUnits('category')} sortIndicator={getSortIndicator(sortUnits, 'category')}>Categoria</ResizableTh>
                                        <ResizableTh tableId="unit" colKey="name" initialWidth="35%" onSort={() => requestSortUnits('name')} sortIndicator={getSortIndicator(sortUnits, 'name')}>Nome</ResizableTh>
                                        <ResizableTh tableId="unit" colKey="symbol" initialWidth="20%" onSort={() => requestSortUnits('symbol')} sortIndicator={getSortIndicator(sortUnits, 'symbol')}>Símbolo</ResizableTh>
                                        <th className="px-4 py-3 text-center w-[80px] border-l border-[#3a3e45]">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedUnits.map(u => (
                                        <tr key={u.id} className="border-b border-[#3a3e45] hover:bg-[#24282f]">
                                            <td className="px-4 py-2">{u.category}</td>
                                            <td className="px-4 py-2 text-white">{u.name}</td>
                                            <td className="px-4 py-2 text-[#0084ff]">{u.symbol}</td>
                                            <td className="px-4 py-2 text-center">
                                                <button onClick={() => handleRemoveUnit(u.id)} className="text-red-400 hover:text-red-500 p-1" title="Excluir">🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                );

            case 'recursos':
                return <Card><CardHeader title="Recursos"><Button variant="primary" onClick={() => alert('Add')}>+ Adicionar</Button></CardHeader><div className="flex flex-wrap gap-2">{recursos.map((r, i) => <span key={i} className="bg-[#242830] px-3 py-1 rounded-full text-sm">{r}</span>)}</div></Card>;
            default: return null;
        }
    };

    const tabs: { id: SettingsTab; label: string }[] = [
        { id: 'geral', label: 'Geral' }, { id: 'profissionais', label: 'Profissionais' }, { id: 'fornecedores', label: 'Fornecedores' }, { id: 'unidades', label: 'Unidades' }, { id: 'recursos', label: 'Recursos' }
    ];

    return (
        <div>
            <PageHeader title="⚙️ CONFIGURAÇÕES" subtitle="Gerenciar dados mestres da obra" />
            {isProfissionalModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000]">
                    <div className="bg-[#1e2329] rounded-lg p-6 w-full max-w-md border border-[#3a3e45] max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <h3 className="text-xl font-bold text-white mb-4">{currentProfissional.id ? 'Editar' : 'Adicionar'} Profissional</h3>
                        <form onSubmit={handleSaveProfissional} className="space-y-4" onKeyDown={handleEnterNavigation}>
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome *</label>
                                <input type="text" value={currentProfissional.nome || ''} onChange={e => setCurrentProfissional({ ...currentProfissional, nome: e.target.value })} placeholder="Nome completo" className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 focus:ring-2 focus:ring-[#0084ff] outline-none" required autoFocus />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Cargo/Função *</label>
                                {isAddingNewRole ? (
                                    <div className="flex gap-2"><input type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Novo Cargo" className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 focus:ring-2 focus:ring-[#0084ff] outline-none" autoFocus /><Button type="button" variant="success" onClick={handleAddNewRole} size="sm" className="w-12 justify-center">Ok</Button><Button type="button" variant="danger" onClick={() => setIsAddingNewRole(false)} size="sm" className="w-12 justify-center">X</Button></div>
                                ) : (
                                    <div className="flex gap-2"><select value={currentProfissional.cargo || ''} onChange={e => setCurrentProfissional({ ...currentProfissional, cargo: e.target.value })} required className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 focus:ring-2 focus:ring-[#0084ff] outline-none"><option value="">Selecione...</option>{roles.map(r => <option key={r} value={r}>{r}</option>)}</select><Button type="button" onClick={() => setIsAddingNewRole(true)} title="Adicionar novo cargo">+</Button></div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Descreva as Atividades *</label>
                                <textarea value={currentProfissional.atividades || ''} onChange={e => setCurrentProfissional({ ...currentProfissional, atividades: e.target.value })} placeholder="Descreva as principais atividades..." className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 focus:ring-2 focus:ring-[#0084ff] outline-none min-h-[80px] text-sm resize-y" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input type="email" value={currentProfissional.email || ''} onChange={e => setCurrentProfissional({ ...currentProfissional, email: e.target.value })} placeholder="email@exemplo.com" className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 focus:ring-2 focus:ring-[#0084ff] outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Telefone (Celular)</label>
                                <input type="text" value={currentProfissional.telefone || ''} onChange={handlePhoneChange} placeholder="(DD) 90000-0000" className={`w-full bg-[#242830] border rounded p-2 focus:ring-2 outline-none ${phoneError ? 'border-red-500 focus:ring-red-500' : 'border-[#3a3e45] focus:ring-[#0084ff]'}`} />
                                {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
                            </div>
                            <div className="flex justify-end gap-2 mt-6"><Button type="button" variant="secondary" onClick={() => setIsProfissionalModalOpen(false)}>Cancelar</Button><Button type="submit" variant="primary">Salvar</Button></div>
                        </form>
                    </div>
                </div>
            )}
            <div className="border-b border-[#3a3e45] mb-6"><nav className="flex space-x-4 overflow-x-auto pb-1">{tabs.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap ${activeTab === tab.id ? 'text-[#0084ff] border-b-2 border-[#0084ff]' : 'text-[#a0a5b0] hover:text-white'}`}>{tab.label}</button>)}</nav></div>
            {renderContent()}
        </div>
    );
};

export default Settings;