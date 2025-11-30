import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useUnits } from '../../hooks/useUnits';
import { useConfirm } from '../../utils/useConfirm';
import type { UnitItem } from '../../types';
import { DataTable } from '../Table/DataTable';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, CirclePlus } from "lucide-react"; // CirclePlus importado
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
} from "@/components/ui/tooltip";
import toast from 'react-hot-toast';
import { Ruler } from "lucide-react";

interface UnitsSettingsProps {
    projectId?: string;
}

export const UnitsSettings: React.FC<UnitsSettingsProps> = ({ projectId }) => {
    const { units, loading, addUnit, updateUnit, deleteUnit, deleteUnits } = useUnits(projectId);
    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUnit, setCurrentUnit] = useState<Partial<UnitItem>>({});

    const handleAdd = () => {
        if (!projectId) {
            toast.error('Selecione um projeto primeiro.');
            return;
        }
        setCurrentUnit({ category: '@Usuário' });
        setIsModalOpen(true);
    };

    const handleEdit = (u: UnitItem) => {
        setCurrentUnit({ ...u });
        setIsModalOpen(true);
    };

    const handleDelete = async (ids: string[]) => {
        if (ids.length === 1) {
            const shouldDelete = await confirm({
                title: 'Remover Unidade',
                message: 'Tem certeza que deseja remover esta unidade?',
                confirmText: 'Remover',
                cancelText: 'Cancelar'
            });

            if (shouldDelete) {
                await deleteUnit(ids[0]);
                toast.success('Unidade removida com sucesso.');
            }
        } else {
            const shouldDelete = await confirm({
                title: 'Excluir Unidades',
                message: `Tem certeza que deseja excluir ${ids.length} unidades selecionadas?`,
                confirmText: 'Excluir Seleção',
                cancelText: 'Cancelar'
            });

            if (shouldDelete) {
                await deleteUnits(ids);
                toast.success(`${ids.length} unidades removidas.`);
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentUnit.name || !currentUnit.symbol) {
            toast.error('Preencha todos os campos obrigatórios.');
            return;
        }

        try {
            if (currentUnit.id) {
                await updateUnit(currentUnit as UnitItem);
                toast.success('Unidade atualizada!');
            } else {
                await addUnit(currentUnit as Omit<UnitItem, 'id'>);
                toast.success('Unidade criada!');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar unidade.');
        }
    };

    const columnHelper = createColumnHelper<UnitItem>();

    const columns = useMemo(() => [
        // 1. Checkbox Column (Fixed 48px)
        {
            id: 'select',
            header: ({ table }: any) => {
                const rows = table.getRowModel().rows;
                const userRows = rows.filter((r: any) => r.original.project_id);
                const allUserRowsSelected = userRows.length > 0 && userRows.every((r: any) => r.getIsSelected());
                const someUserRowsSelected = userRows.some((r: any) => r.getIsSelected());

                return (
                    <div className="flex justify-center">
                        <input
                            type="checkbox"
                            className="rounded border-[#3a3e45] bg-[#0f1419] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830] w-3.5 h-3.5 cursor-pointer"
                            checked={allUserRowsSelected}
                            ref={input => {
                                if (input) input.indeterminate = someUserRowsSelected && !allUserRowsSelected;
                            }}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                userRows.forEach((row: any) => row.toggleSelected(checked));
                            }}
                            disabled={userRows.length === 0}
                        />
                    </div>
                );
            },
            cell: ({ row }: any) => (
                row.original.project_id ? (
                    <div className="flex justify-center">
                        <input
                            type="checkbox"
                            className="rounded border-[#3a3e45] bg-[#0f1419] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830] w-3.5 h-3.5 cursor-pointer"
                            checked={row.getIsSelected()}
                            disabled={!row.getCanSelect()}
                            onChange={row.getToggleSelectedHandler()}
                        />
                    </div>
                ) : null
            ),
            size: 48,
            minSize: 48,
            enableResizing: false,
        },
        // 2. Category Column (Fixed Width)
        columnHelper.accessor('category', {
            header: 'Categoria',
            size: 250,
            minSize: 200,
            cell: info => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#242830] text-[#a0a5b0] border border-[#3a3e45]">
                    {info.getValue()}
                </span>
            )
        }),
        // 3. Name Column (Fluid)
        columnHelper.accessor('name', {
            header: 'Nome da Unidade',
            size: 300,
            minSize: 200,
            meta: { isFluid: true },
            cell: info => (
                <span className="font-medium text-white pl-1">{info.getValue()}</span>
            )
        }),
        // 4. Symbol Column (Fixed Width)
        columnHelper.accessor('symbol', {
            header: 'Símbolo',
            size: 100,
            minSize: 80,
            enableResizing: false,
            cell: info => <span className="font-mono text-xs text-[#0084ff] bg-[#0084ff]/10 px-2 py-1 rounded">{info.getValue()}</span>
        }),
        // 5. Actions Column (Fixed Right)
        {
            id: 'actions',
            header: 'Ações',
            size: 100,
            minSize: 100,
            enableResizing: false,
            cell: ({ row }: any) => (
                row.original.project_id ? (
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
                            <TooltipContent side="right">
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
                            <TooltipContent side="right">
                                <p>Excluir</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <span className="text-[#4a4e55] text-[10px] uppercase font-bold tracking-wider">Padrão</span>
                    </div>
                )
            )
        }
    ], [deleteUnit, deleteUnits, confirm]);

    return (
        <>
            <DataTable
                title={
                    <div className="flex items-center gap-2">
                        <Ruler className="w-5 h-5 text-[#0084ff]" />
                        Unidades de Medida
                    </div>
                }
                columns={columns}
                data={units}
                onAdd={handleAdd}
                onDelete={handleDelete}
                isLoading={loading}
                searchPlaceholder="Buscar unidades..."
            />

            {/* Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px] bg-[#242830] border-[#3a3e45] text-[#e8eaed] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            {currentUnit.id ? <Pencil className="w-4 h-4 text-[#0084ff]" /> : <CirclePlus className="w-4 h-4 text-[#0084ff]" />}
                            {currentUnit.id ? 'Editar Unidade' : 'Nova Unidade'}
                        </DialogTitle>
                        <DialogDescription className="text-[#a0a5b0]">
                            Defina o nome e o símbolo da unidade de medida para uso nos orçamentos.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-5 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium text-[#e8eaed]">Nome da Unidade <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={currentUnit.name || ''}
                                onChange={e => setCurrentUnit({ ...currentUnit, name: e.target.value })}
                                className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f]"
                                required
                                placeholder="Ex: Metro Quadrado"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="symbol" className="text-sm font-medium text-[#e8eaed]">Símbolo / Abreviação <span className="text-red-500">*</span></Label>
                            <Input
                                id="symbol"
                                value={currentUnit.symbol || ''}
                                onChange={e => setCurrentUnit({ ...currentUnit, symbol: e.target.value })}
                                className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] placeholder:text-[#5f656f] font-mono"
                                required
                                placeholder="Ex: m²"
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
        </>
    );
};