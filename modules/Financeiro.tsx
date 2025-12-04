
import React from 'react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader } from '@/components/ui/card';
import { KpiCard } from '@/components/widgets/kpi-card';
import { formatCurrency } from '@/utils/formatters';

// Mock data para o gráfico de fluxo de caixa
const cashFlowData = [
    { month: 'Jan', projected: 150000, actual: 145000 },
    { month: 'Fev', projected: 200000, actual: 210000 },
    { month: 'Mar', projected: 250000, actual: 240000 },
    { month: 'Abr', projected: 220000, actual: 230000 },
    { month: 'Mai', projected: 300000, actual: 290000 },
    { month: 'Jun', projected: 350000, actual: 0 },
];

// Componente de gráfico simples para simular recharts
const RechartsLikeChart = ({ data }: { data: typeof cashFlowData }) => {
    const chartHeight = 250;
    const chartWidth = 500;
    const maxValue = Math.max(...data.map(d => d.projected), ...data.map(d => d.actual));
    const xScale = chartWidth / data.length;
    const yScale = chartHeight / maxValue;

    return (
        <div className="w-full overflow-x-auto">
            <svg width={chartWidth} height={chartHeight + 40} viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} className="text-xs">
                {/* Y-Axis lines */}
                {[0.25, 0.5, 0.75, 1].map(tick => (
                    <g key={tick}>
                        <line x1="0" y1={chartHeight - (tick * maxValue * yScale)} x2={chartWidth} y2={chartHeight - (tick * maxValue * yScale)} stroke="#3a3e45" strokeDasharray="2" />
                        <text x="0" y={chartHeight - (tick * maxValue * yScale) - 2} fill="#a0a5b0">{(tick * maxValue / 1000).toFixed(0)}k</text>
                    </g>
                ))}

                {data.map((d, i) => (
                    <g key={d.month} transform={`translate(${i * xScale}, 0)`}>
                        {/* Projected Bar */}
                        <rect
                            x={xScale * 0.15}
                            y={chartHeight - d.projected * yScale}
                            width={xScale * 0.3}
                            height={d.projected * yScale}
                            fill="#3a3e45"
                        />
                        {/* Actual Bar */}
                        <rect
                            x={xScale * 0.55}
                            y={chartHeight - d.actual * yScale}
                            width={xScale * 0.3}
                            height={d.actual * yScale}
                            fill="#0084ff"
                        />
                        <text x={xScale / 2} y={chartHeight + 15} fill="#e8eaed" textAnchor="middle">{d.month}</text>
                    </g>
                ))}
                <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#3a3e45" />
            </svg>
            <div className="flex justify-center gap-4 mt-2 text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#3a3e45] rounded-sm"></div><span>Projetado</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#0084ff] rounded-sm"></div><span>Realizado</span></div>
            </div>
        </div>
    );
};


const Financeiro: React.FC = () => {
    const receitaTotal = 5000000;
    const custoRealizado = 2100000;
    const custoOrcado = 4000000;
    const lucroBruto = receitaTotal - custoOrcado;
    const margem = (lucroBruto / receitaTotal) * 100;

    return (
        <div>
            <PageHeader title="💵 Financeiro da Obra" subtitle="Demonstrativo de resultado, fluxo de caixa e análise financeira" />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
                <KpiCard label="Receita Total" value={formatCurrency(receitaTotal)} status="info" />
                <KpiCard label="Custo Realizado" value={formatCurrency(custoRealizado)} status="warning" description={`de ${formatCurrency(custoOrcado)} orçados`} />
                <KpiCard label="Lucro Bruto Projetado" value={formatCurrency(lucroBruto)} status="success" />
                <KpiCard label="Margem Projetada" value={`${margem.toFixed(2)}%`} status="success" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader title="DRE - Demonstrativo de Resultado do Exercício" />
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-default">
                                    <td className="py-2">Receita Bruta</td>
                                    <td className="py-2 text-right">{formatCurrency(receitaTotal)}</td>
                                </tr>
                                <tr className="border-b border-default">
                                    <td className="py-2 text-red-400">(-) Impostos sobre Venda</td>
                                    <td className="py-2 text-right text-red-400">{formatCurrency(receitaTotal * 0.05)}</td>
                                </tr>
                                <tr className="border-b border-default font-semibold">
                                    <td className="py-2">(=) Receita Líquida</td>
                                    <td className="py-2 text-right">{formatCurrency(receitaTotal * 0.95)}</td>
                                </tr>
                                <tr className="border-b border-default">
                                    <td className="py-2 text-red-400">(-) Custo Direto (Orçado)</td>
                                    <td className="py-2 text-right text-red-400">{formatCurrency(custoOrcado)}</td>
                                </tr>
                                <tr className="border-b border-default font-bold text-green-400">
                                    <td className="py-2">(=) Lucro Bruto</td>
                                    <td className="py-2 text-right">{formatCurrency(receitaTotal * 0.95 - custoOrcado)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </Card>
                <Card>
                    <CardHeader title="Fluxo de Caixa Projetado vs. Realizado" />
                    <RechartsLikeChart data={cashFlowData} />
                </Card>
            </div>
        </div>
    );
};

export default Financeiro;
