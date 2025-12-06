
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { PlanejamentoItem, ConstraintItem } from '@/types';
import {
    generateScheduleWithGemini,
    predictAndAdjustScheduleGemini,
    optimizeCriticalPathGemini,
    manageConstraintsGemini,
    generateExecutiveReportGemini
} from '@/services/aiPlannerService';
import { WorkScheduleConfig } from '@/utils/formatters';

interface AdvancedAIModalProps {
    isOpen: boolean;
    onClose: () => void;
    planejamento: PlanejamentoItem[];
    profissionais: string[];
    scheduleConfig: WorkScheduleConfig;
    onUpdateSchedule: (newSchedule: PlanejamentoItem[]) => void;
}

type Tab = "builder" | "predictor" | "optimizer" | "constraints" | "report";

// Conteúdo de Ajuda para cada aba
const HELP_CONTENT: Record<Tab, { title: string; body: string }> = {
    builder: {
        title: "Como funciona o Gerador de Cronograma",
        body: "Esta ferramenta utiliza Inteligência Artificial para criar uma proposta inicial de cronograma detalhado.\n\nPASSO A PASSO:\n1. Defina a Data de Início do projeto.\n2. Informe a Duração estimada (em dias ou meses) OU a Data Fim desejada.\n3. Clique em 'Gerar Cronograma'.\n\nO QUE A IA FAZ:\n- Analisa o escopo do orçamento.\n- Estima a duração de cada tarefa baseada em históricos.\n- Define dependências lógicas (sequenciamento).\n- Aloca os profissionais disponíveis.\n- Calcula o caminho crítico automaticamente."
    },
    predictor: {
        title: "Predição e Ajuste (EVM)",
        body: "Monitoramento inteligente baseado na metodologia de Valor Agregado (Earned Value Management).\n\nFUNCIONALIDADE:\nCompara o cronograma planejado (Linha de Base) com os dados reais executados até a Data de Corte.\n\nINDICADORES:\n- SPI (Schedule Performance Index): Eficiência do tempo. (< 1.0 significa atraso).\n- Tendência: Projeção inteligente de quando a obra terminará no ritmo atual.\n\nRESULTADO:\nA IA sugere ações de recuperação específicas para atividades críticas atrasadas."
    },
    optimizer: {
        title: "Otimizador de Caminho Crítico",
        body: "Ferramenta avançada para redução de prazos do projeto.\n\nTÉCNICAS APLICADAS:\n- Fast-Tracking: Identifica tarefas que podem ser feitas em paralelo para ganhar tempo (aumenta risco).\n- Crashing: Sugere onde adicionar recursos para reduzir a duração (aumenta custo).\n\nOBJETIVO:\nEncontrar o melhor cenário para entregar a obra mais cedo com o menor impacto financeiro e de risco possível."
    },
    constraints: {
        title: "Gestão de Restrições",
        body: "Controle de bloqueios externos que impedem o início de tarefas, independentemente da equipe.\n\nTIPOS COMUNS:\n- Entrega de Materiais (Logística)\n- Liberações de Projetos ou Alvarás\n- Condições Climáticas\n- Disponibilidade de Equipamentos\n\nA IA cruza as datas das restrições com o cronograma para prever paradas futuras e sugerir mitigações."
    },
    report: {
        title: "Relatórios Executivos",
        body: "Geração automática de documentação para stakeholders.\n\nA IA compila todos os dados técnicos, KPIs financeiros, status de prazo e riscos em um texto narrativo, claro e profissional.\n\nIdeal para reuniões semanais de acompanhamento ou reportes para a diretoria/cliente."
    }
};

