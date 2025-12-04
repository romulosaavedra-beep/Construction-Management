import React, { useState } from 'react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatters';

type ActiveTab = 'Todos' | 'A' | 'B' | 'C';

const mockCurvaABCData = [
    { class: 'A', item: 'Aço CA-50', valor: 850000, percent: 35.42, percentAcc: 35.42 },
    { class: 'A', item: 'Concreto Usinado 30MPa', valor: 680000, percent: 28.33, percentAcc: 63.75 },
    { class: 'B', item: 'Formas de Madeira', valor: 350000, percent: 14.58, percentAcc: 78.33 },
    { class: 'B', item: 'Blocos Cerâmicos', valor: 250000, percent: 10.42, percentAcc: 88.75 },
    { class: 'C', item: 'Cimento CP-II', valor: 120000, percent: 5.00, percentAcc: 93.75 },
    { class: 'C', item: 'Areia Média', valor: 80000, percent: 3.33, percentAcc: 97.08 },
    { class: 'C', item: 'Brita 1', valor: 70000, percent: 2.92, percentAcc: 100.00 },
];

const CurvaABC: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('Todos');
    
    const filteredData = mockCurvaABCData.filter(d => activeTab === 'Todos' || d.class === activeTab);

    return (
        <div>
            <PageHeader title="📈 Curva ABC (Análise de Pareto)" subtitle="Classificação de insumos por impacto de valor no orçamento" />
            
            <Card>
                <CardHeader title="Distribuição por Classificação" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="bg-[#242830] p-4 rounded-lg">
                        <h4 className="font-bold text-lg text-red-400">CLASSE A</h4>
                        <p className="text-2xl font-bold">63.75%</p>
                        <p className="text-xs text-[#a0a5b0]">2 Itens (80% do Custo)</p>
                    </div>
                    <div className="bg-[#242830] p-4 rounded-lg">
                        <h4 className="font-bold text-lg text-yellow-400">CLASSE B</h4>
                        <p className="text-2xl font-bold">25.00%</p>
                        <p className="text-xs text-[#a0a5b0]">2 Itens (15% do Custo)</p>
                    </div>
                    <div className="bg-[#242830] p-4 rounded-lg">
                        <h4 className="font-bold text-lg text-blue-400">CLASSE C</h4>
                        <p className="text-2xl font-bold">11.25%</p>
                        <p className="text-xs text-[#a0a5b0]">3 Itens (5% do Custo)</p>
                    </div>
                </div>
            </Card>

            <Card>
                {/* FIX: Added the required 'title' prop to the CardHeader component. */}
                <CardHeader title="Itens da Curva ABC">
                    <div className="flex border-b border-[#3a3e45]">
                        {(['Todos', 'A', 'B', 'C'] as ActiveTab[]).map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab ? 'border-b-2 border-[#0084ff] text-[#0084ff]' : 'text-[#a0a5b0] hover:text-white'}`}
                            >
                                Classe {tab}
                            </button>
                        ))}
                    </div>
                    <Button variant="primary" onClick={() => alert('IA irá reprocessar a Curva ABC')}>🤖 Atualizar com IA</Button>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-[#a0a5b0]">
                        <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830]">
                            <tr>
                                <th className="px-4 py-3">Classe</th>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3 text-right">Valor Total</th>
                                <th className="px-4 py-3 text-right">%</th>
                                <th className="px-4 py-3 text-right">% Acumulada</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map(item => (
                                <tr key={item.item} className="border-b border-[#3a3e45] hover:bg-[#24282f]">
                                    <td className="px-4 py-3">
                                        <span className={`font-bold ${item.class === 'A' ? 'text-red-400' : item.class === 'B' ? 'text-yellow-400' : 'text-blue-400'}`}>
                                            {item.class}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-white">{item.item}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(item.valor)}</td>
                                    <td className="px-4 py-3 text-right">{item.percent.toFixed(2)}%</td>
                                    <td className="px-4 py-3 text-right">{item.percentAcc.toFixed(2)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default CurvaABC;