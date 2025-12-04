import React, { useState } from 'react';
import type { Compra, Fornecedor } from '../types';
import { PageHeader } from '../components/layout/page-header';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/widgets/status-badge';
import { comprasData, fornecedoresData } from '@/data/mockData';
import { formatDate } from '@/utils/formatters';

const Compras: React.FC = () => {
    const [compras, setCompras] = useState<Compra[]>(comprasData);
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>(fornecedoresData);


    const getStatusActions = (compra: Compra) => {
        switch (compra.status) {
            case 'Solicitado':
                return <Button variant="secondary" size="sm" onClick={() => alert(`Cotar ${compra.item}`)}>🔎 Cotar</Button>;
            case 'Cotado':
                return <Button variant="success" size="sm" onClick={() => alert(`Aprovar ${compra.item}`)}>✅ Aprovar</Button>;
            case 'Aprovado':
                return <Button variant="primary" size="sm" onClick={() => alert(`Receber ${compra.item}`)}>📦 Marcar Recebido</Button>;
            case 'Recebido':
                return <span className="text-xs text-green-400">Finalizado</span>;
            default:
                return null;
        }
    };

    return (
        <div>
            <PageHeader title="🛒 Gestão de Compras" subtitle="Controle de solicitações, cotações e workflow de aprovação" />

            <Card>
                <CardHeader title="Pipeline de Compras">
                    <Button variant="primary">+ Nova Solicitação</Button>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-[#a0a5b0]">
                        <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830]">
                            <tr>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3">Qtd.</th>
                                <th className="px-4 py-3">Data Nec.</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {compras.map(compra => (
                                <tr key={compra.id} className="border-b border-[#3a3e45] hover:bg-[#24282f]">
                                    <td className="px-4 py-3 font-mono text-xs">{compra.id}</td>
                                    <td className="px-4 py-3 font-medium text-white">{compra.item}</td>
                                    <td className="px-4 py-3">{compra.quantidade} {compra.unidade}</td>
                                    <td className="px-4 py-3">{formatDate(compra.data_necessaria)}</td>
                                    <td className="px-4 py-3"><StatusBadge status={compra.status} /></td>
                                    <td className="px-4 py-3">{getStatusActions(compra)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card>
                <CardHeader title="Histórico de Fornecedores" />
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-[#a0a5b0]">
                        <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830]">
                            <tr>
                                <th className="px-4 py-3">Fornecedor</th>
                                <th className="px-4 py-3">CNPJ</th>
                                <th className="px-4 py-3">Vendedor</th>
                                <th className="px-4 py-3">Telefone</th>
                                <th className="px-4 py-3">Email</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fornecedores.map(f => (
                                <tr key={f.cnpj} className="border-b border-[#3a3e45] hover:bg-[#24282f]">
                                    <td className="px-4 py-3 font-medium text-white">{f.nome}</td>
                                    <td className="px-4 py-3">{f.cnpj}</td>
                                    <td className="px-4 py-3">{f.vendedor}</td>
                                    <td className="px-4 py-3">{f.telefone}</td>
                                    <td className="px-4 py-3">{f.email}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Compras;