export const AdvancedAIModal: React.FC<AdvancedAIModalProps> = ({
    isOpen,
    onClose,
    planejamento,
    profissionais,
    scheduleConfig,
    onUpdateSchedule
}) => {
    const [activeTab, setActiveTab] = useState<Tab>("builder");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [helpModalOpen, setHelpModalOpen] = useState(false);

    // Builder State
    const [dates, setDates] = useState({ start: new Date().toISOString().split('T')[0], end: '' });
    const [duration, setDuration] = useState<number | ''>('');
    const [durationUnit, setDurationUnit] = useState<'days' | 'months'>('months');

    // Predictor State
    const [dataCorte, setDataCorte] = useState(new Date().toISOString().split('T')[0]);

    // Constraints State
    const [constraints, setConstraints] = useState<ConstraintItem[]>([]);
    const [newConstraint, setNewConstraint] = useState<Partial<ConstraintItem>>({ type: 'material' } as any);

    // Reset result when tab changes
    useEffect(() => {
        setResult(null);
        setLoading(false);
        setHelpModalOpen(false);
    }, [activeTab]);

    if (!isOpen) return null;

    // --- Logic for Date/Duration Sync ---
    const calculateEndDate = (start: string, dur: number, unit: 'days' | 'months') => {
        if (!start) return '';
        const d = new Date(start);
        if (unit === 'days') d.setDate(d.getDate() + dur);
        else d.setMonth(d.getMonth() + dur);
        return d.toISOString().split('T')[0];
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        let newEnd = dates.end;

        if (newStart && typeof duration === 'number') {
            newEnd = calculateEndDate(newStart, duration, durationUnit);
        }
        setDates({ start: newStart, end: newEnd });
    };

    const handleDurationChange = (val: number | '') => {
        setDuration(val);
        if (val !== '' && dates.start) {
            const newEnd = calculateEndDate(dates.start, Number(val), durationUnit);
            setDates(prev => ({ ...prev, end: newEnd }));
        }
    };

    const handleUnitChange = (unit: 'days' | 'months') => {
        setDurationUnit(unit);
        if (duration !== '' && dates.start) {
            const newEnd = calculateEndDate(dates.start, Number(duration), unit);
            setDates(prev => ({ ...prev, end: newEnd }));
        }
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEnd = e.target.value;
        setDates(prev => ({ ...prev, end: newEnd }));

        if (dates.start && newEnd) {
            const start = new Date(dates.start);
            const end = new Date(newEnd);
            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0) {
                setDuration(diffDays);
                setDurationUnit('days');
            }
        }
    };

    // --- Handlers ---

    const handleGenerateSchedule = async () => {
        setLoading(true);
        try {
            if (!dates.end) { alert("Defina data fim"); setLoading(false); return; }

            const output = await generateScheduleWithGemini({
                dataInicio: dates.start,
                dataFim: dates.end,
                escopo: planejamento,
                profissionaisDisponiveis: profissionais,
                scheduleConfig: scheduleConfig
            });
            setResult(output);
        } catch (e) {
            console.error(e);
            alert("Erro ao gerar cronograma");
        } finally {
            setLoading(false);
        }
    };

    const handleApplySchedule = () => {
        if (result && result.cronograma) {
            const aiMap = new Map<number, any>(result.cronograma.map((i: any) => [i.id, i]));

            const newItems = planejamento.map(p => {
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

            onUpdateSchedule(newItems);
            alert("Cronograma aplicado!");
            onClose();
        }
    };

    const handlePredict = async () => {
        setLoading(true);
        try {
            const output = await predictAndAdjustScheduleGemini(planejamento, planejamento, dataCorte);
            setResult(output);
        } catch (e) {
            console.error(e);
            alert("Erro na predição");
        } finally {
            setLoading(false);
        }
    };

    const handleOptimize = async () => {
        setLoading(true);
        try {
            const output = await optimizeCriticalPathGemini(planejamento, {
                dataLimiteMaxima: dates.end || '2025-12-31',
                orcamentoMaximo: 1000000
            });
            setResult(output);
        } catch (e) {
            console.error(e);
            alert("Erro na otimização");
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyzeConstraints = async () => {
        setLoading(true);
        try {
            const output = await manageConstraintsGemini(constraints, planejamento);
            setResult(output);
        } catch (e) {
            console.error(e);
            alert("Erro na análise de restrições");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        setLoading(true);
        try {
            const output = await generateExecutiveReportGemini(planejamento, { spi: 0.95, cpi: 1.02 }, "executivo");
            setResult(output); // String markdown
        } catch (e) {
            console.error(e);
            alert("Erro ao gerar relatório");
        } finally {
            setLoading(false);
        }
    };

    const handleAddConstraint = () => {
        if (newConstraint.descricao) {
            setConstraints([...constraints, {
                id: Date.now().toString(),
                tipo: newConstraint.tipo as any || 'material',
                descricao: newConstraint.descricao,
                data_impacto: newConstraint.data_impacto || '',
                severidade: "MÉDIA",
                atividades_bloqueadas: [],
                dias_atraso_estimado: 0
            }]);
            setNewConstraint({ tipo: 'material', descricao: '', data_impacto: '' } as any);
        }
    };

    // --- Renders ---

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000]">
            <div className="bg-surface rounded-lg shadow-xl w-[90vw] max-w-5xl h-[85vh] flex flex-col border border-default relative">

                {/* Help Modal Overlay */}
                {helpModalOpen && (
                    <div className="absolute inset-0 bg-black/60 z-[2050] flex items-center justify-center p-4 rounded-lg">
                        <div className="bg-surface border border-default p-6 rounded-lg max-w-lg shadow-2xl relative animate-in fade-in zoom-in duration-200">
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

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-default">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🤖</span>
                        <h3 className="text-xl font-bold text-white">Planejamento Avançado IA (Gemini)</h3>
                    </div>
                    <button onClick={onClose} className="text-2xl text-secondary hover:text-white">&times;</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-default bg-surface">
                    {[
                        { id: 'builder', label: '1. Gerador de Cronograma', icon: '📅' },
                        { id: 'predictor', label: '2. Predição & Ajuste', icon: '🔮' },
                        { id: 'optimizer', label: '3. Otimizador CPM', icon: '🚀' },
                        { id: 'constraints', label: '4. Gestão de Restrições', icon: '⛓️' },
                        { id: 'report', label: '5. Relatórios', icon: '📊' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab.id
                                ? 'bg-surface text-accent-500 border-t-2 border-accent-500'
                                : 'text-secondary hover:text-white hover:bg-elevated'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span className="hidden md:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-surface custom-scrollbar relative">

                    {/* Loading Overlay */}
                    {loading && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
                            <div className="w-12 h-12 border-4 border-accent-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <div className="text-white font-bold">Processando com Gemini AI...</div>
                        </div>
                    )}

                    {/* TAB 1: BUILDER */}
                    {activeTab === 'builder' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                            <div className="md:col-span-1 space-y-4 bg-surface p-4 rounded-lg h-fit">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-white">Parâmetros</h4>
                                    <button onClick={() => setHelpModalOpen(true)} className="text-accent-500 hover:text-white" title="Ajuda">ℹ️</button>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-1">Início do Projeto</label>
                                    <input
                                        type="date"
                                        value={dates.start}
                                        onChange={handleStartDateChange}
                                        className="w-full bg-surface border border-default rounded p-2 text-sm focus:ring-1 focus:ring-accent-500"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-secondary mb-1">Duração Estimada</label>
                                        <input
                                            type="number"
                                            value={duration}
                                            onChange={e => handleDurationChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            placeholder="Ex: 6"
                                            className="w-full bg-surface border border-default rounded p-2 text-sm focus:ring-1 focus:ring-accent-500"
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-xs font-bold text-secondary mb-1">Unidade</label>
                                        <select
                                            value={durationUnit}
                                            onChange={e => handleUnitChange(e.target.value as 'days' | 'months')}
                                            className="w-full bg-surface border border-default rounded p-2 text-sm focus:ring-1 focus:ring-accent-500"
                                        >
                                            <option value="months">Meses</option>
                                            <option value="days">Dias</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-1">Fim (Deadline)</label>
                                    <input
                                        type="date"
                                        value={dates.end}
                                        onChange={handleEndDateChange}
                                        className="w-full bg-surface border border-default rounded p-2 text-sm focus:ring-1 focus:ring-accent-500"
                                    />
                                </div>

                                <div className="pt-2">
                                    <Button variant="primary" onClick={handleGenerateSchedule} className="w-full shadow-lg shadow-blue-500/20">
                                        ✨ Gerar Cronograma
                                    </Button>
                                </div>

                                <div className="mt-4 text-xs text-secondary border-t border-default pt-3">
                                    <p>A IA analisará {planejamento.length} itens de escopo e {profissionais.length} profissionais disponíveis.</p>
                                </div>
                            </div>

                            <div className="md:col-span-2 bg-surface p-4 rounded-lg overflow-y-auto max-h-[600px]">
                                <h4 className="font-bold text-white mb-2">Preview / Resultado</h4>
                                {result ? (
                                    <div>
                                        <div className="flex justify-between items-center mb-2 bg-green-900/20 p-2 rounded border border-green-800">
                                            <span className="text-green-400 font-bold text-sm">Cronograma Gerado com Sucesso!</span>
                                            <Button size="sm" variant="success" onClick={handleApplySchedule}>Aplicar ao Projeto</Button>
                                        </div>
                                        <pre className="text-xs text-gray-300 bg-surface p-4 rounded overflow-x-auto custom-scrollbar">
                                            {JSON.stringify(result, null, 2)}
                                        </pre>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-60 text-secondary border-2 border-dashed border-default rounded-lg">
                                        <span className="text-4xl mb-2">📅</span>
                                        <p>Configure os parâmetros à esquerda e clique em Gerar.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: PREDICTOR */}
                    {activeTab === 'predictor' && (
                        <div className="space-y-6">
                            <div className="flex items-end gap-4 bg-surface p-4 rounded-lg">
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <label className="block text-xs font-bold text-secondary">Data de Corte (Data Date)</label>
                                        <button onClick={() => setHelpModalOpen(true)} className="text-accent-500 hover:text-white" title="Ajuda">ℹ️</button>
                                    </div>
                                    <input type="date" value={dataCorte} onChange={e => setDataCorte(e.target.value)} className="w-full bg-surface border border-default rounded p-2" />
                                </div>
                                <Button variant="primary" onClick={handlePredict}>🔍 Analisar Desvios</Button>
                            </div>

                            {result && result.analise ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-surface p-5 rounded-lg border-l-4 border-blue-500">
                                        <h4 className="text-lg font-bold text-white mb-4">Análise EVM</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs text-secondary">SPI (Performance de Prazo)</div>
                                                <div className={`text-2xl font-bold ${result.analise.spi < 0.9 ? 'text-red-400' : 'text-green-400'}`}>{result.analise.spi?.toFixed(2)}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-secondary">Estimativa de Atraso</div>
                                                <div className="text-2xl font-bold text-yellow-400">{result.analise.diasAtrasoEstimado} dias</div>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-default">
                                            <div className="text-xs text-secondary">Tendência de Término</div>
                                            <div className="text-xl font-bold text-white">{result.analise.tendenciaFinal}</div>
                                        </div>
                                    </div>

                                    <div className="bg-surface p-5 rounded-lg">
                                        <h4 className="text-lg font-bold text-white mb-4">Recomendações de Ajuste</h4>
                                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                            {result.ajustesRecomendados?.map((adj: any, idx: number) => (
                                                <div key={idx} className="bg-surface p-3 rounded border border-default">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="font-bold text-sm text-accent-500">Atividade ID {adj.id_atividade}</span>
                                                        <span className="text-xs bg-red-500/20 text-red-400 px-2 rounded">Impacto: {adj.impacto_dias}d</span>
                                                    </div>
                                                    <p className="text-sm text-white mb-1">{adj.acao}</p>
                                                    <p className="text-xs text-secondary">{adj.razao}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                result && (
                                    <div className="p-4 text-center bg-surface rounded text-red-400">
                                        Dados de análise indisponíveis ou formato inválido.
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {/* TAB 3: OPTIMIZER */}
                    {activeTab === 'optimizer' && (
                        <div className="h-full flex flex-col">
                            <div className="bg-surface p-4 rounded-lg mb-6 relative">
                                <button onClick={() => setHelpModalOpen(true)} className="absolute top-4 right-4 text-accent-500 hover:text-white" title="Ajuda">ℹ️</button>
                                <p className="text-sm text-secondary mb-4 pr-8">
                                    O otimizador buscará oportunidades de compressão do cronograma (Crashing/Fast-Tracking) respeitando o orçamento máximo.
                                </p>
                                <Button variant="primary" onClick={handleOptimize}>🚀 Otimizar Caminho Crítico</Button>
                            </div>

                            {result && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-surface p-4 rounded-lg text-center">
                                        <div className="text-3xl font-bold text-green-400">{result.compressaoAlcancada || 0} dias</div>
                                        <div className="text-sm text-secondary">Compressão Possível</div>
                                    </div>
                                    <div className="bg-surface p-4 rounded-lg text-center">
                                        <div className="text-3xl font-bold text-yellow-400">R$ {result.custo_adicional || 0}</div>
                                        <div className="text-sm text-secondary">Custo Adicional</div>
                                    </div>
                                    <div className="md:col-span-3 bg-surface p-4 rounded-lg">
                                        <h4 className="font-bold text-white mb-2">Estratégia Sugerida</h4>
                                        <p className="text-sm text-gray-300 mb-4">{result.estrategia || "Nenhuma estratégia gerada."}</p>
                                        <h5 className="font-bold text-xs text-secondary uppercase mb-2">Detalhes das Ações</h5>
                                        <table className="w-full text-xs text-left text-gray-400">
                                            <thead className="bg-surface text-white">
                                                <tr>
                                                    <th className="p-2">Tipo</th>
                                                    <th className="p-2">Impacto</th>
                                                    <th className="p-2">Risco</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.detalhes?.map((d: any, i: number) => (
                                                    <tr key={i} className="border-b border-default">
                                                        <td className="p-2 font-bold">{d.tipo}</td>
                                                        <td className="p-2">{d.impacto}</td>
                                                        <td className="p-2 text-yellow-500">{d.risco}</td>
                                                    </tr>
                                                ))}
                                                {!result.detalhes?.length && (
                                                    <tr><td colSpan={3} className="p-2 text-center">Nenhum detalhe disponível.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: CONSTRAINTS */}
                    {activeTab === 'constraints' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                            <div className="bg-surface p-4 rounded-lg flex flex-col relative">
                                <button onClick={() => setHelpModalOpen(true)} className="absolute top-4 right-4 text-accent-500 hover:text-white" title="Ajuda">ℹ️</button>
                                <h4 className="font-bold text-white mb-4">Registro de Restrições</h4>
                                <div className="flex-1 overflow-y-auto space-y-2 mb-4 custom-scrollbar">
                                    {constraints.map(c => (
                                        <div key={c.id} className="bg-surface p-3 rounded border-l-4 border-red-500 flex justify-between">
                                            <div>
                                                <div className="text-xs font-bold text-red-400 uppercase">{c.tipo}</div>
                                                <div className="text-sm text-white">{c.descricao}</div>
                                                {c.data_impacto && <div className="text-xs text-secondary">Data: {c.data_impacto}</div>}
                                            </div>
                                            <button onClick={() => setConstraints(constraints.filter(x => x.id !== c.id))} className="text-secondary hover:text-white">&times;</button>
                                        </div>
                                    ))}
                                    {constraints.length === 0 && <p className="text-sm text-secondary text-center py-4">Nenhuma restrição registrada.</p>}
                                </div>

                                <div className="border-t border-default pt-4 space-y-3">
                                    <select
                                        value={newConstraint.tipo}
                                        onChange={e => setNewConstraint({ ...newConstraint, tipo: e.target.value as any })}
                                        className="w-full bg-surface border border-default rounded p-2 text-xs"
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
                                        onChange={e => setNewConstraint({ ...newConstraint, descricao: e.target.value })}
                                        className="w-full bg-surface border border-default rounded p-2 text-xs"
                                    />
                                    <input
                                        type="date"
                                        value={newConstraint.data_impacto}
                                        onChange={e => setNewConstraint({ ...newConstraint, data_impacto: e.target.value })}
                                        className="w-full bg-surface border border-default rounded p-2 text-xs"
                                    />
                                    <Button variant="secondary" size="sm" className="w-full" onClick={handleAddConstraint}>+ Adicionar Restrição</Button>
                                </div>

                                <Button variant="primary" className="mt-4" onClick={handleAnalyzeConstraints}>⚡ Analisar Impactos</Button>
                            </div>

                            <div className="bg-surface p-4 rounded-lg overflow-y-auto">
                                <h4 className="font-bold text-white mb-4">Análise de Impacto & Mitigação</h4>
                                {result && result.restricoes_criticas ? (
                                    result.restricoes_criticas.map((rc: any, i: number) => (
                                        <div key={i} className="mb-6 bg-surface p-4 rounded border border-default">
                                            <h5 className="text-red-400 font-bold mb-1">{rc.tipo}: {rc.descricao}</h5>
                                            <p className="text-xs text-secondary mb-3">Impacta {rc.atividades_bloqueadas.length} atividades a partir de {rc.data_impacto}</p>

                                            <div className="space-y-2">
                                                <span className="text-xs font-bold text-white">Mitigações Sugeridas:</span>
                                                {rc.mitigacoes.map((m: any, idx: number) => (
                                                    <div key={idx} className="text-xs bg-surface p-2 rounded flex justify-between items-center">
                                                        <span>{m.acao}</span>
                                                        <span className={`px-2 py-0.5 rounded ${m.viabilidade === 'ALTA' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{m.viabilidade}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-40 text-secondary border-2 border-dashed border-default rounded-lg">
                                        <p>Execute a análise para ver sugestões.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 5: REPORT */}
                    {activeTab === 'report' && (
                        <div className="h-full flex flex-col">
                            <div className="flex justify-between items-center bg-surface p-4 rounded-lg mb-4 relative">
                                <div>
                                    <h4 className="font-bold text-white">Relatório Executivo</h4>
                                    <p className="text-xs text-secondary">Gere relatórios completos em Markdown com insights da IA.</p>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <button onClick={() => setHelpModalOpen(true)} className="text-accent-500 hover:text-white mr-2" title="Ajuda">ℹ️</button>
                                    <Button variant="primary" onClick={handleGenerateReport}>📄 Gerar Relatório</Button>
                                </div>
                            </div>

                            <div className="flex-1 bg-surface border border-default rounded-lg p-6 overflow-y-auto font-mono text-sm text-gray-300 custom-scrollbar">
                                {result ? (
                                    <div className="whitespace-pre-wrap">{result}</div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-secondary">
                                        O relatório gerado aparecerá aqui.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
