
import React, { useState, useMemo } from 'react';
import type { DiarioRegistro, ServicoExecutado } from '../types';
import { PageHeader } from '../components/layout/page-header';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { diarioRegistrosData, profissionaisData, initialOrcamentoData } from '../data/mockData';
import { formatDate, getTodayDateString } from '../utils/formatters';

type Tab = 'form' | 'registros';
type SortKey = 'data' | 'responsavel' | 'etapa' | 'status';

const DiarioDeObra: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('form');
    const [registros, setRegistros] = useState<DiarioRegistro[]>(diarioRegistrosData);

    // Form State
    const [formData, setFormData] = useState<Partial<DiarioRegistro>>({ data: getTodayDateString(), clima: 'Ensolarado' });
    const [servicos, setServicos] = useState<Partial<ServicoExecutado>[]>([]);

    // Registros State
    const [filters, setFilters] = useState({ dataInicio: '', dataFim: '', responsavel: '', etapa: '', servico: '' });
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
    const [actionMenu, setActionMenu] = useState<number | null>(null);

    const orcamentoEtapas = useMemo(() => {
        return initialOrcamentoData.map(item => ({
            ...item,
            isParent: initialOrcamentoData.some(child => child.pai === item.id)
        }));
    }, []);

    const servicosDaEtapa = useMemo(() => {
        const etapaSelecionada = orcamentoEtapas.find(e => e.nivel === formData.etapa?.split(' - ')[0]);
        if (!etapaSelecionada) return [];
        return initialOrcamentoData.filter(item => item.pai === etapaSelecionada.id && item.unidade !== '');
    }, [formData.etapa, orcamentoEtapas]);

    const handleEtapaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData({ ...formData, etapa: e.target.value });
        setServicos([]); // Reset services when etapa changes
    };

    const addServico = () => {
        setServicos([...servicos, { id: Date.now(), equipe: 1 }]);
    };

    const handleServicoChange = (index: number, field: keyof ServicoExecutado, value: any) => {
        const newServicos = [...servicos];
        const servico = newServicos[index];
        if (servico) {
            (servico as any)[field] = value;

            if (field === 'servico') {
                const orcamentoItem = initialOrcamentoData.find(i => i.discriminacao === value);
                if (orcamentoItem) {
                    servico.unidade = orcamentoItem.unidade;
                    servico.quantidadePrevista = orcamentoItem.quantidade;
                }
            }
            setServicos(newServicos);
        }
    };

    const removeServico = (index: number) => {
        setServicos(servicos.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newRegistro: DiarioRegistro = {
            id: registros.length + 1,
            data: formData.data || getTodayDateString(),
            etapa: formData.etapa || '',
            responsavel: formData.responsavel || '',
            servicos: servicos.filter(s => s.servico && s.quantidadeExecutada).map(s => s as ServicoExecutado),
            observacoes: formData.observacoes || 'N/A',
            clima: formData.clima || 'Ensolarado',
            status: 'Finalizado',
        };
        if (newRegistro.servicos.length === 0) {
            alert('Adicione pelo menos um serviço com quantidade executada.');
            return;
        }
        setRegistros([newRegistro, ...registros]);
        setFormData({ data: getTodayDateString(), clima: 'Ensolarado' });
        setServicos([]);
        setActiveTab('registros');
        alert('Registro salvo com sucesso!');
    };

    const sortedAndFilteredRegistros = useMemo(() => {
        let filtered = [...registros].filter(r => {
            const dataRegistro = new Date(r.data + 'T00:00:00');
            const dataInicio = filters.dataInicio ? new Date(filters.dataInicio + 'T00:00:00') : null;
            const dataFim = filters.dataFim ? new Date(filters.dataFim + 'T00:00:00') : null;

            if (dataInicio && dataRegistro < dataInicio) return false;
            if (dataFim && dataRegistro > dataFim) return false;
            if (filters.responsavel && r.responsavel !== filters.responsavel) return false;
            if (filters.etapa && !r.etapa.includes(filters.etapa)) return false;
            if (filters.servico && !r.servicos.some(s => s.servico.toLowerCase().includes(filters.servico.toLowerCase()))) return false;

            return true;
        });

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return filtered;
    }, [registros, filters, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortKey) => {
        if (!sortConfig || sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    }

    return (
        <div>
            <PageHeader title="📝 Diário de Obra" subtitle="Registros diários de atividades e ocorrências" />
            <div className="border-b border-[#3a3e45] mb-6">
                <nav className="flex space-x-4">
                    <button onClick={() => setActiveTab('form')} className={`px-3 py-2 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'form' ? 'text-[#0084ff] border-b-2 border-[#0084ff]' : 'text-[#a0a5b0] hover:text-white'}`}>
                        + Novo Registro
                    </button>
                    <button onClick={() => setActiveTab('registros')} className={`px-3 py-2 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'registros' ? 'text-[#0084ff] border-b-2 border-[#0084ff]' : 'text-[#a0a5b0] hover:text-white'}`}>
                        Registros
                    </button>
                </nav>
            </div>

            {activeTab === 'form' && (
                <Card>
                    <CardHeader title="Novo Registro Diário" />
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Data *</label>
                                <input type="date" name="data" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} required className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Responsável *</label>
                                <select name="responsavel" value={formData.responsavel || ''} onChange={e => setFormData({ ...formData, responsavel: e.target.value })} required className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none">
                                    <option value="">Selecione...</option>
                                    {profissionaisData.map(p => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Etapa *</label>
                            <select name="etapa" value={formData.etapa || ''} onChange={handleEtapaChange} required className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none">
                                <option value="">Selecione a etapa...</option>
                                {orcamentoEtapas.map(e => <option key={e.id} value={`${e.nivel} - ${e.discriminacao}`} disabled={e.isParent}>{e.nivel} - {e.discriminacao}</option>)}
                            </select>
                        </div>

                        {formData.etapa && (
                            <div className="border border-[#3a3e45] rounded-lg p-4">
                                <h4 className="font-semibold mb-2">Serviços Executados</h4>
                                <div className="space-y-3">
                                    {servicos.map((servico, index) => (
                                        <div key={servico.id} className="grid grid-cols-12 gap-2 items-end p-2 bg-[#242830] rounded">
                                            <div className="col-span-12 sm:col-span-4">
                                                <label className="text-xs">Serviço *</label>
                                                <select value={servico.servico || ''} onChange={e => handleServicoChange(index, 'servico', e.target.value)} className="w-full bg-[#1e2329] border border-[#3a3e45] text-sm rounded p-1">
                                                    <option value="">Selecione...</option>
                                                    {servicosDaEtapa.map(s => <option key={s.id} value={s.discriminacao}>{s.discriminacao}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-6 sm:col-span-2">
                                                <label className="text-xs">Qtd. Exec. *</label>
                                                <input type="number" step="any" value={servico.quantidadeExecutada || ''} onChange={e => handleServicoChange(index, 'quantidadeExecutada', parseFloat(e.target.value))} className="w-full bg-[#1e2329] border border-[#3a3e45] text-sm rounded p-1" />
                                            </div>
                                            <div className="col-span-6 sm:col-span-2">
                                                <label className="text-xs">Qtd. Prev.</label>
                                                <input type="text" readOnly value={`${servico.quantidadePrevista || '-'} ${servico.unidade || ''}`} className="w-full bg-[#3a3e45] border border-[#3a3e45] text-sm rounded p-1 cursor-not-allowed" />
                                            </div>
                                            <div className="col-span-6 sm:col-span-2">
                                                <label className="text-xs">Equipe (nº) *</label>
                                                <input type="number" value={servico.equipe || ''} onChange={e => handleServicoChange(index, 'equipe', parseInt(e.target.value))} className="w-full bg-[#1e2329] border border-[#3a3e45] text-sm rounded p-1" />
                                            </div>
                                            <div className="col-span-6 sm:col-span-2 flex justify-end">
                                                <Button type="button" variant="danger" onClick={() => removeServico(index)}>Remover</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" variant="secondary" onClick={addServico} className="mt-3">+ Adicionar outro Serviço</Button>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1">Observação *</label>
                            <textarea name="observacoes" value={formData.observacoes || ''} onChange={e => setFormData({ ...formData, observacoes: e.target.value })} required rows={3} placeholder="Descreva as condições gerais do dia, ocorrências, etc." className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none"></textarea>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="submit" variant="primary">Salvar Registro</Button>
                        </div>
                    </form>
                </Card>
            )}

            {activeTab === 'registros' && (
                <Card>
                    <CardHeader title="Histórico de Registros">
                        {/* Filtros aqui */}
                    </CardHeader>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 p-3 bg-[#242830] rounded-lg">
                        <input type="date" value={filters.dataInicio} onChange={e => setFilters({ ...filters, dataInicio: e.target.value })} className="bg-[#1e2329] border border-[#3a3e45] rounded p-2 text-sm" />
                        <input type="date" value={filters.dataFim} onChange={e => setFilters({ ...filters, dataFim: e.target.value })} className="bg-[#1e2329] border border-[#3a3e45] rounded p-2 text-sm" />
                        <select value={filters.responsavel} onChange={e => setFilters({ ...filters, responsavel: e.target.value })} className="bg-[#1e2329] border border-[#3a3e45] rounded p-2 text-sm">
                            <option value="">Todos Responsáveis</option>
                            {profissionaisData.map(p => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
                        </select>
                        <input type="text" placeholder="Filtrar por Etapa..." value={filters.etapa} onChange={e => setFilters({ ...filters, etapa: e.target.value })} className="bg-[#1e2329] border border-[#3a3e45] rounded p-2 text-sm" />
                        <input type="text" placeholder="Filtrar por Serviço..." value={filters.servico} onChange={e => setFilters({ ...filters, servico: e.target.value })} className="bg-[#1e2329] border border-[#3a3e45] rounded p-2 text-sm" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-[#a0a5b0]">
                            <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830]">
                                <tr>
                                    <th className="px-4 py-3 cursor-pointer" onClick={() => requestSort('data')}>Data {getSortIndicator('data')}</th>
                                    <th className="px-4 py-3 cursor-pointer" onClick={() => requestSort('responsavel')}>Responsável {getSortIndicator('responsavel')}</th>
                                    <th className="px-4 py-3 cursor-pointer" onClick={() => requestSort('etapa')}>Etapa {getSortIndicator('etapa')}</th>
                                    <th className="px-4 py-3">Serviços e Quantidades</th>
                                    <th className="px-4 py-3 cursor-pointer" onClick={() => requestSort('status')}>Status {getSortIndicator('status')}</th>
                                    <th className="px-4 py-3 text-center">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFilteredRegistros.map(r => (
                                    <tr key={r.id} className="border-b border-[#3a3e45] hover:bg-[#24282f]">
                                        <td className="px-4 py-3">{formatDate(r.data)}</td>
                                        <td className="px-4 py-3 font-medium text-white">{r.responsavel}</td>
                                        <td className="px-4 py-3">{r.etapa}</td>
                                        <td className="px-4 py-3">
                                            <ul className="text-xs">
                                                {r.servicos.map(s => (
                                                    <li key={s.id}><strong>{s.servico}:</strong> {s.quantidadeExecutada} {s.unidade}</li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="relative inline-block">
                                                <Button variant="secondary" onClick={() => setActionMenu(actionMenu === r.id ? null : r.id)}>⚙️</Button>
                                                {actionMenu === r.id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-[#242830] border border-[#3a3e45] rounded-md shadow-lg z-10 text-left">
                                                        <a href="#" className="block px-4 py-2 text-sm text-[#e8eaed] hover:bg-[#3a3e45]">✏️ Editar</a>
                                                        <a href="#" className="block px-4 py-2 text-sm text-[#e8eaed] hover:bg-[#3a3e45]">🗑️ Apagar</a>
                                                        <a href="#" className="block px-4 py-2 text-sm text-[#e8eaed] hover:bg-[#3a3e45]">📋 Duplicar</a>
                                                        <a href="#" className="block px-4 py-2 text-sm text-[#e8eaed] hover:bg-[#3a3e45]">🖨️ Imprimir</a>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default DiarioDeObra;
