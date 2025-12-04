
import React, { useState } from 'react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatters';

const initialComposition = [
    { id: 1, insumo: 'Tijolo cerâmico 6 furos', coef: 30.00, un: 'un', preco: 0.80 },
    { id: 2, insumo: 'Argamassa traço 1:2:8', coef: 0.02, un: 'm³', preco: 450.00 },
    { id: 3, insumo: 'Pedreiro', coef: 0.125, un: 'H', preco: 25.00 },
    { id: 4, insumo: 'Servente', coef: 0.125, un: 'H', preco: 18.00 },
];

const ComposicaoCustos: React.FC = () => {
    const [composition, setComposition] = useState(initialComposition);
    const [isEditing, setIsEditing] = useState(false);

    const handleInputChange = (id: number, field: string, value: any) => {
        setComposition(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const totalCost = composition.reduce((acc, item) => acc + (item.coef * item.preco), 0);

    return (
        <div>
            <PageHeader title="🧱 Composição de Custos" subtitle="Detalhamento de custos unitários por serviço" />

            <Card>
                <CardHeader title="Ações e Filtros">
                    <div className="flex flex-wrap gap-2 items-center">
                        <input
                            type="text"
                            placeholder="Pesquisar por nome ou código..."
                            className="w-full sm:w-64 bg-surface border border-default rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm"
                        />
                        <select className="bg-surface border border-default rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm">
                            <option value="">Filtrar por unidade</option>
                            <option value="m2">m²</option>
                            <option value="m3">m³</option>
                            <option value="un">un</option>
                        </select>
                        <Button variant="secondary" onClick={() => alert("Funcionalidade em desenvolvimento")}>+ Nova Composição</Button>
                        <Button variant="primary" onClick={() => alert("🤖 IA irá gerar composições com base no orçamento.")}>🤖 Gerar com IA</Button>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader title="COMP-001: Alvenaria de vedação 1/2 tijolo">
                        <div className="flex gap-2">
                            <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? 'danger' : 'secondary'}>{isEditing ? '🔒 Bloquear' : '✏️ Editar'}</Button>
                            {isEditing && <Button variant="primary" onClick={() => { setIsEditing(false); alert('Composição salva!') }}>💾 Salvar</Button>}
                        </div>
                    </CardHeader>
                    <div className="text-xs mb-4 text-secondary">
                        <span className="font-semibold">Unidade:</span> m² |
                        <span className="font-semibold"> Produtividade:</span> 0,125 Hh/m²
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-secondary">
                            <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830]">
                                <tr>
                                    <th className="px-4 py-3">Insumo</th>
                                    <th className="px-4 py-3">Coef.</th>
                                    <th className="px-4 py-3">Un.</th>
                                    <th className="px-4 py-3">Preço Unit.</th>
                                    <th className="px-4 py-3">Custo Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {composition.map(item => (
                                    <tr key={item.id} className="border-b border-default">
                                        <td className="px-4 py-3 font-medium text-white">
                                            {isEditing ? <input type="text" value={item.insumo} onChange={e => handleInputChange(item.id, 'insumo', e.target.value)} className="w-full bg-[#242830] p-1 rounded" /> : item.insumo}
                                        </td>
                                        <td className="px-4 py-3">
                                            {isEditing ? <input type="number" value={item.coef} onChange={e => handleInputChange(item.id, 'coef', parseFloat(e.target.value))} className="w-20 bg-[#242830] p-1 rounded" /> : item.coef.toFixed(3)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {isEditing ? <input type="text" value={item.un} onChange={e => handleInputChange(item.id, 'un', e.target.value)} className="w-12 bg-[#242830] p-1 rounded" /> : item.un}
                                        </td>
                                        <td className="px-4 py-3">
                                            {isEditing ? <input type="number" value={item.preco} onChange={e => handleInputChange(item.id, 'preco', parseFloat(e.target.value))} className="w-24 bg-[#242830] p-1 rounded" /> : formatCurrency(item.preco)}
                                        </td>
                                        <td className="px-4 py-3">{formatCurrency(item.coef * item.preco)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-semibold text-white bg-[#242830]">
                                    <td colSpan={4} className="px-4 py-3 text-right">CUSTO TOTAL POR M²</td>
                                    <td className="px-4 py-3">{formatCurrency(totalCost)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
                <Card>
                    <CardHeader title="COMP-002: Concreto usinado 30MPa" />
                    <p className="text-center text-sm text-secondary py-10">Selecione ou busque uma composição para ver os detalhes.</p>
                </Card>
            </div>
        </div>
    );
};

export default ComposicaoCustos;
