import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useConfirm } from '@/utils/useConfirm';
import { maskMobilePhone, maskCNPJCPF } from '@/utils/formatters';
import type { Fornecedor } from '@/types';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Pencil,
    Trash2,
    Plus,
    CirclePlus,
    ExternalLink,
    Building2,
    User,
    Mail,
    Phone,
    MapPin
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from "@/components/ui/tooltip";
import toast from 'react-hot-toast';
import { Truck } from "lucide-react";

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
            toast.error('Selecione um projeto primeiro.');
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
                toast.success('Fornecedor removido.');
            }
        } else {
            const shouldDelete = await confirm({
                title: 'Excluir Fornecedores',
                message: `Tem certeza que deseja excluir ${ids.length} fornecedores selecionados?`,
                confirmText: 'Excluir Seleção',
                cancelText: 'Cancelar'
            });

            if (shouldDelete) {
                await deleteSuppliers(ids);
                toast.success(`${ids.length} fornecedores removidos.`);
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setPhoneError("");

        if (!currentSupplier.nome) {
            toast.error('Razão Social é obrigatória.');
            return;
        }

        const rawPhone = (currentSupplier.telefone || '').replace(/\D/g, '');
        if (rawPhone.length > 0) {
            if (rawPhone.length !== 11 && rawPhone.length !== 10) {
                setPhoneError("Telefone inválido.");
                return;
            }
        }

        try {
            if (currentSupplier.id) {
                await updateSupplier(currentSupplier as Fornecedor);
                toast.success('Fornecedor atualizado!');
            } else {
                await addSupplier(currentSupplier as Omit<Fornecedor, 'id'>);
                toast.success('Fornecedor criado!');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar fornecedor.');
        }
    };

    const columnHelper = createColumnHelper<Fornecedor>();

    const columns = useMemo(() => [
        // 1. Checkbox Column (Fixed 48px)
        {
            id: 'select',
            header: ({ table }: any) => (
                <div className="flex justify-center">
                    <input
                        type="checkbox"
                        className="rounded border-[#3a3e45] bg-[#0f1419] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830] w-3.5 h-3.5 cursor-pointer"
                        checked={table.getIsAllPageRowsSelected()}
                        ref={input => {
                            if (input) input.indeterminate = table.getIsSomePageRowsSelected();
                        }}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                    />
                </div>
            ),
            cell: ({ row }: any) => (
                <div className="flex justify-center">
                    <input
                        type="checkbox"
                        className="rounded border-[#3a3e45] bg-[#0f1419] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830] w-3.5 h-3.5 cursor-pointer"
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        onChange={row.getToggleSelectedHandler()}
                    />
                </div>
            ),
            size: 48,
            minSize: 48,
            enableResizing: false,
        },
        // 2. Razão Social (Fluid)
        columnHelper.accessor('nome', {
            header: 'Razão Social',
            size: 350,
            minSize: 200,
            cell: info => (
                <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-[#a0a5b0]" />
                    <span className="font-medium text-white">{info.getValue()}</span>
                </div>
            )
        }),
        // 3. Vendedor
        columnHelper.accessor('contato', {
            header: 'Vendedor',
            size: 250,
            minSize: 150,
            cell: info => info.getValue() ? (
                <div className="flex items-center gap-2 text-[#a0a5b0]">
                    <User className="w-3.5 h-3.5" />
                    <span>{info.getValue()}</span>
                </div>
            ) : '-'
        }),
        // 4. Email
        columnHelper.accessor('email', {
            header: 'Email',
            size: 250,
            minSize: 150,
            cell: info => info.getValue() ? (
                <div className="flex items-center gap-2 text-[#a0a5b0]">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{info.getValue()}</span>
                </div>
            ) : '-'
        }),
        // 5. Telefone
        columnHelper.accessor('telefone', {
            header: 'Telefone',
            size: 160,
            minSize: 120,
            cell: info => info.getValue() ? (
                <div className="flex items-center gap-2 text-[#a0a5b0]">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="font-mono text-xs">{info.getValue()}</span>
                </div>
            ) : '-'
        }),
        // 6. CNPJ
        columnHelper.accessor('cnpj', {
            header: 'CNPJ/CPF',
            size: 160,
            minSize: 140,
            cell: info => <span className="font-mono text-xs text-[#a0a5b0] bg-[#242830] px-2 py-1 rounded border border-[#3a3e45]">{info.getValue() || '-'}</span>
        }),
        // 7. Endereço (Fluid)
        columnHelper.accessor('endereco', {
            header: 'Endereço',
            size: 250,
            minSize: 200,
            meta: { isFluid: true },
            cell: info => info.getValue() ? (
                <div className="flex items-center gap-2 text-[#a0a5b0]" title={info.getValue()}>
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{info.getValue()}</span>
                </div>
            ) : '-'
        }),
        // 8. Link (Fixed)
        columnHelper.accessor('link', {
            header: 'Link',
            size: 60,
            minSize: 60,
            enableResizing: false,
            cell: info => info.getValue() ? (
                <div className="flex justify-center">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                href={info.getValue()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0084ff] hover:text-[#339dff] p-1 rounded hover:bg-[#0084ff]/10 transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </TooltipTrigger>
                        <TooltipContent side="left">Abrir Link</TooltipContent>
                    </Tooltip>
                </div>
            ) : <div className="text-center">-</div>
        }),
        // 9. Actions (Fixed Right)
        {
            id: 'actions',
            header: 'Ações',
            size: 100,
            minSize: 100,
            enableResizing: false,
            cell: ({ row }: any) => (
                <div className="flex justify-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(row.original)}
                                className="h-8 w-8 text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45]"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="end">
                            <p>Editar</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete([row.original.id])}
                                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="end">
                            <p>Excluir</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            )
        }
    ], [deleteSupplier, deleteSuppliers, confirm]);

    return (
        <TooltipProvider>
            <DataTable
                title={
                    <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-[#0084ff]" />
                        Fornecedores
                    </div>
                }
                columns={columns}
                data={suppliers}
                onAdd={handleAdd}
                onDelete={handleDelete}
                isLoading={loading}
                searchPlaceholder="Buscar fornecedores..."
                initialSorting={[{ id: 'nome', desc: false }]}
            />


            {/* Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[600px] bg-[#242830] border-[#3a3e45] text-[#e8eaed] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            {currentSupplier.id ? <Pencil className="w-4 h-4 text-[#0084ff]" /> : <CirclePlus className="w-4 h-4 text-[#0084ff]" />}
                            {currentSupplier.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                        </DialogTitle>
                        <DialogDescription className="text-[#a0a5b0]">
                            Preencha os dados do fornecedor abaixo.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="nome" className="text-sm font-medium text-[#e8eaed]">Razão Social <span className="text-red-500">*</span></Label>
                            <Input
                                id="nome"
                                value={currentSupplier.nome || ''}
                                onChange={e => setCurrentSupplier({ ...currentSupplier, nome: e.target.value })}
                                className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f]"
                                placeholder="Ex: Construtora ABC Ltda"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contato" className="text-sm font-medium text-[#e8eaed]">Nome do Vendedor</Label>
                                <Input
                                    id="contato"
                                    value={currentSupplier.contato || ''}
                                    onChange={e => setCurrentSupplier({ ...currentSupplier, contato: e.target.value })}
                                    className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f]"
                                    placeholder="Ex: Carlos Souza"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cnpj" className="text-sm font-medium text-[#e8eaed]">CNPJ/CPF</Label>
                                <Input
                                    id="cnpj"
                                    value={currentSupplier.cnpj || ''}
                                    onChange={e => setCurrentSupplier({ ...currentSupplier, cnpj: maskCNPJCPF(e.target.value) })}
                                    className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f] font-mono"
                                    maxLength={18}
                                    placeholder="12.345.678/0001-99"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-[#e8eaed]">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={currentSupplier.email || ''}
                                    onChange={e => setCurrentSupplier({ ...currentSupplier, email: e.target.value })}
                                    className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f]"
                                    placeholder="vendas@fornecedor.com.br"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="telefone" className="text-sm font-medium text-[#e8eaed]">Telefone</Label>
                                <Input
                                    id="telefone"
                                    value={currentSupplier.telefone || ''}
                                    onChange={e => {
                                        const masked = maskMobilePhone(e.target.value);
                                        setCurrentSupplier({ ...currentSupplier, telefone: masked });
                                        setPhoneError("");
                                    }}
                                    className={`bg-[#1e2329] border ${phoneError ? 'border-red-500' : 'border-[#3a3e45]'} text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f]`}
                                    maxLength={15}
                                    placeholder="(11) 98765-4321"
                                />
                                {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endereco" className="text-sm font-medium text-[#e8eaed]">Endereço Completo</Label>
                            <Input
                                id="endereco"
                                value={currentSupplier.endereco || ''}
                                onChange={e => setCurrentSupplier({ ...currentSupplier, endereco: e.target.value })}
                                className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f]"
                                placeholder="Rua das Flores, 123, Centro - São Paulo - SP"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="link" className="text-sm font-medium text-[#e8eaed]">Link (Site/Catálogo)</Label>
                            <Input
                                id="link"
                                type="url"
                                value={currentSupplier.link || ''}
                                onChange={e => setCurrentSupplier({ ...currentSupplier, link: e.target.value })}
                                className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f]"
                                placeholder="https://www.fornecedor.com.br"
                            />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button" className="text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45]">Cancelar</Button>
                            <Button type="submit" className="bg-[#0084ff] hover:bg-[#0073e6] text-white shadow-lg shadow-blue-900/20">Salvar Alterações</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Dialog */}
            <Dialog open={dialogState.isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent className="sm:max-w-[400px] bg-[#242830] border-[#3a3e45] text-[#e8eaed] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-400" />
                            {dialogState.title}
                        </DialogTitle>
                        <DialogDescription className="text-[#a0a5b0] pt-2">
                            {dialogState.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="ghost" onClick={handleCancel} className="text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45]">{dialogState.cancelText || 'Cancelar'}</Button>
                        <Button variant="destructive" onClick={handleConfirm} className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/20">{dialogState.confirmText || 'Confirmar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
};