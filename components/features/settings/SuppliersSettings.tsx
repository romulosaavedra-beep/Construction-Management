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
import { FormMessage } from "@/components/ui/form-message";
import {
    Pencil,
    Trash2,
    CirclePlus,
    ExternalLink,
    Building2,
    User,
    Mail,
    Phone,
    MapPin,
    Truck
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
import { toast } from 'sonner';

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
                        className="rounded border-[var(--ds-border-subtle)] bg-[var(--ds-bg-surface)] text-[var(--ds-primary-500)] focus:ring-[var(--ds-primary-500)] focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer transition-colors"
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
                        className="rounded border-[var(--ds-border-subtle)] bg-[var(--ds-bg-surface)] text-[var(--ds-primary-500)] focus:ring-[var(--ds-primary-500)] focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer transition-colors"
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
        // 2. Razão Social
        columnHelper.accessor('nome', {
            header: 'Razão Social',
            size: 350,
            minSize: 200,
            cell: info => (
                <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-[var(--ds-text-secondary)]" />
                    <span className="font-medium text-[var(--ds-text-primary)]">{info.getValue()}</span>
                </div>
            )
        }),
        // 3. Vendedor
        columnHelper.accessor('contato', {
            header: 'Vendedor',
            size: 250,
            minSize: 150,
            cell: info => info.getValue() ? (
                <div className="flex items-center gap-2 text-[var(--ds-text-secondary)]">
                    <User className="w-3.5 h-3.5" />
                    <span>{info.getValue()}</span>
                </div>
            ) : <span className="text-[var(--ds-text-tertiary)]">-</span>
        }),
        // 4. Email
        columnHelper.accessor('email', {
            header: 'Email',
            size: 250,
            minSize: 150,
            cell: info => info.getValue() ? (
                <div className="flex items-center gap-2 text-[var(--ds-text-secondary)]">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{info.getValue()}</span>
                </div>
            ) : <span className="text-[var(--ds-text-tertiary)]">-</span>
        }),
        // 5. Telefone
        columnHelper.accessor('telefone', {
            header: 'Telefone',
            size: 160,
            minSize: 120,
            cell: info => info.getValue() ? (
                <div className="flex items-center gap-2 text-[var(--ds-text-secondary)]">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="font-mono text-xs">{info.getValue()}</span>
                </div>
            ) : <span className="text-[var(--ds-text-tertiary)]">-</span>
        }),
        // 6. CNPJ
        columnHelper.accessor('cnpj', {
            header: 'CNPJ/CPF',
            size: 160,
            minSize: 140,
            cell: info => (
                <span className="font-mono text-xs text-[var(--ds-text-secondary)] bg-[var(--ds-bg-surface)] px-2 py-1 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-default)]">
                    {info.getValue() || '-'}
                </span>
            )
        }),
        // 7. Endereço (Fluid)
        columnHelper.accessor('endereco', {
            header: 'Endereço',
            size: 250,
            minSize: 200,
            meta: { isFluid: true },
            cell: info => info.getValue() ? (
                <div className="flex items-center gap-2 text-[var(--ds-text-secondary)]" title={info.getValue()}>
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{info.getValue()}</span>
                </div>
            ) : <span className="text-[var(--ds-text-tertiary)]">-</span>
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
                                className="text-[var(--ds-primary-500)] hover:text-[var(--ds-primary-600)] p-1 rounded-[var(--ds-radius-sm)] hover:bg-[var(--ds-primary-500)]/10 transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </TooltipTrigger>
                        <TooltipContent side="left">Abrir Link</TooltipContent>
                    </Tooltip>
                </div>
            ) : <div className="text-center text-[var(--ds-text-tertiary)]">-</div>
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
                                className="h-8 w-8"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="end">Editar</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete([row.original.id])}
                                className="h-8 w-8 text-[var(--ds-error)] hover:text-[var(--ds-error-hover)] hover:bg-[var(--ds-error-bg)]"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="end">Excluir</TooltipContent>
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
                        <Truck className="w-5 h-5 text-[var(--ds-primary-500)]" />
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

            {/* Modal Criar/Editar */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[600px] bg-[var(--ds-bg-elevated)] border-[var(--ds-border-default)] text-[var(--ds-text-primary)] shadow-[var(--ds-shadow-2xl)]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {currentSupplier.id ? (
                                <Pencil className="w-4 h-4 text-[var(--ds-primary-500)]" />
                            ) : (
                                <CirclePlus className="w-4 h-4 text-[var(--ds-primary-500)]" />
                            )}
                            {currentSupplier.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                        </DialogTitle>
                        <DialogDescription className="text-[var(--ds-text-secondary)]">
                            Preencha os dados do fornecedor abaixo.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        {/* Razão Social */}
                        <div className="space-y-2">
                            <Label required>Razão Social</Label>
                            <Input
                                value={currentSupplier.nome || ''}
                                onChange={e => setCurrentSupplier({ ...currentSupplier, nome: e.target.value })}
                                placeholder="Ex: Construtora ABC Ltda"
                                required
                                autoFocus
                                fullWidth
                            />
                        </div>

                        {/* Vendedor e CNPJ */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome do Vendedor</Label>
                                <Input
                                    value={currentSupplier.contato || ''}
                                    onChange={e => setCurrentSupplier({ ...currentSupplier, contato: e.target.value })}
                                    placeholder="Ex: Carlos Souza"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>CNPJ/CPF</Label>
                                <Input
                                    value={currentSupplier.cnpj || ''}
                                    onChange={e => setCurrentSupplier({ ...currentSupplier, cnpj: maskCNPJCPF(e.target.value) })}
                                    className="font-mono"
                                    maxLength={18}
                                    placeholder="12.345.678/0001-99"
                                />
                            </div>
                        </div>

                        {/* Email e Telefone */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={currentSupplier.email || ''}
                                    onChange={e => setCurrentSupplier({ ...currentSupplier, email: e.target.value })}
                                    placeholder="vendas@fornecedor.com.br"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Telefone</Label>
                                <Input
                                    value={currentSupplier.telefone || ''}
                                    onChange={e => {
                                        const masked = maskMobilePhone(e.target.value);
                                        setCurrentSupplier({ ...currentSupplier, telefone: masked });
                                        setPhoneError("");
                                    }}
                                    maxLength={15}
                                    placeholder="(11) 98765-4321"
                                    error={!!phoneError}
                                />
                                {phoneError && <FormMessage type="error">{phoneError}</FormMessage>}
                            </div>
                        </div>

                        {/* Endereço */}
                        <div className="space-y-2">
                            <Label>Endereço Completo</Label>
                            <Input
                                value={currentSupplier.endereco || ''}
                                onChange={e => setCurrentSupplier({ ...currentSupplier, endereco: e.target.value })}
                                placeholder="Rua das Flores, 123, Centro - São Paulo - SP"
                                fullWidth
                            />
                        </div>

                        {/* Link */}
                        <div className="space-y-2">
                            <Label>Link (Site/Catálogo)</Label>
                            <Input
                                type="url"
                                value={currentSupplier.link || ''}
                                onChange={e => setCurrentSupplier({ ...currentSupplier, link: e.target.value })}
                                placeholder="https://www.fornecedor.com.br"
                                fullWidth
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
                            <Button type="submit" variant="primary">Salvar Alterações</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Dialog */}
            <Dialog open={dialogState.isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent className="sm:max-w-[400px] bg-[var(--ds-bg-elevated)] border-[var(--ds-border-default)] shadow-[var(--ds-shadow-2xl)]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-[var(--ds-error)]" />
                            {dialogState.title}
                        </DialogTitle>
                        <DialogDescription className="text-[var(--ds-text-secondary)] pt-2">
                            {dialogState.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="ghost" onClick={handleCancel}>{dialogState.cancelText || 'Cancelar'}</Button>
                        <Button variant="destructive" onClick={handleConfirm}>{dialogState.confirmText || 'Confirmar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
};
