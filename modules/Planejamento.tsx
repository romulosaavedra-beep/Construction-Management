
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';
import type { PlanejamentoItem, ConstraintItem } from '../types';
import { profissionaisData } from '../data/mockData';
import { formatCurrency, formatDate, addWorkingDays, calculateDurationInWorkingDays, WorkScheduleConfig } from '../utils/formatters';
import { 
    generateScheduleWithGemini, 
    predictAndAdjustScheduleGemini, 
    optimizeCriticalPathGemini, 
    manageConstraintsGemini, 
    generateExecutiveReportGemini
} from '../services/aiPlannerService';

interface PlanejamentoProps {
    orcamentoData: any[]; // Using any to avoid strict type issues with OrcamentoItem
    savedData: PlanejamentoItem[];
    onSave: (data: PlanejamentoItem[]) => void;
}

type Tab = 'cronograma' | 'gantt' | 'predicao' | 'otimizador' | 'restricoes' | 'relatorios';

const HELP_CONTENT: Record<Tab, { title: string; body: string }> = {
    cronograma: {
        title: "Cronograma & Dados (Gerador IA)",
        body: "Aqui você visualiza e edita o cronograma detalhado.\n\nGERADOR COM IA:\n1. Clique em '🤖 Gerar com IA'.\n2. Defina Início, Duração e Unidade na janela.\n3. A IA criará atividades, sequenciamento e alocará recursos automaticamente baseado no escopo.\n\nEDIÇÃO MANUAL:\nUse o botão '✏️ Editar' para modificar células diretamente."
    },
    gantt: {
        title: "Visualização Gantt",
        body: "Gráfico de barras que ilustra o cronograma do projeto.\n\n- Visualize o sequenciamento no tempo.\n- Identifique sobreposições.\n- Acompanhe o progresso visual de cada etapa.\n- Barras azuis: Atividades normais.\n- Barras vermelhas: Atividades atrasadas."
    },
    predicao: {
        title: "Predição e Ajuste (EVM)",
        body: "Monitoramento inteligente baseado na metodologia de Valor Agregado (Earned Value Management).\n\nFUNCIONALIDADE:\nCompara o cronograma planejado (Linha de Base) com os dados reais executados até a Data de Corte.\n\nINDICADORES:\n- SPI (Schedule Performance Index): Eficiência do tempo. (< 1.0 significa atraso).\n- Tendência: Projeção inteligente de quando a obra terminará no ritmo atual.\n\nRESULTADO:\nA IA sugere ações de recuperação específicas para atividades críticas atrasadas."
    },
    otimizador: {
        title: "Otimizador de Caminho Crítico",
        body: "Ferramenta avançada para redução de prazos do projeto.\n\nTÉCNICAS APLICADAS:\n- Fast-Tracking: Identifica tarefas que podem ser feitas em paralelo para ganhar tempo (aumenta risco).\n- Crashing: Sugere onde adicionar recursos para reduzir a duração (aumenta custo).\n\nOBJETIVO:\nEncontrar o melhor cenário para entregar a obra mais cedo com o menor impacto financeiro e de risco possível."
    },
    restricoes: {
        title: "Gestão de Restrições",
        body: "Controle de bloqueios externos que impedem o início de tarefas, independentemente da equipe.\n\nTIPOS COMUNS:\n- Entrega de Materiais (Logística)\n- Liberações de Projetos ou Alvarás\n- Condições Climáticas\n- Disponibilidade de Equipamentos\n\nA IA cruza as datas das restrições com o cronograma para prever paradas futuras e sugerir mitigações."
    },
    relatorios: {
        title: "Relatórios Executivos",
        body: "Geração automática de documentação para stakeholders.\n\nA IA compila todos os dados técnicos, KPIs financeiros, status de prazo e riscos em um texto narrativo, claro e profissional.\n\nIdeal para reuniões semanais de acompanhamento ou reportes para a diretoria/cliente."
    }
};

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

const formatDateOrDash = (dateStr: string) => {
    const formatted = formatDate(dateStr);
    return formatted === 'N/A' ? '-' : formatted;
};

const getStatus = (item: PlanejamentoItem): string => {
    if (item.percentualConclusao >= 100) return 'Finalizado';
    
    if (item.dataInicio && item.dataFim) {
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        const dataFim = new Date(item.dataFim + 'T00:00:00');
        const dataInicio = new Date(item.dataInicio + 'T00:00:00');
        
        if (hoje > dataFim) return 'Atrasado';
        if (item.percentualConclusao > 0) return 'Em andamento';
        if (hoje >= dataInicio) return 'No prazo';
    }
    
    if (item.percentualConclusao > 0) return 'Em andamento';
    
    return 'Não iniciado';
};

