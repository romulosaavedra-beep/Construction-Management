
import React from 'react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader } from '@/components/ui/card'
import { KpiCard } from '@/components/widgets/kpi-card';
import { ProgressBar } from '@/components/widgets/progress-bar';
import { StatusBadge } from '@/components/widgets/status-badge';
import { obraInfo, kpiData, etapasData, diarioRegistrosData } from '@/data/mockData';
import { formatCurrency, formatDate } from '@/utils/formatters';

const Dashboard: React.FC = () => {
    return (
        <div>
            <PageHeader title="📊 Dashboard - Visão Geral da Obra" subtitle={`${obraInfo.nome} - Visão consolidada`} />

            <Card>
                <CardHeader title="Informações Gerais da Obra" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div><strong>Nome:</strong> {obraInfo.nome}</div>
                    <div><strong>Local:</strong> {obraInfo.local}</div>
                    <div><strong>Cliente:</strong> {obraInfo.cliente}</div>
                    <div><strong>Responsável:</strong> {obraInfo.responsavel}</div>
                    <div><strong>Data Início:</strong> {obraInfo.dataInicio}</div>
                    <div><strong>Data Fim:</strong> {obraInfo.dataFim}</div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
                <KpiCard label="Progresso Físico" value={`${kpiData.progressoFisico.value}%`} status="success" description={`Meta: ${kpiData.progressoFisico.meta}% (${kpiData.progressoFisico.status})`}>
                    <div className="mt-2">
                        <ProgressBar percentage={kpiData.progressoFisico.value} />
                    </div>
                </KpiCard>
                <KpiCard label="Orçamento" value={`${formatCurrency(kpiData.orcamento.executado)} / ${formatCurrency(kpiData.orcamento.total)}`} description={`${((kpiData.orcamento.executado / kpiData.orcamento.total) * 100).toFixed(0)}% executado`}>
                    <div className="mt-2">
                        <ProgressBar percentage={(kpiData.orcamento.executado / kpiData.orcamento.total) * 100} />
                    </div>
                </KpiCard>
                <KpiCard label="Status Prazo" value={`🟢 ${kpiData.prazo.status}`} status="success" description={kpiData.prazo.folga} />
                <KpiCard label="Margem Projetada" value={`${kpiData.margem.value}%`} status="success" description={kpiData.margem.status} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader title="Progresso por Etapa" />
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-secondary">
                            <thead className="text-xs text-primary uppercase bg-elevated">
                                <tr>
                                    <th scope="col" className="px-4 py-3">Etapa</th>
                                    <th scope="col" className="px-4 py-3">Previsto</th>
                                    <th scope="col" className="px-4 py-3">Realizado</th>
                                    <th scope="col" className="px-4 py-3 w-36">Progresso</th>
                                    <th scope="col" className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {etapasData.map((etapa) => (
                                    <tr key={etapa.nome} className="border-b border-border hover:bg-surface">
                                        <td className="px-4 py-3 font-medium text-primary">{etapa.nome}</td>
                                        <td className="px-4 py-3">{formatCurrency(etapa.previsto)}</td>
                                        <td className="px-4 py-3">{formatCurrency(etapa.realizado)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <ProgressBar percentage={etapa.porcentagem} />
                                                <span className="text-xs">{etapa.porcentagem}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={etapa.porcentagem === 100 ? 'Finalizado' : etapa.porcentagem > 0 ? 'Em andamento' : 'Não iniciado'} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Últimos Registros do Diário" />
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-secondary">
                            <thead className="text-xs text-primary uppercase bg-elevated">
                                <tr>
                                    <th scope="col" className="px-4 py-3">Data</th>
                                    <th scope="col" className="px-4 py-3">Etapa</th>
                                    <th scope="col" className="px-4 py-3">Observação / Serviços</th>
                                </tr>
                            </thead>
                            <tbody>
                                {diarioRegistrosData.slice(0, 3).map((log) => (
                                    <tr key={log.id} className="border-b border-border hover:bg-surface">
                                        <td className="px-4 py-3">{formatDate(log.data)}</td>
                                        <td className="px-4 py-3">{log.etapa}</td>
                                        <td className="px-4 py-3 font-medium text-primary">
                                            {log.observacoes}
                                            <ul className="list-disc list-inside text-xs text-secondary mt-1">
                                                {log.servicos.map(s => <li key={s.id}>{s.servico}</li>)}
                                            </ul>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
