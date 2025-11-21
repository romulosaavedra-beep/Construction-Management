
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';
import type { PlanejamentoItem, OrcamentoItem, Profissional } from '../types';
import { profissionaisData } from '../data/mockData';
import { formatCurrency, formatDate, addWorkingDays, calculateDurationInWorkingDays, WorkScheduleConfig } from '../utils/formatters';
import { GoogleGenAI, Type } from "@google/genai";

interface PlanejamentoProps {
    orcamentoData: OrcamentoItem[];
    savedData: PlanejamentoItem[];
    onSave: (data: PlanejamentoItem[]) => void;
}

type Tab = 'cronograma' | 'gantt';
type DurationUnit = 'dias' | 'meses';

const LOCAL_STORAGE_KEY_PLAN_WIDTHS = 'vobi-planejamento-column-widths-v3';
const LOCAL_STORAGE_KEY_PLAN_PINNED = 'vobi-planejamento-pinned-columns';
const LOCAL_STORAGE_KEY_PLAN_HIDDEN = 'vobi-planejamento-hidden-columns';
const LOCAL_STORAGE_KEY_PROFS = 'vobi-settings-profs';
const LOCAL_STORAGE_KEY_GENERAL = 'vobi-settings-general';

const formatNumberOrDash = (value: number, decimalPlaces = 2): string => {
    if (value === 0 || isNaN(value)) return '-';
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
    }).format(value);
};

const getStatus = (item: PlanejamentoItem): string => {
    if (item.percentualConclusao >= 100) return 'Finalizado';
    
    if (item.dataInicio && item.dataFim) {
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        const dataFim = new Date(item.dataFim + 'T00:00:00');
        const dataInicio = new Date(item.dataInicio + 'T00:00:00');
        
        // Lógica de Atraso Prioritária
        if (hoje > dataFim) return 'Atrasado';
        
        if (item.percentualConclusao > 0) return 'Em andamento';
        if (hoje >= dataInicio) return 'No prazo';
    }
    
    // Fallback se não tiver datas mas tiver progresso
    if (item.percentualConclusao > 0) return 'Em andamento';
    
    return 'Não iniciado';
};

// Helper function to recalculate parent values based on children
const recalculateTree = (items: PlanejamentoItem[], config: WorkScheduleConfig): PlanejamentoItem[] => {
    // Create a map for quick access and mutation
    const itemMap = new Map<number, PlanejamentoItem>();
    items.forEach(item => itemMap.set(item.id, { ...item }));

    // Recursive function to process nodes
    const processNode = (parentId: number | null) => {
        const children = items.filter(i => i.pai === parentId);

        if (children.length === 0) return; // Leaf node, no calculation needed

        // Process children first (bottom-up approach)
        children.forEach(child => processNode(child.id));

        // Re-fetch fresh children data after they might have been updated
        const freshChildren = children.map(c => itemMap.get(c.id)!);

        let minStart: number | null = null;
        let maxEnd: number | null = null;
        let minStartReal: number | null = null;
        let maxEndReal: number | null = null;
        
        let totalWeightedProgress = 0;
        let totalValue = 0;

        freshChildren.forEach(child => {
            // Planned Dates
            if (child.dataInicio) {
                const t = new Date(child.dataInicio).getTime();
                if (minStart === null || t < minStart) minStart = t;
            }
            if (child.dataFim) {
                const t = new Date(child.dataFim).getTime();
                if (maxEnd === null || t > maxEnd) maxEnd = t;
            }

            // Real Dates
            if (child.inicioReal) {
                const t = new Date(child.inicioReal).getTime();
                if (minStartReal === null || t < minStartReal) minStartReal = t;
            }
            if (child.fimReal) {
                const t = new Date(child.fimReal).getTime();
                if (maxEndReal === null || t > maxEndReal) maxEndReal = t;
            }

            // Weighted Progress Calculation
            const val = child.valorTotal || 0;
            totalValue += val;
            totalWeightedProgress += (child.percentualConclusao || 0) * val;
        });

        // Update Parent in Map
        if (parentId !== null) {
            const parent = itemMap.get(parentId);
            if (parent) {
                // Update Planned Dates
                if (minStart !== null) parent.dataInicio = new Date(minStart).toISOString().split('T')[0];
                if (maxEnd !== null) parent.dataFim = new Date(maxEnd).toISOString().split('T')[0];
                
                // Calculate Planned Duration based on new dates using WORKING DAYS logic
                if (parent.dataInicio && parent.dataFim) {
                    parent.duracao = calculateDurationInWorkingDays(parent.dataInicio, parent.dataFim, config);
                } else {
                    parent.duracao = 0;
                }

                // Update Real Dates
                if (minStartReal !== null) parent.inicioReal = new Date(minStartReal).toISOString().split('T')[0];
                if (maxEndReal !== null) parent.fimReal = new Date(maxEndReal).toISOString().split('T')[0];

                // Calculate Real Duration using WORKING DAYS logic
                if (parent.inicioReal && parent.fimReal) {
                    parent.duracaoReal = calculateDurationInWorkingDays(parent.inicioReal, parent.fimReal, config);
                } else {
                    parent.duracaoReal = 0;
                }

                // Update Progress
                if (totalValue > 0) {
                    parent.percentualConclusao = totalWeightedProgress / totalValue;
                } else {
                    // Fallback to simple average if no value
                    const sumPct = freshChildren.reduce((acc, c) => acc + c.percentualConclusao, 0);
                    parent.percentualConclusao = freshChildren.length > 0 ? sumPct / freshChildren.length : 0;
                }
            }
        }
    };

    // Start processing from root items
    items.filter(i => i.pai === null).forEach(root => processNode(root.id));

    return Array.from(itemMap.values()).sort((a, b) => a.id - b.id);
};

const EditableCell = ({ value, onCommit, type = 'text', className = "", onKeyDown, disabled = false, options = [], isSelected = false }: {
    value: string | number;
    onCommit: (newValue: string | number) => void;
    type?: 'text' | 'number' | 'date' | 'select';
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void;
    disabled?: boolean;
    options?: string[];
    isSelected?: boolean;
}) => {
    const [currentValue, setCurrentValue] = useState(value);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleBlur = () => {
        if (disabled) return;
        if (currentValue !== value) {
            if (type === 'number') {
                onCommit(parseFloat(currentValue as string) || 0);
            } else {
                onCommit(currentValue);
            }
        }
    };
    
    const handleLocalKeyDown = (e: React.KeyboardEvent<any>) => {
        if (disabled) return;
        if (onKeyDown) {
            onKeyDown(e);
            if (e.defaultPrevented) return;
        }
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        } else if (e.key === 'Escape') {
            setCurrentValue(value);
            e.currentTarget.blur();
        }
    }

    if (type === 'select') {
        return (
            <select
                value={currentValue}
                onChange={(e) => { setCurrentValue(e.target.value); onCommit(e.target.value); }}
                disabled={disabled}
                onKeyDown={handleLocalKeyDown}
                className={`w-full border rounded-md p-1 text-xs ${className} 
                    ${disabled ? 'cursor-not-allowed bg-[#3a3e45] text-[#a0a5b0] border-[#3a3e45]' : ''}
                    ${isSelected ? 'bg-[#0084ff]/20 border-[#0084ff] text-white' : 'bg-[#242830] border-[#3a3e45]'}
                `}
            >
                <option value="">-</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        );
    }

    return (
        <input
            type={type}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleLocalKeyDown}
            onFocus={e => e.target.select()}
            disabled={disabled}
            className={`w-full border rounded-md p-1 text-xs ${className} 
                ${disabled ? 'cursor-not-allowed bg-[#3a3e45] text-[#a0a5b0] border-[#3a3e45]' : ''}
                ${isSelected ? 'bg-[#0084ff]/20 border-[#0084ff] text-white' : 'bg-[#242830] border-[#3a3e45]'}
            `}
            style={{ textAlign: type === 'number' ? 'right' : 'left' }}
        />
    );
};