const recalculateTree = (items: PlanejamentoItem[], config: WorkScheduleConfig): PlanejamentoItem[] => {
    const itemMap = new Map<number, PlanejamentoItem>();
    items.forEach(item => itemMap.set(item.id, { ...item }));

    const processNode = (parentId: number | null) => {
        const children = items.filter(i => i.pai === parentId);
        if (children.length === 0) return; 

        children.forEach(child => processNode(child.id));
        const freshChildren = children.map(c => itemMap.get(c.id)!);

        let minStart: number | null = null;
        let maxEnd: number | null = null;
        let minStartReal: number | null = null;
        let maxEndReal: number | null = null;
        let totalWeightedProgress = 0;
        let totalValue = 0;

        freshChildren.forEach(child => {
            if (child.dataInicio) {
                const t = new Date(child.dataInicio).getTime();
                if (minStart === null || t < minStart) minStart = t;
            }
            if (child.dataFim) {
                const t = new Date(child.dataFim).getTime();
                if (maxEnd === null || t > maxEnd) maxEnd = t;
            }
            if (child.inicioReal) {
                const t = new Date(child.inicioReal).getTime();
                if (minStartReal === null || t < minStartReal) minStartReal = t;
            }
            if (child.fimReal) {
                const t = new Date(child.fimReal).getTime();
                if (maxEndReal === null || t > maxEndReal) maxEndReal = t;
            }
            const val = child.valorTotal || 0;
            totalValue += val;
            totalWeightedProgress += (child.percentualConclusao || 0) * val;
        });

        if (parentId !== null) {
            const parent = itemMap.get(parentId);
            if (parent) {
                if (minStart !== null) parent.dataInicio = new Date(minStart).toISOString().split('T')[0];
                if (maxEnd !== null) parent.dataFim = new Date(maxEnd).toISOString().split('T')[0];
                if (parent.dataInicio && parent.dataFim) {
                    parent.duracao = calculateDurationInWorkingDays(parent.dataInicio, parent.dataFim, config);
                } else {
                    parent.duracao = 0;
                }
                if (minStartReal !== null) parent.inicioReal = new Date(minStartReal).toISOString().split('T')[0];
                if (maxEndReal !== null) parent.fimReal = new Date(maxEndReal).toISOString().split('T')[0];
                if (parent.inicioReal && parent.fimReal) {
                    parent.duracaoReal = calculateDurationInWorkingDays(parent.inicioReal, parent.fimReal, config);
                } else {
                    parent.duracaoReal = 0;
                }
                if (totalValue > 0) {
                    parent.percentualConclusao = totalWeightedProgress / totalValue;
                } else {
                    const sumPct = freshChildren.reduce((acc, c) => acc + c.percentualConclusao, 0);
                    parent.percentualConclusao = freshChildren.length > 0 ? sumPct / freshChildren.length : 0;
                }
            }
        }
    };

    items.filter(i => i.pai === null).forEach(root => processNode(root.id));
    return Array.from(itemMap.values()).sort((a, b) => a.id - b.id);
};

const handleEnterNavigation = (e: React.KeyboardEvent<HTMLElement>, colId: string) => {
    e.preventDefault();
    const currentInput = e.currentTarget;
    const table = currentInput.closest('table');
    if (!table) return;

    const allInputs = Array.from(table.querySelectorAll(`input[data-col-id="${colId}"], select[data-col-id="${colId}"]`)) as HTMLElement[];
    
    const currentIndex = allInputs.indexOf(currentInput);
    if (currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % allInputs.length;
        const nextInput = allInputs[nextIndex];
        nextInput.focus();
        if (nextInput instanceof HTMLInputElement) {
            nextInput.select();
        }
    }
};

