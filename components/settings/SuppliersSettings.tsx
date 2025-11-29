import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useConfirm } from '../../utils/useConfirm';
import { maskMobilePhone, maskCNPJCPF } from '../../utils/formatters';
import type { Fornecedor } from '../../types';
import { DataTable } from '../Table/DataTable';
import { Button } from '../Button';

interface SuppliersSettingsProps {
    projectId?: string;
}

export const SuppliersSettings: React.FC<SuppliersSettingsProps> = ({ projectId }) => {
    const { suppliers, loading, addSupplier, updateSupplier, deleteSupplier, deleteSuppliers } = useSuppliers(projectId);
    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSupplier, setCurrentSupplier] = useState<Partial<Fornecedor>>({});
    const [phoneError, setPhoneError] = useState("");

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

    const handleDelete = async (ids: string[]) => {
        if (ids.length === 1) {
            const shouldDelete = await confirm({
                title: 'Remover Fornecedor',
                message: 'Tem certeza que deseja remover este fornecedor?',
                confirmText: 'Remover',
                cancelText: 'Cancelar'
            });

            if (shouldDelete) {
                await deleteSupplier(ids[0]);
            }
        } else {
            const shouldDelete = await confirm({
                title: 'Excluir Fornecedores',
                message: `Tem certeza que deseja excluir ${ids.length} fornecedores selecionados?`,
                confirmText: 'Excluir',
                cancelText: 'Cancelar'
            });

            if (shouldDelete) {
                await deleteSuppliers(ids);
            }
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

    const columnHelper = createColumnHelper<Fornecedor>();

    const columns = useMemo(() => [
        {
            id: 'select',
            header: ({ table }: any) => (
                <input
                    type="checkbox"
                    className="rounded border-[#3a3e45] bg-[#1e2329] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830]"
                    checked={table.getIsAllPageRowsSelected()}
                    ref={input => {
                        if (input) input.indeterminate = table.getIsSomePageRowsSelected();
                    }}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                />
            ),
            cell: ({ row }: any) => (
                <input
                    type="checkbox"
                    className="rounded border-[#3a3e45] bg-[#1e2329] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830]"
                    checked={row.getIsSelected()}
                    disabled={!row.getCanSelect()}
                    ref={input => {
                        if (input) input.indeterminate = row.getIsSomeSelected();
                    }}
                    onChange={row.getToggleSelectedHandler()}
                />
            ),
            size: 40,
            enableResizing: false,
        },
        columnHelper.accessor('nome', {
            header: 'Razão Social',
            size: 250,
            cell: info => <span className="font-medium text-white">{info.getValue()}</span>
        }),
        columnHelper.accessor('contato', {
            header: 'Vendedor',
            size: 150,
            cell: info => info.getValue() || '-'
        }),
        columnHelper.accessor('email', {
            header: 'Email',
            size: 200,
            cell: info => info.getValue() || '-'
        }),
        columnHelper.accessor('telefone', {
            header: 'Telefone',
            size: 120,
            cell: info => <span className="font-mono text-xs">{info.getValue() || '-'}</span>
        }),
        columnHelper.accessor('cnpj', {
            header: 'CNPJ/CPF',
            size: 140,
            cell: info => <span className="font-mono text-xs">{info.getValue() || '-'}</span>
        }),
        columnHelper.accessor('endereco', {
            header: 'Endereço',
            size: 200,
            meta: { isFluid: true },
            cell: info => <span title={info.getValue()}>{info.getValue() || '-'}</span>
        }),
        columnHelper.accessor('link', {
            header: 'Link',
            size: 60,
            enableResizing: false,
            cell: info => info.getValue() ? <a href={info.getValue()} target="_blank" rel="noopener noreferrer" className="text-[#0084ff] hover:underline text-xs">Link</a> : '-'
        }),
        {
            id: 'actions',
            header: 'Ações',
            size: 80,
            enableResizing: false,
            cell: ({ row }: any) => (
                <div className="flex justify-center gap-2">
                    <button onClick={() => handleEdit(row.original)} className="text-[#a0a5b0] hover:text-white p-1" title="Editar">✏️</button>
                    <button onClick={() => handleDelete([row.original.id])} className="text-red-400 hover:text-red-500 p-1" title="Excluir">🗑️</button>
                </div>
            )
        }
    ], [deleteSupplier, deleteSuppliers, confirm]);

    return (
        <>
            <DataTable
                title="Fornecedores"
                columns={columns}
                data={suppliers}
                onAdd={handleAdd}
                onDelete={handleDelete}
                isLoading={loading}
            />

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