interface ColumnConfig {
    id: string;
    label: string;
    initialWidth: number;
    minWidth: number;
    align?: 'left' | 'center' | 'right';
    resizable?: boolean;
}

const Planejamento: React.FC<PlanejamentoProps> = ({ orcamentoData, savedData, onSave }) => {
    const [dataInicialProjeto, setDataInicialProjeto] = useState(new Date().toISOString().split('T')[0]);
    const [dataFinalProjeto, setDataFinalProjeto] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 6); // Default +6 months
        return d.toISOString().split('T')[0];
    });

    // Settings Config (Loaded from Local Storage)
    const [scheduleConfig, setScheduleConfig] = useState<WorkScheduleConfig>({ scheduleType: 'mon_fri', workOnHolidays: false });

    const [planejamentoItems, setPlanejamentoItems] = useState<PlanejamentoItem[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [originalItems, setOriginalItems] = useState<PlanejamentoItem[] | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('cronograma');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    
    // AI Modal State
    const [aiDuration, setAiDuration] = useState<number>(6);
    const [aiDurationUnit, setAiDurationUnit] = useState<DurationUnit>('meses');
    const [aiStartDate, setAiStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [aiEndDate, setAiEndDate] = useState('');

    // History for Undo/Redo
    const [history, setHistory] = useState<PlanejamentoItem[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Column Resizing & Pinning & Hiding & Selection
    const [columnWidths, setColumnWidths] = useState<number[]>([]);
    const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set());
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
    const [isRestoreMenuOpen, setRestoreMenuOpen] = useState(false);

    // Profissionais Options State (loaded from local storage)
    const [profissionaisOptions, setProfissionaisOptions] = useState<string[]>(() => {
        let currentProfs: Profissional[] = profissionaisData;
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PROFS);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                         currentProfs = parsed;
                    }
                }
            } catch (e) {
                console.error("Error loading professionals from settings", e);
            }
        }
        return currentProfs.map(p => `${p.nome} (${p.cargo})`);
    });

    const resizingColumnRef = useRef<{ index: number; startX: number; startWidth: number; } | null>(null);
    const measureCellRef = useRef<HTMLSpanElement | null>(null);
    const restoreButtonRef = useRef<HTMLButtonElement>(null);
    const restoreMenuRef = useRef<HTMLDivElement>(null);

    // Abort Controller Ref for AI
    const abortAiRef = useRef(false);

    const baseColumnsConfig: ColumnConfig[] = useMemo(() => [
        { id: 'nivel', label: 'Nível', initialWidth: 100, minWidth: 60 },
        { id: 'discriminacao', label: 'Discriminação', initialWidth: 250, minWidth: 150, align: 'left' },
        { id: 'un', label: 'Un.', initialWidth: 50, minWidth: 40, align: 'center' },
        { id: 'quantidade', label: 'Quant.', initialWidth: 70, minWidth: 60, align: 'right' },
        { id: 'percent_concl', label: '% Concl.', initialWidth: 70, minWidth: 60, align: 'right' },
        { id: 'duracao', label: 'Duração (D)', initialWidth: 80, minWidth: 60, align: 'center' },
        { id: 'inicio', label: 'Data Início', initialWidth: 100, minWidth: 90, align: 'center' },
        { id: 'fim', label: 'Data Fim', initialWidth: 100, minWidth: 90, align: 'center' },
        { id: 'responsavel', label: 'Responsável', initialWidth: 200, minWidth: 150, align: 'left' },
        { id: 'duracao_real', label: 'Dur. Real', initialWidth: 80, minWidth: 60, align: 'center' },
        { id: 'inicio_real', label: 'Início Real', initialWidth: 100, minWidth: 90, align: 'center' },
        { id: 'fim_real', label: 'Fim Real', initialWidth: 100, minWidth: 90, align: 'center' },
        { id: 'progresso', label: 'Progresso', initialWidth: 140, minWidth: 100, align: 'left' },
        { id: 'status', label: 'Status', initialWidth: 100, minWidth: 80, align: 'center' },
    ], []);

    const columnsConfig = useMemo(() => baseColumnsConfig, [baseColumnsConfig]);

    // Load Schedule Settings
    useEffect(() => {
        const savedGeneral = localStorage.getItem(LOCAL_STORAGE_KEY_GENERAL);
        if (savedGeneral) {
            try {
                const parsed = JSON.parse(savedGeneral);
                if (parsed.scheduleType) {
                    setScheduleConfig({
                        scheduleType: parsed.scheduleType,
                        workOnHolidays: parsed.workOnHolidays || false,
                        workOnRegionalHolidays: parsed.workOnRegionalHolidays || false,
                        city: parsed.cidade || '',
                        state: parsed.estado || ''
                    });
                }
            } catch (e) { console.error("Erro ao carregar configurações de calendário", e); }
        }
    }, []);

    // Initialize AI Date Logic
    useEffect(() => {
        calculateAiDates('duration', 6); // Initialize with defaults
    }, []);

    // Sync budget items with saved planning data
    useEffect(() => {
        if (orcamentoData.length > 0) {
            setPlanejamentoItems(prevItems => {
                const sourceData = savedData.length > 0 ? savedData : prevItems;
                const existingItemsMap = new Map<number, PlanejamentoItem>(sourceData.map(i => [i.id, i]));
                
                const newItems = orcamentoData.map(orcItem => {
                    const existing = existingItemsMap.get(orcItem.id);
                    const valorTotal = (orcItem.mat_unit + orcItem.mo_unit) * orcItem.quantidade;
                    const isParent = orcamentoData.some(child => child.pai === orcItem.id);

                    return {
                        id: orcItem.id,
                        orcamentoId: orcItem.id,
                        nivel: orcItem.nivel,
                        pai: orcItem.pai,
                        discriminacao: orcItem.discriminacao,
                        unidade: orcItem.unidade,
                        quantidade: orcItem.quantidade,
                        valorTotal: valorTotal,
                        isParent: isParent,
                        expandido: existing ? existing.expandido : true,
                        
                        duracao: existing?.duracao || 0,
                        dataInicio: existing?.dataInicio || '',
                        dataFim: existing?.dataFim || '',
                        quantidadeExecutada: existing?.quantidadeExecutada || 0,
                        responsavel: existing?.responsavel || '-',
                        
                        percentualConclusao: existing?.percentualConclusao || 0,
                        duracaoReal: existing?.duracaoReal || 0,
                        inicioReal: existing?.inicioReal || '',
                        fimReal: existing?.fimReal || ''
                    };
                });
                
                return recalculateTree(newItems, scheduleConfig);
            });
        }
    }, [orcamentoData, savedData, scheduleConfig]); // Re-run when config changes

    // Load saved widths, pinned and hidden columns
    useEffect(() => {
        const savedWidthsJSON = localStorage.getItem(LOCAL_STORAGE_KEY_PLAN_WIDTHS);
        if (savedWidthsJSON) {
            try {
                const parsed = JSON.parse(savedWidthsJSON);
                if (Array.isArray(parsed)) {
                    setColumnWidths(parsed);
                }
            } catch(e) { setColumnWidths(columnsConfig.map(c => c.initialWidth)); }
        } else {
             setColumnWidths(columnsConfig.map(c => c.initialWidth));
        }

        const savedPinned = localStorage.getItem(LOCAL_STORAGE_KEY_PLAN_PINNED);
        if (savedPinned) {
            try {
                setPinnedColumns(new Set(JSON.parse(savedPinned)));
            } catch (e) { console.error(e); }
        } else {
             setPinnedColumns(new Set()); 
        }

        const savedHidden = localStorage.getItem(LOCAL_STORAGE_KEY_PLAN_HIDDEN);
        if (savedHidden) {
            try {
                setHiddenColumns(new Set(JSON.parse(savedHidden)));
            } catch (e) { console.error(e); }
        }
    }, [columnsConfig]);

    // Save widths, pinned and hidden
    useEffect(() => {
        if (columnWidths.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEY_PLAN_WIDTHS, JSON.stringify(columnWidths));
        }
    }, [columnWidths]);

    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY_PLAN_PINNED, JSON.stringify(Array.from(pinnedColumns)));
        } catch (e) { console.error(e); }
    }, [pinnedColumns]);

    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY_PLAN_HIDDEN, JSON.stringify(Array.from(hiddenColumns)));
        } catch (e) { console.error(e); }
    }, [hiddenColumns]);

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isRestoreMenuOpen &&
                restoreButtonRef.current &&
                !restoreButtonRef.current.contains(event.target as Node) &&
                restoreMenuRef.current &&
                !restoreMenuRef.current.contains(event.target as Node)
            ) {
                setRestoreMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isRestoreMenuOpen]);

    const updateItems = useCallback((updater: React.SetStateAction<PlanejamentoItem[]>) => {
        setPlanejamentoItems(currentData => {
            const newData = typeof updater === 'function' ? updater(currentData) : updater;
            const newDataCopy = JSON.parse(JSON.stringify(newData));
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(newDataCopy);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            return newData;
        });
    }, [history, historyIndex]);

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setPlanejamentoItems(history[newIndex]);
        }
    }, [history, historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setPlanejamentoItems(history[newIndex]);
        }
    }, [history, historyIndex]);

    const handleClearSelectedColumn = useCallback(() => {
        if (!selectedColumn || !isEditing) return;

        const fieldMap: { [key: string]: keyof PlanejamentoItem } = {
            'percent_concl': 'percentualConclusao',
            'duracao': 'duracao',
            'inicio': 'dataInicio',
            'fim': 'dataFim',
            'responsavel': 'responsavel',
            'duracao_real': 'duracaoReal',
            'inicio_real': 'inicioReal',
            'fim_real': 'fimReal'
        };

        const field = fieldMap[selectedColumn];
        if (!field) return;

        updateItems(prev => {
            const newItems = prev.map(item => {
                if (item.isParent) return item; 

                let newValue: any = '';
                if (field === 'duracao' || field === 'percentualConclusao' || field === 'duracaoReal') {
                    newValue = 0;
                } else if (field === 'responsavel') {
                    newValue = '-';
                }

                return { ...item, [field]: newValue };
            });
            return recalculateTree(newItems, scheduleConfig);
        });
    }, [selectedColumn, isEditing, updateItems, scheduleConfig]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isEditing) return;
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'z';
            const isRedo = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'y';

            if (isUndo) { e.preventDefault(); handleUndo(); }
            else if (isRedo) { e.preventDefault(); handleRedo(); }
            else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedColumn) {
                e.preventDefault();
                handleClearSelectedColumn();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEditing, handleUndo, handleRedo, selectedColumn, handleClearSelectedColumn]);

    const handleEdit = () => {
        const deepCopy = JSON.parse(JSON.stringify(planejamentoItems));
        setOriginalItems(deepCopy);
        setHistory([deepCopy]);
        setHistoryIndex(0);
        setIsEditing(true);
        setSelectedColumn(null);
    };

    const handleSaveData = () => {
        setIsEditing(false);
        setOriginalItems(null);
        setHistory([]);
        setHistoryIndex(-1);
        setSelectedColumn(null);
        onSave(planejamentoItems);
        alert('Cronograma salvo com sucesso!');
    };

    const handleExit = () => {
        if (originalItems) setPlanejamentoItems(originalItems);
        setIsEditing(false);
        setOriginalItems(null);
        setHistory([]);
        setHistoryIndex(-1);
        setSelectedColumn(null);
    };

    // Smart Date Logic with WORKING DAYS Support
    const calculateDateLogic = (
        currentItem: PlanejamentoItem, 
        field: string, 
        val: any, 
        prefix: '' | 'Real'
    ) => {
        let duracao = prefix === '' ? currentItem.duracao : currentItem.duracaoReal;
        let inicio = prefix === '' ? currentItem.dataInicio : currentItem.inicioReal;
        let fim = prefix === '' ? currentItem.dataFim : currentItem.fimReal;

        if (field === `duracao${prefix}`) duracao = Number(val);
        if (field === `dataInicio${prefix}` || field === `inicio${prefix}`) inicio = val;
        if (field === `dataFim${prefix}` || field === `fim${prefix}`) fim = val;

        if (field === `duracao${prefix}` && duracao === 0) {
             return {
                [`duracao${prefix}`]: 0,
                [prefix === '' ? 'dataInicio' : 'inicioReal']: '',
                [prefix === '' ? 'dataFim' : 'fimReal']: ''
            };
        }

        const fieldName = field.replace(prefix, '').toLowerCase();
        
        // CHANGE: Using helper functions for Work Days calculation
        
        if (fieldName.includes('inicio') && duracao > 0 && inicio) {
            // Given Start + Duration -> Calculate End
            fim = addWorkingDays(inicio, duracao, scheduleConfig);
        } 
        else if (fieldName.includes('fim') && inicio && fim) {
            // Given Start + End -> Calculate Duration
            duracao = calculateDurationInWorkingDays(inicio, fim, scheduleConfig);
        } 
        else if (fieldName.includes('duracao') && inicio && duracao > 0) {
            // Given Duration + Start -> Calculate End (Same as first case, but triggered by duration change)
            fim = addWorkingDays(inicio, duracao, scheduleConfig);
        }
        // For End + Duration -> Start calculation, it's inverse logic. 
        // For simplicity in this "No-Setup" context and complexity of reverse working days with holidays,
        // we will stick to "Start date drives the schedule" primarily. 
        // If user changes End Date, we calc duration. If user changes Duration, we extend End Date.

        return {
            [`duracao${prefix}`]: duracao,
            [prefix === '' ? 'dataInicio' : 'inicioReal']: inicio,
            [prefix === '' ? 'dataFim' : 'fimReal']: fim
        };
    };

    const handleValueCommit = (id: number, field: string, value: any) => {
        updateItems(prev => {
            const updatedList = prev.map(item => {
                if (item.id === id) {
                    let updates: any = { [field]: value };
                    if (['duracao', 'dataInicio', 'dataFim'].includes(field)) {
                        updates = { ...updates, ...calculateDateLogic(item, field, value, '') };
                    }
                    if (['duracaoReal', 'inicioReal', 'fimReal'].includes(field)) {
                        updates = { ...updates, ...calculateDateLogic(item, field, value, 'Real') };
                    }
                    return { ...item, ...updates };
                }
                return item;
            });
            
            return recalculateTree(updatedList, scheduleConfig);
        });
    };

    // AI Modal & Logic (unchanged mostly, but passes current dates)
    const calculateAiDates = (changedField: 'start' | 'end' | 'duration', val?: any) => {
        // ... (Logic remains mostly linear for the modal inputs, simple projection)
        let start = changedField === 'start' ? val : aiStartDate;
        let end = changedField === 'end' ? val : aiEndDate;
        let dur = changedField === 'duration' ? val : aiDuration;
        let unit = aiDurationUnit;

        if (!start) return;
        const startDate = new Date(start);

        // NOTE: For the AI Modal, we keep a simple calendar projection for the "Project Overview" dates,
        // or we could apply the working days logic here too. Let's stick to simple projection for the modal inputs
        // to avoid confusing the user with "Why is 6 months not exactly 6 months in dates?".
        
        if (changedField === 'start' || changedField === 'duration') {
            if (dur > 0) {
                const endDate = new Date(startDate);
                if (unit === 'meses') {
                    endDate.setMonth(endDate.getMonth() + parseInt(dur as string));
                } else {
                    endDate.setDate(endDate.getDate() + parseInt(dur as string));
                }
                setAiEndDate(endDate.toISOString().split('T')[0]);
            }
        } else if (changedField === 'end' && end) {
            const endDate = new Date(end);
            const diffTime = endDate.getTime() - startDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (unit === 'meses') {
                setAiDuration(parseFloat((diffDays / 30.44).toFixed(1)));
            } else {
                setAiDuration(diffDays);
            }
        }

        if (changedField === 'start') setAiStartDate(start);
        if (changedField === 'duration') setAiDuration(dur);
        if (changedField === 'end') setAiEndDate(end);
    };
    
    const handleDurationUnitChange = (unit: DurationUnit) => {
        setAiDurationUnit(unit);
        const startDate = new Date(aiStartDate);
        const endDate = new Date(startDate);
        if (unit === 'meses') {
            endDate.setMonth(endDate.getMonth() + parseInt(aiDuration as any));
        } else {
            endDate.setDate(endDate.getDate() + parseInt(aiDuration as any));
        }
        setAiEndDate(endDate.toISOString().split('T')[0]);
    };

    const handleStopAi = () => {
        abortAiRef.current = true;
        setIsAiLoading(false);
    };

    const handleGenerateScheduleAI = async () => {
        if (!aiStartDate || !aiEndDate) {
            alert('Por favor, defina o período do projeto.');
            return;
        }

        abortAiRef.current = false;
        setIsAiLoading(true);
        
        setDataInicialProjeto(aiStartDate);
        setDataFinalProjeto(aiEndDate);

        try {
            const simplifiedItems = planejamentoItems.map(item => ({
                id: item.id,
                discriminacao: item.discriminacao,
                quantidade: item.quantidade,
                unidade: item.unidade,
                isParent: item.isParent,
                pai: item.pai
            }));

            const formattedProfissionais = profissionaisOptions.join(', ');

            const prompt = `
                Atue como um Especialista Sênior em Planejamento e Gestão de Obras.
                
                DADOS DO PROJETO:
                - Início: ${aiStartDate}
                - Fim (Limite): ${aiEndDate}
                - Prazo Total: ${aiDuration} ${aiDurationUnit}
                
                LISTA DE RESPONSÁVEIS PERMITIDA:
                [${formattedProfissionais}]

                SUA MISSÃO:
                Calcular o cronograma executivo.
                
                REGRAS:
                1. "responsavel": Selecione UM da lista.
                2. "duracao": Dias corridos (inteiro > 0).
                3. "dataInicio" e "dataFim": Formato YYYY-MM-DD.

                Retorne APENAS o JSON Array.
                
                Itens:
                ${JSON.stringify(simplifiedItems)}
            `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.NUMBER },
                                duracao: { type: Type.NUMBER },
                                dataInicio: { type: Type.STRING },
                                dataFim: { type: Type.STRING },
                                responsavel: { type: Type.STRING },
                            }
                        }
                    }
                }
            });

            if (abortAiRef.current) return;

            const aiSchedule = JSON.parse(response.text);

            const updatedItems = planejamentoItems.map(item => {
                const aiItem = aiSchedule.find((ai: any) => ai.id === item.id);
                if (aiItem) {
                    // Recalculate end date based on AI duration + Start Date + Work Schedule
                    // to ensure consistency with the new rules
                    const calculatedEndDate = addWorkingDays(aiItem.dataInicio || aiStartDate, aiItem.duracao || 1, scheduleConfig);
                    
                    return {
                        ...item,
                        duracao: aiItem.duracao || 1,
                        dataInicio: aiItem.dataInicio || aiStartDate,
                        dataFim: calculatedEndDate, 
                        responsavel: aiItem.responsavel || '-'
                    };
                }
                return item;
            });

            updateItems(recalculateTree(updatedItems, scheduleConfig));
            onSave(recalculateTree(updatedItems, scheduleConfig));
            
            if (!abortAiRef.current) {
                setIsAiModalOpen(false);
                alert('Cronograma detalhado gerado com sucesso!');
            }

        } catch (error) {
            if (!abortAiRef.current) {
                console.error("Erro IA", error);
                alert("Erro ao gerar cronograma com IA.");
            }
        } finally {
            if (!abortAiRef.current) {
                setIsAiLoading(false);
            }
        }
    };
    
    const handleTogglePin = (columnId: string) => {
        setPinnedColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(columnId)) {
                newSet.delete(columnId);
            } else {
                newSet.add(columnId);
            }
            return newSet;
        });
    };
    
    const handleHideColumn = (columnId: string) => {
        setHiddenColumns(prev => new Set(prev).add(columnId));
    };

    const handleShowColumn = (columnId: string) => {
        setHiddenColumns(prev => {
            const newSet = new Set(prev);
            newSet.delete(columnId);
            return newSet;
        });
    };

    const handleShowAllColumns = () => {
        setHiddenColumns(new Set());
        setRestoreMenuOpen(false);
    };

    const handleColumnSelect = (columnId: string) => {
        setSelectedColumn(prev => prev === columnId ? null : columnId);
    };
    
    const visibleColumns = useMemo(() => {
        return columnsConfig
            .map((col, index) => ({ col, index }))
            .filter(({ col }) => !hiddenColumns.has(col.id));
    }, [columnsConfig, hiddenColumns]);

    const getStickyLeft = useCallback((columnIndex: number) => {
        let left = 0;
        for (let i = 0; i < columnIndex; i++) {
             const { col, index } = visibleColumns[i];
             if (pinnedColumns.has(col.id)) {
                 left += columnWidths[index] || col.initialWidth;
             }
        }
        return left;
    }, [visibleColumns, pinnedColumns, columnWidths]);

    // Resizing Logic
    const handleResizeStart = (e: React.MouseEvent, visibleIndex: number) => {
        e.preventDefault();
        const originalIndex = visibleColumns[visibleIndex].index;
        resizingColumnRef.current = {
            index: originalIndex,
            startX: e.clientX,
            startWidth: columnWidths[originalIndex] || columnsConfig[originalIndex].initialWidth,
        };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!resizingColumnRef.current) return;
        const { index, startX, startWidth } = resizingColumnRef.current;
        const diffX = e.clientX - startX;
        const newWidth = Math.max(columnsConfig[index].minWidth, startWidth + diffX);
        
        setColumnWidths(prev => {
            const next = [...prev];
            while(next.length <= index) next.push(columnsConfig[next.length].initialWidth);
            next[index] = newWidth;
            return next;
        });
    }, [columnsConfig]);

    const handleResizeEnd = useCallback((e: MouseEvent) => {
        resizingColumnRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    }, [handleResizeMove]);

    const handleAutoResize = (visibleIndex: number) => {
        const originalIndex = visibleColumns[visibleIndex].index;
        const column = columnsConfig[originalIndex];
        if (!measureCellRef.current) return;
        
        const measureElement = measureCellRef.current;
        measureElement.className = 'text-xs absolute invisible whitespace-nowrap z-[-1] font-medium';
        measureElement.textContent = column.label;
        let maxWidth = measureElement.offsetWidth;

        planejamentoItems.forEach(item => {
            let text = '';
            if (column.id === 'nivel') text = item.nivel;
            else if (column.id === 'discriminacao') text = item.discriminacao;
            else if (column.id === 'responsavel') text = item.responsavel;
            else if (column.id === 'inicio') text = formatDate(item.dataInicio);
            
            if (text) {
                measureElement.textContent = text;
                maxWidth = Math.max(maxWidth, measureElement.offsetWidth);
            }
        });

        const newWidth = maxWidth + 20;
        setColumnWidths(prev => {
            const next = [...prev];
            while(next.length <= originalIndex) next.push(columnsConfig[next.length].initialWidth);
            next[originalIndex] = Math.max(column.minWidth, newWidth);
            return next;
        });
    };

    const toggleExpand = (id: number) => {
        setPlanejamentoItems(prev => prev.map(item => item.id === id ? { ...item, expandido: !item.expandido } : item));
    };

    const handleExpandAll = () => {
        const anyCollapsed = planejamentoItems.some(i => i.isParent && !i.expandido);
        setPlanejamentoItems(prev => prev.map(i => i.isParent ? { ...i, expandido: anyCollapsed } : i));
    };

    const areAllExpanded = planejamentoItems.every(i => !i.isParent || i.expandido);

    const { totalOrcamento, totalExecutado } = useMemo(() => {
        const total = planejamentoItems.filter(i => !i.isParent).reduce((acc, item) => acc + item.valorTotal, 0);
        const executado = planejamentoItems.filter(i => !i.isParent).reduce((acc, item) => acc + (item.valorTotal * (item.percentualConclusao / 100)), 0);
        return { totalOrcamento: total, totalExecutado: executado };
    }, [planejamentoItems]);

    const renderRows = (parentId: number | null = null, level = 0): React.ReactElement[] => {
        const items = planejamentoItems.filter(item => item.pai === parentId);
        
        return items.flatMap(item => {
            const isParent = item.isParent;
            const isService = !isParent;
            const rowBgClass = isService ? '' : 'bg-[rgba(42,50,60,0.3)]';
            const status = getStatus(item);
            
            const row = (
                <tr key={item.id} className={`border-b border-[#3a3e45] hover:bg-[#24282f] text-xs ${rowBgClass}`}>
                    {visibleColumns.map(({col, index}, visibleIndex) => {
                        let content: React.ReactNode = null;
                        const isEditable = isEditing && !isParent;
                        
                        const isPinned = pinnedColumns.has(col.id) && !isEditing;
                        const stickyLeft = isPinned ? getStickyLeft(visibleIndex) : undefined;
                        const stickyCellBgClass = isService 
                            ? `bg-[#1e2329] hover:bg-[#24282f]` 
                            : `bg-[rgba(42,50,60,0.3)] hover:bg-[#24282f]`;
                        
                        const finalBgClass = isPinned ? 'bg-[#1e2329] group-hover:bg-[#24282f]' : stickyCellBgClass;
                        const isColSelected = selectedColumn === col.id;
                        const cellSelectionClass = isColSelected ? 'bg-[#0084ff]/10' : '';

                        const stickyStyle: React.CSSProperties = isPinned ? {
                            position: 'sticky',
                            left: stickyLeft,
                            zIndex: 20,
                        } : {};

                        switch (col.id) {
                            case 'nivel':
                                content = (
                                    <div className="flex items-center gap-2" style={{ paddingLeft: level * 12 }}>
                                        {isParent ? (
                                            <button onClick={() => toggleExpand(item.id)} title={item.expandido ? "Recolher" : "Expandir"} className="text-[#0084ff] text-base w-5 h-5 flex items-center justify-center">{item.expandido ? '◢' : '◥'}</button>
                                        ) : <div className="w-5"></div>}
                                        <span className="font-medium text-white">{item.nivel}</span>
                                    </div>
                                );
                                break;
                            case 'discriminacao': 
                                content = <span className="font-medium text-white">{item.discriminacao}</span>; 
                                break;
                            case 'un':
                                content = <span className="text-[#a0a5b0]">{item.unidade || '-'}</span>;
                                break;
                            case 'quantidade':
                                content = <span className="text-[#a0a5b0]">{formatNumberOrDash(item.quantidade)}</span>;
                                break;
                            case 'percent_concl': 
                                content = isEditable ? 
                                    <EditableCell type="number" value={item.percentualConclusao} onCommit={(v) => handleValueCommit(item.id, 'percentualConclusao', v)} isSelected={isColSelected} /> 
                                    : `${item.percentualConclusao.toFixed(0)}%`;
                                break;
                            case 'duracao': 
                                content = isEditable ? 
                                    <EditableCell type="number" value={item.duracao} onCommit={(v) => handleValueCommit(item.id, 'duracao', v)} isSelected={isColSelected} /> 
                                    : (item.duracao === 0 ? '-' : item.duracao);
                                break;
                            case 'inicio':
                                content = isEditable ?
                                    <EditableCell type="date" value={item.dataInicio} onCommit={(v) => handleValueCommit(item.id, 'dataInicio', v)} disabled={item.duracao === 0} isSelected={isColSelected}/>
                                    : formatDate(item.dataInicio);
                                break;
                            case 'fim':
                                content = isEditable ?
                                    <EditableCell type="date" value={item.dataFim} onCommit={(v) => handleValueCommit(item.id, 'dataFim', v)} disabled={item.duracao === 0} isSelected={isColSelected}/>
                                    : formatDate(item.dataFim);
                                break;
                            case 'responsavel':
                                content = isEditable ?
                                    <EditableCell type="select" options={profissionaisOptions} value={item.responsavel} onCommit={(v) => handleValueCommit(item.id, 'responsavel', v)} isSelected={isColSelected} />
                                    : item.responsavel;
                                break;
                            case 'duracao_real':
                                content = isEditable ? 
                                    <EditableCell type="number" value={item.duracaoReal} onCommit={(v) => handleValueCommit(item.id, 'duracaoReal', v)} isSelected={isColSelected} /> 
                                    : (item.duracaoReal === 0 ? '-' : item.duracaoReal);
                                break;
                            case 'inicio_real':
                                content = isEditable ?
                                    <EditableCell type="date" value={item.inicioReal} onCommit={(v) => handleValueCommit(item.id, 'inicioReal', v)} disabled={item.duracaoReal === 0} isSelected={isColSelected}/>
                                    : formatDate(item.inicioReal);
                                break;
                            case 'fim_real':
                                content = isEditable ?
                                    <EditableCell type="date" value={item.fimReal} onCommit={(v) => handleValueCommit(item.id, 'fimReal', v)} disabled={item.duracaoReal === 0} isSelected={isColSelected}/>
                                    : formatDate(item.fimReal);
                                break;
                            case 'progresso':
                                content = (
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <ProgressBar percentage={item.percentualConclusao} />
                                        </div>
                                        <span className="text-[10px] w-8 text-right">{item.percentualConclusao.toFixed(0)}%</span>
                                    </div>
                                );
                                break;
                            case 'status':
                                content = <StatusBadge status={status} />;
                                break;
                        }

                        return (
                            <td key={col.id} style={stickyStyle} className={`px-2 py-2 border-r border-[#3a3e45] text-${col.align || 'left'} overflow-hidden text-ellipsis whitespace-nowrap group-hover:bg-[#24282f] ${finalBgClass} ${cellSelectionClass}`}>
                                {content}
                            </td>
                        );
                    })}
                </tr>
            );

            if (isParent && item.expandido) {
                return [row, ...renderRows(item.id, level + 1)];
            }
            return [row];
        });
    };
    
    const ganttInfo = useMemo(() => {
        const min = new Date(dataInicialProjeto);
        const max = new Date(dataFinalProjeto);

        // Buffer de 5 dias antes
        min.setDate(min.getDate() - 5);
        // Buffer de 5 dias depois
        max.setDate(max.getDate() + 5);

        const diffTime = max.getTime() - min.getTime();
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return { min, max, days: Math.max(days, 1) }; // Garante pelo menos 1 dia
    }, [dataInicialProjeto, dataFinalProjeto]);

    const renderGanttRows = (parentId: number | null = null, level = 0): React.ReactElement[] => {
        const items = planejamentoItems.filter(item => item.pai === parentId);

        return items.flatMap(item => {
            const isParent = item.isParent;
            const rowBgClass = !isParent ? '' : 'bg-[rgba(42,50,60,0.3)]';
            const row = (
                <div key={item.id} className={`flex border-b border-[#3a3e45] hover:bg-[#2a323c] ${rowBgClass}`}>
                    {/* Nível Column */}
                    <div className="w-[100px] flex-shrink-0 p-2 text-xs border-r border-[#3a3e45] flex items-center sticky left-0 bg-[#1e2329] z-20">
                        <div style={{ paddingLeft: level * 12 }} className="flex items-center gap-2 overflow-hidden w-full">
                            {isParent ? (
                                <button 
                                    onClick={() => toggleExpand(item.id)} 
                                    className="text-[#0084ff] text-base w-5 h-5 flex items-center justify-center flex-shrink-0"
                                    title={item.expandido ? "Recolher" : "Expandir"}
                                >
                                    {item.expandido ? '◢' : '◥'}
                                </button>
                            ) : <div className="w-5 flex-shrink-0"></div>}
                             <span className={`truncate ${isParent ? 'font-bold text-white' : 'text-[#a0a5b0]'}`}>
                                 {item.nivel}
                             </span>
                        </div>
                    </div>
                    
                    {/* Atividade (Discriminação) Column */}
                    <div className="w-[250px] flex-shrink-0 p-2 text-xs border-r border-[#3a3e45] flex items-center sticky left-[100px] bg-[#1e2329] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                         <span className={`truncate ${isParent ? 'font-bold text-white' : 'text-[#a0a5b0]'}`} title={item.discriminacao}>
                             {item.discriminacao}
                         </span>
                    </div>

                    <div className="relative flex-grow h-8 min-w-[300px]">
                        {/* Grid Lines */}
                         {Array.from({length: ganttInfo.days}).map((_, i) => (
                            <div key={i} className="absolute top-0 bottom-0 border-r border-[#3a3e45]/20" style={{left: (i+1)*30}}></div>
                         ))}
                         
                         {/* Bar */}
                         {!isParent && item.dataInicio && item.dataFim && (
                             <div 
                                className={`absolute top-1.5 h-5 rounded opacity-80 text-[9px] text-white pl-1 overflow-hidden whitespace-nowrap shadow-sm border ${getStatus(item) === 'Atrasado' ? 'bg-red-500 border-red-700' : 'bg-[#0084ff] border-[#0066cc]'}`}
                                style={{ 
                                    left: Math.max(0, Math.ceil((new Date(item.dataInicio).getTime() - ganttInfo.min.getTime()) / (1000 * 60 * 60 * 24))) * 30, 
                                    width: Math.max(1, item.duracao) * 30 
                                }}
                                title={`${item.discriminacao} (${item.duracao}d) - ${getStatus(item)}`}
                             >
                                 {item.duracao}d
                             </div>
                         )}
                    </div>
                </div>
            );

            if (isParent && item.expandido) {
                return [row, ...renderGanttRows(item.id, level + 1)];
            }
            return [row];
        });
    };

    return (
        <div>
            {/* AI Modal */}
            {isAiModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000]">
                    <div className="bg-[#1e2329] rounded-lg shadow-xl p-6 w-full max-w-lg relative border border-[#3a3e45]">
                        
                        {isAiLoading && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1e2329]/95 rounded-lg">
                                <div className="relative w-16 h-16 mb-4">
                                    <div className="absolute inset-0 border-4 border-[#3a3e45] rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-[#0084ff] border-t-transparent rounded-full animate-spin"></div>
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-1">Planejando Obra...</h4>
                                <p className="text-sm text-[#a0a5b0] text-center px-4 mb-4">
                                    Analisando produtividades, sequenciamento e definindo o caminho crítico com Inteligência Artificial.
                                </p>
                                <Button variant="danger" size="sm" onClick={handleStopAi}>
                                    Interromper
                                </Button>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-6 border-b border-[#3a3e45] pb-2">
                            <h3 className="text-xl font-bold text-white">🤖 Planejamento com IA</h3>
                            <button onClick={() => setIsAiModalOpen(false)} className="text-2xl text-[#a0a5b0] hover:text-white">&times;</button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <p className="text-sm text-[#a0a5b0]">Defina o período do projeto para a IA calcular o cronograma detalhado.</p>
                            
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-[#e8eaed] mb-1 uppercase">Data de Início</label>
                                    <input 
                                        type="date" 
                                        value={aiStartDate} 
                                        onChange={(e) => calculateAiDates('start', e.target.value)} 
                                        className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 text-white focus:ring-2 focus:ring-[#0084ff] outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[#e8eaed] mb-1 uppercase">Duração</label>
                                        <input 
                                            type="number" 
                                            value={aiDuration} 
                                            onChange={(e) => calculateAiDates('duration', parseFloat(e.target.value) || 0)} 
                                            className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 text-white focus:ring-2 focus:ring-[#0084ff] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#e8eaed] mb-1 uppercase">Unidade</label>
                                        <div className="flex bg-[#242830] rounded border border-[#3a3e45] p-1">
                                            <button 
                                                onClick={() => handleDurationUnitChange('dias')}
                                                className={`flex-1 text-xs py-1 rounded ${aiDurationUnit === 'dias' ? 'bg-[#0084ff] text-white' : 'text-[#a0a5b0]'}`}
                                            >
                                                DIAS
                                            </button>
                                            <button 
                                                onClick={() => handleDurationUnitChange('meses')}
                                                className={`flex-1 text-xs py-1 rounded ${aiDurationUnit === 'meses' ? 'bg-[#0084ff] text-white' : 'text-[#a0a5b0]'}`}
                                            >
                                                MESES
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#e8eaed] mb-1 uppercase">Data Fim (Calculada)</label>
                                    <input 
                                        type="date" 
                                        value={aiEndDate} 
                                        onChange={(e) => calculateAiDates('end', e.target.value)} 
                                        className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 text-white focus:ring-2 focus:ring-[#0084ff] outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsAiModalOpen(false)}>Cancelar</Button>
                            <Button variant="primary" onClick={handleGenerateScheduleAI}>Gerar Cronograma</Button>
                        </div>
                    </div>
                </div>
            )}

            <span ref={measureCellRef} aria-hidden="true" className="text-xs absolute invisible whitespace-nowrap z-[-1]"></span>
            <PageHeader title="📅 Planejamento de Obra" subtitle="Cronograma Inteligente e Gráfico de Gantt" />

            <div className="border-b border-[#3a3e45] mb-6">
                <nav className="flex space-x-4">
                    <button onClick={() => setActiveTab('cronograma')} className={`px-3 py-2 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'cronograma' ? 'text-[#0084ff] border-b-2 border-[#0084ff]' : 'text-[#a0a5b0] hover:text-white'}`}>
                        Cronograma & Dados
                    </button>
                    <button onClick={() => setActiveTab('gantt')} className={`px-3 py-2 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'gantt' ? 'text-[#0084ff] border-b-2 border-[#0084ff]' : 'text-[#a0a5b0] hover:text-white'}`}>
                        Visualização Gantt
                    </button>
                </nav>
            </div>
            
            {activeTab === 'cronograma' && (
                <Card>
                    <CardHeader title="Cronograma Detalhado">
                        <div className="flex flex-wrap items-center justify-end gap-4 w-full">
                             <div className="text-right mr-auto">
                                <div className="text-xs text-[#a0a5b0]">EXECUTADO</div>
                                <div className="text-lg font-bold text-green-400">{formatCurrency(totalExecutado)}</div>
                            </div>
                            <div className="text-right mr-8">
                                <div className="text-xs text-[#a0a5b0]">ORÇADO</div>
                                <div className="text-lg font-bold text-blue-400">{formatCurrency(totalOrcamento)}</div>
                            </div>
                            
                             {/* Project Dates - Always visible */}
                             <div className="flex gap-2 items-center pr-4 mr-2">
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-[#a0a5b0] uppercase font-bold">Início Projeto</label>
                                    <input 
                                        type="date" 
                                        disabled={!isEditing}
                                        value={dataInicialProjeto} 
                                        onChange={e => setDataInicialProjeto(e.target.value)} 
                                        className={`bg-[#1e2329] border border-[#3a3e45] rounded text-xs p-1 ${!isEditing && 'opacity-60 cursor-not-allowed'}`} 
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-[#a0a5b0] uppercase font-bold">Fim Projeto</label>
                                    <input 
                                        type="date" 
                                        disabled={!isEditing}
                                        value={dataFinalProjeto} 
                                        onChange={e => setDataFinalProjeto(e.target.value)} 
                                        className={`bg-[#1e2329] border border-[#3a3e45] rounded text-xs p-1 ${!isEditing && 'opacity-60 cursor-not-allowed'}`} 
                                    />
                                </div>
                            </div>

                             <div className="flex items-center gap-2">
                                 {hiddenColumns.size > 0 && (
                                <div className="relative">
                                    <Button ref={restoreButtonRef} variant="secondary" onClick={() => setRestoreMenuOpen(!isRestoreMenuOpen)}>
                                        Reexibir ({hiddenColumns.size})
                                    </Button>
                                    {isRestoreMenuOpen && (
                                        <div ref={restoreMenuRef} className="absolute right-0 mt-2 w-56 bg-[#242830] border border-[#3a3e45] rounded-md shadow-lg z-[100]">
                                            <ul className="py-1 text-sm text-[#e8eaed] max-h-60 overflow-y-auto">
                                                {columnsConfig.filter(c => hiddenColumns.has(c.id)).map(c => (
                                                    <li key={c.id}>
                                                        <a href="#" onClick={(e) => { e.preventDefault(); handleShowColumn(c.id); }} className="block px-4 py-2 hover:bg-[#3a3e45]">
                                                          {c.label}
                                                        </a>
                                                    </li>
                                                ))}
                                                <li className="border-t border-[#3a3e45] my-1"></li>
                                                <li>
                                                    <a href="#" onClick={(e) => { e.preventDefault(); handleShowAllColumns(); }} className="block px-4 py-2 hover:bg-[#3a3e45] font-semibold">
                                                        Reexibir Todas
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                                 {!isEditing && (
                                     <>
                                         <Button onClick={handleEdit}>✏️ Editar</Button>
                                         <Button variant="primary" onClick={() => setIsAiModalOpen(true)}>
                                            🤖 Gerar com IA
                                        </Button>
                                     </>
                                 )}
                             </div>

                            {isEditing && (
                                <>
                                    <Button variant="primary" onClick={handleSaveData}>💾 Salvar</Button>
                                    <Button variant="secondary" onClick={handleExit}>Sair sem Salvar</Button>
                                    <Button size="sm" variant="secondary" onClick={handleUndo} disabled={historyIndex <= 0} title="Desfazer (Ctrl+Z)">↩️</Button>
                                    <Button size="sm" variant="secondary" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Refazer (Ctrl+Y)">↪️</Button>
                                </>
                            )}
                        </div>
                    </CardHeader>

                    <div className="overflow-x-auto border rounded-md border-[#3a3e45]">
                        <table className="w-full text-left text-[#a0a5b0] table-fixed border-collapse">
                             <colgroup>
                                {visibleColumns.map(({col, index}) => (
                                    <col key={col.id} style={{ width: columnWidths[index] || col.initialWidth }} />
                                ))}
                            </colgroup>
                            <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830] sticky top-0 z-30 shadow-sm">
                                <tr>
                                    {visibleColumns.map(({col, index: originalIndex}, visibleIndex) => {
                                        const isPinned = pinnedColumns.has(col.id) && !isEditing;
                                        const isColSelected = selectedColumn === col.id;
                                        
                                        const stickyLeft = isPinned ? getStickyLeft(visibleIndex) : undefined;

                                        const stickyStyle: React.CSSProperties = isPinned ? {
                                            position: 'sticky',
                                            left: stickyLeft,
                                            zIndex: 30,
                                            backgroundColor: '#242830'
                                        } : {};
                                        
                                        // Editable columns that support column selection (batch clear)
                                        const batchEditableColumns = new Set(['percent_concl', 'duracao', 'inicio', 'fim', 'responsavel', 'duracao_real', 'inicio_real', 'fim_real']);
                                        const unhideableColumns = new Set(['nivel']);

                                        return (
                                        <th 
                                            key={col.id} 
                                            style={stickyStyle}
                                            className={`group px-2 py-3 relative text-left border-r border-[#3a3e45] select-none ${isColSelected ? 'bg-[#0084ff]/20' : ''} ${isPinned ? 'shadow-[2px_0_5px_rgba(0,0,0,0.3)]' : ''}`}
                                        >
                                            {/* View Mode Pin Control */}
                                            {!isEditing && (
                                                 <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                                    <button
                                                        onClick={() => handleTogglePin(col.id)}
                                                        className="w-5 h-5 rounded-full bg-[#3a3e45] text-white text-[10px] items-center justify-center flex hover:bg-[#0084ff] shadow-md"
                                                        title={isPinned ? "Desafixar Coluna" : "Fixar Coluna"}
                                                    >
                                                        <span className={!isPinned ? 'transform rotate-90' : ''}>📌</span>
                                                    </button>
                                                </div>
                                            )}

                                            {/* Controls Container (Hide & Select) - Same style as Orcamento */}
                                            {isEditing && !unhideableColumns.has(col.id) && (
                                                <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity md:flex z-20">
                                                    {batchEditableColumns.has(col.id) && (
                                                         <button
                                                            onClick={() => handleColumnSelect(col.id)}
                                                            className={`w-4 h-4 rounded-full text-white text-[10px] items-center justify-center flex hover:bg-blue-500/80 ${isColSelected ? 'bg-[#0084ff] opacity-100' : 'bg-[#3a3e45]'}`}
                                                            title={`Selecionar coluna ${col.label} (Delete para limpar)`}
                                                        >
                                                            ▼
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleHideColumn(col.id)}
                                                        className="w-4 h-4 rounded-full bg-[#3a3e45] text-white text-xs items-center justify-center flex hover:bg-red-500/80"
                                                        title={`Ocultar ${col.label}`}
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-1 pr-4">
                                                {col.id === 'nivel' && (
                                                    <button 
                                                        onClick={handleExpandAll} 
                                                        title={areAllExpanded ? "Recolher Tudo" : "Expandir Tudo"}
                                                        className="hover:bg-blue-500/50 p-0.5 rounded text-sm mr-1"
                                                    >
                                                        {areAllExpanded ? '◢' : '◥'}
                                                    </button>
                                                )}
                                                <span className={col.id !== 'nivel' ? "pr-6" : ""}>{col.label}</span>
                                            </div>
                                            
                                            {(col.resizable ?? true) && (
                                                <div
                                                    onMouseDown={(e) => handleResizeStart(e, visibleIndex)}
                                                    onDoubleClick={() => handleAutoResize(visibleIndex)}
                                                    className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-[#0084ff] z-20"
                                                />
                                            )}
                                        </th>
                                    )})}
                                </tr>
                            </thead>
                            <tbody>
                                {renderRows()}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {activeTab === 'gantt' && (
                <Card>
                     <CardHeader title="Visualização Gantt Chart" />
                     <div className="overflow-x-auto relative custom-scrollbar">
                        <div className="min-w-full flex flex-col">
                            {/* Gantt Header */}
                            <div className="flex sticky top-0 z-10 bg-[#242830] border-b border-[#3a3e45]">
                                <div className="w-[100px] flex-shrink-0 px-2 py-3 border-r border-[#3a3e45] font-bold text-xs text-[#e8eaed] sticky left-0 bg-[#242830] z-30 flex items-center justify-start gap-1 pl-2 uppercase">
                                    <button 
                                        onClick={handleExpandAll} 
                                        title={areAllExpanded ? "Recolher Tudo" : "Expandir Tudo"}
                                        className="hover:bg-blue-500/50 p-0.5 rounded text-sm mr-1"
                                    >
                                        {areAllExpanded ? '◢' : '◥'}
                                    </button>
                                    <span>Nível</span>
                                </div>
                                <div className="w-[250px] flex-shrink-0 px-2 py-3 border-r border-[#3a3e45] font-bold text-xs text-[#e8eaed] sticky left-[100px] bg-[#242830] z-30 shadow-[2px_0_5px_rgba(0,0,0,0.3)] flex items-center uppercase">
                                    ATIVIDADE
                                </div>
                                {Array.from({length: ganttInfo.days}).map((_, i) => {
                                    const d = new Date(ganttInfo.min);
                                    d.setDate(d.getDate() + i);
                                    return <div key={i} className="w-[30px] flex-shrink-0 text-[9px] text-center border-r border-[#3a3e45] p-1 text-[#a0a5b0] flex flex-col justify-center items-center bg-[#242830]">
                                        <div>{d.getDate()}</div>
                                        <div>{d.getMonth()+1}</div>
                                    </div>
                                })}
                            </div>
                            {/* Gantt Body (Recursive) */}
                            {renderGanttRows()}
                        </div>
                     </div>
                </Card>
            )}
        </div>
    );
};

export default Planejamento;
