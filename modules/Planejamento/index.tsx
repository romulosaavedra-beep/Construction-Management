// modules/Planejamento.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';
import {
    Calendar,
    Plus,
    Edit2,
    Trash2,
    Download,
    Upload,
    Filter,
    Search,
    BarChart3,
    DollarSign,
    Brain,
    TrendingUp,
    Activity,
    Clock,
    AlertCircle,
    CheckCircle,
    Save,
    X,
    ChevronDown,
    ChevronRight,
    Loader2,
} from 'lucide-react';

// Componentes UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Tabs do Radix UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Componentes de Planejamento
import { CPMCalculator, type Activity as CPMActivity, type CPMResult } from './utils/cpmCalculator';
import { EVMCalculator, type EvmMetrics } from './utils/evmCalculator';
import { geminiService } from '@/services/geminiPlanning';
import { CurvaSChart } from './components/CurvaSChart';
import { EvmKpiCards } from './components/EvmKpiCards';
import { CriticalActivitiesTable } from './components/CriticalActivitiesTable';

// Tipos
interface Atividade {
    id: number;
    discriminacao: string;
    unidade: string;
    quantidade: number;
    duracao_planejada: number;
    duracao_real?: number;
    data_inicio_planejada: string;
    data_fim_planejada: string;
    data_inicio_real?: string;
    data_fim_real?: string;
    percentual_conclusao: number;
    responsavel: string;
    status: 'Não iniciado' | 'Em andamento' | 'Atrasado' | 'Concluído';
    predecessoras?: number[];
    nivel_wbs?: number;
    codigo_wbs?: string;
}

