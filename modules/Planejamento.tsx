
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';
import type { PlanejamentoItem, Restriction } from '../types';
import { profissionaisData } from '../data/mockData';
import { formatCurrency, formatDate, addWorkingDays, calculateDurationInWorkingDays, WorkScheduleConfig } from '../utils/formatters';
import {
    generateScheduleWithGemini,
    predictAndAdjustScheduleGemini,
    optimizeCriticalPathGemini,
    manageConstraintsGemini,
    generateExecutiveReportGemini
} from '../services/aiPlannerService';
import { AdvancedAIModal } from '../components/AdvancedAIModal';

interface PlanejamentoProps {
    orcamentoData: any[];
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

const LOCAL_STORAGE_KEY_PLAN_WIDTHS = 'vobi-planejamento-column-widths-v4';
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
    if (item.percentualConclusao >= 100) return 'Concluído';

    if (item.dataInicio && item.dataFim) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
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
        let totalCustoRealizado = 0;

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
            totalCustoRealizado += (child.custoRealizado || 0);
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

                // Aggregations
                parent.custoRealizado = totalCustoRealizado;
                parent.custoOrcado = totalValue; // Matches valorTotal aggregation logic

                if (totalValue > 0) {
                    parent.percentualConclusao = totalWeightedProgress / totalValue;
                } else {
                    const sumPct = freshChildren.reduce((acc, c) => acc + c.percentualConclusao, 0);
                    parent.percentualConclusao = freshChildren.length > 0 ? sumPct / freshChildren.length : 0;
                }

                // Determine parent status based on children/progress
                parent.status = getStatus(parent) as any;
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
    value: string | number | number[] | string[];
    onCommit: (newValue: any) => void;
    type?: 'text' | 'number' | 'date' | 'select' | 'array';
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
    const formatArrayValue = (val: any) => {
        if (Array.isArray(val)) return val.join(', ');
        return val;
    };

    const [currentValue, setCurrentValue] = useState(type === 'array' ? formatArrayValue(value) : value);

    useEffect(() => {
        setCurrentValue(type === 'array' ? formatArrayValue(value) : value);
    }, [value, type]);

