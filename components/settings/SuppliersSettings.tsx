import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useConfirm } from '../../utils/useConfirm';
import { maskMobilePhone, maskCNPJCPF } from '../../utils/formatters';
import type { Fornecedor } from '../../types';
import { DataTable } from '../Table/DataTable';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

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
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} className="h-8 w-8 text-[#a0a5b0] hover:text-white" title="Editar">
                        ✏️
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete([row.original.id])} className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-900/20" title="Excluir">
                        🗑️
                    </Button>
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
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px] bg-[#242830] border-[#3a3e45] text-[#e8eaed]">
                    <DialogHeader>
                        <DialogTitle className="text-white">{currentSupplier.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
                        <DialogDescription className="text-[#a0a5b0]">
                            Preencha os dados do fornecedor abaixo.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="nome" className="text-sm font-medium">Razão Social <span className="text-red-500">*</span></Label>
                            <Input
                                id="nome"
                                value={currentSupplier.nome || ''}
                                onChange={e => setCurrentSupplier({ ...currentSupplier, nome: e.target.value })}
                                className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-[#0084ff]"
                                placeholder="Ex: Construtora ABC Ltda"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contato" className="text-sm font-medium">Nome do Vendedor</Label>
                                <Input
                                    id="contato"
                                    value={currentSupplier.contato || ''}
                                    onChange={e => setCurrentSupplier({ ...currentSupplier, contato: e.target.value })}
                                    className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-[#0084ff]"
                                    placeholder="Ex: Carlos Souza"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cnpj" className="text-sm font-medium">CNPJ/CPF</Label>
                                <Input
                                    id="cnpj"
                                    value={currentSupplier.cnpj || ''}
                                    onChange={e => setCurrentSupplier({ ...currentSupplier, cnpj: maskCNPJCPF(e.target.value) })}
                                    className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-[#0084ff]"
                                    maxLength={18}
                                    placeholder="12.345.678/0001-99"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={currentSupplier.email || ''}
                                    onChange={e => setCurrentSupplier({ ...currentSupplier, email: e.target.value })}
                                    className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-[#0084ff]"
                                    placeholder="vendas@fornecedor.com.br"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="telefone" className="text-sm font-medium">Telefone</Label>
                                <Input
                                    id="telefone"
                                    value={currentSupplier.telefone || ''}
                                    onChange={e => {
                                        const masked = maskMobilePhone(e.target.value);
                                        setCurrentSupplier({ ...currentSupplier, telefone: masked });
                                        setPhoneError("");
                                    }}
                                    className={`bg-[#1e2329] border ${phoneError ? 'border-red-500' : 'border-[#3a3e45]'} text-white focus-visible:ring-[#0084ff]`}
                                    maxLength={15}
                                    placeholder="(11) 98765-4321"
                                />
                                {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endereco" className="text-sm font-medium">Endereço Completo</Label>
                            <Input
                                id="endereco"
                                value={currentSupplier.endereco || ''}
                                onChange={e => setCurrentSupplier({ ...currentSupplier, endereco: e.target.value })}
                                className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-[#0084ff]"
                                placeholder="Rua das Flores, 123, Centro - São Paulo - SP"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="link" className="text-sm font-medium">Link (Site/Catálogo)</Label>
                            <Input
                                id="link"
                                type="url"
                                value={currentSupplier.link || ''}
                                onChange={e => setCurrentSupplier({ ...currentSupplier, link: e.target.value })}
                                className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-[#0084ff]"
                                placeholder="https://www.fornecedor.com.br"
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
                            <Button type="submit" className="bg-[#0084ff] hover:bg-[#0073e6] text-white">Salvar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Dialog */}
            <Dialog open={dialogState.isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent className="sm:max-w-[425px] bg-[#242830] border-[#3a3e45] text-[#e8eaed]">
                    <DialogHeader>
                        <DialogTitle className="text-white">{dialogState.title}</DialogTitle>
                        <DialogDescription className="text-[#a0a5b0]">
                            {dialogState.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="secondary" onClick={handleCancel}>{dialogState.cancelText || 'Cancelar'}</Button>
                        <Button variant="destructive" onClick={handleConfirm}>{dialogState.confirmText || 'Confirmar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
