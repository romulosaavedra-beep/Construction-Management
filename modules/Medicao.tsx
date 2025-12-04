
import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/widgets/progress-bar';
import { formatCurrency } from '@/utils/formatters';
import type { MedicaoItem, OrcamentoItem } from '@/types';
import { initialOrcamentoData } from '@/data/mockData';

type Tab = 'controle' | 'progresso';

// Mock data: some items have previous accumulated measurements
const orcamentoComMedicao: MedicaoItem[] = initialOrcamentoData.map(item => ({
    ...item,
    quantMedida: 0,
    medicaoAcumAnterior:
        item.id === 3 ? 1500 :
            item.id === 4 ? 600 :
                item.id === 7 ? 100 : 0,
}));

const Medicao: React.FC = () => {
    const [periodo, setPeriodo] = useState({ inicio: '2025-11-01', fim: '2025-11-15' });
    const [medicaoItens, setMedicaoItens] = useState<MedicaoItem[]>(orcamentoComMedicao);
    const [activeTab, setActiveTab] = useState<Tab>('controle');

    const handleQuantMedidaChange = (id: number, value: number) => {
        setMedicaoItens(prev => prev.map(item => item.id === id ? { ...item, quantMedida: value } : item));
    };

    const processarHierarquia = (items: MedicaoItem[]) => {
        const itemsMap = new Map(items.map(item => [item.id, { ...item, totalMat: 0, totalMo: 0, totalGeral: 0, medidoAcumulado: 0 }]));

        const calculateTotals = (itemId: number | string) => {
            const item = itemsMap.get(itemId);
            if (!item) return { totalMat: 0, totalMo: 0, medidoAcumulado: 0 };

            let childrenTotalMat = 0;
            let childrenTotalMo = 0;
            let childrenMedidoAcum = 0;

            const children = items.filter(child => Number(child.pai) === itemId);
            children.forEach(child => {
                const childTotals = calculateTotals(child.id);
                childrenTotalMat += childTotals.totalMat;
                childrenTotalMo += childTotals.totalMo;
                childrenMedidoAcum += childTotals.medidoAcumulado;
            });

            item.totalMat = (item.quantidade * item.mat_unit) + childrenTotalMat;
            item.totalMo = (item.quantidade * item.mo_unit) + childrenTotalMo;
            item.totalGeral = item.totalMat + item.totalMo;
            item.medidoAcumulado = item.medicaoAcumAnterior + item.quantMedida + childrenMedidoAcum;

            return { totalMat: item.totalMat, totalMo: item.totalMo, medidoAcumulado: item.medidoAcumulado };
        };

        items.filter(item => item.pai === null).forEach(root => calculateTotals(Number(root.id)));
        return Array.from(itemsMap.values());
    };

    const dadosProcessados = useMemo(() => processarHierarquia(medicaoItens), [medicaoItens]);

    const toggleExpand = (id: number) => {
        setMedicaoItens(medicaoItens.map(item => item.id === id ? { ...item, expandido: !item.expandido } : item));
    };

    const renderRows = (processedData: any[], parentId: number | null = null, level = 0, isProgressoVisual = false): React.ReactElement[] => {
        const itemsToRender = processedData.filter(item => item.pai === parentId);

        return itemsToRender.flatMap(item => {
            const hasChildren = processedData.some(child => child.pai === item.id);
            const isService = item.unidade !== '';

            const medicaoAcum = item.medicaoAcumAnterior + item.quantMedida;
            const percentConcluido = item.quantidade > 0 ? (medicaoAcum / item.quantidade) * 100 : 0;
            const matUnit = item.quantidade > 0 ? (item.quantidade * item.mat_unit) / item.quantidade : 0;
            const moUnit = item.quantidade > 0 ? (item.quantidade * item.mo_unit) / item.quantidade : 0;
            const totalMedMat = item.quantMedida * matUnit;
            const totalMedMo = item.quantMedida * moUnit;

            const rowContent = isProgressoVisual ? (
                <tr key={item.id} className="border-b border-default hover:bg-elevated">
                    <td style={{ paddingLeft: `${level * 20 + 8}px` }} className="py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            {hasChildren ? (<button onClick={() => toggleExpand(item.id)} className="text-accent-500 text-lg w-5"> {item.expandido ? '▼' : '▶'}</button>) : <div className="w-5"></div>}
                            <span className="font-medium text-white">{item.nivel}</span>
                        </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{item.discriminacao}</td>
                    <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                            <ProgressBar percentage={percentConcluido} />
                            <span className="text-xs w-12 text-right">{percentConcluido.toFixed(1)}%</span>
                        </div>
                    </td>
                </tr>
            ) : (
                <tr key={item.id} className="border-b border-default hover:bg-elevated text-xs">
                    <td style={{ paddingLeft: `${level * 20 + 8}px` }} className="py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            {hasChildren ? (<button onClick={() => toggleExpand(item.id)} className="text-accent-500 text-lg w-5">{item.expandido ? '▼' : '▶'}</button>) : <div className="w-5"></div>}
                            <span className="font-medium text-white">{item.nivel}</span>
                        </div>
                    </td>
                    <td className="px-2 py-2 font-medium text-white">{item.discriminacao}</td>
                    <td className="px-2 py-2 text-center">{item.unidade || '-'}</td>
                    <td className="px-2 py-2 text-right">{isService ? item.quantidade.toFixed(2) : '-'}</td>
                    <td className="px-2 py-2 text-right">{isService ? formatCurrency(item.quantidade * item.mat_unit) : '-'}</td>
                    <td className="px-2 py-2 text-right">{isService ? formatCurrency(item.quantidade * item.mo_unit) : '-'}</td>
                    <td className="px-2 py-2 text-right">{isService ? formatCurrency((item.quantidade * item.mat_unit) + (item.quantidade * item.mo_unit)) : '-'}</td>
                    <td className="px-2 py-2 text-right bg-accent-500/10">
                        {isService ? <input type="number" value={item.quantMedida} onChange={e => handleQuantMedidaChange(item.id, parseFloat(e.target.value) || 0)} className="w-20 bg-transparent text-right outline-none focus:ring-1 focus:ring-accent-500 rounded" /> : '-'}
                    </td>
                    <td className="px-2 py-2 text-right">{isService ? medicaoAcum.toFixed(2) : '-'}</td>
                    <td className="px-2 py-2">
                        {isService ? <ProgressBar percentage={percentConcluido} /> : '-'}
                    </td>
                    <td className="px-2 py-2 text-right">{isService ? formatCurrency(totalMedMat) : '-'}</td>
                    <td className="px-2 py-2 text-right">{isService ? formatCurrency(totalMedMo) : '-'}</td>
                    <td className="px-2 py-2 text-right font-semibold">{isService ? formatCurrency(totalMedMat + totalMedMo) : '-'}</td>
                </tr>
            );

            return item.expandido ? [rowContent, ...renderRows(processedData, item.id, level + 1, isProgressoVisual)] : [rowContent];
        });
    };

    return (
        <div>
            <PageHeader title="📏 Medição de Obra" subtitle="Acompanhamento de progressão física e financeira por etapa" />

            <div className="border-b border-default mb-6">
                <nav className="flex space-x-4">
                    <button onClick={() => setActiveTab('controle')} className={`px-3 py-2 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'controle' ? 'text-accent-500 border-b-2 border-accent-500' : 'text-secondary hover:text-white'}`}>
                        Controle de Medições
                    </button>
                    <button onClick={() => setActiveTab('progresso')} className={`px-3 py-2 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'progresso' ? 'text-accent-500 border-b-2 border-accent-500' : 'text-secondary hover:text-white'}`}>
                        Progresso Visual por Etapa
                    </button>
                </nav>
            </div>

            {activeTab === 'controle' && (
                <Card>
                    <CardHeader title="Controles da Medição">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <label>Período de:</label>
                                <input type="date" value={periodo.inicio} onChange={e => setPeriodo(p => ({ ...p, inicio: e.target.value }))} className="bg-surface border border-default rounded-md p-2 focus:ring-2 focus:ring-accent-500 outline-none" />
                                <label>até:</label>
                                <input type="date" value={periodo.fim} onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))} className="bg-surface border border-default rounded-md p-2 focus:ring-2 focus:ring-accent-500 outline-none" />
                            </div>
                            <Button variant="primary" onClick={() => alert('IA irá preencher medição com base no Diário de Obras...')}>🤖 Preencher com IA</Button>
                            <Button variant="secondary">💾 Salvar Medição</Button>
                        </div>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-secondary min-w-[1800px]">
                            <thead className="text-xs text-primary uppercase bg-surface">
                                <tr>
                                    <th className="px-4 py-3 min-w-[150px]">Nível</th>
                                    <th className="px-2 py-3 min-w-[250px]">Discriminação</th>
                                    <th className="px-2 py-3 text-center">Un.</th>
                                    <th className="px-2 py-3 text-right">Quant.</th>
                                    <th className="px-2 py-3 text-right">Mat. Total</th>
                                    <th className="px-2 py-3 text-right">M.O Total</th>
                                    <th className="px-2 py-3 text-right">Mat.+M.O Total</th>
                                    <th className="px-2 py-3 text-right">Quant. Medida</th>
                                    <th className="px-2 py-3 text-right">Medição Acum.</th>
                                    <th className="px-2 py-3 text-center min-w-[120px]">% Concluído</th>
                                    <th className="px-2 py-3 text-right">Total Med. Mat.</th>
                                    <th className="px-2 py-3 text-right">Total Med. M.O</th>
                                    <th className="px-2 py-3 text-right">Total Med. Mat.+M.O</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderRows(dadosProcessados, null, 0, false)}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {activeTab === 'progresso' && (
                <Card>
                    <CardHeader title="Progresso Visual por Etapa (Acumulado)" />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-secondary">
                            <thead className="text-xs text-primary uppercase bg-surface">
                                <tr>
                                    <th className="px-4 py-3 w-1/4">Nível</th>
                                    <th className="px-4 py-3 w-1/2">Discriminação</th>
                                    <th className="px-4 py-3 w-1/4">Progresso</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderRows(dadosProcessados, null, 0, true)}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default Medicao;