const EditableCell = ({ value, onCommit, type = 'text', className = "", onKeyDown, disabled = false, options = [], isSelected = false, columnId, step, min, max }: {
    value: string | number;
    onCommit: (newValue: string | number) => void;
    type?: 'text' | 'number' | 'date' | 'select';
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent<any>) => void;
    disabled?: boolean;
    options?: string[];
    isSelected?: boolean;
    columnId?: string;
    step?: string;
    min?: number;
    max?: number;
}) => {
    const [currentValue, setCurrentValue] = useState(value);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleBlur = () => {
        if (disabled) return;
        // Loose check to handle string/number diffs
        if (currentValue != value) {
            if (type === 'number') {
                let val = parseFloat(currentValue as string);

                if (isNaN(val)) val = 0; // Default to 0 if empty or invalid

                // Clamp value on blur just in case
                if (max !== undefined && val > max) val = max;
                if (min !== undefined && val < min) val = min;

                // Rounding logic based on step if provided
                if (step) {
                    const stepStr = String(step);
                    if (stepStr.includes('.')) {
                        const decimals = stepStr.split('.')[1].length;
                        val = Number(val.toFixed(decimals));
                    } else {
                        val = Math.round(val);
                    }
                }
                setCurrentValue(val); // Show formatted value
                onCommit(val);
            } else {
                onCommit(currentValue);
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
         let newVal = e.target.value;
         
         if (type === 'number') {
             // Allow empty string or minus sign during typing
             if (newVal === '' || newVal === '-') {
                 setCurrentValue(newVal);
                 return;
             }

             // Enforce decimal places while typing
             if (step) {
                 const stepStr = String(step);
                 if (stepStr.includes('.')) {
                     const maxDecimals = stepStr.split('.')[1].length;
                     // Regex to ensure we don't exceed decimal places
                     const regex = new RegExp(`^-?\\d*(\\.\\d{0,${maxDecimals}})?$`);
                     if (!regex.test(newVal)) return; // Prevent update if regex doesn't match
                 }
             }

             // Enforce Max Value while typing (prevent entering numbers larger than max)
             if (max !== undefined) {
                 const numVal = parseFloat(newVal);
                 if (!isNaN(numVal) && numVal > max) return; // Prevent update
             }
         }

         setCurrentValue(newVal);
    };
    
    const handleLocalKeyDown = (e: React.KeyboardEvent<any>) => {
        if (disabled) return;
        if (onKeyDown) {
            onKeyDown(e);
            if (e.defaultPrevented) return;
        }
        if (e.key === 'Enter') {
            if (columnId) {
                // Force blur-like commit behavior on Enter before navigation
                handleBlur();
                handleEnterNavigation(e, columnId);
            } else {
                e.currentTarget.blur();
            }
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
                data-col-id={columnId}
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
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleLocalKeyDown}
            onFocus={e => e.target.select()}
            disabled={disabled}
            step={step}
            min={min}
            max={max}
            data-col-id={columnId}
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
    const [activeTab, setActiveTab] = useState<Tab>('cronograma');
    const [helpModalOpen, setHelpModalOpen] = useState(false);
    
    // Generator State in Modal
    const [isGeneratorModalOpen, setGeneratorModalOpen] = useState(false);
    const [isGeneratorProcessing, setGeneratorProcessing] = useState(false);
    const abortGeneratorRef = useRef(false);

    const [dataInicialProjeto, setDataInicialProjeto] = useState(new Date().toISOString().split('T')[0]);
    const [dataFinalProjeto, setDataFinalProjeto] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 6); 
        return d.toISOString().split('T')[0];
    });
    const [duration, setDuration] = useState<number | ''>('');
    const [durationUnit, setDurationUnit] = useState<'days' | 'months'>('months');

    // AI Feature States
    const [dataCorte, setDataCorte] = useState(new Date().toISOString().split('T')[0]);
    const [predictResult, setPredictResult] = useState<any>(null);
    const [predictLoading, setPredictLoading] = useState(false);

    const [optimizeResult, setOptimizeResult] = useState<any>(null);
    const [optimizeLoading, setOptimizeLoading] = useState(false);

    const [constraints, setConstraints] = useState<ConstraintItem[]>([]);
    const [newConstraint, setNewConstraint] = useState<Partial<ConstraintItem>>({ type: 'material' } as any);
    const [constraintResult, setConstraintResult] = useState<any>(null);
    const [constraintLoading, setConstraintLoading] = useState(false);

    const [reportResult, setReportResult] = useState<any>(null);
    const [reportLoading, setReportLoading] = useState(false);

    const [scheduleConfig, setScheduleConfig] = useState<WorkScheduleConfig>({ scheduleType: 'mon_fri', workOnHolidays: false });
    const [planejamentoItems, setPlanejamentoItems] = useState<PlanejamentoItem[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [originalItems, setOriginalItems] = useState<PlanejamentoItem[] | null>(null);
    
    const [history, setHistory] = useState<PlanejamentoItem[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [columnWidths, setColumnWidths] = useState<number[]>([]);
    const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set());
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
    const [isRestoreMenuOpen, setRestoreMenuOpen] = useState(false);

    const [profissionaisOptions, setProfissionaisOptions] = useState<string[]>(() => {
        let currentProfs: any[] = profissionaisData;
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PROFS);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                         currentProfs = parsed;
                    }
                }
            } catch (e) { console.error(e); }
        }
        return currentProfs.map(p => `${p.nome} (${p.cargo})`);
    });

    const resizingColumnRef = useRef<{ index: number; startX: number; startWidth: number; } | null>(null);
    const measureCellRef = useRef<HTMLSpanElement | null>(null);
    const restoreButtonRef = useRef<HTMLButtonElement>(null);
    const restoreMenuRef = useRef<HTMLDivElement>(null);

    const baseColumnsConfig: ColumnConfig[] = useMemo(() => [
        { id: 'nivel', label: 'Nível', initialWidth: 100, minWidth: 60 },
        { id: 'discriminacao', label: 'Discriminação', initialWidth: 250, minWidth: 150, align: 'left' },
        { id: 'un', label: 'Un.', initialWidth: 50, minWidth: 40, align: 'center' },
        { id: 'quantidade', label: 'Quant.', initialWidth: 70, minWidth: 60, align: 'right' },
        { id: 'percent_concl', label: '% Concl.', initialWidth: 70, minWidth: 60, align: 'right' },
        { id: 'duracao', label: 'Duração (D)', initialWidth: 80, minWidth: 60, align: 'center' },
        { id: 'inicio', label: 'Data Início', initialWidth: 100, minWidth: 90, align: 'center' },
        { id: 'responsavel', label: 'Responsável', initialWidth: 200, minWidth: 150, align: 'left' },
        { id: 'fim', label: 'Data Fim', initialWidth: 100, minWidth: 90, align: 'center' },
        { id: 'duracao_real', label: 'Dur. Real', initialWidth: 80, minWidth: 60, align: 'center' },
        { id: 'inicio_real', label: 'Início Real', initialWidth: 100, minWidth: 90, align: 'center' },
        { id: 'fim_real', label: 'Fim Real', initialWidth: 100, minWidth: 90, align: 'center' },
        { id: 'progresso', label: 'Progresso', initialWidth: 140, minWidth: 100, align: 'left' },
        { id: 'status', label: 'Status', initialWidth: 100, minWidth: 80, align: 'center' },
    ], []);

    const columnsConfig = useMemo(() => baseColumnsConfig, [baseColumnsConfig]);

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
    }, [orcamentoData, savedData, scheduleConfig]);

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

    // Date and Duration Sync Logic
    const calculateEndDate = (start: string, dur: number, unit: 'days' | 'months') => {
        if (!start) return '';
        const d = new Date(start);
        if (unit === 'days') d.setDate(d.getDate() + dur);
        else d.setMonth(d.getMonth() + dur);
        return d.toISOString().split('T')[0];
    };
  
    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        let newEnd = dataFinalProjeto;
        
        if (newStart && typeof duration === 'number') {
            newEnd = calculateEndDate(newStart, duration, durationUnit);
        }
        setDataInicialProjeto(newStart);
        setDataFinalProjeto(newEnd);
    };
  
    const handleDurationChange = (val: number | '') => {
        setDuration(val);
        if (val !== '' && dataInicialProjeto) {
            const newEnd = calculateEndDate(dataInicialProjeto, Number(val), durationUnit);
            setDataFinalProjeto(newEnd);
        }
    };
  
    const handleUnitChange = (unit: 'days' | 'months') => {
        setDurationUnit(unit);
        if (duration !== '' && dataInicialProjeto) {
            const newEnd = calculateEndDate(dataInicialProjeto, Number(duration), unit);
            setDataFinalProjeto(newEnd);
        }
    };
  
    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEnd = e.target.value;
        setDataFinalProjeto(newEnd);
        
        if (dataInicialProjeto && newEnd) {
            const start = new Date(dataInicialProjeto);
            const end = new Date(newEnd);
            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0) {
                setDuration(diffDays);
                setDurationUnit('days');
            }
        }
    };

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
        
        if (fieldName.includes('inicio') && duracao > 0 && inicio) {
            fim = addWorkingDays(inicio, duracao, scheduleConfig);
        } 
        else if (fieldName.includes('fim') && inicio && fim) {
            duracao = calculateDurationInWorkingDays(inicio, fim, scheduleConfig);
        } 
        else if (fieldName.includes('duracao') && inicio && duracao > 0) {
            fim = addWorkingDays(inicio, duracao, scheduleConfig);
        }

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
                    let safeValue = value;
                    // Enforce precision on commit to ensure data integrity
                    if (typeof safeValue === 'number') {
                        if (field === 'percentualConclusao') {
                            if (safeValue > 100) safeValue = 100;
                            if (safeValue < 0) safeValue = 0;
                            safeValue = Number(safeValue.toFixed(2));
                        }
                        else if (field === 'duracao' || field === 'duracaoReal') safeValue = Number(safeValue.toFixed(1));
                    }
                    
                    let updates: any = { [field]: safeValue };
                    if (['duracao', 'dataInicio', 'dataFim'].includes(field)) {
                        updates = { ...updates, ...calculateDateLogic(item, field, safeValue, '') };
                    }
                    if (['duracaoReal', 'inicioReal', 'fimReal'].includes(field)) {
                        updates = { ...updates, ...calculateDateLogic(item, field, safeValue, 'Real') };
                    }
                    return { ...item, ...updates };
                }
                return item;
            });
            
            return recalculateTree(updatedList, scheduleConfig);
        });
    };

    // --- AI Handlers ---
    const handleUpdateScheduleFromAI = (newSchedule: PlanejamentoItem[]) => {
        updateItems(recalculateTree(newSchedule, scheduleConfig));
        onSave(recalculateTree(newSchedule, scheduleConfig));
    };

    const handleStopGenerator = () => {
        abortGeneratorRef.current = true;
        setGeneratorProcessing(false);
    };

    const handleGenerateSchedule = async () => {
        if(!dataFinalProjeto) { alert("Defina data fim"); return; }
        
        setGeneratorProcessing(true);
        abortGeneratorRef.current = false;

        try {
            const output = await generateScheduleWithGemini({
                dataInicio: dataInicialProjeto,
                dataFim: dataFinalProjeto,
                escopo: planejamentoItems,
                profissionaisDisponiveis: profissionaisOptions,
                scheduleConfig: scheduleConfig
            });
            
            if (abortGeneratorRef.current) return;

            if (output && output.cronograma) {
                 const aiMap = new Map<number, any>(output.cronograma.map((i: any) => [i.id, i]));
                 const newItems = planejamentoItems.map(p => {
                    const aiItem = aiMap.get(p.id);
                    if (aiItem) {
                        return {
                            ...p,
                            duracao: aiItem.duracao,
                            dataInicio: aiItem.dataInicio,
                            dataFim: aiItem.dataFim,
                            responsavel: aiItem.responsavel,
                        };
                    }
                    return p;
                });
                handleUpdateScheduleFromAI(newItems);
                setGeneratorModalOpen(false);
                alert("Cronograma gerado com sucesso!");
            }
        } catch (e) {
            if (!abortGeneratorRef.current) {
                console.error(e);
                alert("Erro ao gerar cronograma");
            }
        } finally {
            if (!abortGeneratorRef.current) {
                setGeneratorProcessing(false);
            }
        }
    };

    const handlePredict = async () => {
        setPredictLoading(true);
        try {
            const output = await predictAndAdjustScheduleGemini(planejamentoItems, planejamentoItems, dataCorte);
            setPredictResult(output);
        } catch (e) { console.error(e); alert("Erro na predição"); } 
        finally { setPredictLoading(false); }
    };

    const handleOptimize = async () => {
        setOptimizeLoading(true);
        try {
            const output = await optimizeCriticalPathGemini(planejamentoItems, { 
                dataLimiteMaxima: dataFinalProjeto || '2025-12-31', 
                orcamentoMaximo: 1000000 
            });
            setOptimizeResult(output);
        } catch (e) { console.error(e); alert("Erro na otimização"); } 
        finally { setOptimizeLoading(false); }
    };

    const handleAnalyzeConstraints = async () => {
        setConstraintLoading(true);
        try {
            const output = await manageConstraintsGemini(constraints, planejamentoItems);
            setConstraintResult(output);
        } catch (e) { console.error(e); alert("Erro na análise de restrições"); } 
        finally { setConstraintLoading(false); }
    };

    const handleGenerateReport = async () => {
        setReportLoading(true);
        try {
            const output = await generateExecutiveReportGemini(planejamentoItems, { spi: 0.95, cpi: 1.02 }, "executivo");
            setReportResult(output);
        } catch (e) { console.error(e); alert("Erro ao gerar relatório"); } 
        finally { setReportLoading(false); }
    };

    const handleAddConstraint = () => {
        if(newConstraint.descricao) {
            setConstraints([...constraints, { 
                id: Date.now().toString(), 
                tipo: newConstraint.tipo as any || 'material', 
                descricao: newConstraint.descricao,
                dataAfetada: newConstraint.dataAfetada
            }]);
            setNewConstraint({ tipo: 'material', descricao: '', dataAfetada: '' } as any);
        }
    };

    // UI Handlers
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
                <tr key={item.id} data-row-id={item.id} className={`border-b border-[#3a3e45] hover:bg-[#24282f] text-xs ${rowBgClass}`}>
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
                                    <EditableCell type="number" value={item.percentualConclusao} onCommit={(v) => handleValueCommit(item.id, 'percentualConclusao', v)} isSelected={isColSelected} columnId={col.id} step="0.01" min={0} max={100} /> 
                                    : `${item.percentualConclusao.toFixed(2)}%`;
                                break;
                            case 'duracao': 
                                content = isEditable ? 
                                    <EditableCell type="number" value={item.duracao} onCommit={(v) => handleValueCommit(item.id, 'duracao', v)} isSelected={isColSelected} columnId={col.id} step="0.1" min={0} /> 
                                    : formatNumberOrDash(item.duracao, 1);
                                break;
                            case 'inicio':
                                content = isEditable ?
                                    <EditableCell type="date" value={item.dataInicio} onCommit={(v) => handleValueCommit(item.id, 'dataInicio', v)} disabled={item.duracao === 0} isSelected={isColSelected} columnId={col.id}/>
                                    : formatDateOrDash(item.dataInicio);
                                break;
                            case 'fim':
                                content = isEditable ?
                                    <EditableCell type="date" value={item.dataFim} onCommit={(v) => handleValueCommit(item.id, 'dataFim', v)} disabled={item.duracao === 0} isSelected={isColSelected} columnId={col.id}/>
                                    : formatDateOrDash(item.dataFim);
                                break;
                            case 'responsavel':
                                content = isEditable ?
                                    <EditableCell type="select" options={profissionaisOptions} value={item.responsavel} onCommit={(v) => handleValueCommit(item.id, 'responsavel', v)} isSelected={isColSelected} columnId={col.id} />
                                    : item.responsavel;
                                break;
                            case 'duracao_real':
                                content = isEditable ? 
                                    <EditableCell type="number" value={item.duracaoReal} onCommit={(v) => handleValueCommit(item.id, 'duracaoReal', v)} isSelected={isColSelected} columnId={col.id} step="0.1" min={0} /> 
                                    : formatNumberOrDash(item.duracaoReal, 1);
                                break;
                            case 'inicio_real':
                                content = isEditable ?
                                    <EditableCell type="date" value={item.inicioReal} onCommit={(v) => handleValueCommit(item.id, 'inicioReal', v)} disabled={item.duracaoReal === 0} isSelected={isColSelected} columnId={col.id}/>
                                    : formatDateOrDash(item.inicioReal);
                                break;
                            case 'fim_real':
                                content = isEditable ?
                                    <EditableCell type="date" value={item.fimReal} onCommit={(v) => handleValueCommit(item.id, 'fimReal', v)} disabled={item.duracaoReal === 0} isSelected={isColSelected} columnId={col.id}/>
                                    : formatDateOrDash(item.fimReal);
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
        min.setDate(min.getDate() - 5);
        max.setDate(max.getDate() + 5);
        const diffTime = max.getTime() - min.getTime();
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { min, max, days: Math.max(days, 1) }; 
    }, [dataInicialProjeto, dataFinalProjeto]);

    const renderGanttRows = (parentId: number | null = null, level = 0): React.ReactElement[] => {
        const items = planejamentoItems.filter(item => item.pai === parentId);

        return items.flatMap(item => {
            const isParent = item.isParent;
            const rowBgClass = !isParent ? '' : 'bg-[rgba(42,50,60,0.3)]';
            const row = (
                <div key={item.id} className={`flex border-b border-[#3a3e45] hover:bg-[#2a323c] ${rowBgClass}`}>
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
                    
                    <div className="w-[250px] flex-shrink-0 p-2 text-xs border-r border-[#3a3e45] flex items-center sticky left-[100px] bg-[#1e2329] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.3)] flex items-center">
                         <span className={`truncate ${isParent ? 'font-bold text-white' : 'text-[#a0a5b0]'}`} title={item.discriminacao}>
                             {item.discriminacao}
                         </span>
                    </div>

                    <div className="relative flex-grow h-8 min-w-[300px]">
                         {Array.from({length: ganttInfo.days}).map((_, i) => (
                            <div key={i} className="absolute top-0 bottom-0 border-r border-[#3a3e45]/20" style={{left: (i+1)*30}}></div>
                         ))}
                         
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
            {/* Generator Modal */}
            {isGeneratorModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000]">
                    <div className="bg-[#1e2329] rounded-lg shadow-xl p-6 w-full max-w-md relative border border-[#3a3e45]">
                        {isGeneratorProcessing && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1e2329]/95 rounded-lg transition-opacity duration-300">
                                <div className="relative w-16 h-16 mb-4">
                                    <div className="absolute inset-0 border-4 border-[#3a3e45] rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-[#0084ff] border-t-transparent rounded-full animate-spin"></div>
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-1">Gerando Cronograma</h4>
                                <p className="text-sm text-[#a0a5b0] mb-4">A IA está definindo datas e responsáveis...</p>
                                <Button variant="danger" size="sm" onClick={handleStopGenerator}>
                                    Interromper
                                </Button>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-4 border-b border-[#3a3e45] pb-2">
                            <h3 className="text-xl font-bold">🤖 Gerar Cronograma com IA</h3>
                            <button onClick={() => setGeneratorModalOpen(false)} className="text-2xl text-[#a0a5b0] hover:text-white">&times;</button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Início do Projeto</label>
                                <input type="date" value={dataInicialProjeto} onChange={handleStartDateChange} className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 outline-none focus:ring-2 focus:ring-[#0084ff]" />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Duração</label>
                                    <input type="number" value={duration} onChange={e => handleDurationChange(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 outline-none focus:ring-2 focus:ring-[#0084ff]" placeholder="-" />
                                </div>
                                <div className="w-28">
                                    <label className="block text-sm font-medium mb-1">Unidade</label>
                                    <select value={durationUnit} onChange={e => handleUnitChange(e.target.value as any)} className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 outline-none focus:ring-2 focus:ring-[#0084ff]">
                                        <option value="months">Meses</option>
                                        <option value="days">Dias</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Fim do Projeto</label>
                                <input type="date" value={dataFinalProjeto} onChange={handleEndDateChange} className="w-full bg-[#242830] border border-[#3a3e45] rounded p-2 outline-none focus:ring-2 focus:ring-[#0084ff]" />
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-2">
                                <Button variant="secondary" onClick={() => setGeneratorModalOpen(false)}>Cancelar</Button>
                                <Button variant="primary" onClick={handleGenerateSchedule} disabled={isGeneratorProcessing}>
                                    ✨ Gerar Cronograma
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Help Modal */}
            {helpModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[2050] flex items-center justify-center p-4">
                    <div className="bg-[#242830] border border-[#3a3e45] p-6 rounded-lg max-w-lg shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <button 
                            onClick={() => setHelpModalOpen(false)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            ℹ️ {HELP_CONTENT[activeTab]?.title || 'Ajuda'}
                        </h4>
                        <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {HELP_CONTENT[activeTab]?.body}
                        </div>
                    </div>
                </div>
            )}

            <span ref={measureCellRef} aria-hidden="true" className="text-xs absolute invisible whitespace-nowrap z-[-1]"></span>
            <PageHeader title="📅 Planejamento de Obra" subtitle="Cronograma Inteligente, Gantt e Ferramentas Avançadas de IA" />

            <div className="border-b border-[#3a3e45] mb-6 overflow-x-auto">
                <nav className="flex space-x-2">
                    {[
                        { id: 'cronograma', label: 'Cronograma & Dados', icon: '📅' },
                        { id: 'gantt', label: 'Visualização Gantt', icon: '📊' },
                        { id: 'predicao', label: 'Predição & Ajuste', icon: '🔮' },
                        { id: 'otimizador', label: 'Otimizador CPM', icon: '🚀' },
                        { id: 'restricoes', label: 'Gestão de Restrições', icon: '⛓️' },
                        { id: 'relatorios', label: 'Relatórios', icon: '📈' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'text-[#0084ff] border-b-2 border-[#0084ff] bg-[#242830]' : 'text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45]'}`}
                        >
                            <span>{tab.icon}</span>
                            <span className="hidden md:inline">{tab.label}</span>
                        </button>
                    ))}
                    <button onClick={() => setHelpModalOpen(true)} className="ml-auto text-[#0084ff] hover:text-white px-3" title="Ajuda sobre esta aba">
                        ℹ️
                    </button>
                </nav>
            </div>
            
            {activeTab === 'cronograma' && (
                <Card>
                    <CardHeader title="Cronograma Detalhado">
                        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 w-full">
                             {/* Metrics */}
                             <div className="flex gap-6 self-center lg:self-end mb-2 lg:mb-0 mr-auto">
                                <div className="text-right">
                                    <div className="text-xs text-[#a0a5b0]">EXECUTADO</div>
                                    <div className="text-lg font-bold text-green-400">{formatCurrency(totalExecutado)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-[#a0a5b0]">ORÇADO</div>
                                    <div className="text-lg font-bold text-blue-400">{formatCurrency(totalOrcamento)}</div>
                                </div>
                             </div>
                            
                             <div className="flex flex-col items-end gap-2">
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

                                     {!isEditing ? (
                                        <>
                                         <Button onClick={handleEdit}>✏️ Editar</Button>
                                         <Button onClick={() => setGeneratorModalOpen(true)}>🤖 Gerar com IA</Button>
                                        </>
                                     ) : (
                                        <>
                                            <Button variant="primary" onClick={handleSaveData}>💾 Salvar</Button>
                                            <Button variant="secondary" onClick={handleExit}>Cancelar</Button>
                                            <Button size="sm" variant="secondary" onClick={handleUndo} disabled={historyIndex <= 0} title="Desfazer (Ctrl+Z)">↩️</Button>
                                            <Button size="sm" variant="secondary" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Refazer (Ctrl+Y)">↪️</Button>
                                        </>
                                     )}
                                 </div>
                             </div>
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
                                        
                                        const batchEditableColumns = new Set(['percent_concl', 'duracao', 'inicio', 'fim', 'responsavel', 'duracao_real', 'inicio_real', 'fim_real']);
                                        const unhideableColumns = new Set(['nivel']);

                                        return (
                                        <th 
                                            key={col.id} 
                                            style={stickyStyle}
                                            className={`group px-2 py-3 relative text-left border-r border-[#3a3e45] select-none ${isColSelected ? 'bg-[#0084ff]/20' : ''} ${isPinned ? 'shadow-[2px_0_5px_rgba(0,0,0,0.3)]' : ''}`}
                                        >
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
                            {renderGanttRows()}
                        </div>
                     </div>
                </Card>
            )}

            {activeTab === 'predicao' && (
                <div className="space-y-6">
                    <Card>
                        <div className="flex items-end gap-4 p-2">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-[#a0a5b0] mb-1">Data de Corte (Data Date)</label>
                                <input type="date" value={dataCorte} onChange={e => setDataCorte(e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] rounded p-2" />
                            </div>
                            <Button variant="primary" onClick={handlePredict} disabled={predictLoading}>
                                {predictLoading ? 'Analisando...' : '🔍 Analisar Desvios'}
                            </Button>
                        </div>
                    </Card>

                    {predictResult && predictResult.analise ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-l-4 border-blue-500">
                                <h4 className="text-lg font-bold text-white mb-4">Análise EVM</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-[#a0a5b0]">SPI (Performance de Prazo)</div>
                                        <div className={`text-2xl font-bold ${predictResult.analise.spi < 0.9 ? 'text-red-400' : 'text-green-400'}`}>{predictResult.analise.spi?.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-[#a0a5b0]">Estimativa de Atraso</div>
                                        <div className="text-2xl font-bold text-yellow-400">{predictResult.analise.diasAtrasoEstimado} dias</div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-[#3a3e45]">
                                    <div className="text-xs text-[#a0a5b0]">Tendência de Término</div>
                                    <div className="text-xl font-bold text-white">{predictResult.analise.tendenciaFinal}</div>
                                </div>
                            </Card>

                            <Card>
                                <h4 className="text-lg font-bold text-white mb-4">Recomendações de Ajuste</h4>
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {predictResult.ajustesRecomendados?.map((adj: any, idx: number) => (
                                        <div key={idx} className="bg-[#1e2329] p-3 rounded border border-[#3a3e45]">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-bold text-sm text-[#0084ff]">Atividade ID {adj.id_atividade}</span>
                                                <span className="text-xs bg-red-500/20 text-red-400 px-2 rounded">Impacto: {adj.impacto_dias}d</span>
                                            </div>
                                            <p className="text-sm text-white mb-1">{adj.acao}</p>
                                            <p className="text-xs text-[#a0a5b0]">{adj.razao}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    ) : (
                        predictResult && <div className="p-4 text-center bg-[#242830] rounded text-red-400">Dados indisponíveis.</div>
                    )}
                </div>
            )}

            {activeTab === 'otimizador' && (
                <div className="h-full flex flex-col">
                    <Card>
                         <p className="text-sm text-[#a0a5b0] mb-4">
                            O otimizador buscará oportunidades de compressão do cronograma (Crashing/Fast-Tracking) respeitando o orçamento máximo.
                        </p>
                        <Button variant="primary" onClick={handleOptimize} disabled={optimizeLoading}>
                             {optimizeLoading ? 'Otimizando...' : '🚀 Otimizar Caminho Crítico'}
                        </Button>
                    </Card>

                    {optimizeResult && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                            <Card className="text-center">
                                <div className="text-3xl font-bold text-green-400">{optimizeResult.compressaoAlcancada || 0} dias</div>
                                <div className="text-sm text-[#a0a5b0]">Compressão Possível</div>
                            </Card>
                            <Card className="text-center">
                                <div className="text-3xl font-bold text-yellow-400">R$ {optimizeResult.custo_adicional || 0}</div>
                                <div className="text-sm text-[#a0a5b0]">Custo Adicional</div>
                            </Card>
                            <Card className="md:col-span-3">
                                <h4 className="font-bold text-white mb-2">Estratégia Sugerida</h4>
                                <p className="text-sm text-gray-300 mb-4">{optimizeResult.estrategia || "Nenhuma estratégia gerada."}</p>
                                <h5 className="font-bold text-xs text-[#a0a5b0] uppercase mb-2">Detalhes das Ações</h5>
                                <table className="w-full text-xs text-left text-gray-400">
                                    <thead className="bg-[#1e2329] text-white">
                                        <tr>
                                            <th className="p-2">Tipo</th>
                                            <th className="p-2">Impacto</th>
                                            <th className="p-2">Risco</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {optimizeResult.detalhes?.map((d: any, i: number) => (
                                            <tr key={i} className="border-b border-[#3a3e45]">
                                                <td className="p-2 font-bold">{d.tipo}</td>
                                                <td className="p-2">{d.impacto}</td>
                                                <td className="p-2 text-yellow-500">{d.risco}</td>
                                            </tr>
                                        ))}
                                        {!optimizeResult.detalhes?.length && (
                                            <tr><td colSpan={3} className="p-2 text-center">Nenhum detalhe disponível.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'restricoes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                    <Card>
                        <h4 className="font-bold text-white mb-4">Registro de Restrições</h4>
                        <div className="space-y-2 mb-4 custom-scrollbar max-h-60 overflow-y-auto">
                            {constraints.map(c => (
                                <div key={c.id} className="bg-[#1e2329] p-3 rounded border-l-4 border-red-500 flex justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-red-400 uppercase">{c.tipo}</div>
                                        <div className="text-sm text-white">{c.descricao}</div>
                                        {c.dataAfetada && <div className="text-xs text-[#a0a5b0]">Data: {c.dataAfetada}</div>}
                                    </div>
                                    <button onClick={() => setConstraints(constraints.filter(x => x.id !== c.id))} className="text-[#a0a5b0] hover:text-white">&times;</button>
                                </div>
                            ))}
                            {constraints.length === 0 && <p className="text-sm text-[#a0a5b0] text-center py-4">Nenhuma restrição registrada.</p>}
                        </div>
                        
                        <div className="border-t border-[#3a3e45] pt-4 space-y-3">
                            <select 
                                value={newConstraint.tipo} 
                                onChange={e => setNewConstraint({...newConstraint, tipo: e.target.value as any})}
                                className="w-full bg-[#1e2329] border border-[#3a3e45] rounded p-2 text-xs"
                            >
                                <option value="material">Material</option>
                                <option value="clima">Clima</option>
                                <option value="liberacao">Liberação</option>
                                <option value="rh">Mão de Obra</option>
                            </select>
                            <input 
                                type="text" 
                                placeholder="Descrição da restrição..."
                                value={newConstraint.descricao}
                                onChange={e => setNewConstraint({...newConstraint, descricao: e.target.value})}
                                className="w-full bg-[#1e2329] border border-[#3a3e45] rounded p-2 text-xs"
                            />
                            <input 
                                type="date" 
                                value={newConstraint.dataAfetada}
                                onChange={e => setNewConstraint({...newConstraint, dataAfetada: e.target.value})}
                                className="w-full bg-[#1e2329] border border-[#3a3e45] rounded p-2 text-xs"
                            />
                            <Button variant="secondary" size="sm" className="w-full" onClick={handleAddConstraint}>+ Adicionar Restrição</Button>
                        </div>
                        
                        <Button variant="primary" className="mt-4" onClick={handleAnalyzeConstraints} disabled={constraintLoading}>
                             {constraintLoading ? 'Analisando...' : '⚡ Analisar Impactos'}
                        </Button>
                    </Card>

                    <Card>
                        <h4 className="font-bold text-white mb-4">Análise de Impacto & Mitigação</h4>
                        <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
                        {constraintResult && constraintResult.restricoes_criticas ? (
                             constraintResult.restricoes_criticas.map((rc: any, i: number) => (
                                <div key={i} className="mb-6 bg-[#1e2329] p-4 rounded border border-[#3a3e45]">
                                    <h5 className="text-red-400 font-bold mb-1">{rc.tipo}: {rc.descricao}</h5>
                                    <p className="text-xs text-[#a0a5b0] mb-3">Impacta {rc.atividades_bloqueadas.length} atividades a partir de {rc.data_impacto}</p>
                                    
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-white">Mitigações Sugeridas:</span>
                                        {rc.mitigacoes.map((m: any, idx: number) => (
                                            <div key={idx} className="text-xs bg-[#242830] p-2 rounded flex justify-between items-center">
                                                <span>{m.acao}</span>
                                                <span className={`px-2 py-0.5 rounded ${m.viabilidade === 'ALTA' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{m.viabilidade}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-[#a0a5b0] border-2 border-dashed border-[#3a3e45] rounded-lg">
                                <p>Execute a análise para ver sugestões.</p>
                            </div>
                        )}
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'relatorios' && (
                 <div className="h-full flex flex-col">
                     <Card>
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-white">Relatório Executivo</h4>
                                <p className="text-xs text-[#a0a5b0]">Gere relatórios completos em Markdown com insights da IA.</p>
                            </div>
                            <Button variant="primary" onClick={handleGenerateReport} disabled={reportLoading}>
                                 {reportLoading ? 'Gerando...' : '📄 Gerar Relatório'}
                            </Button>
                        </div>
                     </Card>

                     <div className="flex-1 bg-[#1e2329] border border-[#3a3e45] rounded-lg p-6 overflow-y-auto font-mono text-sm text-gray-300 custom-scrollbar min-h-[400px] mt-6">
                        {reportResult ? (
                            <div className="whitespace-pre-wrap">{reportResult}</div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-[#a0a5b0]">
                                O relatório gerado aparecerá aqui.
                            </div>
                        )}
                     </div>
                 </div>
            )}
        </div>
    );
};

export default Planejamento;