    const handleBlur = () => {
        if (disabled) return;

        let commitValue: any = currentValue;

        if (type === 'number') {
            let val = parseFloat(currentValue as string);
            if (isNaN(val)) val = 0;
            if (max !== undefined && val > max) val = max;
            if (min !== undefined && val < min) val = min;
            if (step) {
                const stepStr = String(step);
                if (stepStr.includes('.')) {
                    const decimals = stepStr.split('.')[1].length;
                    val = Number(val.toFixed(decimals));
                } else {
                    val = Math.round(val);
                }
            }
            commitValue = val;
            setCurrentValue(val);
        } else if (type === 'array') {
            // Parse string back to array (numbers or strings)
            const strVal = currentValue as string;
            if (!strVal.trim()) {
                commitValue = [];
            } else {
                const parts = strVal.split(',').map(s => s.trim()).filter(s => s !== '');
                // Try to convert to numbers if looks like numbers
                const numParts = parts.map(p => !isNaN(Number(p)) ? Number(p) : p);
                commitValue = numParts;
            }
        }

        if (commitValue != value) { // Loose check
            onCommit(commitValue);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let newVal = e.target.value;
        if (type === 'number') {
            if (newVal === '' || newVal === '-') {
                setCurrentValue(newVal);
                return;
            }
            if (step) {
                const stepStr = String(step);
                if (stepStr.includes('.')) {
                    const maxDecimals = stepStr.split('.')[1].length;
                    const regex = new RegExp(`^-?\\d*(\\.\\d{0,${maxDecimals}})?$`);
                    if (!regex.test(newVal)) return;
                }
            }
            if (max !== undefined) {
                const numVal = parseFloat(newVal);
                if (!isNaN(numVal) && numVal > max) return;
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
                handleBlur();
                handleEnterNavigation(e, columnId);
            } else {
                e.currentTarget.blur();
            }
        } else if (e.key === 'Escape') {
            setCurrentValue(type === 'array' ? formatArrayValue(value) : value);
            e.currentTarget.blur();
        }
    }

    if (type === 'select') {
        return (
            <select
                value={currentValue as string}
                onChange={(e) => { setCurrentValue(e.target.value); onCommit(e.target.value); }}
                disabled={disabled}
                onKeyDown={handleLocalKeyDown}
                data-col-id={columnId}
                className={`w-full border rounded-md p-1 text-xs ${className} 
                    ${disabled ? 'cursor-not-allowed bg-[#3a3e45] text-[#a0a5b0] border-[#3a3e45]' : ''}
                    ${isSelected ? 'bg-[#0084ff]/20 border-[#0084ff] text-white' : 'bg-[#242830] border-[#3a3e45]'}
                `}
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        );
    }

    return (
        <input
            type={type === 'array' ? 'text' : type}
            value={currentValue as string | number}
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
    const [aiModalOpen, setAiModalOpen] = useState(false);

    const [scheduleConfig, setScheduleConfig] = useState<WorkScheduleConfig>({ scheduleType: 'mon_fri', workOnHolidays: false });
    const [planejamentoItems, setPlanejamentoItems] = useState<PlanejamentoItem[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [originalItems, setOriginalItems] = useState<PlanejamentoItem[] | null>(null);

    const [history, setHistory] = useState<PlanejamentoItem[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [columnWidths, setColumnWidths] = useState<number[]>([]);
    const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set());
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(['lag', 'folga_total', 'folga_livre', 'custo_por_dia', 'dependencia_externa', 'materiais_requeridos', 'risco_nivel', 'observacoes', 'custoRealizado']));
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

    // Full Columns Config based on Critical Data Pillars
    const baseColumnsConfig: ColumnConfig[] = useMemo(() => [
        { id: 'id', label: 'ID', initialWidth: 40, minWidth: 40, align: 'center', resizable: false },
        { id: 'nivel', label: 'Nível', initialWidth: 100, minWidth: 60 },
        { id: 'discriminacao', label: 'Discriminação', initialWidth: 250, minWidth: 150, align: 'left' },
        { id: 'un', label: 'Un.', initialWidth: 50, minWidth: 40, align: 'center' },
        { id: 'quantidade', label: 'Quant.', initialWidth: 70, minWidth: 60, align: 'right' },
        { id: 'percent_concl', label: '% Concl.', initialWidth: 70, minWidth: 60, align: 'right' },
        { id: 'duracao', label: 'Duração (D)', initialWidth: 80, minWidth: 60, align: 'center' },
        { id: 'inicio', label: 'Data Início', initialWidth: 100, minWidth: 90, align: 'center' },
        { id: 'fim', label: 'Data Fim', initialWidth: 100, minWidth: 90, align: 'center' },
        { id: 'responsavel', label: 'Responsável', initialWidth: 180, minWidth: 150, align: 'left' },

        // Pilar 1: Logic & CPM
        { id: 'predecessores', label: 'Predecessores', initialWidth: 100, minWidth: 80, align: 'left' },
        { id: 'sucessores', label: 'Sucessores', initialWidth: 100, minWidth: 80, align: 'left' },
        { id: 'tipoRelacao', label: 'Tipo Rel.', initialWidth: 80, minWidth: 70, align: 'center' },
        { id: 'lag', label: 'Lag (dias)', initialWidth: 70, minWidth: 60, align: 'right' },
        { id: 'folga_total', label: 'Folga Total', initialWidth: 80, minWidth: 70, align: 'center' },
        { id: 'eh_critica', label: 'Crítica', initialWidth: 60, minWidth: 60, align: 'center' },

        // Pilar 2: Execution
        { id: 'duracao_real', label: 'Dur. Real', initialWidth: 80, minWidth: 60, align: 'center' },
        { id: 'inicio_real', label: 'Início Real', initialWidth: 100, minWidth: 90, align: 'center' },
        { id: 'fim_real', label: 'Fim Real', initialWidth: 100, minWidth: 90, align: 'center' },
        { id: 'status', label: 'Status', initialWidth: 100, minWidth: 80, align: 'center' },
        { id: 'observacoes', label: 'Observações', initialWidth: 200, minWidth: 150, align: 'left' },

        // Pilar 3: Optimization
        { id: 'custo_por_dia', label: 'Custo/Dia (R$)', initialWidth: 100, minWidth: 90, align: 'right' },

        // Pilar 4: Constraints
        { id: 'dependencia_externa', label: 'Dep. Externa', initialWidth: 80, minWidth: 70, align: 'center' },
        { id: 'materiais_requeridos', label: 'Materiais Req.', initialWidth: 150, minWidth: 120, align: 'left' },

        // Pilar 5: Report / Financial
        { id: 'custoRealizado', label: 'Custo Real.', initialWidth: 100, minWidth: 90, align: 'right' },
        { id: 'risco_nivel', label: 'Risco', initialWidth: 80, minWidth: 70, align: 'center' },

        { id: 'progresso', label: 'Progresso Visual', initialWidth: 140, minWidth: 100, align: 'left' },
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

                        // Pilar 1 Default
                        duracao: existing?.duracao || 0,
                        dataInicio: existing?.dataInicio || '',
                        dataFim: existing?.dataFim || '',
                        predecessores: existing?.predecessores || [],
                        sucessores: existing?.sucessores || [],
                        tipoRelacao: existing?.tipoRelacao || "FS",
                        lag: existing?.lag || 0,
                        responsavel: existing?.responsavel || '-',
                        folga_total: existing?.folga_total || 0,
                        folga_livre: existing?.folga_livre || 0,
                        eh_critica: existing?.eh_critica || false,
                        caminho_critico: existing?.caminho_critico || false,

                        // Pilar 2 Default
                        quantidadeExecutada: existing?.quantidadeExecutada || 0,
                        percentualConclusao: existing?.percentualConclusao || 0,
                        status: existing?.status || 'Não iniciado',
                        duracaoReal: existing?.duracaoReal || 0,
                        inicioReal: existing?.inicioReal || '',
                        fimReal: existing?.fimReal || '',
                        data_update_real: existing?.data_update_real || '',
                        usuario_update: existing?.usuario_update || '',
                        observacoes: existing?.observacoes || '',
                        desvio_inicio: existing?.desvio_inicio || 0,
                        desvio_prazo: existing?.desvio_prazo || 0,

                        // Pilar 3 Default
                        custo_por_dia: existing?.custo_por_dia || 0,
                        quantidade_recursos_minimo: existing?.quantidade_recursos_minimo || 0,
                        quantidade_recursos_maximo: existing?.quantidade_recursos_maximo || 0,
                        pode_fasttrack: existing?.pode_fasttrack || false,
                        pode_crash: existing?.pode_crash || false,
                        producao_planejada: existing?.producao_planejada || 0,
                        producao_real: existing?.producao_real || 0,
                        indice_produtividade: existing?.indice_produtividade || 1,

                        // Pilar 4 Default
                        restricoes: existing?.restricoes || [],
                        dependencia_externa: existing?.dependencia_externa || false,
                        materiais_requeridos: existing?.materiais_requeridos || [],
                        data_liberacao_minima: existing?.data_liberacao_minima || '',

                        // Pilar 5 Default
                        custoOrcado: valorTotal,
                        custoRealizado: existing?.custoRealizado || 0,
                        risco_nivel: existing?.risco_nivel || 'BAIXO',
                        foto_progresso: existing?.foto_progresso || [],
                        data_conclusao_esperada: existing?.data_conclusao_esperada || ''
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
            } catch (e) { setColumnWidths(columnsConfig.map(c => c.initialWidth)); }
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
            'fim_real': 'fimReal',
            'observacoes': 'observacoes',
            'predecessores': 'predecessores',
            'sucessores': 'sucessores',
            'lag': 'lag',
            'custo_por_dia': 'custo_por_dia',
            'materiais_requeridos': 'materiais_requeridos'
        };

        const field = fieldMap[selectedColumn];
        if (!field) return;

        updateItems(prev => {
            const newItems = prev.map(item => {
                if (item.isParent) return item;
                let newValue: any = '';
                if (field === 'duracao' || field === 'percentualConclusao' || field === 'duracaoReal' || field === 'lag' || field === 'custo_por_dia') {
                    newValue = 0;
                } else if (field === 'predecessores' || field === 'sucessores' || field === 'materiais_requeridos') {
                    newValue = [];
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
            // Calculate Max ID for clamping
            const maxId = prev.length;

            const updatedList = prev.map(item => {
                if (item.id === id) {
                    let safeValue = value;

                    // Strict Validation for Predecessors/Successors
                    if (field === 'predecessores' || field === 'sucessores') {
                        const rawArray = Array.isArray(safeValue) ? safeValue : [];

                        // Logic: Parse Int -> Clamp Max -> Filter > 0 -> Filter Self -> Unique
                        safeValue = rawArray
                            .map((refId: any) => {
                                // Handle strings that might contain decimals (parse as Int drops decimal part)
                                // or parse strings like "1"
                                const num = parseInt(String(refId).trim(), 10);
                                if (isNaN(num)) return null;

                                // Clamp to Max ID ("se digitar algo maior que o último ID... retorna o último ID")
                                if (num > maxId) return maxId;

                                return num;
                            })
                            .filter((num: number | null) => {
                                // Filter out nulls, 0s ("não poder digitar 0"), and self-references
                                return num !== null && num > 0 && num !== item.id;
                            });

                        // Remove duplicates
                        safeValue = [...new Set(safeValue)];
                    }
                    // Enforce precision on commit to ensure data integrity for other fields
                    else if (typeof safeValue === 'number') {
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
            while (next.length <= index) next.push(columnsConfig[next.length].initialWidth);
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
            while (next.length <= originalIndex) next.push(columnsConfig[next.length].initialWidth);
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

    const ganttInfo = useMemo(() => {
        let startTs = Infinity;
        let endTs = -Infinity;
        let hasDates = false;

        planejamentoItems.forEach(item => {
            if (item.dataInicio) {
                const t = new Date(item.dataInicio + 'T00:00:00').getTime();
                if (!isNaN(t)) {
                    if (t < startTs) startTs = t;
                    hasDates = true;
                }
            }
            if (item.dataFim) {
                const t = new Date(item.dataFim + 'T00:00:00').getTime();
                if (!isNaN(t)) {
                    if (t > endTs) endTs = t;
                    hasDates = true;
                }
            }
        });

        if (!hasDates) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            startTs = now.getTime();
            const future = new Date(now);
            future.setDate(future.getDate() + 30);
            endTs = future.getTime();
        }

        if (endTs < startTs) endTs = startTs;

        const min = new Date(startTs);
        const max = new Date(endTs);

        min.setDate(min.getDate() - 5);
        max.setDate(max.getDate() + 5);

        const diffTime = max.getTime() - min.getTime();
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { min, max, days: Math.max(days, 1) };
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
                    {visibleColumns.map(({ col, index }, visibleIndex) => {
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
                            case 'id':
                                content = <span className="text-[#a0a5b0] font-mono">{item.id}</span>;
                                break;
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
                                    <EditableCell type="date" value={item.dataInicio} onCommit={(v) => handleValueCommit(item.id, 'dataInicio', v)} disabled={item.duracao === 0} isSelected={isColSelected} columnId={col.id} />
                                    : formatDateOrDash(item.dataInicio);
                                break;
                            case 'fim':
                                content = isEditable ?
                                    <EditableCell type="date" value={item.dataFim} onCommit={(v) => handleValueCommit(item.id, 'dataFim', v)} disabled={item.duracao === 0} isSelected={isColSelected} columnId={col.id} />
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
                                    <EditableCell type="date" value={item.inicioReal} onCommit={(v) => handleValueCommit(item.id, 'inicioReal', v)} disabled={item.duracaoReal === 0} isSelected={isColSelected} columnId={col.id} />
                                    : formatDateOrDash(item.inicioReal);
                                break;
                            case 'fim_real':
                                content = isEditable ?
                                    <EditableCell type="date" value={item.fimReal} onCommit={(v) => handleValueCommit(item.id, 'fimReal', v)} disabled={item.duracaoReal === 0} isSelected={isColSelected} columnId={col.id} />
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
                            // --- NEW COLUMNS RENDER ---
                            case 'predecessores':
                                content = isEditable ? <EditableCell type="array" value={item.predecessores} onCommit={(v) => handleValueCommit(item.id, 'predecessores', v)} isSelected={isColSelected} columnId={col.id} /> : (item.predecessores?.join(', ') || '-');
                                break;
                            case 'sucessores':
                                content = isEditable ? <EditableCell type="array" value={item.sucessores} onCommit={(v) => handleValueCommit(item.id, 'sucessores', v)} isSelected={isColSelected} columnId={col.id} /> : (item.sucessores?.join(', ') || '-');
                                break;
                            case 'tipoRelacao':
                                content = isEditable ? <EditableCell type="select" options={['FS', 'SS', 'FF', 'SF']} value={item.tipoRelacao} onCommit={(v) => handleValueCommit(item.id, 'tipoRelacao', v)} isSelected={isColSelected} columnId={col.id} /> : item.tipoRelacao;
                                break;
                            case 'lag':
                                content = isEditable ? <EditableCell type="number" value={item.lag} onCommit={(v) => handleValueCommit(item.id, 'lag', v)} isSelected={isColSelected} columnId={col.id} /> : item.lag;
                                break;
                            case 'folga_total':
                                content = <span>{item.folga_total}</span>; // Readonly
                                break;
                            case 'eh_critica':
                                content = <span className={item.eh_critica ? 'text-red-500 font-bold' : 'text-green-500'}>{item.eh_critica ? 'Sim' : 'Não'}</span>;
                                break;
                            case 'observacoes':
                                content = isEditable ? <EditableCell value={item.observacoes} onCommit={(v) => handleValueCommit(item.id, 'observacoes', v)} isSelected={isColSelected} columnId={col.id} /> : item.observacoes;
                                break;
                            case 'custo_por_dia':
                                content = isEditable ? <EditableCell type="number" value={item.custo_por_dia} onCommit={(v) => handleValueCommit(item.id, 'custo_por_dia', v)} isSelected={isColSelected} columnId={col.id} /> : formatCurrency(item.custo_por_dia);
                                break;
                            case 'dependencia_externa':
                                content = isEditable ?
                                    <input type="checkbox" checked={item.dependencia_externa} onChange={(e) => handleValueCommit(item.id, 'dependencia_externa', e.target.checked)} className="w-4 h-4 bg-[#1e2329] border-[#3a3e45] rounded" />
                                    : (item.dependencia_externa ? 'Sim' : 'Não');
                                break;
                            case 'materiais_requeridos':
                                content = isEditable ? <EditableCell type="array" value={item.materiais_requeridos} onCommit={(v) => handleValueCommit(item.id, 'materiais_requeridos', v)} isSelected={isColSelected} columnId={col.id} /> : (item.materiais_requeridos?.join(', ') || '-');
                                break;
                            case 'custoRealizado':
                                content = <span className="font-medium">{formatCurrency(item.custoRealizado)}</span>; // Aggregated
                                break;
                            case 'risco_nivel':
                                content = isEditable ? <EditableCell type="select" options={['BAIXO', 'MÉDIO', 'ALTO']} value={item.risco_nivel} onCommit={(v) => handleValueCommit(item.id, 'risco_nivel', v)} isSelected={isColSelected} columnId={col.id} /> : <span className={`text-xs px-2 py-0.5 rounded ${item.risco_nivel === 'ALTO' ? 'bg-red-500/20 text-red-400' : item.risco_nivel === 'MÉDIO' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{item.risco_nivel}</span>;
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
                        {Array.from({ length: ganttInfo.days }).map((_, i) => (
                            <div key={i} className="absolute top-0 bottom-0 border-r border-[#3a3e45]/20" style={{ left: (i + 1) * 30 }}></div>
                        ))}

                        {!isParent && item.dataInicio && item.dataFim && (
                            <div
                                className={`absolute top-1.5 h-5 rounded opacity-80 text-[9px] text-white pl-1 overflow-hidden whitespace-nowrap shadow-sm border ${getStatus(item) === 'Atrasado' ? 'bg-red-500 border-red-700' : 'bg-[#0084ff] border-[#0066cc]'}`}
                                style={{
                                    left: Math.max(0, Math.ceil((new Date(item.dataInicio + 'T00:00:00').getTime() - ganttInfo.min.getTime()) / (1000 * 60 * 60 * 24))) * 30,
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
            {/* Advanced AI Modal */}
            <AdvancedAIModal
                isOpen={aiModalOpen}
                onClose={() => setAiModalOpen(false)}
                planejamento={planejamentoItems}
                profissionais={profissionaisOptions}
                scheduleConfig={scheduleConfig}
                onUpdateSchedule={handleUpdateScheduleFromAI}
            />

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
            <PageHeader title="📅 Planejamento de Obra" subtitle="Cronograma Inteligente, Gantt e Ferramentas Avançadas" />

            <div className="border-b border-[#3a3e45] mb-6 overflow-x-auto">
                <nav className="flex space-x-2">
                    {[
                        { id: 'cronograma', label: 'Cronograma & Dados', icon: '📅' },
                        { id: 'gantt', label: 'Visualização Gantt', icon: '📊' },
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
                                            <Button onClick={() => setAiModalOpen(true)}>🤖 Ferramentas IA</Button>
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
                                {visibleColumns.map(({ col, index }) => (
                                    <col key={col.id} style={{ width: columnWidths[index] || col.initialWidth }} />
                                ))}
                            </colgroup>
                            <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830] sticky top-0 z-30 shadow-sm">
                                <tr>
                                    {visibleColumns.map(({ col, index: originalIndex }, visibleIndex) => {
                                        const isPinned = pinnedColumns.has(col.id) && !isEditing;
                                        const isColSelected = selectedColumn === col.id;

                                        const stickyLeft = isPinned ? getStickyLeft(visibleIndex) : undefined;

                                        const stickyStyle: React.CSSProperties = isPinned ? {
                                            position: 'sticky',
                                            left: stickyLeft,
                                            zIndex: 30,
                                            backgroundColor: '#242830'
                                        } : {};

                                        // Columns that support batch edit via column header click
                                        const batchEditableColumns = new Set([
                                            'percent_concl', 'duracao', 'inicio', 'fim', 'responsavel',
                                            'duracao_real', 'inicio_real', 'fim_real', 'observacoes',
                                            'predecessores', 'sucessores', 'lag', 'custo_por_dia', 'materiais_requeridos'
                                        ]);
                                        const unhideableColumns = new Set(['nivel', 'id']);

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
                                        )
                                    })}
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
                                {Array.from({ length: ganttInfo.days }).map((_, i) => {
                                    const d = new Date(ganttInfo.min);
                                    d.setDate(d.getDate() + i);
                                    return <div key={i} className="w-[30px] flex-shrink-0 text-[9px] text-center border-r border-[#3a3e45] p-1 text-[#a0a5b0] flex flex-col justify-center items-center bg-[#242830]">
                                        <div>{d.getDate()}</div>
                                        <div>{d.getMonth() + 1}</div>
                                    </div>
                                })}
                            </div>
                            {renderGanttRows()}
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default Planejamento;
