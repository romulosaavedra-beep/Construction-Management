import React, { useState, useMemo } from 'react';
import { Card, CardHeader } from '../Card';
import { Button } from '../Button';
import { ResizableTh } from '../Table/ResizableTh';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useColumnWidths } from '../../hooks/useColumnWidths';
import { useConfirm } from '../../utils/useConfirm';
import { maskMobilePhone, maskCNPJCPF } from '../../utils/formatters';
import type { Fornecedor } from '../../types';

interface SuppliersSettingsProps {
    projectId?: string;
}

export const SuppliersSettings: React.FC<SuppliersSettingsProps> = ({ projectId }) => {
    const { suppliers, loading, addSupplier, updateSupplier, deleteSupplier } = useSuppliers(projectId);
    const { colWidths, updateColumnWidth } = useColumnWidths('vobi-settings-sort-forn');
    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSupplier, setCurrentSupplier] = useState<Partial<Fornecedor>>({});
    const [phoneError, setPhoneError] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof Fornecedor; direction: 'asc' | 'desc' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredAndSortedSuppliers = useMemo(() => {
        let items = [...suppliers];

        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            items = items.filter(s =>
                s.nome.toLowerCase().includes(search) ||
                (s.contato && s.contato.toLowerCase().includes(search)) ||
                (s.email && s.email.toLowerCase().includes(search)) ||
                (s.telefone && s.telefone.includes(search)) ||
                (s.cnpj && s.cnpj.includes(search)) ||
                (s.endereco && s.endereco.toLowerCase().includes(search)) ||
                (s.link && s.link.toLowerCase().includes(search))
            );
        }

        if (sortConfig) {
            items.sort((a, b) => {
                const aVal = String(a[sortConfig.key] || '').toLowerCase();
                const bVal = String(b[sortConfig.key] || '').toLowerCase();
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [suppliers, sortConfig, searchTerm]);

    const requestSort = (key: keyof Fornecedor) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <span className="text-[#4a4e55] ml-1 text-[10px]">▼</span>;
        return <span className="text-[#0084ff] ml-1 text-[10px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    const handleAdd = () => {
        if (!projectId) {
            alert({ message: 'Por favor, salve as Configurações Gerais primeiro para criar o projeto.' });
            return;
        }
        setCurrentSupplier({});
        setPhoneError("");
        setIsModalOpen(true);
    };

    const handleEdit = (s: Fornecedor) => {
        setCurrentSupplier({ ...s });
        setPhoneError("");
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string | number) => {
        const shouldDelete = await confirm({
            title: 'Remover Fornecedor',
            message: 'Tem certeza que deseja remover este fornecedor?',
            confirmText: 'Remover',
            cancelText: 'Cancelar'
        });

        if (shouldDelete) {
            await deleteSupplier(id);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setPhoneError("");

        if (!currentSupplier.nome) return;

        const rawPhone = (currentSupplier.telefone || '').replace(/\D/g, '');
        if (rawPhone.length > 0) {
            if (rawPhone.length !== 11 && rawPhone.length !== 10) return setPhoneError("Telefone inválido.");
        }

        if (currentSupplier.id) {
            await updateSupplier(currentSupplier as Fornecedor);
        } else {
            await addSupplier(currentSupplier as Omit<Fornecedor, 'id'>);
        }
        setIsModalOpen(false);
    };

    return (
        <>
            <Card>
                <CardHeader title="Fornecedores">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="🔍 Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-64 bg-[#1e2329] border border-[#3a3e45] rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0084ff] outline-none"
                        />
                        <Button variant="primary" onClick={handleAdd}>+ Adicionar</Button>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-[#a0a5b0]">
                        <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830]">
                            <tr>
                                <ResizableTh tableId="forn" colKey="nome" initialWidth="20%" onSort={() => requestSort('nome')} sortIndicator={getSortIndicator('nome')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Razão Social</ResizableTh>
                                <ResizableTh tableId="forn" colKey="contato" initialWidth="15%" onSort={() => requestSort('contato')} sortIndicator={getSortIndicator('contato')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Nome do Vendedor</ResizableTh>
                                <ResizableTh tableId="forn" colKey="email" initialWidth="15%" onSort={() => requestSort('email')} sortIndicator={getSortIndicator('email')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Email</ResizableTh>
                                <ResizableTh tableId="forn" colKey="telefone" initialWidth="12%" onSort={() => requestSort('telefone')} sortIndicator={getSortIndicator('telefone')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Telefone</ResizableTh>
                                <ResizableTh tableId="forn" colKey="cnpj" initialWidth="15%" onSort={() => requestSort('cnpj')} sortIndicator={getSortIndicator('cnpj')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>CNPJ/CPF</ResizableTh>
                                <ResizableTh tableId="forn" colKey="endereco" initialWidth="10%" onSort={() => requestSort('endereco')} sortIndicator={getSortIndicator('endereco')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Endereço</ResizableTh>
                                <ResizableTh tableId="forn" colKey="link" initialWidth="8%" onSort={() => requestSort('link')} sortIndicator={getSortIndicator('link')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Link</ResizableTh>
                                <th className="px-4 py-3 w-[80px] text-center border-l border-[#3a3e45]">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="text-center py-6">Carregando...</td></tr>
                            ) : filteredAndSortedSuppliers.map(s => (
                                <tr key={s.id} className="border-b border-[#3a3e45] hover:bg-[#24282f]">
                                    <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis">{s.nome}</td>
                                    <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis">{s.contato || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis">{s.email || '-'}</td>
                                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{s.telefone || '-'}</td>
                                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{s.cnpj || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis">{s.endereco || '-'}</td>
                                    <td className="px-4 py-3 text-center">{s.link ? <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-[#0084ff] hover:underline text-xs">Clique Aqui</a> : '-'}</td>
                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(s)} className="text-[#a0a5b0] hover:text-white p-1" title="Editar">✏️</button>
                                            <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-500 p-1" title="Excluir">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && suppliers.length === 0 && <div className="text-center py-6 text-[#a0a5b0]">Nenhum fornecedor cadastrado.</div>}
                    {!loading && suppliers.length > 0 && filteredAndSortedSuppliers.length === 0 && <div className="text-center py-6 text-[#a0a5b0]">Nenhum resultado encontrado para "{searchTerm}".</div>}
                </div>
            </Card>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
                    <div className="bg-[#242830] rounded-lg shadow-2xl w-full max-w-lg border border-[#3a3e45]">
                        <div className="flex justify-between items-center p-4 border-b border-[#3a3e45]">
                            <h3 className="text-lg font-semibold text-white">{currentSupplier.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#a0a5b0] hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Razão Social <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={currentSupplier.nome || ''}
                                    onChange={e => setCurrentSupplier({ ...currentSupplier, nome: e.target.value })}
                                    className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                    placeholder="Ex: Construtora ABC Ltda"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nome do Vendedor</label>
                                    <input
                                        type="text"
                                        value={currentSupplier.contato || ''}
                                        onChange={e => setCurrentSupplier({ ...currentSupplier, contato: e.target.value })}
                                        className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                        placeholder="Ex: Carlos Souza"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">CNPJ/CPF</label>
                                    <input
                                        type="text"
                                        value={currentSupplier.cnpj || ''}
                                        onChange={e => setCurrentSupplier({ ...currentSupplier, cnpj: maskCNPJCPF(e.target.value) })}
                                        className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                        maxLength={18}
                                        placeholder="12.345.678/0001-99"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={currentSupplier.email || ''}
                                        onChange={e => setCurrentSupplier({ ...currentSupplier, email: e.target.value })}
                                        className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                        placeholder="vendas@fornecedor.com.br"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Telefone</label>
                                    <input
                                        type="text"
                                        value={currentSupplier.telefone || ''}
                                        onChange={e => {
                                            const masked = maskMobilePhone(e.target.value);
                                            setCurrentSupplier({ ...currentSupplier, telefone: masked });
                                            setPhoneError("");
                                        }}
                                        className={`w-full bg-[#1e2329] border ${phoneError ? 'border-red-500' : 'border-[#3a3e45]'} rounded-md p-2 text-sm`}
                                        maxLength={15}
                                        placeholder="(11) 98765-4321"
                                    />
                                    {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Endereço Completo</label>
                                <input
                                    type="text"
                                    value={currentSupplier.endereco || ''}
                                    onChange={e => setCurrentSupplier({ ...currentSupplier, endereco: e.target.value })}
                                    className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                    placeholder="Rua das Flores, 123, Centro - São Paulo - SP"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Link (Site/Catálogo)</label>
                                <input
                                    type="url"
                                    value={currentSupplier.link || ''}
                                    onChange={e => setCurrentSupplier({ ...currentSupplier, link: e.target.value })}
                                    className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                    placeholder="https://www.fornecedor.com.br"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
                                <Button variant="primary" type="submit">Salvar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            {dialogState.isOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1100] p-4">
                    <div className="bg-[#242830] rounded-lg shadow-2xl w-full max-w-md border border-[#3a3e45] p-6">
                        <h3 className="text-lg font-semibold text-white mb-2">{dialogState.title}</h3>
                        <p className="text-[#a0a5b0] mb-6">{dialogState.message}</p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={handleCancel}>{dialogState.cancelText || 'Cancelar'}</Button>
                            <Button variant="danger" onClick={handleConfirm}>{dialogState.confirmText || 'Confirmar'}</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