export default function Planejamento() {
    // States principais
    const [activeTab, setActiveTab] = useState<string>('analise');
    const [atividades, setAtividades] = useState<Atividade[]>([]);
    const [filteredAtividades, setFilteredAtividades] = useState<Atividade[]>([]);
    const [loading, setLoading] = useState(false);

    // States de análise
    const [cpmResult, setCpmResult] = useState<CPMResult | null>(null);
    const [evmMetrics, setEvmMetrics] = useState<EvmMetrics | null>(null);
    const [evmCalculator, setEvmCalculator] = useState<EVMCalculator | null>(null);
    const [aiRecommendations, setAiRecommendations] = useState<any>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // States de filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [responsavelFilter, setResponsavelFilter] = useState<string>('all');

    // States de formulário
    const [editingAtividade, setEditingAtividade] = useState<Atividade | null>(null);
    const [showForm, setShowForm] = useState(false);

    // ========================================
    // CARREGAR DADOS
    // ========================================
    useEffect(() => {
        carregarAtividades();
    }, []);

    useEffect(() => {
        aplicarFiltros();
    }, [atividades, searchTerm, statusFilter, responsavelFilter]);

    const carregarAtividades = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('atividades_planejamento')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;

            setAtividades(data || []);
            toast.success(`✓ ${data?.length || 0} atividades carregadas`);
        } catch (error: any) {
            console.error('Erro ao carregar atividades:', error);
            toast.error('Erro ao carregar atividades');
        } finally {
            setLoading(false);
        }
    };

    // ========================================
    // FILTROS
    // ========================================
    const aplicarFiltros = () => {
        let filtered = [...atividades];

        // Filtro de busca
        if (searchTerm) {
            filtered = filtered.filter(atv =>
                atv.discriminacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                atv.responsavel.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtro de status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(atv => atv.status === statusFilter);
        }

        // Filtro de responsável
        if (responsavelFilter !== 'all') {
            filtered = filtered.filter(atv => atv.responsavel === responsavelFilter);
        }

        setFilteredAtividades(filtered);
    };

    const getResponsaveis = () => {
        const responsaveis = [...new Set(atividades.map(a => a.responsavel))];
        return responsaveis.filter(r => r && r.trim() !== '');
    };

    // ========================================
    // CRUD ATIVIDADES
    // ========================================
    const salvarAtividade = async (atividade: Partial<Atividade>) => {
        try {
            setLoading(true);

            if (editingAtividade) {
                // Atualizar
                const { error } = await supabase
                    .from('atividades_planejamento')
                    .update(atividade)
                    .eq('id', editingAtividade.id);

                if (error) throw error;
                toast.success('✓ Atividade atualizada');
            } else {
                // Criar
                const { error } = await supabase
                    .from('atividades_planejamento')
                    .insert([atividade]);

                if (error) throw error;
                toast.success('✓ Atividade criada');
            }

            await carregarAtividades();
            setShowForm(false);
            setEditingAtividade(null);
        } catch (error: any) {
            console.error('Erro ao salvar atividade:', error);
            toast.error('Erro ao salvar atividade');
        } finally {
            setLoading(false);
        }
    };

    const excluirAtividade = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir esta atividade?')) return;

        try {
            setLoading(true);
            const { error } = await supabase
                .from('atividades_planejamento')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('✓ Atividade excluída');
            await carregarAtividades();
        } catch (error: any) {
            console.error('Erro ao excluir atividade:', error);
            toast.error('Erro ao excluir atividade');
        } finally {
            setLoading(false);
        }
    };

    // ========================================
    // CPM - CAMINHO CRÍTICO
    // ========================================
    const calcularCPM = () => {
        try {
            setIsCalculating(true);

            if (atividades.length === 0) {
                toast.error('Nenhuma atividade cadastrada');
                return;
            }

            // Converter atividades para formato CPM
            const activitiesForCPM: CPMActivity[] = atividades.map(atv => ({
                id: atv.id,
                nome: atv.discriminacao,
                duracao: atv.duracao_planejada || 1,
                predecessores: atv.predecessoras || [],
                percentualConclusao: atv.percentual_conclusao || 0,
                responsavel: atv.responsavel || 'Não atribuído',
            }));

            const calculator = new CPMCalculator(activitiesForCPM);
            const result = calculator.calculate();

            setCpmResult(result);

            toast.success(
                `✓ CPM calculado! Duração do projeto: ${result.projectDuration} dias úteis`,
                { duration: 5000 }
            );


        } catch (error: any) {
            console.error('Erro ao calcular CPM:', error);
            toast.error(`Erro ao calcular CPM: ${error.message}`);
        } finally {
            setIsCalculating(false);
        }
    };

    // ========================================
    // EVM - VALOR AGREGADO
    // ========================================
    const calcularEVM = () => {
        try {
            setIsCalculating(true);

            if (atividades.length === 0) {
                toast.error('Nenhuma atividade cadastrada');
                return;
            }

            // Calcular orçamento total (simplificado - em produção, pegar do módulo Orçamento)
            const orcamentoTotal = 1000000;

            // Calcular % planejado baseado na data atual
            const hoje = new Date();
            const dataInicioProjeto = new Date(
                Math.min(...atividades.map(a => new Date(a.data_inicio_planejada).getTime()))
            );
            const dataFimProjeto = new Date(
                Math.max(...atividades.map(a => new Date(a.data_fim_planejada).getTime()))
            );

            const duracaoTotal = dataFimProjeto.getTime() - dataInicioProjeto.getTime();
            const duracaoDecorrida = hoje.getTime() - dataInicioProjeto.getTime();
            const percentualPlanejado = Math.min(
                100,
                Math.max(0, (duracaoDecorrida / duracaoTotal) * 100)
            );

            // Calcular % real (média das atividades)
            const percentualReal =
                atividades.reduce((sum, a) => sum + (a.percentual_conclusao || 0), 0) /
                atividades.length;

            // Custo real (simplificado - em produção, pegar dos lançamentos)
            const custoReal = orcamentoTotal * (percentualReal / 100) * 1.1; // Simulando 10% sobre-custo

            // Criar calculadora EVM (singleton)
            let calculator = evmCalculator;
            if (!calculator) {
                calculator = new EVMCalculator(orcamentoTotal);
                setEvmCalculator(calculator);
            }

            const metrics = calculator.addMeasurement(
                new Date().toISOString(),
                percentualPlanejado,
                percentualReal,
                custoReal
            );

            setEvmMetrics(metrics);

            // Gerar alertas
            const alerts = calculator.generateAlerts();
            if (alerts.length > 0) {
                alerts.forEach(alert => {
                    if (alert.tipo === 'CRÍTICO') {
                        toast.error(alert.titulo, { duration: 5000 });
                    } else if (alert.tipo === 'AVISO') {
                        toast(alert.titulo, { icon: '⚠️', duration: 4000 });
                    } else {
                        toast.success(alert.titulo, { duration: 3000 });
                    }
                });
            } else {
                toast.success('✓ Projeto dentro do esperado!');
            }


        } catch (error: any) {
            console.error('Erro ao calcular EVM:', error);
            toast.error(`Erro ao calcular EVM: ${error.message}`);
        } finally {
            setIsCalculating(false);
        }
    };

    // ========================================
    // IA - RECOMENDAÇÕES
    // ========================================
    const gerarRecomendacoesIA = async () => {
        if (!geminiService.isAvailable()) {
            toast.error('Configure VITE_GEMINI_API_KEY no arquivo .env para usar IA');
            return;
        }

        if (!cpmResult || !evmMetrics) {
            toast.error('Execute CPM e EVM primeiro');
            return;
        }

        try {
            setIsCalculating(true);
            toast('🤖 IA analisando seu projeto...', { duration: 3000 });

            // 1. Analisar desvios
            const deviations = await geminiService.analyzeDeviations(
                evmMetrics,
                cpmResult.activities
            );



            // 2. Gerar recomendações
            const recommendations = await geminiService.generateRecommendations(
                deviations,
                cpmResult.activities,
                {
                    maxBudget: 50000,
                    maxResourceIncrease: 0.3,
                }
            );



            setAiRecommendations({ deviations, recommendations });

            toast.success(
                `✓ ${recommendations.acoes?.length || 0} recomendações geradas pela IA!`,
                { duration: 4000 }
            );
        } catch (error: any) {
            console.error('Erro na IA:', error);
            toast.error(`Erro ao gerar recomendações: ${error.message}`);
        } finally {
            setIsCalculating(false);
        }
    };

    // ========================================
    // EXPORTAR DADOS
    // ========================================
    const exportarParaExcel = () => {
        toast('Em desenvolvimento: Exportar para Excel', { icon: '🚧' });
    };

    // ========================================
    // RENDER
    // ========================================
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Activity className="w-8 h-8 text-primary-600" />
                        Planejamento e Controle
                    </h1>
                    <p className="text-gray-600 mt-1">
                        CPM, EVM, Análise Preditiva com IA
                    </p>
                </div>

                <div className="flex gap-3">
                    <Button variant="outline" onClick={exportarParaExcel}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                    </Button>
                    <Button onClick={() => { setShowForm(true); setEditingAtividade(null); }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Atividade
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
                    <TabsTrigger value="analise" className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        <span className="hidden sm:inline">Análise Avançada</span>
                        <span className="sm:hidden">Análise</span>
                    </TabsTrigger>
                    <TabsTrigger value="cronograma" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="hidden sm:inline">Cronograma</span>
                        <span className="sm:hidden">Crono</span>
                    </TabsTrigger>
                    <TabsTrigger value="calendario" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="hidden sm:inline">Calendário</span>
                        <span className="sm:hidden">Cal</span>
                    </TabsTrigger>
                    <TabsTrigger value="gantt" className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>Gantt</span>
                    </TabsTrigger>
                </TabsList>

                {/* ========================================
            TAB: ANÁLISE AVANÇADA (CPM + EVM + IA)
        ======================================== */}
                <TabsContent value="analise" className="space-y-6 mt-6">
                    {/* Botões de Ação */}
                    <Card>
                        <div className="flex flex-wrap gap-4">
                            <Button onClick={calcularCPM} disabled={isCalculating} size="lg">
                                {isCalculating ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                )}
                                Calcular CPM
                            </Button>

                            <Button onClick={calcularEVM} disabled={isCalculating} variant="secondary" size="lg">
                                {isCalculating ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <DollarSign className="w-4 h-4 mr-2" />
                                )}
                                Calcular EVM
                            </Button>

                            <Button
                                onClick={gerarRecomendacoesIA}
                                disabled={isCalculating || !cpmResult || !evmMetrics}
                                variant="outline"
                                size="lg"
                            >
                                {isCalculating ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Brain className="w-4 h-4 mr-2" />
                                )}
                                Gerar Recomendações IA
                            </Button>
                        </div>

                        {/* Instruções */}
                        {!cpmResult && !evmMetrics && (
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-900">
                                        <p className="font-medium mb-1">Como usar:</p>
                                        <ol className="list-decimal list-inside space-y-1 text-blue-800">
                                            <li>Clique em "Calcular CPM" para identificar o caminho crítico</li>
                                            <li>Clique em "Calcular EVM" para análise financeira</li>
                                            <li>Clique em "Gerar Recomendações IA" para sugestões inteligentes</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* KPI Cards (EVM) */}
                    {evmMetrics && <EvmKpiCards metrics={evmMetrics} />}

                    {/* Curva S */}
                    {evmMetrics && evmCalculator && (
                        <CurvaSChart data={evmCalculator.exportForCurvaSChart()} />
                    )}

                    {/* Tabela de Atividades Críticas */}
                    {cpmResult && <CriticalActivitiesTable activities={cpmResult.activities} />}

                    {/* Recomendações da IA */}
                    {aiRecommendations && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Brain className="w-5 h-5 text-purple-600" />
                                    <span>Recomendações da IA</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Causas Raiz */}
                                {aiRecommendations.deviations?.causas?.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-600" />
                                            Causas Raiz Identificadas
                                        </h4>
                                        <div className="space-y-3">
                                            {aiRecommendations.deviations.causas.map((causa: any) => (
                                                <div
                                                    key={causa.id}
                                                    className="p-4 bg-red-50 border border-red-200 rounded-lg"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h5 className="font-semibold text-red-900">{causa.causa}</h5>
                                                        <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                                                            Severidade: {causa.severidade}/10
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-red-800 mb-2">{causa.evidencia}</p>
                                                    <div className="grid grid-cols-2 gap-4 text-xs text-red-700">
                                                        <div>
                                                            <strong>Impacto no cronograma:</strong> {causa.impacto_cronograma_dias} dias
                                                        </div>
                                                        <div>
                                                            <strong>Impacto no orçamento:</strong> R${' '}
                                                            {causa.impacto_orcamento_reais?.toLocaleString('pt-BR')}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Ações Recomendadas */}
                                {aiRecommendations.recommendations?.acoes?.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            Ações Recomendadas (Ordenadas por ROI)
                                        </h4>
                                        <div className="space-y-4">
                                            {aiRecommendations.recommendations.acoes.map((acao: any, index: number) => (
                                                <div
                                                    key={acao.id}
                                                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h5 className="font-semibold text-lg text-gray-900">
                                                            {index + 1}. {acao.titulo}
                                                        </h5>
                                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                                            ROI: {(acao.roi * 100).toFixed(2)}%
                                                        </span>
                                                    </div>

                                                    <p className="text-gray-700 text-sm mb-3">{acao.descricao}</p>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                                        <div className="text-sm">
                                                            <span className="text-gray-500 block">Dias economizados</span>
                                                            <span className="font-bold text-green-600 text-lg">
                                                                {acao.dias_economizados}d
                                                            </span>
                                                        </div>
                                                        <div className="text-sm">
                                                            <span className="text-gray-500 block">Custo adicional</span>
                                                            <span className="font-bold text-orange-600 text-lg">
                                                                R$ {acao.custo_adicional?.toLocaleString('pt-BR')}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm">
                                                            <span className="text-gray-500 block">Prazo</span>
                                                            <span className="font-bold text-blue-600">
                                                                {acao.prazo_implementacao}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm">
                                                            <span className="text-gray-500 block">Risco</span>
                                                            <span className="font-bold text-gray-700">{acao.risco}</span>
                                                        </div>
                                                    </div>

                                                    <div className="pt-3 border-t border-gray-100">
                                                        <p className="text-xs text-gray-600">
                                                            <strong>Justificativa:</strong> {acao.razao}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Caso não haja recomendações */}
                                {(!aiRecommendations.recommendations?.acoes ||
                                    aiRecommendations.recommendations.acoes.length === 0) && (
                                        <div className="text-center py-8 text-gray-500">
                                            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                            <p className="text-lg font-medium">Nenhuma recomendação gerada</p>
                                            <p className="text-sm">Tente calcular CPM e EVM novamente</p>
                                        </div>
                                    )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Placeholder se não houver dados */}
                    {!cpmResult && !evmMetrics && !aiRecommendations && (
                        <Card>
                            <div className="text-center py-12 text-gray-500">
                                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-lg font-medium mb-2">Nenhuma análise disponível</p>
                                <p className="text-sm">
                                    Execute CPM e EVM para visualizar análises avançadas
                                </p>
                            </div>
                        </Card>
                    )}
                </TabsContent>

                {/* ========================================
            TAB: CRONOGRAMA (Lista de Atividades)
        ======================================== */}
                <TabsContent value="cronograma" className="space-y-4 mt-6">
                    {/* Filtros */}
                    <Card>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar atividade..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            <div>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">Todos os Status</option>
                                    <option value="Não iniciado">Não iniciado</option>
                                    <option value="Em andamento">Em andamento</option>
                                    <option value="Atrasado">Atrasado</option>
                                    <option value="Concluído">Concluído</option>
                                </select>
                            </div>

                            <div>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    value={responsavelFilter}
                                    onChange={(e) => setResponsavelFilter(e.target.value)}
                                >
                                    <option value="all">Todos os Responsáveis</option>
                                    {getResponsaveis().map((resp) => (
                                        <option key={resp} value={resp}>
                                            {resp}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                            <span>
                                Mostrando {filteredAtividades.length} de {atividades.length} atividades
                            </span>
                            {(searchTerm || statusFilter !== 'all' || responsavelFilter !== 'all') && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setStatusFilter('all');
                                        setResponsavelFilter('all');
                                    }}
                                    className="text-primary-600 hover:text-primary-700 font-medium"
                                >
                                    Limpar filtros
                                </button>
                            )}
                        </div>
                    </Card>

                    {/* Tabela de Atividades */}
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-gray-200">
                                        <th className="text-left py-3 px-2 font-semibold text-gray-700">
                                            Atividade
                                        </th>
                                        <th className="text-center py-3 px-2 font-semibold text-gray-700">
                                            Duração
                                        </th>
                                        <th className="text-center py-3 px-2 font-semibold text-gray-700">
                                            Início
                                        </th>
                                        <th className="text-center py-3 px-2 font-semibold text-gray-700">
                                            Fim
                                        </th>
                                        <th className="text-center py-3 px-2 font-semibold text-gray-700">
                                            % Concluído
                                        </th>
                                        <th className="text-left py-3 px-2 font-semibold text-gray-700">
                                            Responsável
                                        </th>
                                        <th className="text-center py-3 px-2 font-semibold text-gray-700">
                                            Status
                                        </th>
                                        <th className="text-center py-3 px-2 font-semibold text-gray-700">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAtividades.map((atividade) => (
                                        <tr
                                            key={atividade.id}
                                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="py-3 px-2 font-medium">{atividade.discriminacao}</td>
                                            <td className="text-center py-3 px-2">
                                                {atividade.duracao_planejada}d
                                            </td>
                                            <td className="text-center py-3 px-2 text-xs">
                                                {new Date(atividade.data_inicio_planejada).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="text-center py-3 px-2 text-xs">
                                                {new Date(atividade.data_fim_planejada).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="text-center py-3 px-2">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full transition-all ${atividade.percentual_conclusao >= 80
                                                                ? 'bg-green-500'
                                                                : atividade.percentual_conclusao >= 50
                                                                    ? 'bg-orange-500'
                                                                    : 'bg-red-500'
                                                                }`}
                                                            style={{ width: `${atividade.percentual_conclusao}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-medium w-10 text-right">
                                                        {atividade.percentual_conclusao}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 text-gray-600">{atividade.responsavel}</td>
                                            <td className="text-center py-3 px-2">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${atividade.status === 'Concluído'
                                                        ? 'bg-green-100 text-green-700'
                                                        : atividade.status === 'Em andamento'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : atividade.status === 'Atrasado'
                                                                ? 'bg-red-100 text-red-700'
                                                                : 'bg-gray-100 text-gray-700'
                                                        }`}
                                                >
                                                    {atividade.status === 'Concluído' && (
                                                        <CheckCircle className="w-3 h-3" />
                                                    )}
                                                    {atividade.status === 'Atrasado' && (
                                                        <AlertCircle className="w-3 h-3" />
                                                    )}
                                                    {atividade.status}
                                                </span>
                                            </td>
                                            <td className="text-center py-3 px-2">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingAtividade(atividade);
                                                            setShowForm(true);
                                                        }}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => excluirAtividade(atividade.id)}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {filteredAtividades.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-lg font-medium">Nenhuma atividade encontrada</p>
                                    <p className="text-sm">Ajuste os filtros ou cadastre novas atividades</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </TabsContent>

                {/* ========================================
            TAB: CALENDÁRIO (Em desenvolvimento)
        ======================================== */}
                <TabsContent value="calendario" className="mt-6">
                    <Card>
                        <div className="text-center py-12 text-gray-500">
                            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-lg font-medium mb-2">Calendário em desenvolvimento</p>
                            <p className="text-sm">
                                Visualização de atividades em formato de calendário mensal
                            </p>
                        </div>
                    </Card>
                </TabsContent>

                {/* ========================================
            TAB: GANTT (Em desenvolvimento)
        ======================================== */}
                <TabsContent value="gantt" className="mt-6">
                    <Card>
                        <div className="text-center py-12 text-gray-500">
                            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-lg font-medium mb-2">Gráfico de Gantt em desenvolvimento</p>
                            <p className="text-sm">
                                Timeline visual das atividades com dependências e caminho crítico
                            </p>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal de Formulário (simplificado) */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-4">
                                {editingAtividade ? 'Editar Atividade' : 'Nova Atividade'}
                            </h2>
                            <p className="text-sm text-gray-500 mb-4">
                                Formulário completo será implementado nas próximas etapas
                            </p>
                            <div className="flex gap-2">
                                <Button onClick={() => setShowForm(false)} variant="outline" className="w-full">
                                    Cancelar
                                </Button>
                                <Button onClick={() => setShowForm(false)} className="w-full">
                                    Salvar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
